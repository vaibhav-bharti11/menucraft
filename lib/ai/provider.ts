// lib/ai/provider.ts
// Centralized OpenRouter API Gateway Provider

import { getAIConfig } from './config';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  modelOverride?: string;
  responseFormatJson?: boolean;
}

export async function callOpenRouter<T = unknown>(options: OpenRouterCompletionOptions): Promise<T> {
  const config = getAIConfig();

  if (!config.apiKey) {
    throw new Error(
      'OPENROUTER_API_KEY is not configured in server environment. Please set OPENROUTER_API_KEY in your .env file.'
    );
  }

  const model = options.modelOverride || config.model;
  const url = 'https://openrouter.ai/api/v1/chat/completions';

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json',
  };

  if (config.siteUrl) {
    headers['HTTP-Referer'] = config.siteUrl;
  }
  if (config.appName) {
    headers['X-Title'] = config.appName;
  }

  const body: Record<string, unknown> = {
    model,
    messages: options.messages,
    temperature: options.temperature ?? 0.4,
    max_tokens: options.maxTokens ?? 2048,
  };

  if (options.responseFormatJson) {
    body['response_format'] = { type: 'json_object' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  const startTime = Date.now();

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timer);
    const duration = Date.now() - startTime;

    if (!res.ok) {
      const errorText = await res.text();
      let parsedErr: any = null;
      try {
        parsedErr = JSON.parse(errorText);
      } catch {}

      const message =
        parsedErr?.error?.message ||
        `OpenRouter API returned HTTP ${res.status}: ${res.statusText}`;

      console.error(`[AI Provider] OpenRouter error (${duration}ms) [${res.status}]:`, message);

      if (res.status === 401 || res.status === 403) {
        throw new Error('Invalid or unauthorized OpenRouter API Key. Please check server configuration.');
      }
      if (res.status === 429) {
        throw new Error('OpenRouter rate limit or quota exceeded. Please try again shortly.');
      }
      throw new Error(`AI Gateway Error: ${message}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content || typeof content !== 'string') {
      throw new Error('Empty or malformed completion received from AI gateway.');
    }

    // Safe JSON recovery from raw completion
    return extractAndParseJson<T>(content);
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error(`AI request timed out after ${config.timeoutMs / 1000}s. Please retry.`);
    }
    throw err;
  }
}

/**
 * Robust JSON extraction from LLM responses (stripping markdown fences, trailing tokens, etc.)
 */
export function extractAndParseJson<T>(rawContent: string): T {
  let trimmed = rawContent.trim();

  // Strip markdown code fences if present: ```json ... ``` or ``` ... ```
  if (trimmed.startsWith('```')) {
    const lines = trimmed.split('\n');
    lines.shift(); // Remove opening ```
    if (lines.length > 0 && lines[lines.length - 1].trim().startsWith('```')) {
      lines.pop(); // Remove closing ```
    }
    trimmed = lines.join('\n').trim();
  }

  // Find first { or [ and last } or ]
  const firstBrace = trimmed.indexOf('{');
  const firstBracket = trimmed.indexOf('[');
  
  let startIdx = -1;
  let endIdx = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    endIdx = trimmed.lastIndexOf('}');
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endIdx = trimmed.lastIndexOf(']');
  }

  if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
    trimmed = trimmed.substring(startIdx, endIdx + 1);
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch (jsonErr: any) {
    console.error('[AI Provider] Failed to parse JSON from AI response:', rawContent);
    throw new Error(`Failed to parse structured response from AI model: ${jsonErr.message}`);
  }
}
