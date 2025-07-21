#!/usr/bin/env node

import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from 'dotenv';

// Load environment variables
config();

const app = express();
const port = process.env.OPENAI_API_PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Simple Brady response without orchestration (for testing)
function getSimpleBradyResponse(message: string): string {
  return `Hello! I'm Brady AI. You said: "${message}". I'm a simplified version running for testing. The full orchestration version had some compatibility issues with Cline, so this is a basic response to verify the connection works.`;
}

// OpenAI-compatible types
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: 'stop' | 'length' | 'content_filter';
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface ChatCompletionChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: 'assistant';
      content?: string;
    };
    finish_reason?: 'stop' | 'length' | 'content_filter' | null;
  }>;
}

// List models endpoint
app.get('/v1/models', (req: Request, res: Response) => {
  res.json({
    object: 'list',
    data: [
      {
        id: 'brady-director',
        object: 'model',
        created: Date.now(),
        owned_by: 'brady-ai',
        permission: [],
        root: 'brady-director',
        parent: null
      }
    ]
  });
});

// Main chat completions endpoint
app.post('/v1/chat/completions', async (req: Request, res: Response) => {
  try {
    console.log('📥 Received request:', JSON.stringify(req.body, null, 2));
    
    const request: ChatCompletionRequest = req.body;
    
    // Validate request
    if (!request.messages || !Array.isArray(request.messages) || request.messages.length === 0) {
      return res.status(400).json({
        error: {
          message: 'Messages are required and must be a non-empty array',
          type: 'invalid_request_error',
          code: 'invalid_request'
        }
      });
    }

    const conversationId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const userMessage = request.messages[request.messages.length - 1]?.content || '';
    const bradyResponse = getSimpleBradyResponse(userMessage);

    console.log('🤖 Simple Brady responding to:', userMessage);

    if (request.stream) {
      // Streaming response
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Send initial chunk
      const initialChunk: ChatCompletionChunk = {
        id: conversationId,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: request.model || 'brady-director',
        choices: [{
          index: 0,
          delta: { role: 'assistant' },
          finish_reason: null
        }]
      };
      
      res.write(`data: ${JSON.stringify(initialChunk)}\n\n`);

      // Split response into chunks for streaming effect
      const chunkSize = 20;
      for (let i = 0; i < bradyResponse.length; i += chunkSize) {
        const chunk = bradyResponse.slice(i, i + chunkSize);
        
        const streamChunk: ChatCompletionChunk = {
          id: conversationId,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: request.model || 'brady-director',
          choices: [{
            index: 0,
            delta: { content: chunk },
            finish_reason: null
          }]
        };
        
        res.write(`data: ${JSON.stringify(streamChunk)}\n\n`);
        
        // Small delay for streaming effect
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Final chunk
      const finalChunk: ChatCompletionChunk = {
        id: conversationId,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: request.model || 'brady-director',
        choices: [{
          index: 0,
          delta: {},
          finish_reason: 'stop'
        }]
      };
      
      res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      
    } else {
      // Non-streaming response
      const response: ChatCompletionResponse = {
        id: conversationId,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: request.model || 'brady-director',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: bradyResponse
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: Math.ceil(userMessage.length / 4),
          completion_tokens: Math.ceil(bradyResponse.length / 4),
          total_tokens: Math.ceil((userMessage.length + bradyResponse.length) / 4)
        }
      };
      
      res.json(response);
    }
    
  } catch (error) {
    console.error('❌ Error in chat completions:', error);
    res.status(500).json({
      error: {
        message: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'server_error',
        code: 'internal_error'
      }
    });
  }
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'simple-brady-api',
    version: '1.0.0'
  });
});

// Start server
app.listen(port, () => {
  console.log('🚀 Simple Brady OpenAI-Compatible API Server');
  console.log(`📡 Server running on http://localhost:${port}`);
  console.log('🧪 This is a simplified version for testing Cline compatibility');
  console.log('');
  console.log('💡 Update Cline settings:');
  console.log(`  Base URL: http://localhost:${port}/v1`);
  console.log('  Model: brady-director');
  console.log('  API Key: brady-local');
});