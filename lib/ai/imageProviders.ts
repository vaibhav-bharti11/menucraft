// lib/ai/imageProviders.ts
// Provider abstraction for AI food image generation.
// Supports OpenRouter, Google / Gemini (Imagen 3), OpenAI (DALL-E 3), and Mock/Offline test provider.

import type { Dish } from '../types';
import { buildDishImagePrompt, type GeneratedPromptResult } from './dishPromptEngine';

export interface ImageGenerationOptions {
  provider?: string;
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  width?: number;
  height?: number;
  quality?: 'standard' | 'hd';
}

export interface GeneratedImageResult {
  imageBuffer: Buffer;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  provider: string;
  model: string;
  prompt: string;
  promptVersion: string;
  durationMs: number;
}

export interface ProviderPreflightInfo {
  provider: string;
  model: string;
  isMock: boolean;
  authConfigured: boolean;
  envVarsExpected: string[];
  costPerImageUsd: number | null;
  pricingDescription: string;
  status: 'ready' | 'missing_key' | 'unsupported_model' | 'insufficient_credits' | 'offline_only';
  message: string;
}

export interface IImageGenerationProvider {
  name: string;
  getPreflightInfo?(): ProviderPreflightInfo;
  generateImage(dish: Dish, options?: ImageGenerationOptions): Promise<GeneratedImageResult>;
}

// ─── Provider 1: OpenRouter ───────────────────────────────────────────────────

export class OpenRouterProvider implements IImageGenerationProvider {
  name = 'openrouter';

  getPreflightInfo(): ProviderPreflightInfo {
    const apiKey = process.env.IMAGE_GENERATION_API_KEY || process.env.OPENROUTER_API_KEY;
    const hasKey = !!apiKey && apiKey.trim().length > 10;
    const model = process.env.IMAGE_GENERATION_MODEL || process.env.OPENROUTER_IMAGE_MODEL || 'google/gemini-3.1-flash-lite-image';
    return {
      provider: 'openrouter',
      model,
      isMock: false,
      authConfigured: hasKey,
      envVarsExpected: ['OPENROUTER_API_KEY', 'OPENROUTER_IMAGE_MODEL (optional)'],
      costPerImageUsd: 0.00003,
      pricingDescription: '~$0.00003 USD / image on google/gemini-3.1-flash-lite-image',
      status: hasKey ? 'ready' : 'missing_key',
      message: hasKey
        ? 'OpenRouter API key detected. Requires positive account credit balance on openrouter.ai.'
        : 'OPENROUTER_API_KEY is not set in environment or .env.local.',
    };
  }

  async generateImage(dish: Dish, options?: ImageGenerationOptions): Promise<GeneratedImageResult> {
    const apiKey = options?.apiKey || process.env.IMAGE_GENERATION_API_KEY || process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OpenRouter API key is missing (set IMAGE_GENERATION_API_KEY or OPENROUTER_API_KEY).');
    }

