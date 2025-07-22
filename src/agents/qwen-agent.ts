import { Groq } from 'groq-sdk';
import { AgentResponse } from '../types.js';

export class QwenAgent {
  private groq: Groq;

  constructor(apiKey: string) {
    this.groq = new Groq({ apiKey });
  }

  async execute(prompt: string, taskType: string, action: string): Promise<AgentResponse> {
    const startTime = Date.now();
    try {
      const chatCompletion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are Qwen 2.5 Coder, a specialized coding agent. Your task is to ${action} for a ${taskType} job.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: 'qwen/qwen3-32b',
      });

      const duration = Date.now() - startTime;
      const result = chatCompletion.choices[0]?.message?.content || '';
      const tokensUsed = chatCompletion.usage?.total_tokens || 0;
      const cost = 0; // Assuming Groq is free for now

      return {
        success: true,
        result,
        metadata: {
          tokensUsed,
          cost,
          duration,
          model: 'qwen/qwen3-32b',
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
          model: 'qwen/qwen3-32b',
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  
}
