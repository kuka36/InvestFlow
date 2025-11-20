import { GoogleGenAI } from "@google/genai";
import { Asset } from "../types";

const apiKey = process.env.API_KEY || ''; // Fallback handled in UI if missing

export const getPortfolioAnalysis = async (assets: Asset[]) => {
  if (!apiKey) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey });

  const portfolioSummary = assets.map(a => ({
    symbol: a.symbol,
    name: a.name,
    type: a.type,
    value: (a.quantity * a.currentPrice).toFixed(2),
    allocation: 0 // Calculated by model
  }));

  const prompt = `
    您是 InvestFlow 的顶级财务顾问。请分析以下投资组合 JSON：
    ${JSON.stringify(portfolioSummary)}

    请提供：
    1. 资产配置多样性的简要概述。
    2. 基于资产类型的潜在风险（例如，加密货币配置过高、行业集中度过高）。
    3. 根据您专业知识及最新市场行情，提供资产配置再平衡的建设性建议。
    
    请保持专业而又不失鼓励的语气。
    请使用 Markdown 标题进行格式化。
    请使用 中文 输出结果。
    请言简意赅（不超过 250 字）。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      //model: 'gemini-3-pro-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};