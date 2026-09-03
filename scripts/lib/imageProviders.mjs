// scripts/lib/imageProviders.mjs
// Pure ESM image provider factory for standalone Node pipeline scripts.
// Supports: mock, openrouter, openai, gemini with preflight health check capabilities.

import { buildDishImagePrompt } from './dishPromptEngine.mjs';

// ─── Provider 1: Mock Provider (Test SVGs Only) ──────────────────────────────

class MockImageProvider {
  constructor() {
    this.name = 'mock';
  }

  getPreflightInfo() {
    return {
      provider: 'mock',
      model: 'mock-svg-v1',
      isMock: true,
      authConfigured: true,
      envVarsExpected: [],
      costPerImageUsd: 0.0,
      pricingDescription: '$0.00 (Offline local SVG generator for structural/layout testing)',
      status: 'ready',
      message: 'Mock provider ready. Generates vector SVG placeholder cards (testing only, not real food photos).',
    };
  }

  async generateImage(dish) {
    const promptData = buildDishImagePrompt(dish);

    const colorMap = {
      PANEER: ['#F5D26E', '#E8A838'],
      CHICKEN: ['#C9642A', '#8B3E12'],
      MUTTON: ['#A0522D', '#6B2F12'],
      FISH: ['#5B8DB8', '#2C5F8A'],
      SEAFOOD: ['#4A90A4', '#1F6078'],
      RICE: ['#E8D5A3', '#C4A55A'],
      BIRYANI: ['#D4A838', '#8B6914'],
      DAL: ['#C8813A', '#7A4A1C'],
      DESSERT: ['#F2A7C3', '#C4607E'],
      SOUP: ['#9BC47A', '#5A8A3C'],
      BREAD: ['#D4AA70', '#8B6534'],
      SUSHI: ['#4A8C6E', '#1C5C40'],
      PIZZA: ['#D4572E', '#8B2A10'],
      PASTA: ['#E8D08C', '#B8942C'],
      CANAPE: ['#7B68EE', '#4B38BE'],
      SALAD: ['#6DB96D', '#2E8B2E'],
      SAMOSA: ['#C8A050', '#7A5C1A'],
      BEVERAGE: ['#5BBCD4', '#1C7A96'],
      GENERAL: ['#8B7355', '#5A4A2A'],
    };

    const family = promptData.family || 'GENERAL';
    const [primary, secondary] = colorMap[family] || colorMap.GENERAL;
    const isVeg = dish.dietary === 'VEG';
    const dotColor = isVeg ? '#22C55E' : '#EF4444';

    const shortName = dish.name.length > 26 ? dish.name.substring(0, 24) + '…' : dish.name;
    const familyLabel = family.charAt(0) + family.slice(1).toLowerCase();

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${primary};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${secondary};stop-opacity:1" />
    </linearGradient>
    <linearGradient id="shine" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.15" />
      <stop offset="100%" style="stop-color:#ffffff;stop-opacity:0" />
    </linearGradient>
  </defs>
  <rect width="400" height="300" fill="url(#bg)" rx="8"/>
  <rect width="400" height="150" fill="url(#shine)" rx="8"/>
  <circle cx="200" cy="130" r="70" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
  <circle cx="200" cy="130" r="50" fill="rgba(255,255,255,0.08)"/>
  <text x="200" y="136" text-anchor="middle" font-family="serif" font-size="36" fill="rgba(255,255,255,0.6)">🍽</text>
  <rect x="20" y="228" width="360" height="54" fill="rgba(0,0,0,0.35)" rx="6"/>
  <text x="200" y="249" text-anchor="middle" font-family="Georgia, serif" font-size="13" font-weight="bold" fill="#FFFFFF">${shortName}</text>
  <text x="200" y="267" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="rgba(255,255,255,0.7)">${familyLabel} · MenuCraft Mock Testing Only</text>
  <circle cx="32" cy="270" r="5" fill="${dotColor}"/>
  <text x="40" y="274" font-family="Arial, sans-serif" font-size="9" fill="rgba(255,255,255,0.6)">${isVeg ? 'VEG' : 'NON-VEG'}</text>
  <rect x="1" y="1" width="398" height="298" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" rx="8"/>
</svg>`;

    return {
      imageBuffer: Buffer.from(svg, 'utf-8'),
      mimeType: 'image/svg+xml',
      provider: 'mock',
      model: 'mock-svg-v1',
      promptVersion: 'v1.0',
      prompt: promptData.prompt,
    };
  }
}

// ─── Provider 2: OpenRouter ───────────────────────────────────────────────────

class OpenRouterProvider {
  constructor() {
    this.name = 'openrouter';
    this.apiKey = process.env.IMAGE_GENERATION_API_KEY || process.env.OPENROUTER_API_KEY;
    this.model = process.env.IMAGE_GENERATION_MODEL || process.env.OPENROUTER_IMAGE_MODEL || 'google/gemini-3.1-flash-lite-image';
    this.baseUrl = 'https://openrouter.ai/api/v1';
  }

  getPreflightInfo() {
    const hasKey = !!this.apiKey && this.apiKey.trim().length > 10;
    return {
      provider: 'openrouter',
      model: this.model,
      isMock: false,
      authConfigured: hasKey,
      envVarsExpected: ['OPENROUTER_API_KEY', 'OPENROUTER_IMAGE_MODEL (optional)'],
      costPerImageUsd: 0.00003,
      pricingDescription: '~$0.00003 USD / image (~$0.08 for entire 2,593 dish catalog on gemini-3.1-flash-lite-image)',
      status: hasKey ? 'ready' : 'missing_key',
      message: hasKey
        ? 'OpenRouter API key detected. Requires positive account credit balance on openrouter.ai.'
        : 'OPENROUTER_API_KEY is not set in environment or .env.local.',
    };
  }

  async generateImage(dish) {
    if (!this.apiKey) throw new Error('OPENROUTER_API_KEY not set in environment');
    const promptData = buildDishImagePrompt(dish);
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://menucraft.app',
        'X-Title': 'MenuCraft Dish Image Pipeline',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: promptData.prompt }],
        modalities: ['image', 'text'],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenRouter API error ${response.status}: ${text}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    let base64Data = choice?.message?.images?.[0];

    if (!base64Data && choice?.message?.content && typeof choice.message.content === 'string') {
      const match = choice.message.content.match(/data:image\/([a-zA-Z]+);base64,([^\s"')]+)/);
      if (match) base64Data = match[2];
    }

    if (!base64Data) {
      throw new Error(`OpenRouter model "${this.model}" did not return image bytes in response.`);
    }

    const buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ''), 'base64');

    return {
      imageBuffer: buffer,
      mimeType: 'image/jpeg',
      provider: 'openrouter',
      model: this.model,
      promptVersion: 'v1.0',
      prompt: promptData.prompt,
    };
  }
}

// ─── Provider 3: OpenAI (DALL-E 3) ───────────────────────────────────────────

class OpenAIImageProvider {
  constructor() {
    this.name = 'openai';
    this.apiKey = process.env.IMAGE_GENERATION_API_KEY || process.env.OPENAI_API_KEY;
    this.model = process.env.IMAGE_GENERATION_MODEL || 'dall-e-3';
  }

  getPreflightInfo() {
    const hasKey = !!this.apiKey && this.apiKey.trim().length > 10;
    return {
      provider: 'openai',
      model: this.model,
      isMock: false,
      authConfigured: hasKey,
      envVarsExpected: ['OPENAI_API_KEY', 'IMAGE_GENERATION_MODEL (optional)'],
      costPerImageUsd: 0.040,
      pricingDescription: '$0.040 USD / image (DALL-E 3 Standard 1024x1024)',
      status: hasKey ? 'ready' : 'missing_key',
      message: hasKey
        ? 'OpenAI API key detected. Calls api.openai.com/v1/images/generations directly.'
        : 'OPENAI_API_KEY is not set in environment or .env.local.',
    };
  }

  async generateImage(dish) {
    if (!this.apiKey) throw new Error('OPENAI_API_KEY not set in environment');
    const promptData = buildDishImagePrompt(dish);
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        prompt: promptData.prompt,
        n: 1,
        size: '1024x1024',
        response_format: 'b64_json',
        quality: 'standard',
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${text}`);
    }

    const data = await response.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) throw new Error('No b64_json returned from OpenAI DALL-E');

    return {
      imageBuffer: Buffer.from(b64, 'base64'),
      mimeType: 'image/jpeg',
      provider: 'openai',
      model: this.model,
      promptVersion: 'v1.0',
      prompt: promptData.prompt,
    };
  }
}

