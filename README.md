# Brady AI - Multi-Provider AI Gateway

Brady is an intelligent AI gateway that routes requests across multiple LLM providers to optimize cost, performance, and reliability. It provides a unified OpenAI-compatible API while intelligently selecting the best model for each task.

## 🚀 Features

- **Multi-Provider Support**: OpenAI, Anthropic, Google, Groq, Perplexity, and more
- **Intelligent Routing**: Task-aware model selection for optimal cost/performance
- **OpenAI Compatible**: Drop-in replacement for OpenAI API calls
- **Cost Optimization**: Automatic selection of cost-effective models
- **Analytics & Monitoring**: Comprehensive usage tracking via Portkey
- **Fallback Mechanisms**: Automatic failover between providers
- **Streaming Support**: Real-time response streaming
- **Token Counting**: Accurate usage tracking and cost estimation

## 🏗️ Architecture

```
Brady Gateway
├── Orchestrator (routing logic)
├── Provider Agents (OpenAI, Anthropic, etc.)
├── Portkey Integration (analytics)
├── OpenAI-Compatible API
└── Configuration System
```

## 📦 Installation

```bash
git clone https://github.com/AniMittra/brady-ai.git
cd brady-ai
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your API keys
```

## 🔧 Configuration

### Environment Variables

```bash
# Provider API Keys
OPENAI_API_KEY=your-openai-key
GROQ_API_KEY=your-groq-key
GOOGLE_API_KEY=your-google-key
PERPLEXITY_API_KEY=your-perplexity-key
OPENROUTER_API_KEY=your-openrouter-key

# Portkey Configuration (Optional)
PORTKEY_API_KEY=your-portkey-key
PORTKEY_VIRTUAL_KEY=your-virtual-key
PORTKEY_CONFIG_DIRECTOR=your-director-config
PORTKEY_CONFIG_CODER=your-coder-config
```

### Model Priorities

Configure model selection in `model-priorities.json`:

```json
{
  "roles": {
    "director": {
      "providers": [
        {"name": "portkey", "models": ["pc-brady-director"], "priority": 1}
      ]
    },
    "coder": {
      "providers": [
        {"name": "groq", "models": ["llama-3.1-70b"], "priority": 1}
      ]
    }
  }
}
```

## 🚀 Usage

### Start Brady Server

```bash
npm run brady
# Server runs on http://localhost:3002
```

### API Usage

```bash
curl -X POST http://localhost:3002/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer brady-local" \
  -d '{
    "model": "brady-director",
    "messages": [{"role": "user", "content": "Hello Brady!"}]
  }'
```

### Integration Examples

#### Aider Integration
```bash
./examples/aider-integration
```

#### Cline (VS Code)
- **Base URL**: `http://localhost:3002/v1`
- **Model**: `brady-director`
- **API Key**: `brady-local`

#### Python
```python
import openai

client = openai.OpenAI(
    base_url="http://localhost:3002/v1",
    api_key="brady-local"
)

response = client.chat.completions.create(
    model="brady-director",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

## 🎯 Task-Based Routing

Brady automatically selects models based on task type:

- **Director**: Planning, coordination, complex reasoning
- **Coder**: Code generation, programming tasks
- **Researcher**: Real-time search, analysis
- **Documenter**: Documentation, explanations
- **Quick Search**: Fast lookups, simple questions

## 📊 Monitoring

Brady provides detailed analytics:
- Cost tracking per request
- Token usage statistics  
- Model performance metrics
- Provider availability monitoring
- Request/response logging

## 🔧 Development

```bash
# Development mode
npm run dev

# Build
npm run build

# Tests
npm test

# Linting
npm run lint
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- **Portkey**: Multi-provider analytics and routing
- **OpenAI**: API compatibility standard
- **Community**: All the amazing LLM providers

---

**Brady AI** - Your intelligent gateway to AI models.