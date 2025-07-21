#!/usr/bin/env node

import { MCPAIOrchestrator } from "./mcp-server.js";
import { config } from "dotenv";

// Load environment variables
config();

async function main() {
  const apiKeys = {
    groq: process.env.GROQ_API_KEY,
    claude: process.env.ANTHROPIC_API_KEY,
    gemini: process.env.GOOGLE_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    perplexity: process.env.PERPLEXITY_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
  };

  const server = new MCPAIOrchestrator(apiKeys);
  await server.start();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("❌ Server failed to start:", error);
    process.exit(1);
  });
}
