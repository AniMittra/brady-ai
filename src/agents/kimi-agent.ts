import OpenAI from "openai";
import { BaseAgent } from "./base-agent.js";
import { AgentResponse } from "../types.js";

export class KimiAgent extends BaseAgent {
  private openai: OpenAI;

  constructor(apiKey: string) {
    super("Kimi K2", apiKey, {
      strengths: [
        "Project supervision",
        "Documentation",
        "Task coordination",
        "Planning",
      ],
      weaknesses: ["Complex mathematical calculations"],
      costPerToken: 0.000001, // Estimate for OpenRouter pricing
      maxTokens: 128000,
      speed: "medium",
      specialties: ["supervision", "documentation", "coordination", "planning"],
    });

    this.openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: apiKey,
    });
  }

  async execute(prompt: string, context?: string): Promise<AgentResponse> {
    const startTime = Date.now();
    try {
      const chatCompletion = await this.openai.chat.completions.create({
        model: "moonshotai/kimi-k2",
        messages: [
          {
            role: "system",
            content: `You are Kimi K2, a specialized project supervisor and documentation agent.${context ? `

Context: ${context}` : ""}`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const duration = Date.now() - startTime;
      const result = chatCompletion.choices[0]?.message?.content || "";
      const tokensUsed = chatCompletion.usage?.total_tokens || 0;

      return this.createResponse(true, result, tokensUsed, duration);
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
