// lib/ai/types.ts
// Strict TypeScript types for MenuCraft AI System

import type { Dietary, Menu, MenuCounter, DishRef, SectionKind } from '../types';

export type AIAction =
  | 'generate-description'
  | 'improve-description'
  | 'generate-section-intro'
  | 'generate-all-descriptions'
  | 'review-menu'
  | 'suggest-dishes'
  | 'generate-proposal';

export type DescriptionTone = 'standard' | 'premium' | 'concise';

// ─── Request Payloads ─────────────────────────────────────────────────────────

export interface GenerateDescriptionPayload {
  dishName: string;
  category?: Dietary | string;
  course?: string;
  cuisine?: string;
  currentDescription?: string;
  tone?: DescriptionTone;
  eventContext?: {
    functionType?: string;
    venue?: string;
    guestCount?: string;
  };
}

export interface ImproveDescriptionPayload {
  dishName: string;
  currentDescription: string;
  category?: Dietary | string;
  tone?: DescriptionTone;
}

export interface GenerateSectionIntroPayload {
  counterName: string;
  counterDescription?: string;
  dishes?: Array<{ name: string; dietary?: Dietary; description?: string }>;
  eventContext?: {
    functionType?: string;
    guestCount?: string;
    venue?: string;
  };
}

export interface GenerateAllDescriptionsPayload {
  counterName?: string;
  dishes: Array<{
    dish_id: string;
    name: string;
    dietary?: Dietary;
    currentDescription?: string;
  }>;
  overwriteExisting?: boolean;
}

export interface ReviewMenuPayload {
  menu: Menu;
}

export interface SuggestDishesPayload {
  menu: Menu;
  targetCounterId?: string;
  count?: number;
}

export interface GenerateProposalPayload {
  menu: Menu;
}

export interface AIRequest<T = unknown> {
  action: AIAction;
  payload: T;
}

// ─── Response Payloads ────────────────────────────────────────────────────────

export interface GeneratedDescriptionResult {
  dishName: string;
  description: string;
  keyNotes?: string;
}

export interface GeneratedSectionIntroResult {
  counterName: string;
  introduction: string;
  suggestedAccompaniments?: string;
}

export interface GeneratedBatchDescriptionItem {
  dish_id: string;
  name: string;
  description: string;
  wasUpdated: boolean;
}

export interface GeneratedBatchDescriptionsResult {
  dishes: GeneratedBatchDescriptionItem[];
  count: number;
}

export interface MenuIssue {
  id: string;
  type: 'duplicate' | 'balance' | 'missing_description' | 'spelling_inconsistency' | 'dietary_gap' | 'exclusion_conflict' | 'structure';
  severity: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  targetCounterId?: string;
  targetDishId?: string;
  suggestedAction?: string;
}

export interface DishSuggestion {
  id: string;
  dishName: string;
  dietary: Dietary;
  category: string;
  suggestedCounterName?: string;
  suggestedCounterId?: string;
  reason: string;
  description: string;
  accompanimentSuggestion?: string;
}

export interface MenuReviewResult {
  summary: string;
  overallScore: number; // 1-100
  strengths: string[];
  issues: MenuIssue[];
  suggestions: DishSuggestion[];
}

export interface ProposalContentResult {
  executiveSummary: string;
  culinaryNarrative: string;
  curatedExperienceNotes: string[];
  serviceStyleNote: string;
  dietaryOverview: {
    totalVeg: number;
    totalNonVeg: number;
    balanceSummary: string;
  };
  clientGreeting: string;
}

export interface AIResponse<T = unknown> {
  success: boolean;
  action: AIAction;
  data?: T;
  error?: string;
  modelUsed?: string;
  durationMs?: number;
}
