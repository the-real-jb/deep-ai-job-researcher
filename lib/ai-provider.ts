import OpenAI from 'openai/index.mjs';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

export type AIProvider = 'openai' | 'claude' | 'google';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  responseFormat?: { type: 'json_object' };
  maxTokens?: number;
}

export interface ChatCompletionResult {
  content: string;
}

export interface AuthContext {
  isAuthenticated: boolean;
}

/**
 * Base class for AI providers.
 */
abstract class BaseAiProvider {
  abstract createChatCompletion(
    messages: ChatMessage[],
    options: ChatCompletionOptions
  ): Promise<ChatCompletionResult>;
}

/**
 * OpenAI provider implementation.
 */
class OpenAiProvider extends BaseAiProvider {
  private openai: OpenAI;

  constructor() {
    super();
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  private getModel(options: ChatCompletionOptions): string {
    return options.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  async createChatCompletion(
    messages: ChatMessage[],
    options: ChatCompletionOptions
  ): Promise<ChatCompletionResult> {
    const openaiMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const completion = await this.openai.chat.completions.create({
      model: this.getModel(options),
      messages: openaiMessages as any,
      temperature: options.temperature ?? 0.3,
      response_format: options.responseFormat,
      max_tokens: options.maxTokens,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return { content };
  }
}

/**
 * Claude (Anthropic) provider implementation.
 */
class ClaudeProvider extends BaseAiProvider {
  private anthropic: Anthropic;

  constructor() {
    super();
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  private getModel(options: ChatCompletionOptions): string {
    return options.model || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
  }

  async createChatCompletion(
    messages: ChatMessage[],
    options: ChatCompletionOptions
  ): Promise<ChatCompletionResult> {
    if (!messages || messages.length === 0) {
      throw new Error('At least one message is required');
    }

    const systemMessage = messages.find((m) => m.role === 'system');
    let systemPrompt = systemMessage ? systemMessage.content : undefined;

    if (options.responseFormat?.type === 'json_object') {
      const jsonInstruction = "Please ensure your response is a single, valid JSON object, without any surrounding text, comments, or explanations. The entire response should be parseable as JSON.";
      systemPrompt = systemPrompt ? `${systemPrompt}\n\n${jsonInstruction}` : jsonInstruction;
    }

    const conversationMessages = messages.filter((m) => m.role !== 'system');

    if (conversationMessages.length === 0) {
      throw new Error('At least one user or assistant message is required');
    }

    const claudeMessages = conversationMessages.map((msg) => {
      if (msg.role !== 'user' && msg.role !== 'assistant') {
        throw new Error(`Invalid message role: ${msg.role}. Only 'user' and 'assistant' are supported.`);
      }
      return {
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      };
    });

    try {
      const response = await this.anthropic.messages.create({
        model: this.getModel(options),
        max_tokens: options.maxTokens || 4096,
        system: systemPrompt,
        messages: claudeMessages,
        temperature: options.temperature ?? 0.3,
      });

      if (!response.content || response.content.length === 0) {
        throw new Error('No content in Claude response');
      }

      const textParts = response.content.map(block => block.type === 'text' ? block.text : '').filter(Boolean);
      if (textParts.length === 0) {
        throw new Error('No text content in Claude response');
      }

      const content = textParts.join('\n\n').trim();

      if (options.responseFormat?.type === 'json_object') {
        try {
          JSON.parse(content);
          return { content };
        } catch (e) {
          throw new Error(`Failed to parse JSON response from Claude: ${content}`);
        }
      }

      return { content };
    } catch (error: any) {
      throw new Error(`Claude completion failed: ${error.message}`);
    }
  }
}

/**
 * Google (Gemini) provider implementation.
 */
class GoogleProvider extends BaseAiProvider {
  private genAI: GoogleGenerativeAI;

  constructor() {
    super();
    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY or GEMINI_API_KEY environment variable is required');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  private getModel(options: ChatCompletionOptions): string {
    const envModel = process.env.GOOGLE_AI_MODEL;
    if (envModel === 'gemini-1.5-flash' || envModel === 'gemini-1.5-flash-001') {
      return 'gemini-2.5-flash';
    }
    return envModel || 'gemini-2.5-flash';
  }

  async createChatCompletion(
    messages: ChatMessage[],
    options: ChatCompletionOptions
  ): Promise<ChatCompletionResult> {
    const systemMessage = messages.find((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    const generationConfig: any = {
      temperature: options.temperature ?? 0.3,
    };

    if (options.responseFormat?.type === 'json_object') {
      generationConfig.response_mime_type = 'application/json';
    }

    if (options.maxTokens) {
      generationConfig.maxOutputTokens = options.maxTokens;
    }

    const model = this.genAI.getGenerativeModel({
      model: this.getModel(options),
      generationConfig,
      systemInstruction: systemMessage?.content,
    });

    const lastMessage = conversationMessages.slice(-1)[0];
    const history = conversationMessages.slice(0, -1).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{text: msg.content}]
    }));

    const chat = model.startChat({ history: history as any });

    const result = await chat.sendMessage(lastMessage.content);
    const response = result.response;
    const content = response.text();

    if (!content) {
      throw new Error('No response from Google AI');
    }
    return { content };
  }
}


/**
 * Detects which AI provider to use based on available environment variables.
 * Priority: OPENAI_API_KEY > ANTHROPIC_API_KEY > GOOGLE_AI_API_KEY/GEMINI_API_KEY
 */
export function detectProvider(authContext?: AuthContext): AIProvider {
  // Unauthenticated users are restricted to Google provider
  if (authContext && !authContext.isAuthenticated) {
    return 'google';
  }

  if (process.env.OPENAI_API_KEY) {
    return 'openai';
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return 'claude';
  }
  if (process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY) {
    return 'google';
  }
  throw new Error(
    'No AI provider API key found. Please set one of: OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_AI_API_KEY, or GEMINI_API_KEY'
  );
}

const providers: { [key in AIProvider]?: BaseAiProvider } = {};

function getProvider(provider: AIProvider): BaseAiProvider {
  if (providers[provider]) {
    return providers[provider]!;
  }

  switch (provider) {
    case 'openai':
      providers[provider] = new OpenAiProvider();
      break;
    case 'claude':
      providers[provider] = new ClaudeProvider();
      break;
    case 'google':
      providers[provider] = new GoogleProvider();
      break;
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
  return providers[provider]!;
}

/**
 * Creates a chat completion using the detected or specified provider
 */
export async function createChatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {},
  authContext?: AuthContext
): Promise<ChatCompletionResult> {
  const providerName = (process.env.AI_PROVIDER as AIProvider) || detectProvider(authContext);
  const provider = getProvider(providerName);
  return provider.createChatCompletion(messages, options);
}