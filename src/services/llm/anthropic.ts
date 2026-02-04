/**
 * Anthropic Provider
 * Claude implementation of the AgentProvider interface
 */

import Anthropic from "@anthropic-ai/sdk";
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
} from "./types";

/**
 * Default model configuration for Anthropic
 */
const DEFAULT_MODELS: ModelConfig = {
  fast: "claude-haiku-4-5-20251001",
  smart: "claude-sonnet-4-5-20250929",
};

/**
 * Anthropic provider capabilities
 */
const CAPABILITIES: ProviderCapabilities = {
  toolCalling: true,
  vision: true,
  audio: false,
  video: false,
  streaming: true,
  thinking: false, // Claude doesn't have explicit thinking tokens like Gemini 3
  maxContextTokens: 200000,
  maxOutputTokens: 8192,
};

/**
 * Convert unified message to Anthropic format
 */
function toAnthropicMessage(
  message: UnifiedMessage
): Anthropic.Messages.MessageParam {
  // Handle string content
  if (typeof message.content === "string") {
    return {
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content,
    };
  }

  // Handle content array
  const anthropicContent: Anthropic.Messages.ContentBlockParam[] = [];

  for (const block of message.content) {
    switch (block.type) {
      case "text":
        anthropicContent.push({
          type: "text",
          text: (block as TextContent).text,
        });
        break;

      case "tool_use":
        // Tool use blocks come from assistant messages
        anthropicContent.push({
          type: "tool_use",
          id: (block as ToolUseContent).id,
          name: (block as ToolUseContent).name,
          input: (block as ToolUseContent).input,
        });
        break;

      case "tool_result":
        anthropicContent.push({
          type: "tool_result",
          tool_use_id: (block as ToolResultContent).toolUseId,
          content: (block as ToolResultContent).content,
          is_error: (block as ToolResultContent).isError,
        });
        break;

      case "image":
        // Handle image content
        const imageBlock = block as {
          type: "image";
          source: { type: string; mediaType?: string; data?: string; url?: string };
        };
        if (imageBlock.source.type === "base64" && imageBlock.source.data) {
          anthropicContent.push({
            type: "image",
            source: {
              type: "base64",
              media_type: (imageBlock.source.mediaType || "image/png") as
                | "image/png"
                | "image/jpeg"
                | "image/gif"
                | "image/webp",
              data: imageBlock.source.data,
            },
          });
        }
        break;
    }
  }

  return {
    role: message.role === "assistant" ? "assistant" : "user",
    content: anthropicContent,
  };
}

/**
 * Convert unified tool to Anthropic format
 */
function toAnthropicTool(tool: UnifiedTool): Anthropic.Messages.Tool {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: {
      type: "object",
      properties: tool.parameters.properties,
      required: tool.parameters.required,
    },
  };
}

/**
 * Convert Anthropic content block to unified format
 */
function fromAnthropicContentBlock(
  block: Anthropic.Messages.ContentBlock
): UnifiedContent {
  if (block.type === "text") {
    return {
      type: "text",
      text: block.text,
    };
  }

  if (block.type === "tool_use") {
    return {
      type: "tool_use",
      id: block.id,
      name: block.name,
      input: block.input as Record<string, unknown>,
    };
  }

  // Fallback for unknown types
  return {
    type: "text",
    text: JSON.stringify(block),
  };
}

/**
 * Convert Anthropic stop reason to unified format
 */
function fromAnthropicStopReason(
  reason: Anthropic.Messages.Message["stop_reason"]
): StopReason {
  switch (reason) {
    case "end_turn":
      return "end_turn";
    case "tool_use":
      return "tool_use";
    case "max_tokens":
      return "max_tokens";
    case "stop_sequence":
      return "stop_sequence";
    default:
      return "end_turn";
  }
}

/**
 * Convert Anthropic response to unified format
 */
function fromAnthropicResponse(
  response: Anthropic.Messages.Message
): UnifiedResponse {
  return {
    id: response.id,
    content: response.content.map(fromAnthropicContentBlock),
    stopReason: fromAnthropicStopReason(response.stop_reason),
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
    raw: response,
  };
}

/**
 * Anthropic (Claude) Provider Implementation
 */
export class AnthropicProvider implements AgentProvider {
  readonly name = "anthropic" as const;
  readonly capabilities = CAPABILITIES;
  readonly models: ModelConfig;

  private client: Anthropic;

