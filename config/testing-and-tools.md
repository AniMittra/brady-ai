# Testing and Development Tools

## Testing Strategy

### Unit Testing
- Test each provider agent independently
- Mock external API calls for consistent testing
- Validate cost calculations and token counting
- Test error handling and fallback mechanisms

### Integration Testing
- Test full request flow through orchestrator
- Validate OpenAI API compatibility
- Test Portkey integration and analytics
- Performance and load testing

### Testing Tools
- **Jest/Vitest**: Unit and integration tests
- **Supertest**: API endpoint testing
- **Nock**: HTTP mocking for external APIs
- **Artillery**: Load testing

## Development Stack

### Core Technologies
- **TypeScript**: Type-safe development
- **Node.js**: Runtime environment
- **Express**: HTTP server framework
- **Portkey**: Multi-provider analytics and routing

### Provider SDKs
- **OpenAI SDK**: GPT models
- **Anthropic SDK**: Claude models
- **Google AI SDK**: Gemini models
- **Groq SDK**: Fast inference models

### Development Tools
- **ESLint + Prettier**: Code quality and formatting
- **Husky**: Git hooks for quality gates
- **TypeScript**: Compile-time type checking
- **Nodemon**: Development auto-reload

## Integration Examples

### Aider Integration
Brady includes an example Aider integration (`examples/aider-integration`) that:
- Auto-starts Brady if not running
- Loads project context files
- Provides OpenAI-compatible interface
- Supports streaming responses

### Cline Integration
Configure Cline to use Brady:
- **Base URL**: `http://localhost:3002/v1`
- **Model**: `brady-director`
- **API Key**: `brady-local`

### Direct API Usage
```bash
curl -X POST http://localhost:3002/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer brady-local" \
  -d '{
    "model": "brady-director",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## Performance Monitoring

### Metrics Tracked
- Request latency per provider
- Token usage and costs
- Success/failure rates
- Model selection decisions
- Fallback usage statistics

### Debugging
- Comprehensive logging with structured data
- Request/response tracing
- Provider-specific error handling
- Performance profiling tools

## Quality Assurance

### Code Quality
- TypeScript strict mode
- 100% type coverage for public APIs
- Comprehensive error handling
- Security best practices

### Testing Coverage
- Minimum 80% code coverage
- All provider agents tested
- API compatibility verified
- Error scenarios covered