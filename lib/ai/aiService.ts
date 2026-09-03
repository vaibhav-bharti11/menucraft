// lib/ai/aiService.ts
// Central Server-Side AI Service for MenuCraft

import { getAIConfig } from './config';
import { callOpenRouter } from './provider';
import {
  SYSTEM_ROLE_INSTRUCTION,
  buildGenerateDescriptionPrompt,
  buildImproveDescriptionPrompt,
  buildSectionIntroPrompt,
  buildGenerateAllDescriptionsPrompt,
  buildReviewMenuPrompt,
  buildSuggestDishesPrompt,
  buildProposalContentPrompt,
} from './prompts';
import type {
  AIAction,
  GenerateDescriptionPayload,
  ImproveDescriptionPayload,
  GenerateSectionIntroPayload,
  GenerateAllDescriptionsPayload,
  ReviewMenuPayload,
  SuggestDishesPayload,
  GenerateProposalPayload,
  GeneratedDescriptionResult,
  GeneratedSectionIntroResult,
  GeneratedBatchDescriptionsResult,
  MenuReviewResult,
  DishSuggestion,
  ProposalContentResult,
  AIResponse,
} from './types';

export class AIService {
  /**
   * Feature 1: Generate single dish description
   */
  static async generateDishDescription(
    payload: GenerateDescriptionPayload
  ): Promise<GeneratedDescriptionResult> {
    if (!payload.dishName || !payload.dishName.trim()) {
      throw new Error('Dish name is required to generate a description.');
    }

    const prompt = buildGenerateDescriptionPrompt(payload);
    const result = await callOpenRouter<GeneratedDescriptionResult>({
      messages: [
        { role: 'system', content: SYSTEM_ROLE_INSTRUCTION },
        { role: 'user', content: prompt },
      ],
      responseFormatJson: true,
      temperature: 0.5,
    });

    if (!result.description) {
      throw new Error('AI response did not include a valid dish description.');
    }

    return {
      dishName: payload.dishName,
      description: result.description.trim(),
      keyNotes: result.keyNotes,
    };
  }

  /**
   * Feature 2: Improve existing description
   */
  static async improveDishDescription(
    payload: ImproveDescriptionPayload
  ): Promise<GeneratedDescriptionResult> {
    if (!payload.dishName || !payload.dishName.trim()) {
      throw new Error('Dish name is required.');
    }
    if (!payload.currentDescription || !payload.currentDescription.trim()) {
      // If empty, fallback to generate
      return this.generateDishDescription({
        dishName: payload.dishName,
        category: payload.category,
        tone: payload.tone,
      });
    }

    const prompt = buildImproveDescriptionPrompt(payload);
    const result = await callOpenRouter<GeneratedDescriptionResult>({
      messages: [
        { role: 'system', content: SYSTEM_ROLE_INSTRUCTION },
        { role: 'user', content: prompt },
      ],
      responseFormatJson: true,
      temperature: 0.4,
    });

    return {
      dishName: payload.dishName,
      description: (result.description || payload.currentDescription).trim(),
      keyNotes: result.keyNotes,
    };
  }

  /**
   * Feature 3: Generate section/counter intro and accompaniments
   */
  static async generateSectionIntro(
    payload: GenerateSectionIntroPayload
  ): Promise<GeneratedSectionIntroResult> {
    if (!payload.counterName || !payload.counterName.trim()) {
      throw new Error('Counter name is required.');
    }

    const prompt = buildSectionIntroPrompt(payload);
    const result = await callOpenRouter<GeneratedSectionIntroResult>({
      messages: [
        { role: 'system', content: SYSTEM_ROLE_INSTRUCTION },
        { role: 'user', content: prompt },
      ],
      responseFormatJson: true,
      temperature: 0.5,
    });

    return {
      counterName: payload.counterName,
      introduction: (result.introduction || '').trim(),
      suggestedAccompaniments: result.suggestedAccompaniments?.trim(),
    };
  }

  /**
   * Feature 4: Batch generate descriptions for a section / counter
   */
  static async generateAllDescriptions(
    payload: GenerateAllDescriptionsPayload
  ): Promise<GeneratedBatchDescriptionsResult> {
    if (!payload.dishes || payload.dishes.length === 0) {
      return { dishes: [], count: 0 };
    }

    const prompt = buildGenerateAllDescriptionsPrompt(payload);
    const result = await callOpenRouter<{ dishes: Array<{ dish_id: string; name: string; description: string; wasUpdated?: boolean }> }>({
      messages: [
        { role: 'system', content: SYSTEM_ROLE_INSTRUCTION },
        { role: 'user', content: prompt },
      ],
      responseFormatJson: true,
      temperature: 0.4,
      maxTokens: 3000,
    });

    const parsedDishes = (result.dishes || []).map((d) => ({
      dish_id: d.dish_id,
      name: d.name,
      description: d.description ? d.description.trim() : '',
      wasUpdated: d.wasUpdated ?? true,
    }));

    return {
      dishes: parsedDishes,
      count: parsedDishes.length,
    };
  }