// ─── Provider 4: Google / Gemini (Imagen 3) ───────────────────────────────────

class GeminiImagenProvider {
  constructor() {
    this.name = 'gemini';
    this.apiKey = process.env.IMAGE_GENERATION_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    this.model = process.env.IMAGE_GENERATION_MODEL || 'gemini-3.1-flash-image-preview';
  }

  getPreflightInfo() {
    const hasKey = !!this.apiKey && this.apiKey.trim().length > 10;
    return {
      provider: 'gemini',
      model: this.model,
      isMock: false,
      authConfigured: hasKey,
      envVarsExpected: ['GEMINI_API_KEY or GOOGLE_API_KEY', 'IMAGE_GENERATION_MODEL (optional)'],
      costPerImageUsd: 0.030,
      pricingDescription: '$0.030 USD / image (Google Cloud Imagen 3 API)',
      status: hasKey ? 'ready' : 'missing_key',
      message: hasKey
        ? 'Gemini / Google API key detected. Calls generativelanguage.googleapis.com API.'
        : 'GEMINI_API_KEY (or GOOGLE_API_KEY) is not set in environment or .env.local.',
    };
  }

  async generateImage(dish) {
    if (!this.apiKey) throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY not set in environment');
    const promptData = buildDishImagePrompt(dish);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: promptData.prompt }] }],
        generationConfig: {
          responseModalities: ["IMAGE"]
        }
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${text}`);
    }

    const data = await response.json();
    let b64 = null;
    
    // Check standard Gemini format for image responses
    const part = data?.candidates?.[0]?.content?.parts?.[0];
    if (part?.inlineData?.data) {
      b64 = part.inlineData.data;
    } else {
      throw new Error('No image data in Gemini response');
    }

    return {
      imageBuffer: Buffer.from(b64, 'base64'),
      mimeType: 'image/jpeg',
      provider: 'gemini',
      model: this.model,
      promptVersion: 'v1.0',
      prompt: promptData.prompt,
    };
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function getImageProvider(providerName) {
  const name = (providerName || process.env.IMAGE_GENERATION_PROVIDER || 'mock').toLowerCase();
  switch (name) {
    case 'openrouter': return new OpenRouterProvider();
    case 'openai':     return new OpenAIImageProvider();
    case 'gemini':     return new GeminiImagenProvider();
    case 'mock':
    default:           return new MockImageProvider();
  }
}
