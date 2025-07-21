import { AgentCapability, AgentResponse } from "../types.js";
import {
  KIRO_GUIDELINES,
  generateKiroContextPrompt,
  validateGitCommand,
} from "../steering/kiro-guidelines.js";

export abstract class BaseAgent {
  protected name: string;
  protected apiKey: string;
  protected capabilities: AgentCapability;
  protected kiroGuidelines = KIRO_GUIDELINES;

  constructor(name: string, apiKey: string, capabilities: AgentCapability) {
    this.name = name;
    this.apiKey = apiKey;
    this.capabilities = capabilities;
  }

  abstract execute(prompt: string, context?: string): Promise<AgentResponse>;

  /**
   * Execute with Kiro guidelines integration
   */
  async executeWithKiroGuidelines(
    prompt: string,
    taskType: string,
    context?: string,
  ): Promise<AgentResponse> {
    // Generate Brady ecosystem context
    const bradyContext = `BRADY AI ECOSYSTEM CONTEXT:
You are part of Brady AI, an intelligent development orchestrator. Brady (the director) is delegating this task to you as a specialist agent. Brady is itself an LLM being managed by a human user.

Your role in the Brady ecosystem:
- You are a specialist agent (${this.name}) with expertise in: ${this.capabilities.specialties.join(", ")}
- Brady coordinates multiple agents like you for complex development projects
- You can ask clarifying questions if you need more context for your specialized work
- You should provide thorough, expert-level responses in your domain
- Brady will integrate your response with other agents' work and report back to the user

`;

    // Generate Kiro-aware context prompt
    const kiroContextPrompt = generateKiroContextPrompt(taskType, context);
    const fullPrompt = `${bradyContext}${kiroContextPrompt}\n\nTASK DELEGATED BY BRADY:\n${prompt}`;

    // Validate any git commands in the prompt
    const gitValidation = validateGitCommand(prompt);
    if (!gitValidation.valid) {
      return this.createResponse(
        false,
        "",
        0,
        0,
        `Git safety violation: ${gitValidation.error}`,
      );
    }

    return this.execute(fullPrompt, context);
  }

  /**
   * Get Kiro-specific guidelines for this agent's specialties
   */
  getKiroGuidelines(): string[] {
    const guidelines: string[] = [];

    // Add general guidelines
    guidelines.push(...this.kiroGuidelines.gitSafety.safeCommands);
    guidelines.push(...this.kiroGuidelines.codeQuality.typescript);
    guidelines.push(...this.kiroGuidelines.communication.clarity);

    // Add specialty-specific guidelines
    if (this.capabilities.specialties.includes("debugging")) {
      guidelines.push(...this.kiroGuidelines.codeQuality.errorHandling);
    }
    if (this.capabilities.specialties.includes("documentation")) {
      guidelines.push(...this.kiroGuidelines.documentation.formatting);
    }
    if (this.capabilities.specialties.includes("architecture")) {
      guidelines.push(...this.kiroGuidelines.workflow.architecture);
    }

    return guidelines;
  }

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
