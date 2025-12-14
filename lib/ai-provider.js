"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectProvider = detectProvider;
exports.createChatCompletion = createChatCompletion;
const index_mjs_1 = __importDefault(require("openai/index.mjs"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const generative_ai_1 = require("@google/generative-ai");
/**
 * Base class for AI providers.
 */
class BaseAiProvider {
}
/**
 * OpenAI provider implementation.
 */
class OpenAiProvider extends BaseAiProvider {
    constructor() {
        super();
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY environment variable is required');
        }
        this.openai = new index_mjs_1.default({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    getModel(options) {
        return options.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
    }
    async createChatCompletion(messages, options) {
        const openaiMessages = messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
        }));
        const completion = await this.openai.chat.completions.create({
            model: this.getModel(options),
            messages: openaiMessages,
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
    constructor() {
        super();
        if (!process.env.ANTHROPIC_API_KEY) {
            throw new Error('ANTHROPIC_API_KEY environment variable is required');
        }
        this.anthropic = new sdk_1.default({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });
    }
    getModel(options) {
        return options.model || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
    }
    async createChatCompletion(messages, options) {
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
                role: msg.role,
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
                }
                catch (e) {
                    throw new Error(`Failed to parse JSON response from Claude: ${content}`);
                }
            }
            return { content };
        }
        catch (error) {
            throw new Error(`Claude completion failed: ${error.message}`);
        }
    }
}
/**
 * Google (Gemini) provider implementation.
 */
class GoogleProvider extends BaseAiProvider {
    constructor() {
        super();
        const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GOOGLE_AI_API_KEY or GEMINI_API_KEY environment variable is required');
        }
        this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    }
    getModel(options) {
        const envModel = process.env.GOOGLE_AI_MODEL;
        // Use the environment model if set, otherwise default to gemini-1.5-pro
        return envModel || 'gemini-1.5-pro';
    }
    async createChatCompletion(messages, options) {
        const systemMessage = messages.find((m) => m.role === 'system');
        const conversationMessages = messages.filter((m) => m.role !== 'system');
        const generationConfig = {
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
            parts: [{ text: msg.content }]
        }));
        const chat = model.startChat({ history: history });
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
 * Modified to only use OpenAI when available, disable other providers
 */
function detectProvider(authContext) {
    // Only use OpenAI if available
    if (process.env.OPENAI_API_KEY) {
        return 'openai';
    }
    // Disable other providers - only OpenAI is supported
    throw new Error('OpenAI API key is required. Please set OPENAI_API_KEY environment variable.');
}
const providers = {};
function getProvider(provider) {
    if (providers[provider]) {
        return providers[provider];
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
    return providers[provider];
}
/**
 * Creates a chat completion using the detected or specified provider
 */
async function createChatCompletion(messages, options = {}, authContext) {
    const providerName = process.env.AI_PROVIDER || detectProvider(authContext);
    const provider = getProvider(providerName);
    return provider.createChatCompletion(messages, options);
}
