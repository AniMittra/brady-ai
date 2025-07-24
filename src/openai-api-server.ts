#!/usr/bin/env node

import express, { Request, Response } from "express";
import cors from "cors";
import { BradyAI } from "./orchestrator.js";
import { config } from "dotenv";

// Load environment variables
config({ path: "../.env.local" });
config(); // Also load from .env if exists

const app = express();
const port = process.env.OPENAI_API_PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Initialize Brady orchestrator
const apiKeys = {
  groq: process.env.GROQ_API_KEY,
  claude: process.env.ANTHROPIC_API_KEY,
  gemini: process.env.GOOGLE_API_KEY,
  openai: process.env.OPENAI_API_KEY,
  perplexity: process.env.PERPLEXITY_API_KEY,
  openrouter: process.env.OPENROUTER_API_KEY,
  portkey:
    process.env.PORTKEY_API_KEY && process.env.PORTKEY_VIRTUAL_KEY
      ? {
          apiKey: process.env.PORTKEY_API_KEY,
          virtualKey: process.env.PORTKEY_VIRTUAL_KEY,
          configs: {
            director: process.env.PORTKEY_CONFIG_DIRECTOR || "",
            researcher: process.env.PORTKEY_CONFIG_RESEARCHER || "",
            coder: process.env.PORTKEY_CONFIG_CODER || "",
            quickSearch: process.env.PORTKEY_CONFIG_QUICK_SEARCH || "",
            simpleTasks: process.env.PORTKEY_CONFIG_SIMPLE_TASKS || "",
            documenter: process.env.PORTKEY_CONFIG_DOCUMENTER || "",
          },
        }
      : undefined,
};

const brady = new BradyAI(apiKeys, process.cwd());

// OpenAI-compatible types
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<any> | { text: string };
}

interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

interface ChatCompletionResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: "stop" | "length" | "content_filter";
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface ChatCompletionChunk {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: "assistant";
      content?: string;
    };
    finish_reason?: "stop" | "length" | "content_filter" | null;
  }>;
}

// Helper function to convert OpenAI messages to Brady context
function messagesToBradyContext(messages: ChatMessage[]): string {
  return messages
    .map((msg) => {
      let contentStr = "";
      if (typeof msg.content === "string") {
        contentStr = msg.content;
      } else if (Array.isArray(msg.content)) {
        // If content is an array, extract text from it
        contentStr = msg.content
          .filter(
            (item) =>
              typeof item === "string" ||
              (item && typeof item.text === "string"),
          )
          .map((item) => (typeof item === "string" ? item : item.text))
          .join(" ");
      } else if (
        msg.content &&
        typeof msg.content === "object" &&
        msg.content.text
      ) {
        contentStr = msg.content.text;
      } else {
        contentStr =
          typeof msg.content === "string"
            ? msg.content
            : JSON.stringify(msg.content) || "";
      }
      return `${msg.role.toUpperCase()}: ${contentStr}`;
    })
    .join("\n\n");
}

// Helper function to determine task type from conversation
function detectTaskType(messages: ChatMessage[]): string {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || !lastMessage.content) {
    return "simple-tasks";
  }

  // Handle both string and array content (Cline might send arrays)
  let contentStr = "";
  if (typeof lastMessage.content === "string") {
    contentStr = lastMessage.content.toLowerCase();
  } else if (Array.isArray(lastMessage.content)) {
    contentStr = lastMessage.content
      .filter(
        (item) =>
          typeof item === "string" || (item && typeof item.text === "string"),
      )
      .map((item) => (typeof item === "string" ? item : item.text))
      .join(" ")
      .toLowerCase();
  } else if (
    lastMessage.content &&
    typeof lastMessage.content === "object" &&
    lastMessage.content.text
  ) {
    contentStr = lastMessage.content.text.toLowerCase();
  }

  // Documentation tasks (check first - more specific)
  if (
    contentStr.includes("explain") ||
    contentStr.includes("what is") ||
    contentStr.includes("what are") ||
    contentStr.includes("describe") ||
    contentStr.includes("document") ||
    contentStr.includes("readme") ||
    contentStr.includes("guide") ||
    contentStr.includes("tutorial")
  ) {
    return "documenter";
  }

  // Coding tasks
  if (
    contentStr.includes("code") ||
    contentStr.includes("implement") ||
    contentStr.includes("function") ||
    contentStr.includes("python") ||
    contentStr.includes("javascript") ||
    contentStr.includes("typescript") ||
    (contentStr.includes("write") &&
      (contentStr.includes("script") || contentStr.includes("program")))
  ) {
    return "coder";
  }

  // Research tasks
  if (
    contentStr.includes("research") ||
    contentStr.includes("find out") ||
    contentStr.includes("latest") ||
    contentStr.includes("analyze") ||
    contentStr.includes("compare") ||
    contentStr.includes("investigate")
  ) {
    return "researcher";
  }

  // Quick search tasks
  if (
    contentStr.includes("what is") ||
    contentStr.includes("who is") ||
    contentStr.includes("when") ||
    contentStr.includes("where") ||
    contentStr.includes("how much") ||
    (contentStr.includes("quick") && contentStr.includes("search"))
  ) {
    return "quick-search";
  }

  // Simple tasks (default for basic questions)
  return "simple-tasks";
}

