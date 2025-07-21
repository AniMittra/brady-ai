import { GoogleGenerativeAI } from "@google/generative-ai";
import { BaseAgent } from "./base-agent.js";
import { AgentResponse } from "../types.js";

export class GeminiProAgent extends BaseAgent {
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    super("Gemini Pro", apiKey, {
      strengths: [
        "Complex coding",
        "Architecture decisions",
        "Deep reasoning",
        "Code quality",
      ],
      weaknesses: ["Speed (slower but higher quality)"],
      costPerToken: 0, // Free tier
      maxTokens: 2000000,
      speed: "slow",
      specialties: [
        "coding",
        "architecture",
        "complex-reasoning",
        "code-review",
      ],
    });

    this.client = new GoogleGenerativeAI(this.apiKey);
  }

  async execute(prompt: string, context?: string): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      const model = this.client.getGenerativeModel({
        model: "gemini-2.5-pro",
        systemInstruction: `You are Gemini 2.5 Pro, an AI assistant. ${context ? `\n\nContext: ${context}` : ""}`,
      });

      const result = await (model.generateContent(prompt) as Promise<any>);
      const response = await result.response;
      const text = response.text();

      // Estimate tokens (Gemini doesn't provide exact count in free tier)
      const estimatedTokens = Math.ceil((prompt.length + text.length) / 4);
      const duration = Date.now() - startTime;

      return this.createResponse(true, text, estimatedTokens, duration);
    } catch (error) {
      const duration = Date.now() - startTime;
      return this.createResponse(
        false,
        "",
        0,
        duration,
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }
}
