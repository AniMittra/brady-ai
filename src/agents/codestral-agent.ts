import OpenAI from 'openai';
import { AgentResponse } from '../types.js';

export class CodestralAgent {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: apiKey,
    });
  }

  async execute(prompt: string, taskType: string, action: string): Promise<AgentResponse> {
    const startTime = Date.now();
    try {
      const chatCompletion = await this.openai.chat.completions.create({
        model: 'mistralai/codestral-latest',
        messages: [
          {
            role: 'system',
            content: `You are Codestral, a specialized code completion and generation agent. Your task is to ${action} for a ${taskType} job. Follow Kiro IDE guidelines strictly.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const duration = Date.now() - startTime;
      const result = chatCompletion.choices[0]?.message?.content || '';
      const tokensUsed = chatCompletion.usage?.total_tokens || 0;
      const cost = 0; // Calculate cost based on OpenRouter pricing if needed

      return {
        success: true,
        result,
        metadata: {
          tokensUsed,
          cost,
          duration,
          model: 'codestral-latest',
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        result: '',
        metadata: {
          tokensUsed: 0,
          cost: 0,
          duration,
          model: 'codestral-latest',
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  
}
