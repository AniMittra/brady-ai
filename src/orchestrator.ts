import * as fs from "fs";
import * as path from "path";
import {
  Task,
  AgentResponse,
  OrchestrationPlan,
  OrchestrationStep,
} from "./types.js";
import { KimiAgent } from "./agents/kimi-agent.js";
import { ClaudeAgent } from "./agents/claude-agent.js";
import { GeminiAgent } from "./agents/gemini-agent.js";
import { GeminiProAgent } from "./agents/gemini-pro-agent.js";
import { ChatGPTAgent } from "./agents/chatgpt-agent.js";
import { PerplexityAgent } from "./agents/perplexity-agent.js";
import { QwenAgent } from "./agents/qwen-agent.js";
import { CodestralAgent } from "./agents/codestral-agent.js";
import { LlamaAgent } from "./agents/llama-agent.js";
import { PortkeyAgent } from "./agents/portkey-agent.js";
import { ContextLoader, ProjectContext } from "./context-loader.js";

export interface APIKeys {
  groq?: string;
  claude?: string;
  gemini?: string;
  openai?: string;
  perplexity?: string;
  openrouter?: string;
  portkey?: {
    apiKey: string;
    virtualKey: string;
    configs: {
      director: string;
      researcher: string;
      coder: string;
      quickSearch: string;
      simpleTasks: string;
      documenter: string;
    };
  };
}

export interface ModelConfig {
  model: string;
  provider:
    | "groq"
    | "openrouter"
    | "openai"
    | "gemini"
    | "claude"
    | "perplexity"
    | "portkey";
  priority: number;
}

export interface RoleConfig {
  [role: string]: {
    providers: {
      name: string;
      models: string[];
      priority: number;
    }[];
  };
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  cooldownSeconds: number;
}

export interface ModelPriorityConfig {
  roles: RoleConfig;
  rateLimits: {
    [provider: string]: RateLimitConfig;
  };
}

export interface TaskResult {
  results: AgentResponse[];
  totalCost: number;
  totalTime: number;
  summary: string;
}

export interface TaskHistory {
  task: Task;
  result: TaskResult;
  timestamp: Date;
}

class RateLimiter {
  private providerRequestTimestamps: Map<string, number[]> = new Map();
  private rateLimits: { [provider: string]: RateLimitConfig };
  private providerCooldownUntil: Map<string, number> = new Map();

  constructor(rateLimits: { [provider: string]: RateLimitConfig }) {
    this.rateLimits = rateLimits;
  }

  async wait(provider: string): Promise<{ allowed: boolean; reason: string }> {
    const now = Date.now();

    const cooldownUntil = this.providerCooldownUntil.get(provider);
    if (cooldownUntil && now < cooldownUntil) {
      const waitTime = ((cooldownUntil - now) / 1000).toFixed(1);
      return {
        allowed: false,
        reason: `${provider} is in a cooldown period. Please wait ${waitTime}s.`,
      };
    }

    const limitConfig = this.rateLimits[provider];
    if (!limitConfig) {
      return { allowed: true, reason: "No rate limit configured." };
    }

    const timestamps = this.providerRequestTimestamps.get(provider) || [];
    const oneMinuteAgo = now - 60000;

    const recentTimestamps = timestamps.filter((ts) => ts > oneMinuteAgo);

    if (recentTimestamps.length >= limitConfig.requestsPerMinute) {
      this.enterCooldown(provider);
      const waitTime = limitConfig.cooldownSeconds;
      return {
        allowed: false,
        reason: `${provider} rate limit reached. Entering ${waitTime}s cooldown.`,
      };
    }

    recentTimestamps.push(now);
    this.providerRequestTimestamps.set(provider, recentTimestamps);

    return { allowed: true, reason: "Request allowed." };
  }

  enterCooldown(provider: string) {
    const limitConfig = this.rateLimits[provider];
    if (limitConfig) {
      const cooldownUntil = Date.now() + limitConfig.cooldownSeconds * 1000;
      this.providerCooldownUntil.set(provider, cooldownUntil);
      console.warn(
        `[RateLimiter] Cooldown initiated for ${provider} for ${limitConfig.cooldownSeconds} seconds.`,
      );
    }
  }
}

