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
        systemInstruction: `You are Gemini 2.5 Pro, an AI assistant specialized in:
- Complex coding tasks and architecture decisions
- Deep reasoning and problem-solving
- High-quality code generation and review
- Technical analysis and optimization

KIRO IDE BEHAVIORAL GUIDELINES:
${this.getKiroGuidelines()
  .map((g) => `- ${g}`)
  .join("\n")}

CRITICAL GIT SAFETY:
- NEVER use ./ prefixes in git commands (git add ./file is FORBIDDEN)
- Always use: git add . or git add filename (without ./)
- Run git status before any commit
- Follow conventional commit format: type: description

CODING & ARCHITECTURE FOCUS:
- Prioritize code quality over speed
- Maintain TypeScript strict mode compliance
- Use defensive programming practices
- Provide comprehensive error handling
- Follow existing code patterns and conventions
- Design scalable, maintainable solutions

Provide high-quality, well-reasoned solutions with detailed explanations while strictly following Kiro guidelines.
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
