import fs from 'fs';
import path from 'path';
import { BaseAgent } from './agents/base-agent.js';
import { ChatGPTAgent } from './agents/chatgpt-agent.js';
import { ClaudeAgent } from './agents/claude-agent.js';
import { PortkeyAgent } from './agents/portkey-agent.js';

export interface ImageAnalysisRequest {
  imagePath: string;
  prompt?: string;
  agent?: 'gpt-4o' | 'claude' | 'portkey';
  detail?: 'low' | 'high'; // For GPT-4o
}

export interface ImageAnalysisResponse {
  success: boolean;
  analysis: string;
  metadata: {
    imagePath: string;
    imageSize: number;
    agent: string;
    tokensUsed: number;
    cost: number;
    duration: number;
  };
  error?: string;
}

export class VisionAnalyzer {
  private chatgptAgent?: ChatGPTAgent;
  private claudeAgent?: ClaudeAgent;
  private portkeyAgent?: PortkeyAgent;

  constructor(
    openaiApiKey?: string,
    anthropicApiKey?: string,
    portkeyApiKey?: string,
    portkeyVirtualKey?: string,
    portkeyConfigs?: any
  ) {
    if (openaiApiKey) {
      this.chatgptAgent = new ChatGPTAgent(openaiApiKey);
    }
    if (anthropicApiKey) {
      this.claudeAgent = new ClaudeAgent(anthropicApiKey);
    }
    if (portkeyApiKey && portkeyVirtualKey) {
      this.portkeyAgent = new PortkeyAgent(portkeyApiKey, portkeyVirtualKey, portkeyConfigs);
    }
  }

  async analyzeImage(request: ImageAnalysisRequest): Promise<ImageAnalysisResponse> {
    const startTime = Date.now();

    try {
      // Validate image file exists
      if (!fs.existsSync(request.imagePath)) {
        throw new Error(`Image file not found: ${request.imagePath}`);
      }

      // Get image info
      const imageStats = fs.statSync(request.imagePath);
      const imageExtension = path.extname(request.imagePath).toLowerCase();
      
      // Validate image format
      const supportedFormats = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
      if (!supportedFormats.includes(imageExtension)) {
        throw new Error(`Unsupported image format: ${imageExtension}. Supported: ${supportedFormats.join(', ')}`);
      }

      // Read and encode image
      const imageBuffer = fs.readFileSync(request.imagePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = this.getMimeType(imageExtension);

      // Default prompt if none provided
      const prompt = request.prompt || "Analyze this image and describe what you see in detail.";

      let result;
      const agentType: string = request.agent || 'gpt-4o'; // Default to GPT-4o for vision

      switch (agentType) {
        case 'gpt-4o':
          result = await this.analyzeWithGPT4o(prompt, base64Image, mimeType, request.detail);
          break;
        case 'claude':
          result = await this.analyzeWithClaude(prompt, base64Image, mimeType);
          break;
        case 'portkey':
          result = await this.analyzeWithPortkey(prompt, base64Image, mimeType);
          break;
        default:
          throw new Error(`Unsupported agent: ${agentType}`);
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        analysis: result.result,
        metadata: {
          imagePath: request.imagePath,
          imageSize: imageStats.size,
          agent: agentType,
          tokensUsed: result.metadata?.tokensUsed || 0,
          cost: result.metadata?.cost || 0,
          duration: duration,
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        analysis: '',
        metadata: {
          imagePath: request.imagePath,
          imageSize: 0,
          agent: request.agent || 'unknown',
          tokensUsed: 0,
          cost: 0,
          duration: duration,
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async analyzeWithGPT4o(prompt: string, base64Image: string, mimeType: string, detail: 'low' | 'high' = 'high') {
    if (!this.chatgptAgent) {
      throw new Error('ChatGPT agent not initialized. Provide OpenAI API key.');
    }

    // We need to modify the ChatGPT agent to support vision
    // For now, let's create a direct OpenAI call
    const OpenAI = (await import('openai')).default;
    const client = new OpenAI({ apiKey: (this.chatgptAgent as any).apiKey });

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: detail,
              },
            },
          ],
        },
      ],
      max_tokens: 4000,
      temperature: 0.7,
    });

    return {
      result: response.choices[0].message.content || '',
      metadata: {
        tokensUsed: response.usage?.total_tokens || 0,
        cost: (response.usage?.total_tokens || 0) * 0.000015, // GPT-4o pricing
      },
    };
  }

  private async analyzeWithClaude(prompt: string, base64Image: string, mimeType: string) {
    if (!this.claudeAgent) {
      throw new Error('Claude agent not initialized. Provide Anthropic API key.');
    }

    // Direct Anthropic call for vision
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: (this.claudeAgent as any).apiKey });

    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType as any,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    });

    const result = response.content[0].type === 'text' ? response.content[0].text : '';
    const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

    return {
      result,
      metadata: {
        tokensUsed,
        cost: tokensUsed * 0.000015, // Claude pricing
      },
    };
  }

  private async analyzeWithPortkey(prompt: string, base64Image: string, mimeType: string) {
    if (!this.portkeyAgent) {
      throw new Error('Portkey agent not initialized. Provide Portkey API key and virtual key.');
    }

    // Direct Portkey call for vision
    const { Portkey } = await import('portkey-ai');
    const client = new Portkey({
      apiKey: (this.portkeyAgent as any).apiKey,
      virtualKey: (this.portkeyAgent as any).virtualKey,
    });

    const response = await client.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      config: 'gpt-4o-vision', // You'll need to set up this config in Portkey
      maxTokens: 4000,
      temperature: 0.7,
    });

    return {
      result: response.choices[0]?.message?.content || '',
      metadata: {
        tokensUsed: response.usage?.total_tokens || 0,
        cost: (response.usage?.total_tokens || 0) * 0.000015,
      },
    };
  }

  private getMimeType(extension: string): string {
    const mimeTypes: { [key: string]: string } = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    return mimeTypes[extension] || 'image/jpeg';
  }
}