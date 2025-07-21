import { Groq } from "groq-sdk";
import { AgentResponse, AgentCapability } from "../types.js";
import { BaseAgent } from "./base-agent.js";

export class LlamaAgent extends BaseAgent {
  private groq: Groq;

  constructor(apiKey: string) {
    const capabilities: AgentCapability = {
      strengths: ["coding", "writing", "summarization"],
      weaknesses: ["complex reasoning"],
      costPerToken: 0.0000009, // Example cost
      maxTokens: 8192,
      speed: "fast",
      specialties: [
        "llama-v3p3-70b-instruct",
        "llama3-70b-8192",
        "llama3-8b-8192",
      ],
    };
    super("llama", apiKey, capabilities);
    this.groq = new Groq({ apiKey });
  }

  async execute(prompt: string, context?: string): Promise<AgentResponse> {
    const startTime = Date.now();
    try {
      const modelName = this.capabilities.specialties[0]; // Use the first model as default
      const chatCompletion = await this.groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: context || "You are a helpful assistant.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        model: modelName,
      });

      const result = chatCompletion.choices[0]?.message?.content || "";
      const endTime = Date.now();
      const tokensUsed = chatCompletion.usage?.total_tokens || 0;

      return this.createResponse(true, result, tokensUsed, endTime - startTime);
    } catch (error: any) {
      const endTime = Date.now();
      return this.createResponse(
        false,
        error.message,
        0,
        endTime - startTime,
        error.message,
      );
    }
  }
}
