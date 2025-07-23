# Brady Context Discovery Example

This shows how a project would configure Brady context using a `brady.md` file.

## Example `brady.md` in project root:

```markdown
# Brady AI Context - BundleMind Project

## Project Overview
This is a content organization MVP built with React, TypeScript, and Convex.

## Context Files
Brady should read these files for full project context:

### Core Documentation
- `README.md` - Project overview and setup
- `docs/PRD.md` - Product requirements and vision
- `docs/DEVELOPMENT_GUIDE.md` - Development guidelines

### Technical Context  
- `convex/schema.ts` - Database schema
- `src/types/` - TypeScript type definitions
- `package.json` - Dependencies and scripts

### Guidelines
- `.github/CONTRIBUTING.md` - Contribution guidelines
- `docs/CODING_STANDARDS.md` - Code style and patterns

## Model Preferences
For this project, prefer:
- **Coder tasks**: Use fast models (Groq Llama) for quick iterations
- **Architecture decisions**: Use reasoning models (GPT-4, Claude)
- **Documentation**: Use balanced models (GPT-4o-mini)

## Project-Specific Instructions
- Follow React 18 patterns with hooks
- Use Convex for all database operations
- Maintain TypeScript strict mode
- Write tests for all new features
```

## MCP Tool Discovery

**CRITICAL**: Brady should ALWAYS start by discovering available MCP tools:

### Discovery Process
1. **Check for MCP config**: Look for `warp-mcp-config.json` 
2. **Query each server**: Send `tools/list` to discover capabilities
3. **Cache tool schemas**: Store for session use

### Expected MCP Tools
- **Vision**: `describe_image`, `describe_image_from_file` (image analysis)
- **Search**: `brave_web_search` (web research) 
- **Files**: `read_file`, `write_file`, `list_directory`
- **Dev**: `execute_command`, `git_operations`
- **Brady**: `orchestrate_task`, `get_task_status`

### Tool Priority
1. MCP tools (external, often more capable)
2. Built-in agent capabilities  
3. Manual implementation (last resort)

## How it works:
1. **MCP Discovery**: Query available MCP tools first
2. Brady looks for `brady.md` in current working directory
3. Parses the "Context Files" section
4. Loads all referenced files
5. Uses project-specific model preferences
6. Applies project-specific instructions