#!/usr/bin/env node

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

async function checkBradyHealth(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:3002/health');
    return response.ok;
  } catch {
    return false;
  }
}

async function findBradyDirectory(): Promise<string | null> {
  const possiblePaths = [
    process.cwd(), // Current directory
    path.join(process.cwd(), 'brady-ai'),
    path.join(process.cwd(), '..', 'brady-ai'),
    path.join(process.cwd(), '..', '..', 'brady-ai'),
    path.join(process.env.HOME || '~', 'brady-ai'),
    path.join(process.env.HOME || '~', 'Dev', 'brady-ai'),
    __dirname, // Where this script is located
    path.join(__dirname, '..'), // Parent of src directory
  ];

  for (const dir of possiblePaths) {
    try {
      const packageJsonPath = path.join(dir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        if (packageJson.name === 'brady-ai' && packageJson.scripts?.brady) {
          return dir;
        }
      }
    } catch {
      // Continue checking other paths
    }
  }

  return null;
}

async function startBradyServer(): Promise<void> {
  console.log('🚨 Brady API is not running. Starting it now...');
  
  const bradyDir = await findBradyDirectory();
  
  if (!bradyDir) {
    console.error('❌ Could not find brady-ai directory. Please ensure brady-ai is installed.');
    process.exit(1);
  }

  console.log(`📁 Found Brady at ${bradyDir}, starting server...`);
  
  // Start Brady server in the background
  const bradyProcess = spawn('npm', ['run', 'brady'], {
    cwd: bradyDir,
    detached: true,
    stdio: 'ignore'
  });

  bradyProcess.unref();
  console.log(`🚀 Brady server started with PID ${bradyProcess.pid}`);

  // Wait for server to be ready
  console.log('⏳ Waiting for Brady to start...');
  let attempts = 0;
  const maxAttempts = 30; // 30 seconds max wait

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (await checkBradyHealth()) {
      console.log('✅ Connected to Brady API');
      return;
    }
    attempts++;
  }

  console.error('❌ Failed to start Brady server. Please check the logs.');
  process.exit(1);
}

async function main() {
  // Check if Brady is already running
  if (!(await checkBradyHealth())) {
    await startBradyServer();
  } else {
    console.log('✅ Connected to Brady API');
  }

  // Parse arguments
  const args = process.argv.slice(2);
  let specName = '';
  const aiderArgs: string[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--spec' && i + 1 < args.length) {
      specName = args[i + 1];
      i++; // Skip the next argument
    } else {
      aiderArgs.push(args[i]);
    }
  }

  // Build aider command
  const aiderCmd = [
    'aider',
    '--openai-api-base', 'http://localhost:3002/v1',
    '--openai-api-key', 'brady-local',
    '--model', 'openai/brady-director',
    '--no-show-model-warnings',
    ...aiderArgs
  ];

  // Execute aider
  const aiderProcess = spawn(aiderCmd[0], aiderCmd.slice(1), {
    stdio: 'inherit',
    cwd: process.cwd()
  });

  aiderProcess.on('exit', (code) => {
    process.exit(code || 0);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Brady CLI error:', error);
    process.exit(1);
  });
}