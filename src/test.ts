#!/usr/bin/env node

import { BradyAI } from "./orchestrator.js";
import { Task } from "./types.js";
import { config } from "dotenv";

config();

async function testOrchestrator() {
  console.log("🧪 Testing AI Development Orchestrator\n");

  const apiKeys = {
    groq: process.env.GROQ_API_KEY || "",
    claude: process.env.ANTHROPIC_API_KEY,
    gemini: process.env.GOOGLE_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    perplexity: process.env.PERPLEXITY_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
  };

  if (!apiKeys.groq || !apiKeys.openrouter) {
    console.error(
      "❌ GROQ_API_KEY and OPENROUTER_API_KEY are required for testing",
    );
    process.exit(1);
  }

  const orchestrator = new BradyAI(apiKeys);

  // Test 1: Role Capabilities
  console.log("1️⃣ Testing role capabilities...");
  const rolesToTest = ["director", "coder", "researcher", "summarizer"];
  console.log(`✅ Testing capabilities for roles: ${rolesToTest.join(", ")}`);

  for (const roleName of rolesToTest) {
    try {
      const capabilities = orchestrator.getRoleCapabilities(roleName);
      console.log(`   - ${roleName}: ${capabilities}`);
    } catch (e: any) {
      console.error(
        `   - Error getting capabilities for ${roleName}: ${e.message}`,
      );
    }
  }
  console.log(
    `✅ Found ${orchestrator.getAvailableAgents().length} available agents initialized.`,
  );

  // Test 2: Simple Task with Parallelism
  console.log("\n2️⃣ Testing simple task execution with parallelism...");
  const simpleTask: Task = {
    id: "test-1",
    type: "code",
    description:
      "Create a simple hello world function in Python and a thank you message in a separate file.",
    priority: "medium",
  };

  try {
    const result = await orchestrator.executeTask(simpleTask);
    console.log(`✅ Task completed successfully`);
    console.log(`💰 Cost: ${result.totalCost.toFixed(4)}`);
    console.log(`⏱️  Time: ${result.totalTime}ms`);
    console.log(`📊 Steps: ${result.results.length}`);
    result.results.forEach((res) => {
      console.log(
        `   - Agent: ${res.metadata.model}, Success: ${res.success}` +
          (res.error ? `, Error: ${res.error}` : ""),
      );
    });
    console.log(`📝 Summary preview: ${result.summary.substring(0, 100)}...`);
  } catch (error) {
    console.error(
      `❌ Task failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // Test 3: Direct Director Query
  console.log("\n3️⃣ Testing direct Director interaction...");
  try {
    const directorResponse = await orchestrator.askDirector(
      "What are the key principles for effective AI agent orchestration?",
    );

    if (directorResponse.success) {
      console.log(`✅ Director responded successfully`);
      console.log(`💰 Cost: ${directorResponse.metadata.cost.toFixed(6)}`);
      console.log(`⏱️  Duration: ${directorResponse.metadata.duration}ms`);
      console.log(
        `📝 Response preview: ${directorResponse.result.substring(0, 150)}...`,
      );
    } else {
      console.error(
        `❌ Director failed: ${directorResponse.error || "Unknown error"}`,
      );
    }
  } catch (error) {
    console.error(
      `❌ Direct query failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // Test 4: OpenAI Agent Verification
  if (apiKeys.openai) {
    console.log("\n4️⃣ Verifying OpenAI (ChatGPT) Agent...");
    const openAITask: Task = {
      id: "test-openai",
      type: "document",
      description: "Write a short poem about coding.",
      priority: "low",
    };
    try {
      const result = await orchestrator.executeTask(openAITask);
      console.log(`✅ OpenAI task completed.`);
      console.log(`   - Summary: ${result.summary}`);
    } catch (error) {
      console.error(
        `❌ OpenAI task failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Test 5: Task History
  console.log("\n5️⃣ Testing task history...");
  const history = orchestrator.getTaskHistory();
  console.log(`✅ Task history contains ${history.length} tasks`);

  console.log("\n🎉 Testing complete!");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testOrchestrator().catch(console.error);
}
