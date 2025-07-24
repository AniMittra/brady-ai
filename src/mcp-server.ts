import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { BradyAI, APIKeys } from "./orchestrator.js";
import { Task, TaskSchema } from "./types.js";
import {
  FileSystemManager,
  createFileSystemConfig,
  FileOperation,
} from "./file-system/index.js";
import { promises as fs } from "fs";

export class MCPAIOrchestrator {
  private server: Server;
  private orchestrator: BradyAI;
  private fileSystemManager: FileSystemManager;

  constructor(apiKeys: APIKeys) {
    this.orchestrator = new BradyAI(apiKeys, process.cwd());
    this.fileSystemManager = new FileSystemManager(createFileSystemConfig());
    this.server = new Server(
      {
        name: "ai-dev-orchestrator",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.setupTools();
  }

  private setupTools() {
    // Tool: Execute development task
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "execute_dev_task",
            description:
              "Execute a development task using a role-based AI orchestrator.",
            inputSchema: {
              type: "object",
              properties: {
                description: {
                  type: "string",
                  description: "Description of the development task to execute",
                },
                type: {
                  type: "string",
                  enum: [
                    "code",
                    "debug",
                    "document",
                    "research",
                    "optimize",
                    "test",
                    "architecture",
                    "security",
                    "database",
                    "ui-design",
                    "devops",
                    "api-design",
                    "mobile",
                    "data-analysis",
                    "content",
                    "accessibility",
                    "performance",
                    "integration",
                  ],
                  description: "Type of development task",
                },
                context: {
                  type: "string",
                  description: "Additional context for the task (optional)",
                },
                priority: {
                  type: "string",
                  enum: ["low", "medium", "high", "urgent"],
                  description: "Task priority level",
                  default: "medium",
                },
                files: {
                  type: "array",
                  items: { type: "string" },
                  description: "List of relevant files (optional)",
                },
              },
              required: ["description", "type"],
            },
          },
          {
            name: "get_agent_status",
            description:
              "Get status and capabilities of all available AI agents",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "get_task_history",
            description: "Get history of executed tasks",
            inputSchema: {
              type: "object",
              properties: {
                limit: {
                  type: "number",
                  description: "Maximum number of tasks to return",
                  default: 10,
                },
              },
            },
          },
          {
            name: "ask_director",
            description: "Ask the director a direct question for guidance",
            inputSchema: {
              type: "object",
              properties: {
                question: {
                  type: "string",
                  description: "Question to ask the director role",
                },
                context: {
                  type: "string",
                  description: "Additional context for the question",
                },
              },
              required: ["question"],
            },
          },
          {
            name: "execute_plan",
            description: "Executes a pre-defined orchestration plan",
            inputSchema: {
              type: "object",
              properties: {
                plan: {
                  type: "object",
                  description: "A valid OrchestrationPlan JSON object",
                },
                task: {
                  type: "object",
                  description: "The original task associated with the plan",
                },
              },
              required: ["plan", "task"],
            },
          },
          {
            name: "write_file",
            description: "Create or update a file with content",
            inputSchema: {
              type: "object",
              properties: {
                path: {
                  type: "string",
                  description: "File path relative to workspace",
                },
                content: {
                  type: "string",
                  description: "File content",
                },
                encoding: {
                  type: "string",
                  enum: ["utf8", "base64"],
                  default: "utf8",
                },
                createDirs: {
                  type: "boolean",
                  default: true,
                },
              },
              required: ["path", "content"],
            },
          },
          {
            name: "read_file",
            description: "Read file content",
            inputSchema: {
              type: "object",
              properties: {
                path: {
                  type: "string",
                  description: "File path to read",
                },
                encoding: {
                  type: "string",
                  enum: ["utf8", "base64"],
                  default: "utf8",
                },
              },
              required: ["path"],
            },
          },
          {
            name: "delete_file",
            description: "Delete a file",
            inputSchema: {
              type: "object",
              properties: {
                path: {
                  type: "string",
                  description: "File path to delete",
                },
                backup: {
                  type: "boolean",
                  default: true,
                },
              },
              required: ["path"],
            },
          },
          {
            name: "process_ai_response",
            description:
              "Process an AI response for file operations and execute them",
            inputSchema: {
              type: "object",
              properties: {
                response: {
                  type: "string",
                  description:
                    "AI response text to process for file operations",
                },
                agentName: {
                  type: "string",
                  description: "Name of the agent that generated the response",
                  default: "unknown",
                },
              },
              required: ["response"],
            },
          },
        ] as Tool[],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "execute_dev_task": {
            const task: Task = {
              id: `task-${Date.now()}`,
              type: args?.type as Task["type"],
              description: args?.description as string,
              context: args?.context as string,
              priority: (args?.priority as Task["priority"]) || "medium",
              files: args?.files as string[],
              requirements: [],
            };

            // Validate task
            TaskSchema.parse(task);

            const result = await this.orchestrator.executeTask(task);

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      success: true,
                      task: task,
                      plan: "Generated plan", // TaskResult doesn't have plan property
                      summary: result.summary,
                      totalCost: result.totalCost,
                      totalTime: result.totalTime,
                      stepResults: result.results.map((r: any) => ({
                        success: r.success,
                        agent: r.metadata.model,
                        cost: r.metadata.cost,
                        duration: r.metadata.duration,
                        preview:
                          r.result.substring(0, 200) +
                          (r.result.length > 200 ? "..." : ""),
                      })),
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
          }

          case "execute_plan": {
            const plan = args?.plan as any;
            const task = args?.task as any;

            // A full implementation would have robust validation here
            if (!plan || !plan.steps || !task) {
              throw new Error("Invalid plan or task provided");
            }

            const result = await this.orchestrator.executePlan(plan, task);

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      success: true,
                      summary: result.summary,
                      totalCost: result.totalCost,
                      totalTime: result.totalTime,
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
          }

          case "get_agent_status": {
            const status = this.orchestrator.getAvailableAgents();
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      availableAgents: status,
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
          }

          case "get_task_history": {
            const limit = (args?.limit as number) || 10;
            const history = this.orchestrator.getTaskHistory().slice(-limit);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      taskCount: history.length,
                      tasks: history.map((h) => ({
                        id: h.task.id,
                        type: h.task.type,
                        description: h.task.description,
                        stepsExecuted: h.result.results.length,
                        totalCost: h.result.totalCost,
                        success: h.result.results.every((r: any) => r.success),
                      })),
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
          }

          case "ask_director": {
            const response = await this.orchestrator.askDirector(
              args?.question as string,
              args?.context as string,
            );

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      success: response.success,
                      response: response.result,
                      cost: response.metadata.cost,
                      duration: response.metadata.duration,
                      error: response.error,
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
          }

          case "write_file": {
            const operation: FileOperation = {
              type: "create",
              path: args?.path as string,
              content: args?.content as string,
              encoding: (args?.encoding as "utf8" | "base64") || "utf8",
              createDirs: args?.createDirs !== false,
            };

            const result =
              await this.fileSystemManager.executeOperation(operation);

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      success: result.success,
                      path: result.path,
                      bytesWritten: result.bytesWritten,
                      backupPath: result.backupPath,
                      duration: result.duration,
                      error: result.error,
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
          }

          case "read_file": {
            try {
              const content = await (fs.readFile as any)(
                args?.path as string,
                args?.encoding || "utf8",
              );

              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify(
                      {
                        success: true,
                        path: args?.path,
                        content: content,
                        encoding: args?.encoding || "utf8",
                      },
                      null,
                      2,
                    ),
                  },
                ],
              };
            } catch (error) {
              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify(
                      {
                        success: false,
                        path: args?.path,
                        error:
                          error instanceof Error
                            ? error.message
                            : "Unknown error",
                      },
                      null,
                      2,
                    ),
                  },
                ],
              };
            }
          }

          case "delete_file": {
            const operation: FileOperation = {
              type: "delete",
              path: args?.path as string,
              backup: args?.backup !== false,
            };

            const result =
              await this.fileSystemManager.executeOperation(operation);

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      success: result.success,
                      path: result.path,
                      backupPath: result.backupPath,
                      duration: result.duration,
                      error: result.error,
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
          }

          case "process_ai_response": {
            const response = args?.response as string;
            const agentName = (args?.agentName as string) || "unknown";

            const result = await this.fileSystemManager.processResponse(
              response,
              agentName,
            );

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      success: result.successCount > 0,
                      successCount: result.successCount,
                      failureCount: result.failureCount,
                      operations: result.operations.map((op) => ({
                        success: op.success,
                        path: op.path,
                        operation: op.operation.type,
                        duration: op.duration,
                        bytesWritten: op.bytesWritten,
                        error: op.error,
                      })),
                      totalDuration: result.totalDuration,
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: false,
                  error:
                    error instanceof Error ? error.message : "Unknown error",
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("🚀 AI Development Orchestrator MCP Server started");
  }
}
