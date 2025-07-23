# Using Brady from Other LLMs (RovoDev, Gemini CLI, etc.)

## 🎯 **Three Ways to Use Brady:**

### **Option 1: Brady MCP Server (Recommended)**
Brady runs as an MCP server that other LLMs can call.

#### **Setup:**
```bash
# Start Brady MCP server (in one terminal)
cd /Users/animittra/Dev/brady-ai
npm run build
node dist/mcp-server.js

# Brady MCP server now running on stdio/port
```

#### **From RovoDev:**
```bash
# Add Brady MCP to your config
echo '{
  "mcpServers": {
    "brady": {
      "command": "node",
      "args": ["dist/mcp-server.js"],
      "working_directory": "/Users/animittra/Dev/brady-ai"
    }
  }
}' > mcp.json

# Then use Brady tools:
execute_dev_task("scrape website with firecrawl and analyze images")
ask_director("What's the best approach for this React component?")
```

#### **From Gemini CLI:**
```bash
# Configure Brady MCP
gemini config set mcp.servers.brady.command "node"
gemini config set mcp.servers.brady.args '["dist/mcp-server.js"]'
gemini config set mcp.servers.brady.working_directory "/Users/animittra/Dev/brady-ai"

# Use Brady
gemini chat "Use the brady MCP to orchestrate a task: scrape this website and analyze the data"
```

### **Option 2: Brady HTTP API**
Brady runs as a web server with REST endpoints.

#### **Setup:**
```bash
# Start Brady HTTP server (in one terminal)
cd /Users/animittra/Dev/brady-ai
npm run build
node dist/http-server.js
# Brady API now running on http://localhost:3000
```

#### **From RovoDev:**
```bash
# Make HTTP calls to Brady
curl -X POST http://localhost:3000/api/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "task": "scrape website and analyze images",
    "type": "web-analysis"
  }'

# Or use fetch in code
fetch('http://localhost:3000/api/ask-director', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    question: "How should I structure this React app?",
    context: "Building a dashboard with charts"
  })
})
```

#### **From Gemini CLI:**
```bash
# Use HTTP requests
gemini chat "Make an HTTP POST to http://localhost:3000/api/orchestrate with this task: analyze this codebase"
```

### **Option 3: Brady CLI Commands**
Call Brady directly as a command-line tool.

#### **Setup:**
```bash
# Make Brady CLI available globally
cd /Users/animittra/Dev/brady-ai
npm run build
npm link  # Makes 'brady' command available globally
```

#### **From RovoDev:**
```bash
# Call Brady CLI directly
brady orchestrate "scrape this website and create a summary report"
brady ask "What's the best database for this use case?"
brady execute --type=web-scraping "analyze competitor websites"
```

#### **From Gemini CLI:**
```bash
# Execute Brady commands
gemini chat "Run this command: brady orchestrate 'build a React component for user profiles'"
```

## 🚀 **Practical Examples:**

### **Web Scraping + Analysis:**
```bash
# RovoDev using Brady MCP
execute_dev_task("Use firecrawl to scrape https://example.com, then use vision MCP to analyze any screenshots, then summarize findings")

# Gemini using Brady HTTP
curl -X POST http://localhost:3000/api/orchestrate \
  -d '{"task": "scrape and analyze https://example.com", "type": "research"}'

# Direct CLI
brady orchestrate "scrape https://example.com and analyze the content structure"
```

### **Image Analysis:**
```bash
# RovoDev using Brady MCP
execute_dev_task("Use vision MCP to analyze /path/to/screenshot.png and suggest UI improvements")

# Gemini using Brady HTTP
curl -X POST http://localhost:3000/api/vision-analyze \
  -d '{"imagePath": "/path/to/image.png", "prompt": "analyze this UI design"}'

# Direct CLI
brady analyze-image /path/to/image.png "suggest improvements for this UI"
```

### **Complex Multi-Step Tasks:**
```bash
# RovoDev using Brady MCP
execute_dev_task("1. Scrape competitor websites 2. Analyze their UI patterns 3. Generate component suggestions 4. Create implementation plan")

# Gemini using Brady HTTP
curl -X POST http://localhost:3000/api/orchestrate \
  -d '{
    "task": "competitive analysis and component generation",
    "steps": ["scrape", "analyze", "generate", "plan"],
    "context": "building e-commerce dashboard"
  }'
```

## 📋 **Comparison:**

| Method | Pros | Cons | Best For |
|--------|------|------|----------|
| **MCP Server** | Native integration, tool discovery | Requires MCP support | RovoDev, Gemini CLI |
| **HTTP API** | Universal, any tool can use | Need to manage server | Web apps, scripts |
| **CLI Commands** | Simple, direct | Limited to command-line | Quick tasks, scripts |

## 🎯 **Recommended Setup:**

1. **Start Brady MCP server** (always running)
2. **Configure your LLMs** to use Brady MCP
3. **Use Brady as orchestrator** for complex tasks
4. **Use other LLMs** for specialized work (coding, analysis)

**Example workflow:**
1. Ask Brady (via MCP) to scrape and analyze data
2. Ask RovoDev to write code based on Brady's findings
3. Ask Brady to test the code with playwright
4. Ask RovoDev to optimize and document

This gives you the best of both worlds! 🚀