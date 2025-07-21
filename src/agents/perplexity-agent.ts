import { BaseAgent } from './base-agent.js';
import { AgentResponse } from '../types.js';

export class PerplexityAgent extends BaseAgent {
  constructor(apiKey: string) {
    super('Perplexity', apiKey, {
      strengths: ['Research', 'Current information', 'Finding solutions', 'Documentation lookup'],
      weaknesses: ['Code generation'],
      costPerToken: 0.000001, // $1 per million tokens
      maxTokens: 4000,
      speed: 'medium',
      specialties: ['research', 'documentation', 'current-info', 'problem-solving'],
    });
  }

  async execute(prompt: string, context?: string): Promise<AgentResponse> {
    const startTime = Date.now();
    
    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content: `You are Perplexity, an AI research assistant. ${context ? `\n\nContext: ${context}` : ''}`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Perplexity API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const result = data.choices[0].message.content;
      const tokensUsed = data.usage?.total_tokens || 0;
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
