# Brady AI - Project Guidelines

Brady is a multi-provider AI gateway that intelligently routes requests across different LLM providers to optimize cost, performance, and reliability.

## 🔍 Purpose

Brady serves as a unified interface for:
- **Cost optimization**: Route to the most cost-effective model for each task
- **Performance optimization**: Select models based on speed and quality requirements  
- **Provider abstraction**: Single API for OpenAI, Anthropic, Google, Groq, and more
- **Intelligent routing**: Task-aware model selection
- **Analytics & monitoring**: Track usage, costs, and performance

## 📐 Design Principles

- **Provider agnostic**: Easy to add new LLM providers
- **Task-aware routing**: Different models for different use cases
- **Cost conscious**: Always consider cost vs quality tradeoffs
- **Observable**: Comprehensive logging and metrics
- **Reliable**: Fallback mechanisms and error handling

## 🏗️ Architecture

```
Brady Gateway
├── Core Orchestrator (task routing logic)
├── Provider Agents (OpenAI, Anthropic, Groq, etc.)
├── Portkey Integration (analytics & fallbacks)
├── OpenAI-Compatible API (drop-in replacement)
└── Configuration System (model priorities, routing rules)
```

## ✅ Development Guidelines

- **Commit format**: `feat|fix|docs: short description`
- **Testing**: All new providers must include tests
- **Documentation**: Update README for new features
- **Security**: Never commit API keys or sensitive data
- **Performance**: Monitor and optimize token usage

## 🔧 Adding New Providers

1. Create agent in `src/agents/`
2. Extend base agent class
3. Add to orchestrator initialization
4. Update model priorities configuration
5. Add tests and documentation

## 📊 Monitoring

Brady tracks:
- Request latency and success rates
- Token usage and costs per provider
- Model performance metrics
- Error rates and fallback usage