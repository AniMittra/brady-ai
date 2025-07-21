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

## How it works:
1. Brady looks for `brady.md` in current working directory
2. Parses the "Context Files" section
3. Loads all referenced files
4. Uses project-specific model preferences
5. Applies project-specific instructions