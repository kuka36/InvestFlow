import { GoogleGenAI, Type } from "@google/genai";
import { Asset, AssetType } from "../types";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export const RISK_CACHE_KEY = 'investflow_risk_cache';
export const RISK_CACHE_TTL = 3600 * 1000; // 1 hour

export const ADVISOR_CACHE_KEY = 'investflow_advisor_cache';
export const ADVISOR_CACHE_TTL = 24 * 3600 * 1000; // 24 hours

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// In-memory promise cache to prevent simultaneous duplicate calls
let pendingRiskPromise: { hash: string, promise: Promise<any> } | null = null;
let pendingAdvisorPromise: { hash: string, promise: Promise<string> } | null = null;

export const generatePortfolioHash = (assets: Asset[]) => {
  return assets
    .map(a => `${a.symbol}:${a.quantity}:${a.type}`)
    .sort()
    .join('|');
};

export const getPortfolioAnalysis = async (assets: Asset[]) => {
  if (!GEMINI_API_KEY) throw new Error("API Key is missing");
  if (assets.length === 0) return "";

  const currentHash = generatePortfolioHash(assets);
  const now = Date.now();

  // 1. Check LocalStorage Cache
  try {
    const cachedRaw = localStorage.getItem(ADVISOR_CACHE_KEY);
    if (cachedRaw) {
      const { hash, timestamp, data } = JSON.parse(cachedRaw);
      if (hash === currentHash && (now - timestamp < ADVISOR_CACHE_TTL)) {
        return data;
      }
    }
  } catch (e) {
    console.warn("InvestFlow: Advisor Cache parse error", e);
  }

  if (pendingAdvisorPromise && pendingAdvisorPromise.hash === currentHash) {
    return pendingAdvisorPromise.promise;
  }

  const apiCall = (async () => {
    const portfolioSummary = assets.map(a => ({
      symbol: a.symbol,
      type: a.type,
      qty: a.quantity,
      val: (a.quantity * a.currentPrice).toFixed(0),
      curr: a.currency
    }));

    // Optimized System Prompt for Comprehensive Wealth Management
    const prompt = `
    You are the Chief Investment Officer (CIO) for 'InvestFlow', a private wealth management platform.

    **User Portfolio Snapshot:**
    ${JSON.stringify(portfolioSummary)}

    **Financial Context:**
    - **Net Worth** = Total Assets - Total Liabilities.
    - **Liquid Assets**: Stocks, Crypto, Cash, Funds.
    - **Illiquid Assets**: Real Estate (Low volatility, hard to sell).
    - **Liabilities**: Loans, Mortgages (Negative impact on Net Worth).

    **Task:**
    Generate a strategic wealth analysis report in **Chinese (Simplified)**. Use Markdown.

    **Structure:**
    1.  **Wealth Health Check (财富健康诊断)**:
        - Analyze the **Net Worth** status.
        - Assess **Debt-to-Asset Ratio**. Are they over-leveraged? (Liabilities > 30% is caution).
        - Assess **Liquidity**. Do they have enough cash/stocks vs real estate?

    2.  **Risk & Allocation (风险与配置)**:
        - Evaluate exposure to High Volatility (Crypto) vs Stable Assets (Real Estate/Cash).
        - Comment on concentration risk (e.g., too much in one stock or one property).

    3.  **Strategic Recommendations (首席建议)**:
        - Provide 3 specific, actionable steps to optimize the portfolio (e.g., "Pay down high-interest debt", "Increase emergency fund", "Diversify into global ETFs").

    **Tone:** Professional, insightful, objective, and encouraging.
    **Length:** Concise (~300 words).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    const textResult = response.text || "暂时无法生成分析报告。";

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
  if (!GEMINI_API_KEY) throw new Error("API Key is missing");
  if (assets.length === 0) return null;

  const currentHash = generatePortfolioHash(assets);
  const now = Date.now();

  try {
    const cachedRaw = localStorage.getItem(RISK_CACHE_KEY);
    if (cachedRaw) {
      const { hash, timestamp, data } = JSON.parse(cachedRaw);
      if (hash === currentHash && (now - timestamp < RISK_CACHE_TTL)) {
        return data;
      }
    }
  } catch (e) {}

  if (pendingRiskPromise && pendingRiskPromise.hash === currentHash) {
     return pendingRiskPromise.promise;
  }

  const apiCall = (async () => {
    const portfolioSummary = assets.map(a => ({
      type: a.type,
      val: (a.quantity * a.currentPrice).toFixed(0),
    }));

    const prompt = `
      Analyze the risk profile of this portfolio: ${JSON.stringify(portfolioSummary)}.
      Classify assets:
      - High Risk: Crypto
      - Medium Risk: Stocks, Funds
      - Low/Stable Risk: Cash, Real Estate
      - Liability: Debt (increases overall risk profile if high)
      
      Return JSON with a riskScore (1-10) and a brief analysis in Chinese.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskScore: { type: Type.NUMBER, description: "1-10 Score (10 is Aggressive)" },
            riskLevel: { type: Type.STRING, description: "Conservative, Balanced, Aggressive" },
            analysis: { type: Type.STRING, description: "Max 60 words summary in Chinese" }
          },
          required: ["riskScore", "riskLevel", "analysis"]
        }
      }
    });

    const data = JSON.parse(response.text as string);

    try {
      localStorage.setItem(RISK_CACHE_KEY, JSON.stringify({
        hash: currentHash,
        timestamp: Date.now(),
        data: data
      }));
    } catch (e) {}

    return data;
  })();

  pendingRiskPromise = { hash: currentHash, promise: apiCall };

  try {
      return await apiCall;
  } finally {
      pendingRiskPromise = null;
  }
};