export class BradyAI {
  private agents: Map<string, any> = new Map();
  private taskHistory: TaskHistory[] = [];
  private modelConfig!: ModelPriorityConfig;
  private apiKeys: APIKeys;
  private rateLimiter!: RateLimiter;
  private contextLoader: ContextLoader;
  private projectContext: ProjectContext | null = null;
  private currentTaskProgress: {
    taskId: string;
    totalSteps: number;
    completedSteps: number;
    status: string;
  } | null = null;

  constructor(apiKeys: APIKeys, workingDirectory?: string) {
    this.apiKeys = apiKeys;
    this.contextLoader = new ContextLoader(workingDirectory || process.cwd());
    this.loadConfig();
    this.initializeAgents();
    this.loadProjectContext();
  }

  private async loadProjectContext() {
    try {
      console.log('[BradyAI] Loading project context and discovering MCP tools...');
      this.projectContext = await this.contextLoader.loadProjectContext();
      
      if (this.projectContext) {
        console.log(`[BradyAI] Context loaded: ${this.projectContext.mcpServers.length} MCP servers, ${this.projectContext.availableTools.length} tools`);
        if (this.projectContext.availableTools.length > 0) {
          console.log(`[BradyAI] Available MCP tools: ${this.projectContext.availableTools.join(', ')}`);
        }
        if (this.projectContext.overview !== 'No project context file found. Working in generic mode.') {
          console.log(`[BradyAI] Project: ${this.projectContext.overview.substring(0, 100)}...`);
        }
      } else {
        console.log('[BradyAI] No project context found, working in generic mode');
      }
    } catch (error) {
      console.error('[BradyAI] Error loading project context:', error);
    }
  }

  private loadConfig() {
    try {
      const configPath = path.resolve(process.cwd(), "model-priorities.json");
      const configFile = fs.readFileSync(configPath, "utf-8");
      this.modelConfig = JSON.parse(configFile);
      this.rateLimiter = new RateLimiter(this.modelConfig.rateLimits);
      console.log(
        "[Orchestrator] Loaded model priorities and rate limits from model-priorities.json",
      );
    } catch (error) {
      console.error(
        "[Orchestrator] CRITICAL: Could not load or parse model-priorities.json. Using fallback.",
        error,
      );
      this.modelConfig = {
        roles: {},
        rateLimits: {},
      };
      this.rateLimiter = new RateLimiter({});
    }
  }

  private initializeAgents() {
    const requiredProviders = new Set<string>();
    for (const role in this.modelConfig.roles) {
      this.modelConfig.roles[role].providers.forEach((p) =>
        requiredProviders.add(p.name),
      );
    }

    if (requiredProviders.has("groq") && this.apiKeys.groq) {
      this.agents.set("groq-qwen", new QwenAgent(this.apiKeys.groq));
      this.agents.set("groq-llama", new LlamaAgent(this.apiKeys.groq));
      this.agents.set("groq-kimi", new KimiAgent(this.apiKeys.groq));
    }
    if (requiredProviders.has("openrouter") && this.apiKeys.openrouter) {
      this.agents.set(
        "openrouter-kimi",
        new KimiAgent(this.apiKeys.openrouter),
      );
      this.agents.set(
        "openrouter-codestral",
        new CodestralAgent(this.apiKeys.openrouter),
      );
      this.agents.set(
        "openrouter-llama",
        new LlamaAgent(this.apiKeys.openrouter),
      );
    }
    if (requiredProviders.has("claude") && this.apiKeys.claude) {
      this.agents.set("claude", new ClaudeAgent(this.apiKeys.claude));
    }
    if (requiredProviders.has("gemini") && this.apiKeys.gemini) {
      this.agents.set("gemini-flash", new GeminiAgent(this.apiKeys.gemini));
      this.agents.set("gemini-pro", new GeminiProAgent(this.apiKeys.gemini));
    }
    if (requiredProviders.has("openai") && this.apiKeys.openai) {
      this.agents.set("openai-chatgpt", new ChatGPTAgent(this.apiKeys.openai));
    }
    if (requiredProviders.has("perplexity") && this.apiKeys.perplexity) {
      this.agents.set(
        "perplexity",
        new PerplexityAgent(this.apiKeys.perplexity),
      );
    }
    if (requiredProviders.has("portkey") && this.apiKeys.portkey) {
      this.agents.set(
        "portkey",
        new PortkeyAgent(
          this.apiKeys.portkey.apiKey,
          this.apiKeys.portkey.virtualKey,
          this.apiKeys.portkey.configs,
        ),
      );
    }
  }

