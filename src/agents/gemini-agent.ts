import { GoogleGenerativeAI } from "@google/generative-ai";
import { BaseAgent } from "./base-agent.js";
import { AgentResponse } from "../types.js";

export class GeminiAgent extends BaseAgent {
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    super("Gemini", apiKey, {
      strengths: [
        "Fast processing",
        "General tasks",
        "QA/Review",
        "Quick analysis",
      ],
      weaknesses: ["Complex reasoning"],
      costPerToken: 0, // Free tier
      maxTokens: 1000000,
      speed: "fast",
      specialties: [
        "general-tasks",
        "qa-review",
        "quick-analysis",
        "fast-processing",
      ],
    });

    this.client = new GoogleGenerativeAI(this.apiKey);
  }

  async execute(prompt: string, context?: string): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      const model = this.client.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: `You are Brady AI, an intelligent development orchestrator powered by Gemini 2.5 Flash. You coordinate multiple AI models to help with development tasks. You are specialized in:
- Fast processing and quick responses
- General task completion and analysis
- QA/Review and quality assurance
- Quick technical insights and summaries

KIRO IDE BEHAVIORAL GUIDELINES:
${this.getKiroGuidelines()
  .map((g) => `- ${g}`)
  .join("\n")}

CRITICAL GIT SAFETY:
- NEVER use ./ prefixes in git commands (git add ./file is FORBIDDEN)
- Always use: git add . or git add filename (without ./)
- Run git status before any commit
- Follow conventional commit format: type: description

OPTIMIZATION & DEBUGGING FOCUS:
- Maintain TypeScript strict mode compliance
- Use defensive programming practices
- Provide clear error messages and recovery steps
- Test optimizations thoroughly before committing
- Follow existing code patterns and conventions

Provide efficient, optimized solutions with clear explanations while strictly following Kiro guidelines.
${context ? `\n\nContext: ${context}` : ""}`,
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