  constructor(config: ProviderConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
    this.models = config.models || DEFAULT_MODELS;
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
      await this.client.messages.create({
        model: this.models.fast,
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      });
      return true;
    } catch (error) {
      console.error("[AnthropicProvider] Validation failed:", error);
      return false;
    }
  }

  /**
   * Send a chat completion request
   */
  async chat(
    messages: UnifiedMessage[],
    options: ChatOptions
  ): Promise<UnifiedResponse> {
    // Separate system messages from conversation messages
    const systemMessages = messages.filter((m) => m.role === "system");
    const conversationMessages = messages.filter((m) => m.role !== "system");

    // Build system prompt
    let systemPrompt = options.systemPrompt || "";
    for (const msg of systemMessages) {
      const text =
        typeof msg.content === "string"
          ? msg.content
          : msg.content
              .filter((c): c is TextContent => c.type === "text")
              .map((c) => c.text)
              .join("\n");
      systemPrompt += (systemPrompt ? "\n\n" : "") + text;
    }

    // Convert messages
    const anthropicMessages = conversationMessages.map(toAnthropicMessage);

    // Convert tools
    const anthropicTools = options.tools?.map(toAnthropicTool);

    // Make the API call
    const response = await this.client.messages.create({
      model: this.getModel(options.tier),
      max_tokens: options.maxTokens,
      system: systemPrompt || undefined,
      messages: anthropicMessages,
      tools: anthropicTools,
      temperature: options.temperature,
    });

    return fromAnthropicResponse(response);
  }

  /**
   * Send a streaming chat completion request
   */
  async *streamChat(
    messages: UnifiedMessage[],
    options: ChatOptions
  ): AsyncIterable<UnifiedStreamChunk> {
    // Separate system messages from conversation messages
    const systemMessages = messages.filter((m) => m.role === "system");
    const conversationMessages = messages.filter((m) => m.role !== "system");

    // Build system prompt
    let systemPrompt = options.systemPrompt || "";
    for (const msg of systemMessages) {
      const text =
        typeof msg.content === "string"
          ? msg.content
          : msg.content
              .filter((c): c is TextContent => c.type === "text")
              .map((c) => c.text)
              .join("\n");
      systemPrompt += (systemPrompt ? "\n\n" : "") + text;
    }

    // Convert messages
    const anthropicMessages = conversationMessages.map(toAnthropicMessage);

    // Convert tools
    const anthropicTools = options.tools?.map(toAnthropicTool);

    // Create streaming request
    const stream = this.client.messages.stream({
      model: this.getModel(options.tier),
      max_tokens: options.maxTokens,
      system: systemPrompt || undefined,
      messages: anthropicMessages,
      tools: anthropicTools,
      temperature: options.temperature,
    });

    // Process stream events
    for await (const event of stream) {
      switch (event.type) {
        case "message_start":
          yield {
            type: "message_start",
          };
          break;

        case "content_block_start":
          yield {
            type: "content_block_start",
            contentBlock: {
              type: event.content_block.type as "text" | "tool_use",
              id:
                event.content_block.type === "tool_use"
                  ? event.content_block.id
                  : undefined,
              name:
                event.content_block.type === "tool_use"
                  ? event.content_block.name
                  : undefined,
            },
          };
          break;

        case "content_block_delta":
          if (event.delta.type === "text_delta") {
            yield {
              type: "content_block_delta",
              delta: {
                type: "text_delta",
                text: event.delta.text,
              },
            };
          } else if (event.delta.type === "input_json_delta") {
            yield {
              type: "content_block_delta",
              delta: {
                type: "input_json_delta",
                partialJson: event.delta.partial_json,
              },
            };
          }
          break;

        case "content_block_stop":
          yield {
            type: "content_block_stop",
          };
          break;

        case "message_delta":
          yield {
            type: "message_delta",
            stopReason: fromAnthropicStopReason(event.delta.stop_reason),
            usage: event.usage
              ? {
                  inputTokens: 0, // Not provided in delta
                  outputTokens: event.usage.output_tokens,
                }
              : undefined,
          };
          break;

        case "message_stop":
          yield {
            type: "message_stop",
          };
          break;

        case "error":
          yield {
            type: "error",
            error: {
              type: "api_error",
              message:
                event.error instanceof Error
                  ? event.error.message
                  : String(event.error),
            },
          };
          break;
      }
    }
  }
}

/**
 * Create an Anthropic provider instance
 */
export function createAnthropicProvider(config: ProviderConfig): AgentProvider {
  return new AnthropicProvider(config);
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
 * Create a tool result message
 */
export function createToolResultMessage(
  toolUseId: string,
  content: string,
  isError = false
): UnifiedMessage {
  return {
    role: "user",
    content: [
      {
        type: "tool_result",
        toolUseId,
        content,
        isError,
      },
    ],
  };
}
