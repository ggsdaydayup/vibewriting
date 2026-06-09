import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { AIProviderConfig } from "@vibewriting/shared";
import type { LanguageModel } from "ai";

/** Returns a LanguageModel instance ready for use with the Vercel AI SDK */
export function createAIProvider(config: AIProviderConfig): LanguageModel {
  const { provider, model, apiKey, baseUrl } = config;

  switch (provider) {
    case "anthropic":
      return createAnthropic({ apiKey })(model);

    case "openai":
      return createOpenAI({ apiKey })(model);

    case "deepseek":
      return createOpenAI({
        apiKey,
        baseURL: baseUrl || "https://api.deepseek.com/v1",
      })(model);

    case "qwen":
      return createOpenAI({
        apiKey,
        baseURL: baseUrl || "https://dashscope.aliyuncs.com/compatible-mode/v1",
      })(model);

    case "custom":
      if (!baseUrl) throw new Error("baseUrl is required for custom provider");
      return createOpenAI({ apiKey, baseURL: baseUrl })(model);

    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

export const PROVIDER_PRESETS: Record<
  string,
  { label: string; models: string[]; baseUrl?: string }
> = {
  openai: {
    label: "OpenAI",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
  },
  anthropic: {
    label: "Anthropic Claude",
    models: ["claude-opus-4-5", "claude-sonnet-4-5", "claude-haiku-3-5"],
  },
  deepseek: {
    label: "DeepSeek",
    models: ["deepseek-chat", "deepseek-reasoner"],
    baseUrl: "https://api.deepseek.com/v1",
  },
  qwen: {
    label: "通义千问",
    models: ["qwen-max", "qwen-plus", "qwen-turbo"],
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  },
  custom: {
    label: "自定义",
    models: [],
  },
};
