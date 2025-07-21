# 🚀 Setup BradyAI with Warp MCP

## Quick Setup (3 steps)

### 1. Build BradyAI
```bash
cd mcp-orchestrator && npm run build
```

### 2. Add to Warp MCP
1. Open Warp
2. Go to `Settings > AI > Manage MCP servers`
3. Click `+ Add`
4. Choose "Multiple MCP servers (JSON)"
5. Paste this JSON:

```json
{
  "mcpServers": {
    "bradyai": {
      "command": "node",
      "args": ["mcp-orchestrator/dist/index.js"],
      "working_directory": "/full/path/to/your/content_organizer_mvp",
      "start_on_launch": true
    }
  }
}
```

**Important**: Replace `/full/path/to/your/content_organizer_mvp` with your actual project path!

### 3. Test It
In Warp, try asking:
- "Use BradyAI to help me plan a new feature"
- "Ask the director about best practices for React components"
- "Execute a code generation task for user authentication"

## 🎯 What This Gives You

### In Warp Terminal:
- **Direct AI Integration**: Ask Warp's AI to use BradyAI tools
- **Multi-Agent Orchestration**: Complex tasks get distributed to specialized agents
- **Cost-Optimized**: Uses free Gemini 2.5 models + cheap Kimi K2
- **Auto-Start**: BradyAI starts automatically when you open Warp

### Available BradyAI Tools in Warp:
- `execute_dev_task` - Run complex development tasks
- `ask_director` - Get guidance from the director agent (Kimi K2)
- `get_agent_status` - See all available AI agents
- `get_task_history` - View previous task executions
- `write_file` / `read_file` / `delete_file` - File operations
- `execute_plan` - Run pre-defined orchestration plans

## 🔧 Troubleshooting

### If BradyAI doesn't start:
1. Check logs in Warp MCP manager
2. Ensure `working_directory` path is correct
3. Verify `mcp-orchestrator/dist/index.js` exists
4. Check environment variables are set

### If API calls fail:
1. Verify your API keys in `.env` or `.env.local`
2. Check the logs for specific error messages
3. Test individual models with the CLI first

## 💡 Pro Tips

### Use with Warp AI:
- "Use BradyAI to create a React component for user profiles"
- "Ask the BradyAI director how to structure this feature"
- "Use BradyAI's code generator to implement authentication"

### Best Practices:
- Let BradyAI handle complex, multi-step tasks
- Use the director for planning and architecture decisions
- Leverage the specialized agents (security-auditor, ui-designer, etc.)
- Check task history to see what worked well

## 🚀 Advanced Usage

### Custom Task Types:
- `architecture` - System design and planning
- `security` - Security audits and recommendations  
- `ui-design` - UI/UX design and implementation
- `database` - Database design and optimization
- `devops` - Infrastructure and deployment
- `mobile` - Mobile development tasks
- `accessibility` - A11y audits and fixes

### Multi-Agent Workflows:
BradyAI automatically coordinates multiple agents for complex tasks:
1. **Director** plans the approach
2. **Specialists** handle their domains
3. **Reviewer** checks the output
4. **Summarizer** provides clear results