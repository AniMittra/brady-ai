# Brady AI MCP Integration Guide

## MCP Tool Discovery Protocol

Brady AI should automatically discover and utilize available MCP tools at the start of each session.

### Discovery Process

1. **Check for MCP Configuration**
   ```bash
   # Look for Warp MCP config
   cat warp-mcp-config.json | jq '.mcpServers | keys'
   ```

2. **Query Available Tools**
   ```json
   {"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}
   ```

3. **Cache Tool Schemas**
   Store tool names, parameters, and descriptions for session use.

### Current MCP Servers

**Vision Analysis** (`vision-gemini`):
- `describe_image(image: string, prompt?: string)` - Analyze base64 images
- `describe_image_from_file(filepath: string, prompt?: string)` - Analyze image files
- **Cost**: FREE (Google API)
- **Use for**: Screenshots, diagrams, UI mockups, error images

**Web Search** (`brave`):
- `brave_web_search(query: string, count?: number)` - Search the web
- **Cost**: FREE
- **Use for**: Research, current events, documentation lookup

**Brady Orchestration** (`bradyai`):
- `orchestrate_task(type: string, description: string, requirements?: string[])` - Task coordination
- `get_task_status(taskId: string)` - Check task progress
- `list_agents()` - Available AI agents
- **Use for**: Complex multi-step tasks, agent coordination

### Tool Priority

When multiple tools can accomplish the same task:

1. **MCP tools** (external, often more capable)
2. **Built-in agent capabilities** (internal Brady functions)
3. **Manual implementation** (last resort)

### Integration Examples

**Image Analysis Task**:
```typescript
// Check for vision MCP first
const visionTools = await discoverMCPTools('vision');
if (visionTools.includes('describe_image_from_file')) {
  return await callMCPTool('describe_image_from_file', {
    filepath: imagePath,
    prompt: 'Analyze this technical diagram'
  });
}
```

**Research Task**:
```typescript
// Use Brave search MCP for web research
const searchResults = await callMCPTool('brave_web_search', {
  query: 'latest React 18 features',
  count: 10
});
```

### Error Handling

- **MCP server unavailable**: Fall back to built-in capabilities
- **Tool not found**: Check tool name spelling and parameters
- **API limits**: Switch to alternative tools or inform user

### Performance Tips

- **Cache tool schemas** to avoid repeated discovery calls
- **Batch similar requests** when possible
- **Use appropriate models** (free vs paid) based on task complexity