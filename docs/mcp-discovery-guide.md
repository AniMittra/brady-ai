# 🔍 MCP Discovery & Integration Guide

## How LLMs Can Discover and Use MCP Tools

### 🎯 **MCP Discovery Methods**

#### 1. **Warp MCP Registry** (Easiest)
```bash
# List all available MCP servers in Warp
warp mcp list

# Get details about specific server
warp mcp describe vision-gemini
```

#### 2. **Direct MCP Server Interrogation**
```bash
# Connect to any MCP server and discover tools
mcp connect stdio python3 -m image_recognition_server.server

# Then send discovery commands:
{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "discovery-client", "version": "1.0.0"}}}
{"jsonrpc": "2.0", "method": "notifications/initialized"}
{"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}}
```

#### 3. **Configuration File Parsing**
```bash
# Parse Warp's MCP config
cat warp-mcp-config.json | jq '.mcpServers | keys'

# Get tool details from running servers
curl -X POST http://localhost:3000/mcp/tools/list
```

### 🛠 **Available MCP Servers & Tools**

#### **Brady AI MCP** (`bradyai`)
- **Tools**: `orchestrate_task`, `get_task_status`, `list_agents`
- **Use Case**: AI development orchestration
- **Connection**: `node dist/mcp-server.js`

#### **Brave Search MCP** (`brave`)
- **Tools**: `brave_web_search`
- **Use Case**: Web search and research
- **Connection**: `npx @modelcontextprotocol/server-brave-search`

#### **Vision MCP - Gemini** (`vision-gemini`)
- **Tools**: `describe_image`, `describe_image_from_file`
- **Use Case**: Free image analysis
- **Connection**: `python3 -m image_recognition_server.server`
- **Cost**: FREE (Google API)

#### **Vision MCP - Portkey** (`vision-portkey`)
- **Tools**: `describe_image`, `describe_image_from_file`
- **Use Case**: Premium image analysis
- **Connection**: `python3 -m image_recognition_server.server`
- **Cost**: ~$0.01-0.03 per image (GPT-4o)

### 🚀 **Integration Examples**

#### **RovoDev CLI Integration**
```bash
# Create mcp.json config
{
  "servers": {
    "vision": {
      "command": "python3",
      "args": ["-m", "image_recognition_server.server"],
      "working_directory": "./tmp_rovodev_vision_mcp",
      "env": {
        "OPENAI_API_KEY": "${GOOGLE_API_KEY}",
        "OPENAI_BASE_URL": "https://generativelanguage.googleapis.com/v1beta"
      }
    }
  }
}

# Use in RovoDev
rovodev --mcp-config mcp.json "Analyze this image: /path/to/image.png"
```

#### **Gemini CLI Integration**
```bash
# Install Gemini CLI with MCP support
npm install -g @google/generative-ai-cli

# Configure MCP servers
gemini config set mcp.servers.vision.endpoint "http://localhost:3000"

# Use vision tools
gemini chat "Use the vision MCP to analyze this image: /path/to/image.png"
```

#### **Brady AI Integration**
```typescript
// In Brady's orchestrator
const mcpTools = await discoverMCPTools();
const visionTools = mcpTools.filter(tool => tool.name.includes('image'));

// Use in task orchestration
await orchestrator.executeTask({
  type: 'image-analysis',
  tools: ['describe_image_from_file'],
  input: '/path/to/image.png'
});
```

### 🔧 **MCP Tool Discovery Script**

```bash
#!/bin/bash
# discover-mcp-tools.sh

echo "🔍 Discovering available MCP tools..."

# Check Warp config
if [ -f "warp-mcp-config.json" ]; then
    echo "📋 Warp MCP Servers:"
    jq -r '.mcpServers | keys[]' warp-mcp-config.json
fi

# Test each server
for server in vision-gemini vision-portkey bradyai brave; do
    echo "🧪 Testing $server..."
    # Add connection logic here
done
```

### 📚 **Tool Usage Patterns**

#### **Image Analysis**
```json
{
  "tool": "describe_image_from_file",
  "args": {
    "filepath": "/path/to/image.png",
    "prompt": "Analyze this image and describe what you see"
  }
}
```

#### **Web Search**
```json
{
  "tool": "brave_web_search",
  "args": {
    "query": "latest AI developments",
    "count": 10
  }
}
```

#### **Task Orchestration**
```json
{
  "tool": "orchestrate_task",
  "args": {
    "type": "code",
    "description": "Build a React component",
    "requirements": ["TypeScript", "responsive design"]
  }
}
```

### 🎯 **Best Practices**

1. **Always initialize MCP servers** before calling tools
2. **Cache tool schemas** to avoid repeated discovery calls
3. **Handle errors gracefully** - MCP servers can be unavailable
4. **Use appropriate models** for cost optimization (Gemini free vs GPT-4o paid)
5. **Batch similar requests** to reduce API calls

### 🔗 **Quick Reference**

| Server | Port | Tools | Cost | Use Case |
|--------|------|-------|------|----------|
| vision-gemini | stdio | describe_image* | FREE | Image analysis |
| vision-portkey | stdio | describe_image* | $0.01-0.03 | Premium vision |
| brave | stdio | brave_web_search | FREE | Web search |
| bradyai | stdio | orchestrate_task | Varies | AI orchestration |

### 📖 **Further Reading**

- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)
- [Warp MCP Documentation](https://docs.warp.dev/knowledge-and-collaboration/mcp)
- [MCP Server Registry](https://mcpservers.org/)