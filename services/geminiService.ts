import { GoogleGenAI, Type } from "@google/genai";
import { Asset } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getPortfolioAnalysis = async (assets: Asset[]) => {
  if (!process.env.API_KEY) throw new Error("API Key is missing");

  const portfolioSummary = assets.map(a => ({
    symbol: a.symbol,
    name: a.name,
    type: a.type,
    value: (a.quantity * a.currentPrice).toFixed(2),
  }));

  // const prompt = `
  //   You are a senior financial advisor.
  //   Analyze the following portfolio JSON:
  //   ${JSON.stringify(portfolioSummary)}

  //   Please provide:
  //   1. A brief summary of the asset allocation diversity.
  //   2. Potential risks based on the asset types (e.g., too much crypto, sector concentration).
  //   3. Constructive suggestions for rebalancing.
    
  //   Keep the tone professional yet encouraging. Format with markdown headers.
  //   Be concise (under 250 words).
  // `;

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

export const getRiskAssessment = async (assets: Asset[]) => {
  if (!process.env.API_KEY) throw new Error("API Key is missing");

  const portfolioSummary = assets.map(a => ({
    symbol: a.symbol,
    type: a.type,
    value: (a.quantity * a.currentPrice).toFixed(0),
  }));

  const prompt = `
    Evaluate the risk profile of this investment portfolio. 请使用 中文 输出结果。
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

  return JSON.parse(response.text as string);
};