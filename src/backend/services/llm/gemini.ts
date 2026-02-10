/**
 * Gemini Provider
 * Google Gemini implementation of the AgentProvider interface
 *
 * Supports Gemini 3 Flash and Pro models with:
 * - Function calling
 * - Thinking levels (minimal, low, medium, high)
 * - Multimodal inputs (text, images, audio, video)
 * - Streaming responses
 */

import {
  GoogleGenAI,
  type Content,
  type Part,
  type Tool,
  type FunctionDeclaration,
  type GenerateContentResponse,
} from "@google/genai";
import type {
  AgentProvider,
  ProviderConfig,
  ProviderCapabilities,
  ModelConfig,
  UnifiedMessage,
  UnifiedContent,
  UnifiedResponse,
  UnifiedStreamChunk,
  UnifiedTool,
  UnifiedToolCall,
  ChatOptions,
  ModelTier,
  StopReason,
  TextContent,
  ToolUseContent,
  ToolResultContent,
  GeminiOptions,
} from "./types";

/**
 * Default model configuration for Gemini
 * Using Gemini 3 Flash for both tiers with different thinking levels
 */
const DEFAULT_MODELS: ModelConfig = {
  fast: "gemini-3-flash-preview",
  smart: "gemini-3-flash-preview",
};

/**
 * Gemini provider capabilities
 */
const CAPABILITIES: ProviderCapabilities = {
  toolCalling: true,
  vision: true,
  audio: true,
  video: true,
  streaming: true,
  thinking: true, // Gemini 3 has thinking levels
  maxContextTokens: 1048576, // 1M context window
  maxOutputTokens: 65536,
};

/**
 * Default thinking levels for each tier
 */
const DEFAULT_THINKING_LEVELS: Record<
  ModelTier,
  GeminiOptions["thinkingLevel"]
> = {
  fast: "minimal",
  smart: "medium",
};

/**
 * Convert unified message role to Gemini role
 */
function toGeminiRole(role: UnifiedMessage["role"]): "user" | "model" {
  return role === "assistant" ? "model" : "user";
}

/**
 * Convert unified content to Gemini parts
 */
function toGeminiParts(content: string | UnifiedContent[]): Part[] {
  if (typeof content === "string") {
    return [{ text: content }];
  }

  const parts: Part[] = [];

  for (const block of content) {
    switch (block.type) {
      case "text":
        parts.push({ text: (block as TextContent).text });
        break;

      case "tool_result":
        // Tool results are sent as function responses
        const toolResult = block as ToolResultContent;
        parts.push({
          functionResponse: {
            name: toolResult.toolUseId, // We'll need to track the function name separately
            response: {
              content: toolResult.content,
              error: toolResult.isError,
            },
          },
        });
        break;

      case "image":
        const imageBlock = block as {
          type: "image";
          source: {
            type: string;
            mediaType?: string;
            data?: string;
            url?: string;
          };
        };
        if (imageBlock.source.type === "base64" && imageBlock.source.data) {
          parts.push({
            inlineData: {
              mimeType: imageBlock.source.mediaType || "image/png",
              data: imageBlock.source.data,
            },
          });
        }
        break;

      // Tool use blocks are only in responses, not requests
      case "tool_use":
        // Skip - these come from model responses
        break;
    }
  }

  return parts;
}

/**
 * Convert unified message to Gemini content
 */
function toGeminiContent(message: UnifiedMessage): Content {
  return {
    role: toGeminiRole(message.role),
    parts: toGeminiParts(message.content),
  };
}

/**
 * Convert unified tool to Gemini function declaration
 */
function toGeminiFunctionDeclaration(tool: UnifiedTool): FunctionDeclaration {
  return {
    name: tool.name,
    description: tool.description,
    parameters: {
      type: "object",
      properties: tool.parameters.properties as Record<string, unknown>,
      required: tool.parameters.required,
    },
  };
}

/**
 * Convert Gemini response to unified format
 */
