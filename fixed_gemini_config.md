# Fixed Gemini CLI Configuration

Copy and paste this command to fix the API key issue:

```bash
cat > ~/.gemini/settings.json << 'EOF'
{
  "auth": {
    "apiKey": "AIzaSyDNPb8Mc8HMhT_TusmOdC1C33YrQI0cAig"
  },
  "mcpServers": {
    "vision-gemini": {
      "command": "/Library/Frameworks/Python.framework/Versions/3.13/bin/python3",
      "args": ["-m", "image_recognition_server.server"],
      "cwd": "/Users/animittra/Dev/brady-ai/vision_mcp_server",
      "env": {
        "VISION_PROVIDER": "openai",
        "OPENAI_API_KEY": "AIzaSyDNPb8Mc8HMhT_TusmOdC1C33YrQI0cAig",
        "OPENAI_BASE_URL": "https://generativelanguage.googleapis.com/v1beta",
        "OPENAI_MODEL": "gemini-2.0-flash-exp",
        "LOG_LEVEL": "INFO",
        "ENABLE_OCR": "false"
      },
      "timeout": 30000,
      "trust": false
    },
    "brave": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "BSAqES7dW_83keVSqZMh9c6qG0fVgSYHq-xKH5Jf3QY"
      },
      "timeout": 30000,
      "trust": false
    }
  }
}
EOF
```

Then test:

```bash
gemini /mcp
gemini -p "Use describe_image_from_file to analyze this image: ./test_image.png"
```

This should fix the API key issue for both `describe_image` and `describe_image_from_file`!