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

/**
 * Gets the model for OpenAI from environment variable or returns default
 */
function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL || 'gpt-4o-mini';
}

/**
 * Gets the model for Claude from environment variable or returns default
 */
function getClaudeModel(): string {
  return process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
}

/**
 * Gets the model for Google AI from environment variable or returns default
 */
function getGoogleAIModel(): string {
  return process.env.GOOGLE_AI_MODEL || 'gemini-1.5-flash';
}

/**
 * Gets the Google AI API key from environment variables.
 * Supports both GOOGLE_AI_API_KEY and GEMINI_API_KEY for backwards compatibility.
 */
function getGoogleAIApiKey(): string | undefined {
  return process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
}

/**
 * Detects which AI provider to use based on available environment variables.
 * Priority: OPENAI_API_KEY > ANTHROPIC_API_KEY > GOOGLE_AI_API_KEY/GEMINI_API_KEY
 */
export function detectProvider(): AIProvider {
  if (process.env.OPENAI_API_KEY) {
    return 'openai';
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return 'claude';
  }
  if (getGoogleAIApiKey()) {
    return 'google';
  }
  throw new Error(
    'No AI provider API key found. Please set one of: OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_AI_API_KEY, or GEMINI_API_KEY'
  );
}

/**
 * Creates a chat completion using the detected or specified provider
 */
export async function createChatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): Promise<ChatCompletionResult> {
  const provider = (process.env.AI_PROVIDER as AIProvider) || detectProvider();

  switch (provider) {
    case 'openai':
      return createOpenAICompletion(messages, options);
    case 'claude':
      return createClaudeCompletion(messages, options);
    case 'google':
      return createGoogleCompletion(messages, options);
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

async function createOpenAICompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions
): Promise<ChatCompletionResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Convert messages to OpenAI format
  const openaiMessages = messages.map((msg) => ({
    role: msg.role === 'system' ? 'system' : msg.role === 'user' ? 'user' : 'assistant',
    content: msg.content,
  }));

  const completion = await openai.chat.completions.create({
    model: options.model || getOpenAIModel(),
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

async function createClaudeCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions
): Promise<ChatCompletionResult> {
  // Validate API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  // Validate that we have at least one message
  if (!messages || messages.length === 0) {
    throw new Error('At least one message is required');
  }

  // Initialize Anthropic client
  const anthropic = new Anthropic({
    apiKey: apiKey,
  });

  // Separate system message from conversation messages
  // Anthropic supports a single system message via the 'system' parameter
  const systemMessage = messages.find((m) => m.role === 'system');
  const conversationMessages = messages.filter((m) => m.role !== 'system');

  // Validate we have conversation messages
  if (conversationMessages.length === 0) {
    throw new Error('At least one user or assistant message is required');
  }

  // Convert to Claude message format with proper typing
  const claudeMessages: Array<{ role: 'user' | 'assistant'; content: string }> = 
    conversationMessages.map((msg) => {
      if (msg.role !== 'user' && msg.role !== 'assistant') {
        throw new Error(`Invalid message role: ${msg.role}. Only 'user' and 'assistant' are supported.`);
      }
      return {
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      };
    });

  // Use system message if provided, otherwise use a default
  const systemPrompt = systemMessage
    ? systemMessage.content
    : undefined; // Anthropic SDK handles undefined system gracefully

  try {
    const response = await anthropic.messages.create({
      model: options.model || getClaudeModel(),
      max_tokens: options.maxTokens || 4096,
      system: systemPrompt,
      messages: claudeMessages,
      temperature: options.temperature ?? 0.3,
    });

    // Extract text content from response
    // Anthropic returns content as an array of content blocks
    if (!response.content || response.content.length === 0) {
      throw new Error('No content in Claude response');
    }

    // Handle different content types (text, tool_use, etc.)
    // Extract text from text blocks
    const textParts: string[] = [];
    for (const block of response.content) {
      if (block.type === 'text') {
        textParts.push(block.text);
      }
    }

    if (textParts.length === 0) {
      throw new Error('No text content in Claude response');
    }

    // Combine all text blocks
    const content = textParts.join('\n\n');

    if (!content || content.trim().length === 0) {
      throw new Error('Empty response from Claude');
    }

    // If JSON format is requested, extract and validate JSON
    if (options.responseFormat?.type === 'json_object') {
      // Try to extract JSON from the response
      // Handle cases where JSON might be wrapped in code fences or have extra text
      let jsonContent = content.trim();

      // Remove markdown code fences if present
      if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      // Try to find JSON object in the content
      const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          // Validate it's valid JSON
          JSON.parse(jsonMatch[0]);
          return { content: jsonMatch[0] };
        } catch (parseError) {
          // If JSON parsing fails, log warning but return original content
          console.warn('Failed to parse extracted JSON from Claude response:', parseError);
          // Fall through to return original content
        }
      }
    }

    return { content };
  } catch (error: any) {
    // Handle Anthropic-specific errors
    if (error && typeof error === 'object' && 'status' in error && 'message' in error) {
      const apiError = error as { status?: number; message?: string; type?: string };
      throw new Error(
        `Anthropic API error: ${apiError.message || 'Unknown error'} (status: ${apiError.status || 'unknown'}${apiError.type ? `, type: ${apiError.type}` : ''})`
      );
    }
    // Re-throw other errors with original message
    throw new Error(
      `Claude completion failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function createGoogleCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions
): Promise<ChatCompletionResult> {
  const apiKey = getGoogleAIApiKey();
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY or GEMINI_API_KEY environment variable is required');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Separate system message from conversation messages
  const systemMessage = messages.find((m) => m.role === 'system');
  const conversationMessages = messages.filter((m) => m.role !== 'system');

  const generationConfig: any = {
    temperature: options.temperature ?? 0.3,
  };

  // Google AI supports JSON mode via response_mime_type
  if (options.responseFormat?.type === 'json_object') {
    generationConfig.response_mime_type = 'application/json';
  }

  if (options.maxTokens) {
    generationConfig.maxOutputTokens = options.maxTokens;
  }

  const model = genAI.getGenerativeModel({
    model: options.model || getGoogleAIModel(),
    generationConfig,
  });

  // Build the prompt with system message if present
  let prompt = '';
  if (systemMessage) {
    prompt = `${systemMessage.content}\n\n`;
  }

  // Handle conversation history properly
  // For single-turn conversations (most common case), use the last user message
  // For multi-turn, combine all messages
  if (conversationMessages.length === 1 && conversationMessages[0].role === 'user') {
    // Simple single-turn case
    prompt += conversationMessages[0].content;
    const result = await model.generateContent(prompt);
    const response = result.response;
    const content = response.text();
    
    if (!content) {
      throw new Error('No response from Google AI');
    }
    return { content };
  } else {
    // Multi-turn conversation - use chat history
    // Convert messages to Google AI format
    const chatHistory = conversationMessages
      .slice(0, -1) // All but the last message
      .map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));

    const lastMessage = conversationMessages[conversationMessages.length - 1];
    
    // Start a chat with history
    const chat = model.startChat({
      history: chatHistory as any,
      systemInstruction: systemMessage?.content,
    });

    const result = await chat.sendMessage(lastMessage.content);
    const response = result.response;
    const content = response.text();
    
    if (!content) {
      throw new Error('No response from Google AI');
    }
    return { content };
  }
}