// Authentication middleware (optional)
function authenticateRequest(
  req: Request,
  res: Response,
  next: express.NextFunction,
) {
  const authHeader = req.headers.authorization;

  // For now, accept any Bearer token or no auth
  // In production, validate against your API keys
  if (authHeader && !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        message: "Invalid authentication format. Use Bearer token.",
        type: "invalid_request_error",
        code: "invalid_api_key",
      },
    });
  }

  next();
}

// List models endpoint
app.get("/v1/models", authenticateRequest, (req: Request, res: Response) => {
  res.json({
    object: "list",
    data: [
      {
        id: "brady-director",
        object: "model",
        created: Date.now(),
        owned_by: "brady-ai",
        permission: [],
        root: "brady-director",
        parent: null,
      },
    ],
  });
});

// Main chat completions endpoint
app.post(
  "/v1/chat/completions",
  authenticateRequest,
  async (req: Request, res: Response) => {
    try {
      const request: ChatCompletionRequest = req.body;

      // Validate request
      if (
        !request.messages ||
        !Array.isArray(request.messages) ||
        request.messages.length === 0
      ) {
        return res.status(400).json({
          error: {
            message: "Messages are required and must be a non-empty array",
            type: "invalid_request_error",
            code: "invalid_request",
          },
        });
      }

      const conversationId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const context = messagesToBradyContext(request.messages);
      const taskType = detectTaskType(request.messages);
      // Extract user message content safely
      const lastMessage = request.messages[request.messages.length - 1];
      let userMessage = "";
      if (lastMessage && lastMessage.content) {
        if (typeof lastMessage.content === "string") {
          userMessage = lastMessage.content;
        } else if (Array.isArray(lastMessage.content)) {
          userMessage = lastMessage.content
            .filter(
              (item) =>
                typeof item === "string" ||
                (item && typeof item.text === "string"),
            )
            .map((item) => (typeof item === "string" ? item : item.text))
            .join(" ");
        } else if (
          lastMessage.content &&
          typeof lastMessage.content === "object" &&
          lastMessage.content.text
        ) {
          userMessage = lastMessage.content.text;
        } else {
          userMessage =
            typeof lastMessage.content === "string"
              ? lastMessage.content
              : JSON.stringify(lastMessage.content);
        }
      }

      console.log(
        `🤖 Brady Chat: ${taskType} task - ${userMessage.substring(0, 100)}...`,
      );

      if (request.stream) {
        // Streaming response
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Cache-Control",
        });

        // Send initial chunk
        const initialChunk: ChatCompletionChunk = {
          id: conversationId,
          object: "chat.completion.chunk",
          created: Math.floor(Date.now() / 1000),
          model: request.model || "brady-director",
          choices: [
            {
              index: 0,
              delta: { role: "assistant" },
              finish_reason: null,
            },
          ],
        };

        res.write(`data: ${JSON.stringify(initialChunk)}\n\n`);

        try {
          // Execute Brady task with appropriate role
          console.log(
            `🤖 Brady processing: ${userMessage.substring(0, 50)}...`,
          );
          const result = await brady.executeTaskWithRole(
            userMessage,
            context,
            taskType,
          );
          if (result.error) console.error("❌ Brady error:", result.error);

          if (result.success && result.result) {
            // Add execution details to response
            const timestamp = new Date().toLocaleTimeString();
            const provider = result.metadata.model.includes("kimi")
              ? result.metadata.model.includes("groq")
                ? "groq"
                : "openrouter"
              : result.metadata.model.includes("gemini")
                ? "gemini"
                : result.metadata.model.includes("claude")
                  ? "claude"
                  : result.metadata.model.includes("gpt")
                    ? "openai"
                    : result.metadata.model.includes("perplexity")
                      ? "perplexity"
                      : "unknown";

            const responseText = `${result.result}

---
🧠 **Brady used Director role** • ${result.metadata.model} (${provider}) • ${timestamp}
💰 $${result.metadata.cost.toFixed(6)} • ⏱️ ${result.metadata.duration}ms • 🎯 ${result.metadata.tokensUsed} tokens`;
            const chunkSize = 50; // Characters per chunk

            for (let i = 0; i < responseText.length; i += chunkSize) {
              const chunk = responseText.slice(i, i + chunkSize);

              const streamChunk: ChatCompletionChunk = {
                id: conversationId,
                object: "chat.completion.chunk",
                created: Math.floor(Date.now() / 1000),
                model: request.model || "brady-director",
                choices: [
                  {
                    index: 0,
                    delta: { content: chunk },
                    finish_reason: null,
                  },
                ],
              };

              res.write(`data: ${JSON.stringify(streamChunk)}\n\n`);

              // Small delay for streaming effect
              await new Promise((resolve) => setTimeout(resolve, 50));
            }
          } else {
            // Error chunk
            const errorChunk: ChatCompletionChunk = {
              id: conversationId,
              object: "chat.completion.chunk",
              created: Math.floor(Date.now() / 1000),
              model: request.model || "brady-director",
              choices: [
                {
                  index: 0,
                  delta: {
                    content:
                      result.error ||
                      "Sorry, I encountered an error processing your request.",
                  },
                  finish_reason: null,
                },
              ],
            };

            res.write(`data: ${JSON.stringify(errorChunk)}\n\n`);
          }

          // Final chunk
          const finalChunk: ChatCompletionChunk = {
            id: conversationId,
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model: request.model || "brady-director",
            choices: [
              {
                index: 0,
                delta: {},
                finish_reason: "stop",
              },
            ],
          };

          res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
          res.write("data: [DONE]\n\n");
        } catch (error) {
          console.error("🚨 Streaming error:", error);
          console.error(
            "🚨 Error stack:",
            error instanceof Error ? error.stack : "No stack trace",
          );
          res.write(
            `data: {"error": "Internal server error: ${error instanceof Error ? error.message : "Unknown error"}"}\n\n`,
          );
          res.write("data: [DONE]\n\n");
        }

        res.end();
      } else {
        // Non-streaming response
        console.log(`🤖 Brady processing: ${userMessage.substring(0, 50)}...`);
        const result = await brady.executeTaskWithRole(
          userMessage,
          context,
          taskType,
        );
        if (result.error) console.error("❌ Brady error:", result.error);

        // Add execution details to response
        const timestamp = new Date().toLocaleTimeString();
        const provider = result.metadata?.model?.includes("kimi")
          ? result.metadata.model.includes("groq")
            ? "groq"
            : "openrouter"
          : result.metadata?.model?.includes("gemini")
            ? "gemini"
            : result.metadata?.model?.includes("claude")
              ? "claude"
              : result.metadata?.model?.includes("gpt")
                ? "openai"
                : result.metadata?.model?.includes("perplexity")
                  ? "perplexity"
                  : "unknown";

        const responseContent =
          result.success && result.result
            ? `${result.result}

---
🧠 **Brady used Director role** • ${result.metadata?.model || "unknown"} (${provider}) • ${timestamp}
💰 $${(result.metadata?.cost || 0).toFixed(6)} • ⏱️ ${result.metadata?.duration || 0}ms • 🎯 ${result.metadata?.tokensUsed || 0} tokens`
            : result.error ||
              "Sorry, I encountered an error processing your request.";

        const response: ChatCompletionResponse = {
          id: conversationId,
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: request.model || "brady-director",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: responseContent,
              },
              finish_reason: "stop",
            },
          ],
          usage: {
            prompt_tokens: Math.ceil(context.length / 4), // Rough estimate
            completion_tokens: Math.ceil(responseContent.length / 4),
            total_tokens: Math.ceil(
              (context.length + responseContent.length) / 4,
            ),
          },
        };

        res.json(response);
      }
    } catch (error) {
      console.error("Chat completion error:", error);
      res.status(500).json({
        error: {
          message: "Internal server error",
          type: "server_error",
          code: "internal_error",
        },
      });
    }
  },
);

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "brady-openai-api",
    version: "1.0.0",
  });
});

// Start server
app.listen(port, () => {
  console.log("🚀 Brady OpenAI-Compatible API Server");
  console.log(`📡 Server running on http://localhost:${port}`);
  console.log("🤖 Available endpoints:");
  console.log("  GET  /v1/models           - List available models");
  console.log(
    "  POST /v1/chat/completions - Chat completions (streaming & non-streaming)",
  );
  console.log("  GET  /health              - Health check");
  console.log("");
  console.log("💡 Example usage:");
  console.log("curl -X POST http://localhost:3002/v1/chat/completions \\");
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -H "Authorization: Bearer your-api-key" \\');
  console.log(
    '  -d \'{"model": "brady-director", "messages": [{"role": "user", "content": "Hello Brady!"}]}\'',
  );
  console.log("");
  console.log("🔗 Add to Gemini CLI or any OpenAI-compatible tool:");
  console.log(`  Base URL: http://localhost:${port}/v1`);
  console.log("  Model: brady-director");
});
