#!/usr/bin/env node

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  console.log('🔧 Starting Brady server in background...');
  
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
  const maxAttempts = 15; // Reduced to 15 seconds

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`⏳ Attempt ${attempts + 1}/${maxAttempts}...`);
    if (await checkBradyHealth()) {
      console.log('✅ Connected to Brady API');
      return;
    }
    attempts++;
  }

  console.error('❌ Failed to start Brady server. Please check the logs.');
  process.exit(1);
}

async function generateBradyMd(projectDir: string): Promise<void> {
  const bradyPath = path.join(projectDir, 'brady.md');
  
  // Discover project information
  const packageJsonPath = path.join(projectDir, 'package.json');
  const readmePath = path.join(projectDir, 'README.md');
  
  let projectInfo = {
    name: path.basename(projectDir),
    type: 'Unknown',
    description: '',
    dependencies: [] as string[],
    scripts: [] as string[],
    files: [] as string[]
  };
  
  // Read package.json if it exists
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      projectInfo.name = packageJson.name || projectInfo.name;
      projectInfo.description = packageJson.description || '';
      
      // Detect project type from dependencies
      const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      projectInfo.dependencies = Object.keys(allDeps);
      
      if (allDeps.react) projectInfo.type = 'React Application';
      else if (allDeps.next) projectInfo.type = 'Next.js Application';
      else if (allDeps.vue) projectInfo.type = 'Vue.js Application';
      else if (allDeps.convex) projectInfo.type = 'Convex Application';
      else if (allDeps.express) projectInfo.type = 'Express.js Server';
      else if (allDeps.typescript) projectInfo.type = 'TypeScript Project';
      else if (packageJson.type === 'module') projectInfo.type = 'Node.js ES Module';
      else if (allDeps.node || packageJson.engines?.node) projectInfo.type = 'Node.js Project';
      
      projectInfo.scripts = Object.keys(packageJson.scripts || {});
    } catch (error) {
      console.warn('Error reading package.json:', error);
    }
  }
  
  // Read README.md for description if package.json doesn't have one
  if (!projectInfo.description && fs.existsSync(readmePath)) {
    try {
      const readmeContent = fs.readFileSync(readmePath, 'utf8');
      const firstParagraph = readmeContent.split('\n').find(line => 
        line.trim() && !line.startsWith('#') && !line.startsWith('!')
      );
      if (firstParagraph) {
        projectInfo.description = firstParagraph.trim();
      }
    } catch (error) {
      console.warn('Error reading README.md:', error);
    }
  }
  
  // Discover important files
  const importantFiles = [
    'README.md', 'package.json', 'tsconfig.json', 'convex.json',
    'src/index.ts', 'src/index.js', 'src/App.tsx', 'src/App.jsx',
    'pages/index.tsx', 'pages/index.js', 'app/page.tsx',
    'docs/', 'CONTRIBUTING.md', '.env.example'
  ];
  
  projectInfo.files = importantFiles.filter(file => {
    const fullPath = path.join(projectDir, file);
    return fs.existsSync(fullPath);
  });
  
  // Generate brady.md content
  const bradyContent = `# ${projectInfo.name}

## Project Overview
${projectInfo.description || `This is a ${projectInfo.type.toLowerCase()} located at ${projectDir}.`}

**Project Type**: ${projectInfo.type}

## Context Files
${projectInfo.files.map(file => `- \`${file}\``).join('\n')}

## Model Preferences
- **Coder tasks**: Use fast, efficient models for code generation
- **Complex reasoning**: Use advanced models for architecture decisions
- **Documentation**: Use balanced models for clear explanations

## Project-Specific Instructions
- Follow existing code patterns and conventions
- Maintain consistency with project structure
${projectInfo.scripts.includes('test') ? '- Run tests before making changes' : ''}
${projectInfo.scripts.includes('lint') ? '- Follow linting rules and formatting standards' : ''}
${projectInfo.dependencies.includes('typescript') ? '- Use TypeScript best practices and proper typing' : ''}
${projectInfo.dependencies.includes('react') ? '- Follow React best practices and hooks patterns' : ''}

## Available Scripts
${projectInfo.scripts.map(script => `- \`npm run ${script}\``).join('\n')}

## Key Dependencies
${projectInfo.dependencies.slice(0, 10).map(dep => `- ${dep}`).join('\n')}
${projectInfo.dependencies.length > 10 ? `- ... and ${projectInfo.dependencies.length - 10} more` : ''}

---
*This file was auto-generated by Brady CLI. You can edit it to customize your project context.*
`;

  // Write the file
  fs.writeFileSync(bradyPath, bradyContent, 'utf8');
}

async function main() {
  // Parse arguments first (needed for --no-generate flag)
  const args = process.argv.slice(2);
  let specName = '';
  const aiderArgs: string[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--spec' && i + 1 < args.length) {
      specName = args[i + 1];
      i++; // Skip the next argument
    } else if (args[i] !== '--no-generate') {
      aiderArgs.push(args[i]);
    }
  }

  console.log('');
  console.log('═'.repeat(80));
  console.log('🤖 BRADY CLI STARTUP');
  console.log('═'.repeat(80));
  
  // Show Brady CLI version
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    console.log(`🚀 Brady CLI v${packageJson.version}`);
  } catch (error) {
    console.log('🚀 Brady CLI (version unknown)');
  }

  // Check if Brady is already running
  if (await checkBradyHealth()) {
    console.log('✅ Connected to existing Brady API');
  } else {
    await startBradyServer();
  }

  // Show context loading information
  console.log(`📁 Working directory: ${process.cwd()}`);
  
  // Check for project context files
  const contextFiles = ['brady.md', 'README.md', 'package.json'];
  const foundFiles = contextFiles.filter(file => fs.existsSync(path.join(process.cwd(), file)));
  
  // Auto-generate brady.md if it doesn't exist (unless --no-generate flag is passed)
  const shouldGenerate = !args.includes('--no-generate') && !fs.existsSync(path.join(process.cwd(), 'brady.md'));
  
  if (shouldGenerate) {
    console.log('📝 No brady.md found, generating project context...');
    await generateBradyMd(process.cwd());
    foundFiles.push('brady.md');
    console.log('  ✅ Generated brady.md');
  }
  
  if (foundFiles.length > 0) {
    console.log('📋 Project context files found:');
    foundFiles.forEach(file => console.log(`  ✅ ${file}`));
  } else {
    console.log('📋 No project context files found (brady.md, README.md, package.json)');
  }
  
  console.log('═'.repeat(80));

  // Build aider command
  const aiderCmd = [
    'aider',
    '--openai-api-base', 'http://localhost:3002/v1',
    '--openai-api-key', 'brady-local',
    '--model', 'openai/brady-director',
    '--no-show-model-warnings',
    ...aiderArgs
  ];

  // Show final summary with delay so user can see it
  console.log('');
  console.log('═'.repeat(80));
  console.log('🚀 LAUNCHING AIDER WITH BRADY');
  console.log('═'.repeat(80));
  console.log('📝 Command:', aiderCmd.join(' '));
  console.log('');
  console.log('⏳ Starting in 3 seconds... (Press Ctrl+C to cancel)');
  
  // Give user time to see the startup information
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const aiderProcess = spawn(aiderCmd[0], aiderCmd.slice(1), {
    stdio: 'inherit',
    cwd: process.cwd()
  });

  aiderProcess.on('exit', (code) => {
    process.exit(code || 0);
  });
}

// Always run main when this file is executed directly
main().catch((error) => {
  console.error('❌ Brady CLI error:', error);
  process.exit(1);
});