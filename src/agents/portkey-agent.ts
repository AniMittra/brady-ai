import { BaseAgent } from "./base-agent.js";
import { Portkey } from "portkey-ai";

export class PortkeyAgent extends BaseAgent {
  private portkey: Portkey;
  private virtualKey: string;

  constructor(
    apiKey: string,
    virtualKey: string,
    private configs: any,
  ) {
    super("Portkey Gateway", apiKey, {
      strengths: [
        "unified API access",
        "cost optimization",
        "real-time analytics",
        "automatic fallbacks",
      ],
      weaknesses: ["additional latency", "dependency on third-party service"],
      maxTokens: 4000,
      costPerToken: 0.000002,
      speed: "fast",
      specialties: [
        "multi-provider",
        "cost-optimization",
        "analytics",
        "load-balancing",
      ],
    });

    this.virtualKey = virtualKey;
    this.portkey = new Portkey({
      apiKey: apiKey,
      virtualKey: virtualKey,
    });
  }

  async execute(
    prompt: string,
    taskType: string = "general",
    configId?: string,
  ): Promise<any> {
    const startTime = Date.now();

    try {
      // Use the provided config ID or determine from task type
      const config = configId || this.getConfigForTaskType(taskType);

      const chatCompletion = await this.portkey.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are ${this.name}, an AI assistant specialized in:
- Multi-provider model routing and optimization
- Cost-effective AI operations
- Performance benchmarking and analysis
- Unified API access across providers

Task type: ${taskType}
Provide accurate, helpful responses while optimizing for cost and performance.`,
          },
          { role: "user", content: prompt },
        ],
        config: config,
        maxTokens: this.capabilities.maxTokens,
        temperature: 0.7,
      });

      const duration = Date.now() - startTime;
      const content = chatCompletion.choices[0]?.message?.content || "";
      const tokensUsed = chatCompletion.usage?.total_tokens || 0;

      return {
        success: true,
        result: content,
        metadata: {
          model: config,
          provider: "portkey",
          tokensUsed: tokensUsed,
          cost: this.estimatePortkeyCost(tokensUsed, config),
          duration: duration,
          // Portkey-specific metadata
          portkeyRequestId: chatCompletion.id,
          promptTokens: chatCompletion.usage?.prompt_tokens || 0,
          completionTokens: chatCompletion.usage?.completion_tokens || 0,
        },
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`[PortkeyAgent] Error:`, error);

      return {
        success: false,
        result: "",
        error: error.message || "Unknown Portkey error",
        metadata: {
          model: configId || "portkey-config",
          provider: "portkey",
          tokensUsed: 0,
          cost: 0,
          duration: duration,
        },
      };
    }
  }

  private getConfigForTaskType(taskType: string): string {
    // Map task types to Portkey config IDs
    switch (taskType.toLowerCase()) {
      case "director":
      case "planning":
      case "coordination":
        return this.configs.director;
      case "researcher":
      case "research":
      case "analysis":
        return this.configs.researcher;
      case "coder":
      case "coding":
      case "programming":
        return this.configs.coder;
      case "quick-search":
      case "search":
      case "web-search":
        return this.configs.quickSearch;
      case "simple-tasks":
      case "simple":
      case "basic":
        return this.configs.simpleTasks;
      case "documenter":
      case "documentation":
      case "docs":
        return this.configs.documenter;
      default:
        return this.configs.director; // Default fallback
    }
  }

  private estimatePortkeyCost(tokens: number, model: string): number {
    // Cost estimation based on common model pricing
    // These are rough estimates - Portkey provides actual costs in their dashboard
    const costPerToken: { [key: string]: number } = {
      "gpt-4o": 0.000015, // $15/1M tokens
      "gpt-4o-mini": 0.00000015, // $0.15/1M tokens
      "gpt-4-turbo": 0.00001, // $10/1M tokens
      "claude-3-5-sonnet": 0.000015, // $15/1M tokens
      "claude-3-haiku": 0.00000025, // $0.25/1M tokens
      "gemini-1.5-pro": 0.000007, // $7/1M tokens
      "gemini-1.5-flash": 0.0000007, // $0.7/1M tokens
      "llama-3.1-70b": 0.0000009, // $0.9/1M tokens
      "llama-3.1-8b": 0.0000002, // $0.2/1M tokens
    };

    const rate = costPerToken[model] || 0.000002; // Default fallback
    return tokens * rate;
  }
}
