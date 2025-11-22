import { GoogleGenAI, Type } from "@google/genai";
import { Asset, AssetType, Language } from "../types";

export const RISK_CACHE_KEY = 'investflow_risk_cache';
export const RISK_CACHE_TTL = 3600 * 1000; // 1 hour

export const ADVISOR_CACHE_KEY = 'investflow_advisor_cache';
export const ADVISOR_CACHE_TTL = 24 * 3600 * 1000; // 24 hours

// In-memory promise cache to prevent simultaneous duplicate calls
let pendingRiskPromise: { hash: string, promise: Promise<any> } | null = null;
let pendingAdvisorPromise: { hash: string, promise: Promise<string> } | null = null;

export const generatePortfolioHash = (assets: Asset[]) => {
  return assets
    .map(a => {
      // For manual valuation assets, price changes are significant user inputs, so include in hash.
      // For market assets (Stock/Crypto), we ignore price to prevent cache invalidation on every market tick.
      const isManualValuation = a.type === AssetType.REAL_ESTATE || a.type === AssetType.LIABILITY || a.type === AssetType.OTHER;
      const pricePart = isManualValuation ? `:${a.currentPrice}` : '';
      return `${a.symbol}:${a.quantity}:${a.type}${pricePart}`;
    })
    .sort()
    .join('|');
};

export const getPortfolioAnalysis = async (assets: Asset[], apiKey: string, language: Language = 'en', forceRefresh: boolean = false) => {
  if (!apiKey) throw new Error("API Key is missing");
  if (assets.length === 0) return "";

  // Include language in hash to ensure we re-fetch if language changes
  const currentHash = `${generatePortfolioHash(assets)}:${language}`;
  const now = Date.now();

  // 1. Check LocalStorage Cache
  if (!forceRefresh) {
    try {
      const cachedRaw = localStorage.getItem(ADVISOR_CACHE_KEY);
      if (cachedRaw) {
        const { hash, timestamp, data } = JSON.parse(cachedRaw);
        if (hash === currentHash && (now - timestamp < ADVISOR_CACHE_TTL)) {
          return data;
        }
      }
    } catch (e) {
      console.warn("PanassetLite: Advisor Cache parse error", e);
    }
  }

  if (pendingAdvisorPromise && pendingAdvisorPromise.hash === currentHash && !forceRefresh) {
    return pendingAdvisorPromise.promise;
  }

  const apiCall = (async () => {
    // Initialize AI with the provided key
    const ai = new GoogleGenAI({ apiKey });

    const portfolioSummary = assets.map(a => ({
      symbol: a.symbol,
      type: a.type,
      qty: a.quantity,
      val: (a.quantity * a.currentPrice).toFixed(0),
      curr: a.currency
    }));

    const targetLanguage = language === 'zh' ? 'Chinese (Simplified)' : 'English';

    // Optimized System Prompt for Comprehensive Wealth Management with Privacy Protection
    const prompt = `
    You are the Chief Investment Officer (CIO) for 'PanassetLite' (盘资产·轻), a private wealth management platform.

    **User Portfolio Snapshot (For Analysis Only):**
    ${JSON.stringify(portfolioSummary)}

    **Financial Context:**
    - **Net Worth** = Total Assets - Total Liabilities.
    - **Liquid Assets**: Stocks, Crypto, Cash, Funds.
    - **Illiquid Assets**: Real Estate (Low volatility, hard to sell).
    - **Liabilities**: Loans, Mortgages (Negative impact on Net Worth).

    **STRICT PRIVACY & OUTPUT RULES:**
    1. **NO ABSOLUTE NUMBERS:** You are generating a report for a privacy-focused dashboard. **DO NOT** output any specific monetary values (e.g., do NOT write "$10,000", "72,361 RMB", or "1.5 BTC") in the final report.
    2. **USE RATIOS & PERCENTAGES:** Instead of numbers, use percentages (%), ratios, and qualitative terms (e.g., "healthy buffer", "significant portion", "minor allocation").
    3. **LANGUAGE:** The output must be in **${targetLanguage}**.

    **Task:**
    Generate a strategic wealth analysis report. Use Markdown.

    **Structure:**
    1.  **Wealth Health Check**:
        - Analyze the **Net Worth** structure (Asset vs Liability mix) using percentages only.
        - Assess **Debt-to-Asset Ratio**. (Liabilities > 30% is caution).
        - Assess **Liquidity**. Are they over-leveraged or too illiquid?

    2.  **Risk & Allocation**:
        - Evaluate exposure to High Volatility (Crypto) vs Stable Assets (Real Estate/Cash) based on portfolio weight.
        - Comment on concentration risk (e.g., "Allocated heavily in a single asset").

    3.  **Strategic Recommendations**:
        - Provide 3 specific, actionable steps to optimize the portfolio based on the asset mix.

    **Tone:** Professional, insightful, objective, and encouraging.
    **Length:** Concise (~300 words).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    const textResult = response.text || (language === 'zh' ? "暂时无法生成分析报告。" : "Unable to generate analysis report.");

    try {
      localStorage.setItem(ADVISOR_CACHE_KEY, JSON.stringify({
        hash: currentHash,
        timestamp: Date.now(),
        data: textResult
      }));
    } catch (e) {
      console.warn("PanassetLite: Failed to save advisor cache", e);
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

export const getRiskAssessment = async (assets: Asset[], apiKey: string, language: Language = 'en', forceRefresh: boolean = false) => {
  if (!apiKey) throw new Error("API Key is missing");
  if (assets.length === 0) return null;

  const currentHash = `${generatePortfolioHash(assets)}:${language}`;
  const now = Date.now();

  if (!forceRefresh) {
    try {
      const cachedRaw = localStorage.getItem(RISK_CACHE_KEY);
      if (cachedRaw) {
        const { hash, timestamp, data } = JSON.parse(cachedRaw);
        if (hash === currentHash && (now - timestamp < RISK_CACHE_TTL)) {
          return data;
        }
      }
    } catch (e) {}
  }

  if (pendingRiskPromise && pendingRiskPromise.hash === currentHash && !forceRefresh) {
     return pendingRiskPromise.promise;
  }

  const apiCall = (async () => {
    // Initialize AI with the provided key
    const ai = new GoogleGenAI({ apiKey });

    const portfolioSummary = assets.map(a => ({
      type: a.type,
      val: (a.quantity * a.currentPrice).toFixed(0),
    }));

    const targetLanguage = language === 'zh' ? 'Chinese' : 'English';

    const prompt = `
      Analyze the risk profile of this portfolio: ${JSON.stringify(portfolioSummary)}.
      
      **PRIVACY RULE**: Do not mention specific monetary amounts in the 'analysis' text. Use percentages or general terms.

      Classify assets:
      - High Risk: Crypto
      - Medium Risk: Stocks, Funds
      - Low/Stable Risk: Cash, Real Estate
      - Liability: Debt (increases overall risk profile if high)
      
      Return JSON with a riskScore (1-10) and a brief analysis in ${targetLanguage}.
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
            analysis: { type: Type.STRING, description: `Max 60 words summary in ${targetLanguage}, no specific dollar/currency amounts.` }
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