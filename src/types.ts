import { z } from 'zod';

// Task types for the orchestrator
export const TaskSchema = z.object({
  id: z.string(),
  type: z.enum([
    'code', 'debug', 'document', 'research', 'optimize', 'test', 'architecture', 'direct-question',
    'security', 'database', 'ui-design', 'devops', 'api-design', 'mobile',
    'data-analysis', 'content', 'accessibility', 'performance', 'integration'
  ]),
  description: z.string(),
  context: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  files: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
});

export type Task = z.infer<typeof TaskSchema>;

// A single step in the orchestration plan
export const OrchestrationStepSchema = z.object({
    stepId: z.string(),
    agent: z.string(),
    action: z.string(),
    input: z.string(),
    expectedOutput: z.string(),
    dependencies: z.array(z.string()).optional(),
  });

export type OrchestrationStep = z.infer<typeof OrchestrationStepSchema>;


// Orchestration plan
export const OrchestrationPlanSchema = z.object({
  taskId: z.string(),
  steps: z.array(OrchestrationStepSchema),
  estimatedCost: z.number(),
  estimatedTime: z.string(),
  reasoning: z.string(),
});

export type OrchestrationPlan = z.infer<typeof OrchestrationPlanSchema>;

// Agent response
export const AgentResponseSchema = z.object({
  success: z.boolean(),
  result: z.string(),
  metadata: z.object({
    tokensUsed: z.number(),
    cost: z.number(),
    duration: z.number(),
    model: z.string(),
  }),
  error: z.string().optional(),
});

export type AgentResponse = z.infer<typeof AgentResponseSchema>;

export interface AgentCapability {
  strengths: string[];
  weaknesses: string[];
  costPerToken: number;
  maxTokens: number;
  speed: string;
  specialties: string[];
}

export const CurrentTaskProgressSchema = z.object({
  taskId: z.string(),
  totalSteps: z.number(),
  completedSteps: z.number(),
  status: z.string(),
});

export type CurrentTaskProgress = z.infer<typeof CurrentTaskProgressSchema>;

// File system operation types
export const FileContentRequestSchema = z.object({
  content: z.string(),
});

export type FileContentRequest = z.infer<typeof FileContentRequestSchema>;

export const GitCommandRequestSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional().default([]),
});

export type GitCommandRequest = z.infer<typeof GitCommandRequestSchema>;