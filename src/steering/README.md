# Kiro IDE Guidelines Integration

This directory contains the integration of Kiro IDE's behavioral guidelines into the MCP orchestrator agents.

## Overview

The Kiro guidelines ensure all AI agents follow consistent patterns for:

- **Git Safety**: Preventing invalid path issues (no ./ prefixes)
- **Code Quality**: TypeScript, React, and Convex best practices
- **Documentation**: Consistent formatting and maintenance
- **Workflow**: Proper branching, testing, and architecture
- **Communication**: Clear commit messages and problem-solving

## Usage

All agents now inherit Kiro-aware behavior through:

1. **Base Agent Integration**: `BaseAgent` class includes Kiro guidelines
2. **Context-Aware Prompts**: Task-specific guidelines are injected
3. **Git Command Validation**: Automatic validation of git operations
4. **Specialty Guidelines**: Each agent gets relevant guidelines for their expertise

## Key Features

### Git Safety Validation
```typescript
const validation = validateGitCommand("git add ./file.txt");
// Returns: { valid: false, error: "Forbidden git pattern detected..." }
```

### Kiro-Aware Execution
```typescript
const result = await agent.executeWithKiroGuidelines(
  prompt,
  taskType,
  context
);
```

### Guidelines by Agent Type
- **Claude**: Architecture, reasoning, complex analysis guidelines
- **Gemini**: Optimization, debugging, performance guidelines  
- **ChatGPT**: Documentation, UX, prototyping guidelines
- **Perplexity**: Research, best practices guidelines

## Integration Points

1. **System Prompts**: All agents include Kiro guidelines in their system prompts
2. **Task Routing**: Orchestrator uses Kiro-aware execution methods
3. **Validation**: Git commands are validated before execution
4. **Context**: Task-specific guidelines are provided based on task type

This ensures all AI agents in the orchestrator follow the same high standards and behavioral patterns established by Kiro IDE.