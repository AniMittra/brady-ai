# Test Vision MCP Environment Variables

## Quick Test Commands

**Test if environment variables are working:**

```bash
# Test the vision MCP server directly with explicit env vars
cd /Users/animittra/Dev/brady-ai/vision_mcp_server

VISION_PROVIDER=openai \
OPENAI_API_KEY=$GOOGLE_API_KEY \
OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta \
OPENAI_MODEL=gemini-2.0-flash-exp \
LOG_LEVEL=INFO \
ENABLE_OCR=false \
python3 -m image_recognition_server.server
```

**Then in another terminal, test with a simple JSON request:**

```bash
echo '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test-client", "version": "1.0.0"}}}' | python3 -m image_recognition_server.server
```

## Alternative: Fix Gemini CLI Config

**The issue might be that `$GOOGLE_API_KEY` isn't expanding in the JSON. Try this:**

```bash
# Create config with actual API key value
ACTUAL_KEY=$GOOGLE_API_KEY
cat > ~/.gemini/settings.json << EOF
{
  "auth": {
    "apiKey": "$ACTUAL_KEY"
  },
  "mcpServers": {
    "vision-gemini": {
      "command": "/Library/Frameworks/Python.framework/Versions/3.13/bin/python3",
      "args": ["-m", "image_recognition_server.server"],
      "cwd": "/Users/animittra/Dev/brady-ai/vision_mcp_server",
      "env": {
        "VISION_PROVIDER": "openai",
        "OPENAI_API_KEY": "$ACTUAL_KEY",
        "OPENAI_BASE_URL": "https://generativelanguage.googleapis.com/v1beta",
        "OPENAI_MODEL": "gemini-2.0-flash-exp",
        "LOG_LEVEL": "INFO",
        "ENABLE_OCR": "false"
      },
      "timeout": 30000,
      "trust": false
    }
  }
}
EOF
```

**Then restart Gemini CLI and test:**

```bash
gemini /mcp
gemini -p "Use describe_image_from_file to analyze this image: ./test_image.png"
```