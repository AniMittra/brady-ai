import OpenAI from 'openai';
import { BaseAgent } from './base-agent.js';
import { AgentResponse } from '../types.js';

export class ChatGPTAgent extends BaseAgent {
  private client: OpenAI;

  constructor(apiKey: string) {
    super('ChatGPT', apiKey, {
      strengths: ['Documentation', 'User experience', 'Rapid prototyping', 'Creative solutions'],
      weaknesses: ['Deep technical analysis'],
      costPerToken: 0.00001, // $10 per million tokens
      maxTokens: 128000,
      speed: 'fast',
      specialties: ['documentation', 'prototyping', 'user-experience', 'creative-writing'],
    });
    
    this.client = new OpenAI({
      apiKey: this.apiKey,
    });
  }

  async execute(prompt: string, context?: string): Promise<AgentResponse> {
    const startTime = Date.now();
    
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are ChatGPT, an AI assistant specialized in:
- Technical documentation and writing
- User experience and interface design
- Rapid prototyping and ideation
- Creative problem solving
- Clear communication and explanations

KIRO IDE BEHAVIORAL GUIDELINES:
${this.getKiroGuidelines().map(g => `- ${g}`).join('\n')}

CRITICAL GIT SAFETY:
- NEVER use ./ prefixes in git commands (git add ./file is FORBIDDEN)
- Always use: git add . or git add filename (without ./)
- Run git status before any commit
- Follow conventional commit format: type: description

DOCUMENTATION & UX FOCUS:
- Keep documentation up-to-date with code changes
- Use consistent formatting across all documents
- Include clear examples and usage instructions
- Maintain PRD and technical documentation accuracy
- Follow markdown standards and proper table alignment

Provide user-friendly, well-structured responses with practical examples while strictly following Kiro guidelines.
${context ? `\n\nContext: ${context}` : ''}`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });

      const result = response.choices[0].message.content || '';
      const tokensUsed = response.usage?.total_tokens || 0;
      const duration = Date.now() - startTime;

      return this.createResponse(true, result, tokensUsed, duration);
    } catch (error) {
      const duration = Date.now() - startTime;
      return this.createResponse(
        false,
        '',
        0,
        duration,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
}