function fromGeminiResponse(
  response: GenerateContentResponse,
  responseId: string,
): UnifiedResponse {
  const content: UnifiedContent[] = [];

  // Process response candidates
  const candidate = response.candidates?.[0];
  if (candidate?.content?.parts) {
    for (const part of candidate.content.parts) {
      if ("text" in part && part.text) {
        content.push({
          type: "text",
          text: part.text,
        });
      }

      if ("functionCall" in part && part.functionCall) {
        content.push({
          type: "tool_use",
          id: `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: part.functionCall.name || "",
          input: (part.functionCall.args as Record<string, unknown>) || {},
        });
      }
    }
  }

  // Determine stop reason
  let stopReason: StopReason = "end_turn";
  const finishReason = candidate?.finishReason;
  if (finishReason === "STOP") {
    stopReason = "end_turn";
  } else if (finishReason === "MAX_TOKENS") {
    stopReason = "max_tokens";
  } else if (content.some((c) => c.type === "tool_use")) {
    stopReason = "tool_use";
  }

  // Extract usage
  const usageMetadata = response.usageMetadata;

  return {
    id: responseId,
    content,
    stopReason,
    usage: {
      inputTokens: usageMetadata?.promptTokenCount || 0,
      outputTokens: usageMetadata?.candidatesTokenCount || 0,
      thinkingTokens: usageMetadata?.thoughtsTokenCount || 0,
    },
    raw: response,
  };
}

/**
 * Google Gemini Provider Implementation
 */
export class GeminiProvider implements AgentProvider {
  readonly name = "gemini" as const;
  readonly capabilities = CAPABILITIES;
  readonly models: ModelConfig;

  private client: GoogleGenAI;
  private defaultOptions: Partial<ChatOptions>;

  constructor(config: ProviderConfig) {
    this.client = new GoogleGenAI({ apiKey: config.apiKey });
    this.models = config.models || DEFAULT_MODELS;
    this.defaultOptions = config.defaultOptions || {};
  }

  /**
   * Get model ID for a tier
   */
  getModel(tier: ModelTier): string {
    return this.models[tier];
  }

  /**
   * Validate the provider configuration
   */
  async validate(): Promise<boolean> {
    try {
      // Make a minimal API call to validate credentials
      await this.client.models.generateContent({
        model: this.models.fast,
        contents: "hi",
      });
      return true;
    } catch (error) {
      console.error("[GeminiProvider] Validation failed:", error);
      return false;
    }
  }

  /**
   * Send a chat completion request
   */
  async chat(
    messages: UnifiedMessage[],
    options: ChatOptions,
  ): Promise<UnifiedResponse> {
    // Separate system messages from conversation messages
    const systemMessages = messages.filter((m) => m.role === "system");
    const conversationMessages = messages.filter((m) => m.role !== "system");

    // Build system instruction
    let systemInstruction = options.systemPrompt || "";
    for (const msg of systemMessages) {
      const text =
        typeof msg.content === "string"
          ? msg.content
          : msg.content
              .filter((c): c is TextContent => c.type === "text")
              .map((c) => c.text)
              .join("\n");
      systemInstruction += (systemInstruction ? "\n\n" : "") + text;
    }

    // Convert messages to Gemini format
    const geminiContents = conversationMessages.map(toGeminiContent);

    // Convert tools to Gemini format
    const tools: Tool[] | undefined = options.tools
      ? [
          {
            functionDeclarations: options.tools.map(
              toGeminiFunctionDeclaration,
            ),
          },
        ]
      : undefined;

    // Determine thinking level
    const geminiOptions = options.providerOptions as GeminiOptions | undefined;
    const thinkingLevel =
      geminiOptions?.thinkingLevel || DEFAULT_THINKING_LEVELS[options.tier];

    // Make the API call
    const response = await this.client.models.generateContent({
      model: this.getModel(options.tier),
      contents: geminiContents,
      config: {
        systemInstruction: systemInstruction || undefined,
        tools,
        maxOutputTokens: options.maxTokens,
        temperature: options.temperature,
        // thinkingConfig for Gemini 2.5+ models
        thinkingConfig: {
          thinkingBudget:
            thinkingLevel === "minimal"
              ? 0
              : thinkingLevel === "low"
                ? 1024
                : thinkingLevel === "medium"
                  ? 4096
                  : 8192,
        },
      },
    });

    const responseId = `gemini_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return fromGeminiResponse(response, responseId);
  }

  /**
   * Send a streaming chat completion request
   */
  async *streamChat(
    messages: UnifiedMessage[],
    options: ChatOptions,
  ): AsyncIterable<UnifiedStreamChunk> {
    // Separate system messages from conversation messages
    const systemMessages = messages.filter((m) => m.role === "system");
    const conversationMessages = messages.filter((m) => m.role !== "system");

    // Build system instruction
    let systemInstruction = options.systemPrompt || "";
    for (const msg of systemMessages) {
      const text =
        typeof msg.content === "string"
          ? msg.content
          : msg.content
              .filter((c): c is TextContent => c.type === "text")
              .map((c) => c.text)
              .join("\n");
      systemInstruction += (systemInstruction ? "\n\n" : "") + text;
    }

    // Convert messages to Gemini format
    const geminiContents = conversationMessages.map(toGeminiContent);

    // Convert tools to Gemini format
    const tools: Tool[] | undefined = options.tools
      ? [
          {
            functionDeclarations: options.tools.map(
              toGeminiFunctionDeclaration,
            ),
          },
        ]
      : undefined;

    // Determine thinking level
    const geminiOptions = options.providerOptions as GeminiOptions | undefined;
    const thinkingLevel =
      geminiOptions?.thinkingLevel || DEFAULT_THINKING_LEVELS[options.tier];

    // Create streaming request
    const streamResult = await this.client.models.generateContentStream({
      model: this.getModel(options.tier),
      contents: geminiContents,
      config: {
        systemInstruction: systemInstruction || undefined,
        tools,
        maxOutputTokens: options.maxTokens,
        temperature: options.temperature,
        thinkingConfig: {
          thinkingBudget:
            thinkingLevel === "minimal"
              ? 0
              : thinkingLevel === "low"
                ? 1024
                : thinkingLevel === "medium"
                  ? 4096
                  : 8192,
        },
      },
    });

    // Emit message start
    yield { type: "message_start" };

    let currentBlockType: "text" | "tool_use" | null = null;

    // Process stream chunks
    for await (const chunk of streamResult) {
      const candidate = chunk.candidates?.[0];
      if (!candidate?.content?.parts) continue;

      for (const part of candidate.content.parts) {
        // Handle text parts
        if ("text" in part && part.text) {
          if (currentBlockType !== "text") {
            // Start new text block
            if (currentBlockType !== null) {
              yield { type: "content_block_stop" };
            }
            currentBlockType = "text";
            yield {
              type: "content_block_start",
              contentBlock: { type: "text" },
            };
          }

          yield {
            type: "content_block_delta",
            delta: {
              type: "text_delta",
              text: part.text,
            },
          };
        }

        // Handle function call parts
        if ("functionCall" in part && part.functionCall) {
          if (currentBlockType !== null) {
            yield { type: "content_block_stop" };
          }
          currentBlockType = "tool_use";

          const toolId = `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          yield {
            type: "content_block_start",
            contentBlock: {
              type: "tool_use",
              id: toolId,
              name: part.functionCall.name || "",
            },
          };

          // Send the args as JSON delta
          const argsJson = JSON.stringify(part.functionCall.args || {});
          yield {
            type: "content_block_delta",
            delta: {
              type: "input_json_delta",
              partialJson: argsJson,
            },
          };

          yield { type: "content_block_stop" };
          currentBlockType = null;
        }
      }

      // Check for finish reason
      if (candidate.finishReason) {
        let stopReason: StopReason = "end_turn";
        if (candidate.finishReason === "MAX_TOKENS") {
          stopReason = "max_tokens";
        } else if (candidate.finishReason === "STOP") {
          stopReason = "end_turn";
        }

        yield {
          type: "message_delta",
          stopReason,
        };
      }
    }

    // Close any open block
    if (currentBlockType !== null) {
      yield { type: "content_block_stop" };
    }

    yield {
      type: "message_stop",
    };
  }
}

/**
 * Create a Gemini provider instance
 */
export function createGeminiProvider(config: ProviderConfig): AgentProvider {
  return new GeminiProvider(config);
}

/**
 * Analyze an image and return a brief description using Gemini vision
 */
export async function analyzeImage(
  imageBase64: string,
  mimeType: string,
  apiKey?: string,
): Promise<string> {
  const key = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY or GOOGLE_AI_API_KEY is required for image analysis");
  }

  const client = new GoogleGenAI({ apiKey: key });

  const response = await client.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType,
              data: imageBase64,
            },
          },
          {
            text: "Describe what you see in this photo in 1-2 concise sentences. Focus on the key subject and context. Do not be overly detailed.",
          },
        ],
      },
    ],
    config: {
      maxOutputTokens: 256,
      temperature: 0.3,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const text = response.candidates?.[0]?.content?.parts
    ?.filter((p): p is Part & { text: string } => "text" in p && !!p.text)
    .map((p) => p.text)
    .join("") || "Photo captured";

  return text.trim();
}

/**
 * Extract tool calls from a unified response
 */
export function extractToolCalls(response: UnifiedResponse): UnifiedToolCall[] {
  return response.content
    .filter((c): c is ToolUseContent => c.type === "tool_use")
    .map((c) => ({
      id: c.id,
      name: c.name,
      input: c.input,
    }));
}

/**
 * Extract text content from a unified response
 */
export function extractText(response: UnifiedResponse): string {
  return response.content
    .filter((c): c is TextContent => c.type === "text")
    .map((c) => c.text)
    .join("");
}

/**
 * Check if response contains tool calls
 */
export function hasToolCalls(response: UnifiedResponse): boolean {
  return response.content.some((c) => c.type === "tool_use");
}

/**
 * Create a tool result message for Gemini
 * Note: Gemini uses functionResponse format
 */
export function createToolResultMessage(
  toolUseId: string,
  functionName: string,
  content: string,
  isError = false,
): UnifiedMessage {
  return {
    role: "user",
    content: [
      {
        type: "tool_result",
        toolUseId: functionName, // Gemini uses function name, not ID
        content,
        isError,
      },
    ],
  };
}
