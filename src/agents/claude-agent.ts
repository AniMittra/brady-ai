import Anthropic from "@anthropic-ai/sdk";
import { BaseAgent } from "./base-agent.js";
import { AgentResponse } from "../types.js";

export class ClaudeAgent extends BaseAgent {
  private client: Anthropic;

  constructor(apiKey: string) {
    super("Claude", apiKey, {
      strengths: [
        "Complex reasoning",
        "Code analysis",
        "Architecture",
        "Problem solving",
      ],
      weaknesses: ["Cost for simple tasks"],
      costPerToken: 0.000003, // $3 per million tokens
      maxTokens: 200000,
      speed: "medium",
      specialties: [
        "reasoning",
        "architecture",
        "code-review",
        "complex-analysis",
      ],
    });

    this.client = new Anthropic({
      apiKey: this.apiKey,
    });
  }

  async execute(prompt: string, context?: string): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      const systemPrompt = `You are Brady AI, an intelligent development orchestrator powered by Claude. ${context ? `\n\nContext: ${context}` : ""}`;

      const response = await this.client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4000,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const result =
        response.content[0].type === "text" ? response.content[0].text : "";
      const tokensUsed =
        response.usage.input_tokens + response.usage.output_tokens;
      const duration = Date.now() - startTime;

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