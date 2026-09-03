// lib/ai/config.ts
// Configuration for OpenRouter LLM gateway

export interface AIConfig {
  apiKey: string;
  model: string;
  siteUrl?: string;
  appName?: string;
  timeoutMs: number;
}

export function getAIConfig(): AIConfig {
  const apiKey = process.env.OPENROUTER_API_KEY || '';
  
  // Default to a fast, reliable, current model on OpenRouter
  const model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
  const siteUrl = process.env.OPENROUTER_SITE_URL || 'https://menucraft.local';
  const appName = process.env.OPENROUTER_APP_NAME || 'MenuCraft Catering Platform';
  const timeoutMs = parseInt(process.env.OPENROUTER_TIMEOUT_MS || '45000', 10);

  return {
    apiKey,
    model,
    siteUrl,
    appName,
    timeoutMs,
  };
}

export function isAIConfigured(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}
