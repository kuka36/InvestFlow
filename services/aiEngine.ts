
import { GoogleGenAI, Type } from "@google/genai";

// 1. Define the Strategy Interface
export interface IAIEngine {
  generateText(prompt: string): Promise<string>;
  generateJSON(prompt: string, schema?: any): Promise<any>;
}

// 2. Concrete Strategy: Gemini
export class GeminiEngine implements IAIEngine {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateText(prompt: string): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "";
  }

  async generateJSON(prompt: string, schema?: any): Promise<any> {
    const config: any = {
      responseMimeType: 'application/json',
    };

    // Only attach schema if provided and supported by the generic structure
    if (schema) {
      config.responseSchema = schema;
    }

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: config
    });

    try {
      return JSON.parse(response.text as string);
    } catch (e) {
      console.error("Gemini JSON Parse Error", e);
      throw new Error("Invalid JSON response from Gemini");
    }
  }
}

// 3. Concrete Strategy: DeepSeek
export class DeepSeekEngine implements IAIEngine {
  private apiKey: string;
  private baseUrl = 'https://api.deepseek.com/chat/completions';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async callAPI(messages: any[], jsonMode: boolean = false): Promise<string> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: messages,
        response_format: jsonMode ? { type: "json_object" } : undefined,
        stream: false
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const msg = errData.error?.message || response.statusText;
      throw new Error(`DeepSeek API Error: ${msg}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async generateText(prompt: string): Promise<string> {
    return this.callAPI([{ role: "user", content: prompt }], false);
  }

  async generateJSON(prompt: string, _schema?: any): Promise<any> {
    // DeepSeek V3 supports JSON mode but doesn't support strict Schema validation like Gemini in the same way.
    // We rely on the prompt instructions and JSON mode enforcement.
    const responseText = await this.callAPI([{ role: "user", content: prompt }], true);
    
    try {
      return JSON.parse(responseText);
    } catch (e) {
      console.error("DeepSeek JSON Parse Error", e);
      throw new Error("Invalid JSON response from DeepSeek");
    }
  }
}

// 4. Factory
export class AIEngineFactory {
  static create(provider: string, apiKey: string): IAIEngine {
    switch (provider) {
      case 'deepseek':
        return new DeepSeekEngine(apiKey);
      case 'gemini':
      default:
        return new GeminiEngine(apiKey);
    }
  }
}
