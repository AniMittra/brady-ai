# Brady CLI Auto-Start Debugging

## Goal
Create a global `brady-cli` command that can be run from any project directory and automatically:
1. Detect if Brady OpenAI API server is running on port 3002
2. If not running, automatically start Brady server in background
3. Launch aider with correct Brady connection parameters
4. Handle multiple projects using Brady simultaneously without port conflicts

## Current Status
- ✅ CLI works when Brady server is already running manually
- ❌ Auto-start feature may not be working properly
- ✅ CLI is globally installed via `npm link`
- ✅ Fixed ES module issues and entry point problems

## Architecture

### Brady Components
1. **MCP Server** (`dist/index.js`) - Model Context Protocol server
2. **OpenAI API Server** (`dist/openai-api-server.js`) - OpenAI-compatible HTTP API on port 3002
3. **CLI** (`dist/cli.js`) - Global command that auto-starts Brady and launches aider

### Environment Setup
- **BundleMind project** has Portkey API keys in `.env.local`
- **Brady** routes `brady-director` model to Kimi K2 via Portkey configs
- **Aider** connects to Brady using OpenAI-compatible API

## What We've Tried

### 1. Initial Problem
- User running `brady-cli` from BundleMind project got connection errors
- Aider was trying to connect to `openai/brady-director` but getting "Connection error"
- Brady server wasn't running on port 3002

### 2. Environment Issues Fixed
- Added missing Portkey config IDs to BundleMind `.env.local`:
  ```bash
  PORTKEY_CONFIG_DIRECTOR=pc-brady-director-kimi
  PORTKEY_CONFIG_RESEARCHER=pc-brady-researcher
  PORTKEY_CONFIG_CODER=pc-brady-coder
  PORTKEY_CONFIG_QUICK_SEARCH=pc-brady-quick-search
  PORTKEY_CONFIG_SIMPLE_TASKS=pc-brady-simple-tasks
  PORTKEY_CONFIG_DOCUMENTER=pc-brady-documenter
  ```

### 3. CLI Implementation Issues Fixed

#### ES Module Problems
- Fixed `__dirname` not available in ES modules:
  ```typescript
  import { fileURLToPath } from 'url';
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  ```

#### Entry Point Issues
- Removed problematic entry point check that prevented CLI from running via symlink:
  ```typescript
  // REMOVED: if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Brady CLI error:', error);
    process.exit(1);
  });
  ```

#### Port Conflict Prevention
- Modified CLI to detect existing Brady instance instead of always trying to start new one:
  ```typescript
  if (await checkBradyHealth()) {
    console.log('✅ Connected to existing Brady API');
  } else {
    await startBradyServer();
  }
  ```

### 4. Testing Results

#### What Works
- ✅ `node /Users/animittra/Dev/brady-ai/dist/cli.js "hello"` works perfectly
- ✅ Detects existing Brady server correctly
- ✅ Launches aider with correct parameters:
  ```bash
  aider --openai-api-base http://localhost:3002/v1 --openai-api-key brady-local --model openai/brady-director --no-show-model-warnings
  ```
- ✅ Aider connects to Brady successfully

#### What Needs Testing
- ❌ Auto-start feature when no Brady is running
- ❌ CLI working from symlink (`brady-cli` vs direct node execution)
- ❌ Multiple project scenario (VS Code + Terminal simultaneously)

## Current CLI Logic

### Brady Detection
```typescript
async function checkBradyHealth(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:3002/health');
    return response.ok;
  } catch {
    return false;
  }
}
```

### Brady Auto-Start
```typescript
async function startBradyServer(): Promise<void> {
  const bradyDir = await findBradyDirectory();
  const bradyProcess = spawn('npm', ['run', 'brady'], {
    cwd: bradyDir,
    detached: true,
    stdio: 'ignore'
  });
  bradyProcess.unref();
  // Wait for health check to pass...
}
```

### Directory Discovery
Searches these locations for brady-ai:
- Current directory
- `./brady-ai`, `../brady-ai`, `../../brady-ai`
- `~/brady-ai`, `~/Dev/brady-ai`
- `__dirname` and parent directories

## Known Issues

### 1. Auto-Start May Not Work
The `spawn('npm', ['run', 'brady'])` with `detached: true` and `stdio: 'ignore'` should start Brady in background, but:
- Process might not actually start
- Health check might timeout before Brady is ready
- npm process might exit but Brady server might not start

### 2. Symlink vs Direct Execution
- Direct execution works: `node dist/cli.js`
- Symlink execution unclear: `brady-cli`
- Entry point check was causing issues

### 3. Multiple Brady Instances
- User wants to run Brady in VS Code (Cline) AND Terminal (brady-cli)
- Both try to use port 3002
- Current solution: share same Brady instance
- Need to test if this actually works in practice

## Test Scenarios Needed

### 1. Auto-Start Test
```bash
# Kill all Brady processes
pkill -f "brady|openai-api-server"

# Verify port is free
lsof -i :3002

# Test auto-start from different directory
cd /Users/animittra/Dev/shifted_website
brady-cli "test message"

# Should see:
# 🚨 Brady API is not running. Starting it now...
# 📁 Found Brady at /path/to/brady-ai, starting server...
# 🚀 Brady server started with PID XXXX
# ⏳ Waiting for Brady to start...
# ✅ Connected to Brady API
# 🚀 Launching aider with Brady...
```

### 2. Multiple Project Test
```bash
# Terminal 1: Start Brady for VS Code
cd /Users/animittra/Dev/brady-ai
npm run brady

# Terminal 2: Use CLI from different project
cd /Users/animittra/Dev/shifted_website
brady-cli "test message"

# Should see:
# ✅ Connected to existing Brady API
# 🚀 Launching aider with Brady...
```

### 3. Symlink Test
```bash
# Test global command vs direct execution
cd /Users/animittra/Dev/shifted_website

# This works:
node /Users/animittra/Dev/brady-ai/dist/cli.js "test"

# This needs testing:
brady-cli "test"
```

## Files Modified

### package.json
```json
{
  "bin": {
    "brady-cli": "./dist/cli.js"
  },
  "scripts": {
    "install-cli": "npm run build && npm link"
  }
}
```

### src/cli.ts
- Added ES module compatibility
- Removed problematic entry point check
- Added verbose debugging output
- Implemented Brady directory discovery
- Added smart Brady detection vs auto-start

### BundleMind/.env.local
- Added missing Portkey configuration IDs

## Next Steps for Debugging

1. **Test auto-start feature** with no Brady running
2. **Verify symlink execution** works same as direct execution
3. **Test multiple project scenario** (VS Code + Terminal)
4. **Improve error handling** for failed Brady startup
5. **Add timeout/retry logic** for Brady health checks
6. **Consider alternative Brady startup methods** if npm spawn doesn't work

## Commands for Testing

```bash
# Install/update CLI
cd /Users/animittra/Dev/brady-ai
npm run install-cli

# Test from different directory
cd /Users/animittra/Dev/shifted_website
brady-cli "Give me a sit rep on the MVP"

# Check Brady status
curl http://localhost:3002/health
lsof -i :3002
ps aux | grep brady
```

## Expected Behavior
User should be able to run `brady-cli` from any project directory and it "just works" - automatically starting Brady if needed, connecting to existing Brady if available, and launching aider with proper configuration.