import { GoogleGenAI, Type } from "@google/genai";
import { Asset } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const RISK_CACHE_KEY = 'investflow_risk_cache';
const RISK_CACHE_TTL = 3600 * 1000; // 1 hour

const ADVISOR_CACHE_KEY = 'investflow_advisor_cache';
const ADVISOR_CACHE_TTL = 24 * 3600 * 1000; // 24 hours

// In-memory promise cache to prevent simultaneous duplicate calls (e.g. StrictMode)
let pendingRiskPromise: { hash: string, promise: Promise<any> } | null = null;
let pendingAdvisorPromise: { hash: string, promise: Promise<string> } | null = null;

/**
 * Generates a simple hash based on asset symbols and quantities.
 * We exclude price to ensure the cache remains valid even if prices update slightly,
 * prioritizing the "Asset Allocation" structure for risk assessment.
 */
const generatePortfolioHash = (assets: Asset[]) => {
  return assets
    .map(a => `${a.symbol}:${a.quantity}`)
    .sort()
    .join('|');
};

export const getPortfolioAnalysis = async (assets: Asset[]) => {
  if (!process.env.API_KEY) throw new Error("API Key is missing");
  if (assets.length === 0) return "";

  const currentHash = generatePortfolioHash(assets);
  const now = Date.now();

  // 1. Check LocalStorage Cache
  try {
    const cachedRaw = localStorage.getItem(ADVISOR_CACHE_KEY);
    if (cachedRaw) {
      const { hash, timestamp, data } = JSON.parse(cachedRaw);
      // Return cached data if portfolio (hash) hasn't changed AND cache is fresh (< 24 hours)
      if (hash === currentHash && (now - timestamp < ADVISOR_CACHE_TTL)) {
        return data;
      }
    }
  } catch (e) {
    console.warn("InvestFlow: Advisor Cache parse error", e);
  }

  // 2. Check In-Flight Requests (De-duplication)
  if (pendingAdvisorPromise && pendingAdvisorPromise.hash === currentHash) {
    return pendingAdvisorPromise.promise;
  }

  // 3. Execute API Call
  const apiCall = (async () => {
    const portfolioSummary = assets.map(a => ({
      symbol: a.symbol,
      name: a.name,
      type: a.type,
      value: (a.quantity * a.currentPrice).toFixed(2),
    }));

    const prompt = `
      You are a senior financial advisor.
      Analyze the following portfolio JSON:
      ${JSON.stringify(portfolioSummary)}

      Please provide:
      1. A brief summary of the asset allocation diversity.
      2. Potential risks based on the asset types (e.g., too much crypto, sector concentration).
      3. Constructive suggestions for rebalancing.
      
      Keep the tone professional yet encouraging. Format with markdown headers.
      Be concise (under 250 words).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    const textResult = response.text || "Unable to generate analysis.";

    // Save to Cache
    try {
      localStorage.setItem(ADVISOR_CACHE_KEY, JSON.stringify({
        hash: currentHash,
        timestamp: Date.now(),
        data: textResult
      }));
    } catch (e) {
      console.warn("InvestFlow: Failed to save advisor cache", e);
    }

    return textResult;
  })();

  pendingAdvisorPromise = { hash: currentHash, promise: apiCall };

  try {
    return await apiCall;
  } finally {
    pendingAdvisorPromise = null;
  }
};

export const getRiskAssessment = async (assets: Asset[]) => {
  if (!process.env.API_KEY) throw new Error("API Key is missing");
  if (assets.length === 0) return null;

  const currentHash = generatePortfolioHash(assets);
  const now = Date.now();

  // 1. Check LocalStorage Cache
  try {
    const cachedRaw = localStorage.getItem(RISK_CACHE_KEY);
    if (cachedRaw) {
      const { hash, timestamp, data } = JSON.parse(cachedRaw);
      // Return cached data if portfolio hasn't changed AND cache is fresh (< 1 hour)
      if (hash === currentHash && (now - timestamp < RISK_CACHE_TTL)) {
        return data;
      }
    }
  } catch (e) {
    console.warn("InvestFlow: Cache parse error", e);
  }

  // 2. Check In-Flight Requests (De-duplication)
  if (pendingRiskPromise && pendingRiskPromise.hash === currentHash) {
     return pendingRiskPromise.promise;
  }

  // 3. Prepare and Execute API Call
  const apiCall = (async () => {
    const portfolioSummary = assets.map(a => ({
      symbol: a.symbol,
      type: a.type,
      value: (a.quantity * a.currentPrice).toFixed(0),
    }));

    const prompt = `
      Evaluate the risk profile of this investment portfolio.
      Portfolio: ${JSON.stringify(portfolioSummary)}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskScore: {
              type: Type.NUMBER,
              description: "A score from 1 (Conservative) to 10 (Highly Speculative)"
            },
            riskLevel: {
              type: Type.STRING,
              description: "One of: 'Conservative', 'Moderate', 'Aggressive', 'Very Aggressive'"
            },
            analysis: {
              type: Type.STRING,
              description: "A concise paragraph (max 60 words) explaining the primary risk factors."
            }
          },
          required: ["riskScore", "riskLevel", "analysis"]
        }
      }
    });

    const data = JSON.parse(response.text as string);

    // Save to Cache
    try {
      localStorage.setItem(RISK_CACHE_KEY, JSON.stringify({
        hash: currentHash,
        timestamp: Date.now(),
        data: data
      }));
    } catch (e) {
      console.warn("InvestFlow: Failed to save to cache", e);
    }

    return data;
  })();

  // Store the promise in memory
  pendingRiskPromise = { hash: currentHash, promise: apiCall };

  try {
      return await apiCall;
  } finally {
      // Clear pending promise once done (success or fail)
      pendingRiskPromise = null;
  }
};