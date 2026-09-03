// app/api/ai/route.ts
// Central Server-Side API Endpoint for MenuCraft AI Integrations

import { NextRequest, NextResponse } from 'next/server';
import { AIService } from '@/lib/ai/aiService';
import { isAIConfigured } from '@/lib/ai/config';
import type { AIRequest, AIAction } from '@/lib/ai/types';

// In-memory rate limiting map for basic protection against runaway clients
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, limit = 40, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';

  if (!checkRateLimit(clientIp)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Too many requests. Please wait a few seconds before trying again.',
      },
      { status: 429 }
    );
  }

  if (!isAIConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error:
          'OpenRouter API is not configured on the server. Please add OPENROUTER_API_KEY to your environment variables.',
      },
      { status: 503 }
    );
  }

  let body: AIRequest;
  try {
    body = (await req.json()) as AIRequest;
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON request payload.' },
      { status: 400 }
    );
  }

  const { action, payload } = body;

  const validActions: AIAction[] = [
    'generate-description',
    'improve-description',
    'generate-section-intro',
    'generate-all-descriptions',
    'review-menu',
    'suggest-dishes',
    'generate-proposal',
  ];

  if (!action || !validActions.includes(action)) {
    return NextResponse.json(
      {
        success: false,
        error: `Invalid or missing AI action. Allowed actions: ${validActions.join(', ')}`,
      },
      { status: 400 }
    );
  }

  if (!payload || typeof payload !== 'object') {
    return NextResponse.json(
      { success: false, error: 'Request payload must be an object.' },
      { status: 400 }
    );
  }

  try {
    const result = await AIService.dispatch(action, payload);

    if (!result.success) {
      return NextResponse.json(result, { status: 422 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error(`[API /api/ai] Unhandled exception for action "${action}":`, err);
    return NextResponse.json(
      {
        success: false,
        action,
        error: err.message || 'Internal server error while processing AI request.',
      },
      { status: 500 }
    );
  }
}
