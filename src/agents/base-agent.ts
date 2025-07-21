import { AgentCapability, AgentResponse } from "../types.js";

export abstract class BaseAgent {
  protected name: string;
  protected apiKey: string;
  protected capabilities: AgentCapability;

  constructor(name: string, apiKey: string, capabilities: AgentCapability) {
    this.name = name;
    this.apiKey = apiKey;
    this.capabilities = capabilities;
  }

  abstract execute(prompt: string, context?: string): Promise<AgentResponse>;

  getName(): string {
    return this.name;
  }

  getCapabilities(): AgentCapability {
    return this.capabilities;
  }

  canHandle(taskType: string): boolean {
    return this.capabilities.specialties.includes(taskType);
  }

  estimateCost(promptLength: number): number {
    const estimatedTokens = Math.ceil(promptLength / 4); // Rough estimate
    return estimatedTokens * this.capabilities.costPerToken;
  }

  protected createResponse(
    success: boolean,
    result: string,
    tokensUsed: number,
    duration: number,
    error?: string,
  ): AgentResponse {
    return {
      success,
      result,
      metadata: {
        tokensUsed,
        cost: tokensUsed * this.capabilities.costPerToken,
        duration,
        model: this.name,
      },
      error,
    };
  }
}
