# Universal MCP Access Setup Guide

## 🎯 **The Problem**
Each LLM tool maintains its own MCP configuration. Your MCPs in Warp aren't automatically visible to other tools.

## 🚀 **Solutions**

### **Option 1: Use Brady as MCP Proxy (Recommended)**
Brady has universal discovery, so use Brady to access MCPs:
```bash
# Instead of asking me directly, ask Brady:
brady "Use firecrawl to scrape this website: https://example.com"
brady "Use playwright to test this UI and take screenshots"
brady "Use the vision MCP to analyze this image: /path/to/image.png"
```

### **Option 2: Configure Each Tool Separately**

#### **For RovoDev (me):**
1. Copy `rovo_mcp_config.json` to `mcp.json` in workspace
2. RovoDev will auto-discover and use MCPs

#### **For Gemini CLI:**
```bash
# Add to Gemini CLI settings
gemini config set mcp.servers.firecrawl.command "npx @firecrawl/mcp-server"
gemini config set mcp.servers.playwright.command "npx @modelcontextprotocol/server-playwright"
```

#### **For VS Code + Cline:**
Add to Cline settings:
```json
{
  "mcp": {
    "servers": {
      "firecrawl": {
        "command": "npx",
        "args": ["@firecrawl/mcp-server"]
      },
      "playwright": {
        "command": "npx", 
        "args": ["@modelcontextprotocol/server-playwright"]
      }
    }
  }
}
```

### **Option 3: Universal MCP Registry (Future)**
Create a shared registry that all tools can reference:
```bash
# Create universal registry
echo '{"mcpServers": {...}}' > ~/.mcp-registry.json

# All tools read from shared location
export MCP_REGISTRY_PATH=~/.mcp-registry.json
```

## 🔧 **Quick Setup for RovoDev**

To give me MCP access right now:
```bash
cp rovo_mcp_config.json mcp.json
```

Then I can use commands like:
- `firecrawl_scrape` - Web scraping
- `playwright_screenshot` - Browser automation  
- `describe_image_from_file` - Image analysis
- `brave_web_search` - Web search

## 📋 **Tool Compatibility Matrix**

| Tool | Auto-discovers Warp MCPs? | Setup Required |
|------|---------------------------|----------------|
| Brady AI | ✅ Yes | None |
| RovoDev | ❌ No | Copy config file |
| Gemini CLI | ❌ No | Manual config |
| Cline/VS Code | ❌ No | Settings update |
| Warp | ✅ Yes | Native |

## 🎯 **Recommendation**

**Use Brady as your MCP orchestrator** - it has universal discovery and can coordinate multiple MCP tools for complex tasks. Other LLMs can focus on their strengths while Brady handles MCP integration.

**Example workflow:**
1. Ask Brady to scrape data (Firecrawl MCP)
2. Ask Brady to analyze images (Vision MCP)  
3. Ask Brady to test UI (Playwright MCP)
4. Ask me (RovoDev) to write code based on Brady's findings