  /**
   * Feature 5: Review entire menu for content, balance, exclusions, and suggestions
   */
  static async reviewMenu(payload: ReviewMenuPayload): Promise<MenuReviewResult> {
    if (!payload.menu || !payload.menu.counters) {
      throw new Error('A valid menu structure is required for review.');
    }

    const prompt = buildReviewMenuPrompt(payload);
    const result = await callOpenRouter<MenuReviewResult>({
      messages: [
        { role: 'system', content: SYSTEM_ROLE_INSTRUCTION },
        { role: 'user', content: prompt },
      ],
      responseFormatJson: true,
      temperature: 0.3,
      maxTokens: 3500,
    });

    return {
      summary: result.summary || 'Menu review completed.',
      overallScore: typeof result.overallScore === 'number' ? result.overallScore : 80,
      strengths: Array.isArray(result.strengths) ? result.strengths : [],
      issues: Array.isArray(result.issues) ? result.issues : [],
      suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
    };
  }

  /**
   * Feature 6: Suggest complementary dishes based on event and current menu
   */
  static async suggestDishes(payload: SuggestDishesPayload): Promise<{ suggestions: DishSuggestion[] }> {
    if (!payload.menu) {
      throw new Error('A valid menu is required to provide dish suggestions.');
    }

    const prompt = buildSuggestDishesPrompt(payload);
    const result = await callOpenRouter<{ suggestions: DishSuggestion[] }>({
      messages: [
        { role: 'system', content: SYSTEM_ROLE_INSTRUCTION },
        { role: 'user', content: prompt },
      ],
      responseFormatJson: true,
      temperature: 0.6,
      maxTokens: 2500,
    });

    return {
      suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
    };
  }

  /**
   * Feature 9: Generate comprehensive proposal narrative content
   */
  static async generateProposal(payload: GenerateProposalPayload): Promise<ProposalContentResult> {
    if (!payload.menu) {
      throw new Error('A valid menu is required to generate proposal content.');
    }

    const prompt = buildProposalContentPrompt(payload);
    const result = await callOpenRouter<ProposalContentResult>({
      messages: [
        { role: 'system', content: SYSTEM_ROLE_INSTRUCTION },
        { role: 'user', content: prompt },
      ],
      responseFormatJson: true,
      temperature: 0.5,
      maxTokens: 2500,
    });

    return {
      clientGreeting: result.clientGreeting || `Proposal prepared for ${payload.menu.client_name || 'Valued Client'}`,
      executiveSummary: result.executiveSummary || '',
      culinaryNarrative: result.culinaryNarrative || '',
      curatedExperienceNotes: Array.isArray(result.curatedExperienceNotes) ? result.curatedExperienceNotes : [],
      serviceStyleNote: result.serviceStyleNote || '',
      dietaryOverview: result.dietaryOverview || {
        totalVeg: 0,
        totalNonVeg: 0,
        balanceSummary: 'Balanced catering selection.',
      },
    };
  }

  /**
   * Unified dispatcher helper
   */
  static async dispatch(action: AIAction, payload: any): Promise<AIResponse> {
    const config = getAIConfig();
    const startTime = Date.now();

    try {
      let data: any;

      switch (action) {
        case 'generate-description':
          data = await this.generateDishDescription(payload);
          break;
        case 'improve-description':
          data = await this.improveDishDescription(payload);
          break;
        case 'generate-section-intro':
          data = await this.generateSectionIntro(payload);
          break;
        case 'generate-all-descriptions':
          data = await this.generateAllDescriptions(payload);
          break;
        case 'review-menu':
          data = await this.reviewMenu(payload);
          break;
        case 'suggest-dishes':
          data = await this.suggestDishes(payload);
          break;
        case 'generate-proposal':
          data = await this.generateProposal(payload);
          break;
        default:
          throw new Error(`Unknown AI action: ${action}`);
      }

      return {
        success: true,
        action,
        data,
        modelUsed: config.model,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      console.error(`[AIService Error] Action "${action}" failed:`, err);
      return {
        success: false,
        action,
        error: err.message || 'An unexpected error occurred while processing AI request.',
        modelUsed: config.model,
        durationMs: Date.now() - startTime,
      };
    }
  }
}