  private getAgentForModel(provider: string, modelName: string): any {
    switch (provider) {
      case "groq":
        if (modelName.includes("qwen")) return this.agents.get("groq-qwen");
        if (modelName.includes("llama")) return this.agents.get("groq-llama");
        if (modelName.includes("kimi")) return this.agents.get("groq-kimi");
        break;
      case "openrouter":
        if (modelName.includes("kimi"))
          return this.agents.get("openrouter-kimi");
        if (modelName.includes("codestral"))
          return this.agents.get("openrouter-codestral");
        if (modelName.includes("llama"))
          return this.agents.get("openrouter-llama");
        break;
      case "openai":
        return this.agents.get("openai-chatgpt");
      case "perplexity":
        return this.agents.get("perplexity");
      case "portkey":
        return this.agents.get("portkey");
      case "gemini":
        if (modelName.includes("pro")) return this.agents.get("gemini-pro");
        return this.agents.get("gemini-flash");
      case "claude":
        return this.agents.get("claude");
    }
    console.warn(
      `[Orchestrator] No agent found for provider: ${provider}, model: ${modelName}`,
    );
    return null;
  }

  async executeTask(task: Task): Promise<TaskResult> {
    this.currentTaskProgress = {
      taskId: task.id,
      totalSteps: 0,
      completedSteps: 0,
      status: "Planning",
    };
    console.log(
      `[Orchestrator] Starting task: ${task.description} (ID: ${task.id})`,
    );
    try {
      const plan = await this.createPlan(task);
      this.currentTaskProgress.totalSteps = plan.steps.length;
      this.currentTaskProgress.status = "Executing";
      console.log(
        `[Orchestrator] Plan created with ${plan.steps.length} steps. Estimated cost: ${plan.estimatedCost.toFixed(4)}, time: ${plan.estimatedTime}`,
      );
      return await this.executePlan(plan, task);
    } catch (error) {
      this.currentTaskProgress.status = "Failed";
      console.error(`[Orchestrator] Error executing task ${task.id}:`, error);
      throw error;
    } finally {
      this.currentTaskProgress = null;
    }
  }

