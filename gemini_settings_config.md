# Gemini CLI Settings Configuration

Copy and paste this command to fix the API key issue:

```bash
cat > ~/.gemini/settings.json << EOF
{
  "auth": {
    "apiKey": "$GOOGLE_API_KEY"
  },
  "mcpServers": {
    "vision-gemini": {
      "command": "/Library/Frameworks/Python.framework/Versions/3.13/bin/python3",
      "args": ["-m", "image_recognition_server.server"],
      "cwd": "/Users/animittra/Dev/brady-ai/vision_mcp_server",
      "env": {
        "VISION_PROVIDER": "openai",
        "OPENAI_API_KEY": "$GOOGLE_API_KEY",
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
        "BRAVE_API_KEY": "$BRAVE_API_KEY"
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
cd /Users/animittra/Dev/shifted_website
gemini /mcp
```

And try vision analysis:

```bash
cp /Users/ani-work/Downloads/magic_card.png ./test_image.png
gemini -p "Use describe_image_from_file to analyze this Magic card: ./test_image.png"
```