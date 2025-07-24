# Gemini CLI MCP Setup Guide

## Issue
Gemini CLI doesn't automatically load MCP servers from config files. You need to explicitly allow them.

## Solution

### Method 1: Use --allowed-mcp-server-names flag
```bash
gemini --allowed-mcp-server-names vision-gemini,brave,firecrawl -p "What MCP tools do I have available?"
```

### Method 2: Create alias for convenience
Add to your ~/.zshrc or ~/.bashrc:
```bash
alias gemini-mcp="gemini --allowed-mcp-server-names vision-gemini,brave,firecrawl,convex-helper,playwright,aws-docs,perplexity-ask,fetch,shadcn-ui-jpisnice,shadcn-ui-heilgar,mcp-installer"
```

Then use:
```bash
gemini-mcp -p "Use vision-gemini to analyze this image: /path/to/image.png"
```

### Method 3: Interactive mode with MCPs
```bash
gemini --allowed-mcp-server-names vision-gemini,brave,firecrawl
# Then in interactive mode:
# > Use vision-gemini to analyze this image: /path/to/image.png
```

## Available MCP Servers
Based on your Warp configuration:
- vision-gemini (FREE image analysis)
- brave (web search)
- firecrawl (web scraping)
- convex-helper (database)
- playwright (browser automation)
- aws-docs (AWS documentation)
- perplexity-ask (AI search)
- fetch (HTTP requests)
- shadcn-ui-jpisnice (UI components)
- shadcn-ui-heilgar (UI components)
- mcp-installer (MCP management)

## Testing
```bash
# Test vision analysis
gemini --allowed-mcp-server-names vision-gemini -p "Use vision-gemini to analyze this image: /Users/ani-work/Downloads/magic_card.png"

# Test web search
gemini --allowed-mcp-server-names brave -p "Use brave to search for latest AI news"
```