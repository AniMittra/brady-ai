#!/usr/bin/env node

import express, { Request, Response } from "express";
import cors from "cors";
import { BradyAI } from "./orchestrator.js";
import { Task, FileContentRequest, GitCommandRequest } from "./types.js";
import {
  readFileContent,
  writeFileContent,
  listDirectory,
  executeGitCommand,
} from "./file-system.js";
import { config } from "dotenv";

// Load environment variables
config();

const app = express();
const port = process.env.HTTP_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Initialize orchestrator
const apiKeys = {
  groq: process.env.GROQ_API_KEY,
  claude: process.env.ANTHROPIC_API_KEY,
  gemini: process.env.GOOGLE_API_KEY,
  openai: process.env.OPENAI_API_KEY,
  perplexity: process.env.PERPLEXITY_API_KEY,
  openrouter: process.env.OPENROUTER_API_KEY,
};

const orchestrator = new BradyAI(apiKeys);

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    availableAgents: orchestrator.getAvailableAgents(),
  });
});

// Get available agents
app.get("/agents", (req: Request, res: Response) => {
  try {
    const agents = orchestrator.getAvailableAgents();
    res.json({ success: true, agents });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get task history
app.get("/history", (req: Request, res: Response) => {
  try {
    const history = orchestrator.getTaskHistory();
    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get current task status
app.get("/status", (req: Request, res: Response) => {
  try {
    const status = orchestrator.getCurrentTaskProgress();
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// File System Endpoints

/**
 * List directory contents
 * GET /files?dir={path}&type={extension}
 */
app.get("/files", async (req: Request, res: Response) => {
  try {
    const dirPath = (req.query.dir as string) || ".";
    const fileTypeFilter = req.query.type as string;

    const contents = await listDirectory(dirPath, fileTypeFilter);

    res.json({
      success: true,
      directory: dirPath,
      contents,
      count: contents.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const statusCode =
      error instanceof Error && error.message.includes("not found") ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Read file content
 * GET /file?path={path}
 */
app.get("/file", async (req: Request, res: Response) => {
  try {
    const filePath = req.query.path as string;

    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: "File path is required",
      });
    }

    const result = await readFileContent(filePath);

    res.json({
      success: true,
      content: result.content,
      metadata: result.metadata,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const statusCode =
      error instanceof Error && error.message.includes("not found") ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Write file content
 * PUT /file?path={path}
 */
app.put("/file", async (req: Request, res: Response) => {
  try {
    const filePath = req.query.path as string;
    const { content } = req.body as FileContentRequest;

    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: "File path is required",
      });
    }

    if (typeof content !== "string") {
      return res.status(400).json({
        success: false,
        error: "File content must be a string",
      });
    }

    const metadata = await writeFileContent(filePath, content);

    console.log(`📝 File written: ${filePath} (${metadata.size} bytes)`);

    res.json({
      success: true,
      metadata,
      message: `File ${filePath} written successfully`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const statusCode =
      error instanceof Error && error.message.includes("not allowed")
        ? 403
        : 500;
    res.status(statusCode).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Execute git commands
 * POST /git
 */
app.post("/git", async (req: Request, res: Response) => {
  try {
    const { command, args = [] } = req.body as GitCommandRequest;

    if (!command) {
      return res.status(400).json({
        success: false,
        error: "Git command is required",
      });
    }

    const result = await executeGitCommand(command, args);

    if (result.success) {
      console.log(`🔧 Git command executed: ${result.command}`);
    } else {
      console.log(`❌ Git command failed: ${result.command} - ${result.error}`);
    }

    res.json({
      success: result.success,
      command: result.command,
      output: result.output,
      error: result.error,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

// Execute development task
app.post("/execute-task", async (req: Request, res: Response) => {
  try {
    const { type, description, context, priority, files, requirements } =
      req.body;

    // Validate required fields
    if (!description) {
      return res.status(400).json({
        success: false,
        error: "Task description is required",
      });
    }

    // Create task object
    const task: Task = {
      id: `http-task-${Date.now()}`,
      type: type || "code",
      description,
      context,
      priority: priority || "medium",
      files,
      requirements,
    };

    console.log(
      `🎯 Executing ${task.type} task: ${task.description.substring(0, 100)}...`,
    );

    const startTime = Date.now();
    const result = await orchestrator.executeTask(task);
    const duration = Date.now() - startTime;

    console.log(
      `✅ Task completed in ${duration}ms - Cost: $${result.totalCost.toFixed(4)}`,
    );

    res.json({
      success: true,
      task,
      result,
      duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Task execution failed:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`🚀 AI Development Orchestrator HTTP Server`);
  console.log(`📡 Server running on http://localhost:${port}`);
  console.log(
    `🤖 Available agents: ${orchestrator.getAvailableAgents().join(", ")}`,
  );
  console.log(`\n📚 API Endpoints:`);
  console.log(`  GET  /health        - Health check`);
  console.log(`  GET  /agents        - List available agents`);
  console.log(`  GET  /history       - Get task history`);
  console.log(`  GET  /status        - Get current task status`);
  console.log(`  POST /execute-task  - Execute development task`);
  console.log(`\n📁 File System Endpoints:`);
  console.log(`  GET  /file?path=... - Read file content`);
  console.log(`  PUT  /file?path=... - Write file content`);
  console.log(`  GET  /files?dir=... - List directory contents`);
  console.log(`  POST /git           - Execute git commands`);
  console.log(`\n💡 Example usage:`);
  console.log(`  curl -X POST http://localhost:${port}/execute-task \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(
    `    -d '{"type": "code", "description": "Create a hello world function"}'`,
  );
  console.log(`\n  curl "http://localhost:${port}/file?path=src/lib/utils.ts"`);
  console.log(
    `  curl -X PUT "http://localhost:${port}/file?path=src/lib/newFile.ts" \\`,
  );
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"content": "export const hello = () => \\"world\\""}'`);
  console.log("");
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Shutting down HTTP server...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n👋 Shutting down HTTP server...");
  process.exit(0);
});
