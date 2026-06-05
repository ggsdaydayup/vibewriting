export type AIProvider = "openai" | "anthropic" | "deepseek" | "qwen" | "custom";

export interface AIProviderConfig {
  provider: AIProvider;
  model: string;
  apiKey: string;
  baseUrl?: string;
}

export interface CompleteRequest {
  chapterId: string;
  recentText: string;
  cursorPosition: number;
}

export interface InlineEditRequest {
  chapterId: string;
  selectedText: string;
  instruction: string;
  surroundingContext?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  chapterId: string;
  messages: ChatMessage[];
}

export interface AutopilotRequest {
  chapterId: string;
  vibePrompt?: string;
  targetWordCount?: number;
}