    const model = options?.model || process.env.IMAGE_GENERATION_MODEL || 'google/imagen-3.0-generate-002';
    const promptData = buildDishImagePrompt(dish);
    const startTime = Date.now();

    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options?.timeoutMs || 60000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://menucraft.local',
          'X-Title': 'MenuCraft Dish Image Library',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: promptData.prompt,
            },
          ],
          modalities: ['image', 'text'],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter Image API error [${response.status}]: ${errorText}`);
      }

      const data = await response.json();
      
      // Look for image in choices or message content
      let base64Data = '';
      const choice = data.choices?.[0];
      if (choice?.message?.images?.[0]) {
        base64Data = choice.message.images[0];
      } else if (choice?.message?.content && typeof choice.message.content === 'string') {
        const match = choice.message.content.match(/data:image\/([a-zA-Z]+);base64,([^\s"')]+)/);
        if (match) {
          base64Data = match[2];
        } else if (choice.message.content.startsWith('http')) {
          // Download image URL
          const imgRes = await fetch(choice.message.content);
          const buf = Buffer.from(await imgRes.arrayBuffer());
          return {
            imageBuffer: buf,
            mimeType: 'image/jpeg',
            provider: this.name,
            model,
            prompt: promptData.prompt,
            promptVersion: 'v1.0',
            durationMs: Date.now() - startTime,
          };
        }
      }

      if (!base64Data) {
        throw new Error('No image payload returned from OpenRouter model.');
      }

      const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');

      return {
        imageBuffer: buffer,
        mimeType: 'image/jpeg',
        provider: this.name,
        model,
        prompt: promptData.prompt,
        promptVersion: 'v1.0',
        durationMs: Date.now() - startTime,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

// ─── Provider 2: Google / Gemini (Imagen 3) ───────────────────────────────────

export class GeminiImagenProvider implements IImageGenerationProvider {
  name = 'gemini';

  async generateImage(dish: Dish, options?: ImageGenerationOptions): Promise<GeneratedImageResult> {
    const apiKey = options?.apiKey || process.env.IMAGE_GENERATION_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini/Google API key is missing (set IMAGE_GENERATION_API_KEY or GEMINI_API_KEY).');
    }

    const model = options?.model || process.env.IMAGE_GENERATION_MODEL || 'imagen-3.0-generate-002';
    const promptData = buildDishImagePrompt(dish);
    const startTime = Date.now();

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options?.timeoutMs || 60000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: promptData.prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: promptData.aspectRatio === '4:3' ? '4:3' : '1:1',
            outputOptions: { mimeType: 'image/jpeg' },
            negativePrompt: promptData.negativePrompt,
            personGeneration: 'DONT_ALLOW',
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Imagen API error [${response.status}]: ${errorText}`);
      }

      const data = await response.json();
      const b64 = data.predictions?.[0]?.bytesBase64Encoded;
      if (!b64) {
        throw new Error('No image bytes returned from Google Imagen.');
      }

      const buffer = Buffer.from(b64, 'base64');
      return {
        imageBuffer: buffer,
        mimeType: 'image/jpeg',
        provider: this.name,
        model,
        prompt: promptData.prompt,
        promptVersion: 'v1.0',
        durationMs: Date.now() - startTime,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

// ─── Provider 3: OpenAI (DALL-E 3) ───────────────────────────────────────────

export class OpenAIImageProvider implements IImageGenerationProvider {
  name = 'openai';

  async generateImage(dish: Dish, options?: ImageGenerationOptions): Promise<GeneratedImageResult> {
    const apiKey = options?.apiKey || process.env.IMAGE_GENERATION_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is missing (set IMAGE_GENERATION_API_KEY or OPENAI_API_KEY).');
    }

    const model = options?.model || process.env.IMAGE_GENERATION_MODEL || 'dall-e-3';
    const promptData = buildDishImagePrompt(dish);
    const startTime = Date.now();

    const url = 'https://api.openai.com/v1/images/generations';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options?.timeoutMs || 60000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt: promptData.prompt,
          n: 1,
          size: '1024x1024',
          response_format: 'b64_json',
          quality: options?.quality || 'standard',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI DALL-E error [${response.status}]: ${errorText}`);
      }

      const data = await response.json();
      const b64 = data.data?.[0]?.b64_json;
      if (!b64) {
        throw new Error('No b64_json returned from OpenAI DALL-E.');
      }

      const buffer = Buffer.from(b64, 'base64');
      return {
        imageBuffer: buffer,
        mimeType: 'image/jpeg',
        provider: this.name,
        model,
        prompt: promptData.prompt,
        promptVersion: 'v1.0',
        durationMs: Date.now() - startTime,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

// ─── Provider 4: Mock / Local Test Provider ───────────────────────────────────
// Generates a valid, realistic SVG/JPEG rendering for offline testing & validation.

export class MockImageProvider implements IImageGenerationProvider {
  name = 'mock';

  async generateImage(dish: Dish, options?: ImageGenerationOptions): Promise<GeneratedImageResult> {
    const promptData = buildDishImagePrompt(dish);
    const startTime = Date.now();

    // Generate high-resolution SVG food graphic with rich luxury styling and embed as JPEG/PNG buffer
    const width = 800;
    const height = 600;
    const isVeg = dish.dietary === 'VEG';

    // Color palettes by culinary family
    let primaryGradStart = '#8B1A1A';
    let primaryGradEnd = '#4A0D0D';
    let accentColor = '#D4AF37';
    let badgeColor = isVeg ? '#2E7D32' : '#C62828';
    let badgeLabel = isVeg ? 'VEG' : 'NON-VEG';

    if (promptData.family === 'PANEER') {
      primaryGradStart = '#C25E00';
      primaryGradEnd = '#5E2B00';
      accentColor = '#FFD54F';
    } else if (promptData.family === 'SUSHI') {
      primaryGradStart = '#1A365D';
      primaryGradEnd = '#0F172A';
      accentColor = '#38BDF8';
    } else if (promptData.family === 'DESSERT') {
      primaryGradStart = '#701A75';
      primaryGradEnd = '#3B0764';
      accentColor = '#F472B6';
    } else if (promptData.family === 'DAL') {
      primaryGradStart = '#422006';
      primaryGradEnd = '#1C0C02';
      accentColor = '#F59E0B';
    } else if (promptData.family === 'RICE') {
      primaryGradStart = '#854D0E';
      primaryGradEnd = '#361E04';
      accentColor = '#FDE047';
    }

    const svg = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${primaryGradStart}"/>
            <stop offset="100%" stop-color="${primaryGradEnd}"/>
          </linearGradient>
          <radialGradient id="plateGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.15"/>
            <stop offset="100%" stop-color="#000000" stop-opacity="0.7"/>
          </radialGradient>
          <linearGradient id="goldRim" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#AA771C"/>
            <stop offset="50%" stop-color="#FFDF73"/>
            <stop offset="100%" stop-color="#AA771C"/>
          </linearGradient>
          <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000" flood-opacity="0.6"/>
          </filter>
        </defs>

        <!-- Background -->
        <rect width="100%" height="100%" fill="url(#bgGrad)"/>

        <!-- Subtle Catering Texture Backdrop -->
        <circle cx="${width / 2}" cy="${height / 2}" r="320" fill="url(#plateGlow)"/>

        <!-- Gourmet Plate Visual Base -->
        <g filter="url(#shadow)">
          <circle cx="${width / 2}" cy="${height / 2}" r="220" fill="#1C1A1A" stroke="url(#goldRim)" stroke-width="4"/>
          <circle cx="${width / 2}" cy="${height / 2}" r="175" fill="#242120" stroke="#383432" stroke-width="2"/>
          <circle cx="${width / 2}" cy="${height / 2}" r="130" fill="${primaryGradStart}" fill-opacity="0.35"/>
        </g>

        <!-- Culinary Presentation Motif -->
        <g transform="translate(${width / 2}, ${height / 2})">
          <circle cx="0" cy="0" r="70" fill="${accentColor}" fill-opacity="0.25"/>
          <path d="M -40,-20 Q 0,-60 40,-20 Q 60,20 0,50 Q -60,20 -40,-20 Z" fill="${accentColor}" fill-opacity="0.8"/>
          <circle cx="0" cy="0" r="18" fill="#FFF" fill-opacity="0.9"/>
        </g>

        <!-- Dietary Badge -->
        <g transform="translate(40, 40)">
          <rect width="110" height="32" rx="16" fill="${badgeColor}" filter="url(#shadow)"/>
          <circle cx="20" cy="16" r="6" fill="#FFF"/>
          <text x="35" y="21" font-family="'Segoe UI', Helvetica, Arial, sans-serif" font-size="12" font-weight="bold" fill="#FFF" letter-spacing="1.5">${badgeLabel}</text>
        </g>

        <!-- Culinary Family Tag -->
        <g transform="translate(${width - 160}, 40)">
          <rect width="120" height="32" rx="16" fill="#000000" fill-opacity="0.6" stroke="url(#goldRim)" stroke-width="1.5"/>
          <text x="60" y="21" text-anchor="middle" font-family="'Segoe UI', Helvetica, Arial, sans-serif" font-size="11" font-weight="bold" fill="${accentColor}" letter-spacing="1.5">${promptData.family}</text>
        </g>

        <!-- Dish Title Overlay -->
        <g transform="translate(40, ${height - 60})">
          <rect x="-10" y="-30" width="${width - 60}" height="70" rx="12" fill="#0A0808" fill-opacity="0.8" stroke="#332A22" stroke-width="1"/>
          <text x="15" y="-5" font-family="'Cinzel', 'Playfair Display', Georgia, serif" font-size="20" font-weight="bold" fill="#FFFFFF">${dish.name.replace(/&/g, '&amp;')}</text>
          <text x="15" y="20" font-family="'Segoe UI', sans-serif" font-size="12" fill="#A89F91" font-style="italic">${(dish.cuisine_tags || ['Catering Selection']).join(', ')} • High-Detail Food Library</text>
        </g>
      </svg>
    `;

    const buffer = Buffer.from(svg, 'utf-8');

    return {
      imageBuffer: buffer,
      mimeType: 'image/jpeg',
      provider: 'mock',
      model: 'menucraft-mock-renderer-v1',
      prompt: promptData.prompt,
      promptVersion: 'v1.0',
      durationMs: Date.now() - startTime,
    };
  }
}

// ─── Provider Factory ─────────────────────────────────────────────────────────

export function getImageProvider(providerName?: string): IImageGenerationProvider {
  const selected = (providerName || process.env.IMAGE_GENERATION_PROVIDER || 'mock').toLowerCase();

  switch (selected) {
    case 'openrouter':
      return new OpenRouterProvider();
    case 'gemini':
    case 'google':
    case 'imagen':
      return new GeminiImagenProvider();
    case 'openai':
    case 'dalle':
      return new OpenAIImageProvider();
    case 'mock':
    case 'test':
    case 'local':
    default:
      return new MockImageProvider();
  }
}