  async executePlan(plan: OrchestrationPlan, task: Task): Promise<TaskResult> {
    const startTime = Date.now();
    const results: AgentResponse[] = [];
    try {
      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        try {
          const result = await this.executeStep(step, task);
          results.push(result);
          if (this.currentTaskProgress) {
            this.currentTaskProgress.completedSteps++;
            const progress = (
              (this.currentTaskProgress.completedSteps /
                this.currentTaskProgress.totalSteps) *
              100
            ).toFixed(2);
            console.log(
              `[Orchestrator] Progress: ${progress}% - Completed step ${step.stepId}: ${step.action}`,
            );
          }
        } catch (error) {
          console.error(`[Orchestrator] Step ${step.stepId} failed:`, error);
          throw error;
        }
      }

      const totalTime = Date.now() - startTime;
      const totalCost = results.reduce(
        (sum, result) => sum + (result.metadata.cost || 0),
        0,
      );

      const summary = await this.generateSummary(task, results);

      const taskResult: TaskResult = {
        results,
        totalCost,
        totalTime,
        summary: summary.result,
      };

      this.taskHistory.push({
        task,
        result: taskResult,
        timestamp: new Date(),
      });

      console.log(`Task completed in ${(totalTime / 1000).toFixed(1)}s`);
      console.log(`Cost: ${totalCost.toFixed(6)}`);
      console.log(`Steps: ${results.length}`);

      const modelBreakdown = this.getModelBreakdown(results);
      if (modelBreakdown.length > 0) {
        console.log(`Models used: ${modelBreakdown.join(", ")}`);
      }
      return taskResult;
    } catch (error) {
      console.error(
        `[Orchestrator] Error executing plan for task ${task.id}:`,
        error,
      );
      throw error;
    }
  }

  private async executeStep(
    step: OrchestrationStep,
    task: Task,
  ): Promise<AgentResponse> {
    const role = step.agent;
    const roleConfig = this.modelConfig.roles[role];

    if (
      !roleConfig ||
      !roleConfig.providers ||
      roleConfig.providers.length === 0
    ) {
      throw new Error(`No models configured for role: ${role}`);
    }

    const prioritizedModels = roleConfig.providers
      .sort((a, b) => a.priority - b.priority)
      .flatMap((provider) =>
        provider.models.map((model) => ({
          model,
          provider: provider.name,
        })),
      );

    for (const modelInfo of prioritizedModels) {
      const providerName = modelInfo.provider;
      const modelName = modelInfo.model;

      const rateLimitCheck = await this.rateLimiter.wait(providerName);
      if (!rateLimitCheck.allowed) {
        console.warn(
          `[Orchestrator] Step ${step.stepId}: ${rateLimitCheck.reason} Skipping to next provider.`,
        );
        continue;
      }

      const agent = this.getAgentForModel(providerName, modelName);
      if (!agent) {
        console.warn(
          `[Orchestrator] No agent available for model ${modelName} on provider ${providerName}. Skipping.`,
        );
        continue;
      }

      try {
        console.log(
          `[Orchestrator] Attempting step ${step.stepId} with role ${role} using ${modelName} on ${providerName}`,
        );
        const result = await agent.execute(step.input, task.type);

        if (result.success) {
          const cost = result.metadata.cost || 0;
          console.log(
            `[Orchestrator] Step ${step.stepId} completed -> ${modelName} (${providerName}) | Cost: ${cost.toFixed(6)}`,
          );
          return result;
        } else {
          const reason = result.result || result.error || "Unknown failure";
          console.warn(
            `[Orchestrator] Step ${step.stepId} failed with ${modelName} on ${providerName}. Reason: ${reason}. Trying next model.`,
          );
        }
      } catch (error: any) {
        const errorMsg = error?.message || error?.toString() || "Unknown error";
        console.error(
          `[Orchestrator] Step ${step.stepId} threw an error with ${modelName} on ${providerName}: ${errorMsg}`,
        );
        if (
          error.message &&
          (error.message.includes("rate_limit_exceeded") ||
            error.message.includes("429"))
        ) {
          this.rateLimiter.enterCooldown(providerName);
        }
      }
    }

    throw new Error(
      `[Orchestrator] All models for role ${role} failed to execute step ${step.stepId}`,
    );
  }

  private async createPlan(task: Task): Promise<OrchestrationPlan> {
    const planPrompt = `CRITICAL: You MUST respond with ONLY valid JSON. No explanations, no markdown, no additional text.\n\nYou are an AI code orchestrator. Create a parallel execution plan for the following task.\n\n**Task:**\n- **Type:** ${task.type}\n- **Description:** ${task.description}\n- **Context:** ${task.context || "None"}\n- **Priority:** ${task.priority}\n\n**Available Roles:**\n${Object.keys(
      this.modelConfig.roles,
    )
      .map((role) => `- **${role}**: ${this.getRoleCapabilities(role)}`)
      .join(
        "\n",
      )}\n\n**Role Assignment Guidelines:**\n- Use "researcher" for tasks requiring current information, web search, or real-time data\n- Use "coder" for writing, implementing, or creating code\n- Use "optimizer" for performance analysis, debugging, or improving existing code\n- Use "documenter" for writing documentation, explanations, or tutorials\n- Use "reviewer" for code review, quality assurance, or feedback\n- Use "summarizer" for condensing information or extracting key insights\n\n**Instructions:**\n1.  Break the task into logical, parallelizable steps.\n2.  Assign the MOST APPROPRIATE role for each step based on the guidelines above.\n3.  For research tasks, ALWAYS use the "researcher" role.\n4.  Define the input for each agent clearly.\n\n**RESPONSE FORMAT (JSON ONLY):**\n{"steps": [{"stepId": "1", "agent": "role-name", "action": "description", "input": "specific input", "expectedOutput": "expected result"}]}\n`;

    const directorStep: OrchestrationStep = {
      stepId: "0-plan",
      agent: "director",
      action: "Create orchestration plan",
      input: planPrompt,
      expectedOutput: "A valid JSON orchestration plan.",
    };

    const planResult = await this.executeStep(directorStep, task);

    if (!planResult.success) {
      throw new Error("Failed to create a plan. The director agent failed.");
    }

    return this.parsePlan(planResult.result, task);
  }

  private parsePlan(planText: string, task: Task): OrchestrationPlan {
    console.log("Raw plan response:", planText);

    try {
      let jsonString = "";
      const codeBlockMatch = planText.match(
        /```(?:json)?\s*(\{[\s\S]*?\})\s*```/,
      );
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1];
      } else {
        const simpleMatch = planText.match(/\{[\s\S]*\}/);
        if (simpleMatch) {
          jsonString = simpleMatch[0];
        }
      }

      if (!jsonString) {
        throw new Error("No JSON found in plan response");
      }

      const planData = JSON.parse(jsonString);

      if (!planData.steps || !Array.isArray(planData.steps)) {
        throw new Error(
          "Invalid plan structure: missing or invalid steps array",
        );
      }

      return {
        taskId: task.id,
        steps: planData.steps,
        estimatedCost: 0.01,
        estimatedTime: "30s",
        reasoning: "Auto-generated parallel plan",
      };
    } catch (error) {
      console.error("Error parsing plan:", error);
      console.log("Falling back to simple plan");

      return {
        taskId: task.id,
        steps: [
          {
            stepId: "1",
            agent: "coder",
            action: "Complete task",
            input: `Task: ${task.description}`,
            expectedOutput: "Task completion",
          },
        ],
        estimatedCost: 0.01,
        estimatedTime: "30s",
        reasoning: "Fallback single-step plan (JSON parsing failed)",
      };
    }
  }

  private async generateSummary(
    task: Task,
    results: AgentResponse[],
  ): Promise<AgentResponse> {
    const summaryPrompt = `Summarize the results of this task:
    
Task: ${task.description}
Results: ${results.map((r, i) => `Step ${i + 1} (${r.metadata.model}): ${r.result.substring(0, 200)}...`).join("\n")}\n\nProvide a concise summary of what was accomplished.`;

    const summaryStep: OrchestrationStep = {
      stepId: "final-summary",
      agent: "summarizer",
      action: "Generate task summary",
      input: summaryPrompt,
      expectedOutput: "A concise summary of the task results.",
    };

    const summaryRole = this.modelConfig.roles["summarizer"]
      ? "summarizer"
      : "director";
    summaryStep.agent = summaryRole;

    return this.executeStep(summaryStep, task);
  }

  getAvailableAgents(): string[] {
    return Array.from(this.agents.keys());
  }

  public getRoleCapabilities(role: string): string {
    const capabilities: Record<string, string> = {
      director:
        "Project planning, task coordination, and high-level decision making. Excellent at breaking down complex tasks.",
      coder:
        "Writing, implementing, and generating code in various languages. Fast execution and practical solutions.",
      researcher:
        "Real-time internet search, finding current information, analyzing trends, and gathering up-to-date data using online sources.",
      optimizer:
        "Performance analysis, code optimization, debugging, and improving efficiency of existing solutions.",
      documenter:
        "Writing clear documentation, explanations, tutorials, and user-friendly content.",
      summarizer:
        "Condensing information, creating summaries, and extracting key insights from complex data.",
      reviewer:
        "Code review, quality assurance, identifying issues, and providing constructive feedback.",
      "security-auditor":
        "Security vulnerability assessment, penetration testing analysis, secure coding practices, and threat modeling.",
      "database-architect":
        "Database design, schema optimization, query performance tuning, and data modeling for Convex and other databases.",
      "ui-designer":
        "User interface design, UX patterns, component architecture, and visual design using Shadcn UI and modern frameworks.",
      "devops-engineer":
        "Infrastructure automation, CI/CD pipelines, containerization, cloud deployment, and system reliability.",
      "api-architect":
        "RESTful API design, GraphQL schemas, API versioning, authentication patterns, and integration strategies.",
      "test-engineer":
        "Test automation, unit testing, integration testing, E2E testing with Playwright, and test strategy development.",
      "data-analyst":
        "Data analysis, metrics interpretation, user behavior analysis, and business intelligence insights.",
      "mobile-developer":
        "Mobile app development, responsive design, React Native patterns, and cross-platform solutions.",
      "content-strategist":
        "Content planning, copywriting, SEO optimization, content marketing strategies, and user engagement.",
      "accessibility-expert":
        "WCAG compliance, screen reader testing, accessible design patterns, and inclusive user experience design.",
    };

    const capability = capabilities[role] || `Handles ${role} tasks`;
    const models =
      this.modelConfig.roles[role]?.providers
        .flatMap((p) => p.models)
        .join(", ") || "No models configured";
    return `${capability} Models: ${models}`;
  }

  getTaskHistory(): TaskHistory[] {
    return this.taskHistory;
  }

  public getCurrentTaskProgress() {
    return this.currentTaskProgress;
  }

  private getModelBreakdown(results: AgentResponse[]): string[] {
    const modelCounts = new Map<string, number>();
    results.forEach((result) => {
      const model = result.metadata.model || "unknown";
      modelCounts.set(model, (modelCounts.get(model) || 0) + 1);
    });

    return Array.from(modelCounts.entries()).map(([model, count]) =>
      count > 1 ? `${model}(${count})` : model,
    );
  }

  public async askDirector(
    question: string,
    context?: string,
  ): Promise<AgentResponse> {
    // Include project context and MCP tools if available
    let fullContext = context || "None";
    
    if (this.projectContext) {
      const contextString = await this.contextLoader.generateContextString();
      fullContext = `${contextString}\n\nAdditional Context: ${context || "None"}`;
    }

    const prompt = `You are Brady AI, an intelligent development orchestrator. You coordinate multiple AI models to help with development tasks. When users interact with you directly, respond as Brady.

When you need to delegate tasks, you can say things like "Let me assign this to our UX Designer" and then report back with results like "UX Designer (Qwen via Groq) completed the task, here's the output."

Context: ${fullContext}

Question: ${question}`;
    const directQuestionStep: OrchestrationStep = {
      stepId: "direct-question",
      agent: "director",
      action: "Answer user question as Brady AI",
      input: prompt,
      expectedOutput: "A direct answer to the user's question as Brady.",
    };
    const task: Task = {
      id: "direct-ask",
      type: "direct-question",
      description: question,
      priority: "medium",
    };
    return this.executeStep(directQuestionStep, task);
  }

  public async executeTaskWithRole(
    userMessage: string,
    context: string,
    role: string,
  ): Promise<any> {
    // If Portkey is available and has configs, use it directly
    if (this.apiKeys.portkey && this.apiKeys.portkey.configs) {
      const portkeyAgent = this.agents.get("portkey");
      if (portkeyAgent) {
        try {
          console.log(`[Orchestrator] Using Portkey config for ${role}`);
          const result = await portkeyAgent.execute(userMessage, role);

          if (result.success) {
            console.log(
              `[Orchestrator] Step completed -> ${result.metadata.model} (portkey) | Cost: ${result.metadata.cost.toFixed(6)}`,
            );
            return result;
          }
        } catch (error: any) {
          console.warn(
            `[Orchestrator] Portkey failed for ${role}: ${error.message}`,
          );
        }
      }
    }

    // Fallback to original director logic
    return this.askDirector(userMessage, context);
  }
}
