# Brady AI Context Discovery System

## Overview

Brady AI v1.1.0+ includes intelligent project context discovery that automatically understands any project without manual setup.

## How It Works

### Automatic Project Discovery

When Brady is used in a project directory (via `brady-cli`), it automatically:

1. **Scans for documentation files**: README.md, DOCS.md, STATUS.md, COMPLETION.md, etc.
2. **Analyzes project structure**: package.json, dependencies, project type detection
3. **Examines git repository**: Current branch, status, recent commits
4. **Generates brady.md**: Creates persistent context file for future use

### Context Sources

Brady discovers context from multiple sources:

#### Documentation Files (Priority Order)
- `README.md`, `readme.md`, `README.txt`
- `DOCS.md`, `docs.md`, `DOCUMENTATION.md`
- `PROJECT.md`, `OVERVIEW.md`, `ABOUT.md`
- `STATUS.md`, `PROGRESS.md`, `COMPLETION.md`, `CHANGELOG.md`
- Project-specific files (e.g., `BUNDLE_PREVIEW_COMPLETION.md`)

#### Project Analysis
- **package.json**: Name, description, dependencies
- **Project type detection**: React, Vue, Angular, Next.js, Convex, Node.js, etc.
- **Technology stack**: Automatically identified from dependencies

#### Git Repository Intelligence
- **Current branch** and working directory status
- **Recent commits** (last 5) for project history context
- **File status**: Modified, untracked, staged files
- **Repository health**: Clean vs dirty working directory

### MCP Tool Discovery

Brady also automatically discovers available MCP (Model Context Protocol) tools from:

1. **Warp MCP config** (`warp-mcp-config.json`)
2. **Kiro IDE configs** 
3. **Running HTTP processes** (port scanning)
4. **Generic configs** (`mcp.json`, `brady-mcp.json`, `.mcp.json`)
5. **Environment variables** (`MCP_SERVERS`)

## Usage

### Basic Usage
```bash
cd /path/to/your/project
brady-cli
```

Brady will automatically:
- Detect project type and context
- Load available MCP tools
- Generate `brady.md` for future use
- Be ready to answer project-specific questions

### Startup Logs (v1.1.0+)
```
[BradyAI v1.1.0] Starting in directory: /path/to/project
[ContextLoader] No brady.md found in /path/to/project
[ContextLoader] 🔍 Starting automatic project discovery...
[ContextLoader] ✅ Auto-discovered context from 3 files: README.md, package.json, STATUS.md
[ContextLoader] 📝 Generating brady.md file for future use...
```

### Manual Context File
You can also create a `brady.md` file manually:

```markdown
# Brady AI Project Context

## Project Overview
Brief description of your project

## Context Files
- README.md
- docs/architecture.md
- specs/requirements.md

## Instructions
- Focus on TypeScript best practices
- Use Convex for backend operations
- Follow existing code patterns

## Model Preferences
- director: Use GPT-4o for complex planning
- coder: Use Claude for implementation
```

## Project Type Detection

Brady automatically detects project types based on dependencies:

| Dependencies | Detected Type |
|-------------|---------------|
| `react`, `@types/react` | React Application |
| `vue`, `@vue/cli` | Vue Application |
| `angular`, `@angular/core` | Angular Application |
| `next`, `nextjs` | Next.js Application |
| `convex` | Convex Full-Stack Application |
| `express`, `fastify`, `koa` | Node.js Backend |
| `electron` | Electron Desktop Application |

## Global CLI Management

### Installation
```bash
cd /path/to/brady-ai
npm install -g .
```

### Auto-Updates
Brady automatically updates the global CLI when:
- Code changes are committed (via git hooks)
- Version is bumped (`npm version patch/minor/major`)
- Manual update: `npm run update-global`

### Manual Update
```bash
cd /path/to/brady-ai
./update-brady-global.sh
```

## Configuration

### Working Directory
Brady uses the current working directory (`process.cwd()`) for context discovery, not Brady's installation directory.

### MCP Discovery
Brady discovers MCP tools from multiple sources and makes them available to all conversations. See `docs/universal-mcp-discovery.md` for details.

## Troubleshooting

### Brady Not Finding Project Context
1. Ensure you're running `brady-cli` from the project directory
2. Check that documentation files exist (README.md, etc.)
3. Verify Brady version: Look for `[BradyAI v1.1.0+]` in startup logs
4. Update global CLI: `npm run update-global`

### Old Version Running
```bash
# Kill old processes
pkill -f brady

# Update global CLI
cd /path/to/brady-ai
./update-brady-global.sh

# Test in project
cd /path/to/your/project
brady-cli
```

### No Context Discovery Logs
Context discovery logs appear during Brady startup, not during conversation. Look for:
- `[BradyAI v1.1.0] Starting in directory: ...`
- `[ContextLoader] 🔍 Starting automatic project discovery...`

## Examples

### Successful Discovery
```
[BradyAI v1.1.0] Starting in directory: /Users/dev/my-react-app
[ContextLoader] No brady.md found in /Users/dev/my-react-app
[ContextLoader] 🔍 Starting automatic project discovery...
[ContextLoader] ✅ Auto-discovered context from 4 files: README.md, package.json, CHANGELOG.md, docs/setup.md
[ContextLoader] 📝 Generating brady.md file for future use...
[BradyAI] Context loaded: 13 MCP servers, 25 tools
[BradyAI] Available MCP tools: describe_image, brave_web_search, firecrawl_scrape, ...
[BradyAI] Project: Auto-discovered project context from README.md, package.json, CHANGELOG.md, docs/setup.md
```

### Using Generated Context
After first run, Brady will use the generated `brady.md`:
```
[BradyAI v1.1.0] Starting in directory: /Users/dev/my-react-app
[ContextLoader] Found brady.md, loading project context...
[BradyAI] Project: React Application - My Awesome App
```

## Version History

- **v1.1.0**: Added automatic project discovery and context generation
- **v1.0.0**: Basic Brady AI with manual context setup