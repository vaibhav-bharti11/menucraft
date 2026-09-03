// lib/ai/prompts.ts
// Reusable server-side prompt templates for MenuCraft AI System

import type {
  GenerateDescriptionPayload,
  ImproveDescriptionPayload,
  GenerateSectionIntroPayload,
  GenerateAllDescriptionsPayload,
  ReviewMenuPayload,
  SuggestDishesPayload,
  GenerateProposalPayload,
} from './types';

export const SYSTEM_ROLE_INSTRUCTION = `You are an elite master culinary consultant and luxury catering copywriter for "The Embassy Catering", a premier catering house.

Your job is to generate polished, evocative, concise, and client-facing culinary copy for event menus and proposals.

CRITICAL RULES:
1. Write elegant, appetizing, and professional language suitable for high-end catering proposals.
2. NEVER invent factual ingredients, uncommon allergens, or specific cooking claims (e.g. "marinated for 48 hours", "imported from Tuscany") unless specified in the context or inherently standard to the classical dish.
3. NEVER make health or medical claims.
4. Respect event details (Function Type, Guest Count, Venue, Requirements, and especially Exclusions).
5. Output strict valid JSON matching the exact schema requested. No markdown formatting outside the JSON, no surrounding commentary.
6. Avoid emojis in the generated descriptions/menu copy. Keep it sophisticated and client-ready.`;

export function buildGenerateDescriptionPrompt(payload: GenerateDescriptionPayload): string {
  const toneInstruction =
    payload.tone === 'premium'
      ? 'Craft an elevated, refined culinary description emphasizing artisanal preparation and luxury dining experience (1 to 2 sentences).'
      : payload.tone === 'concise'
      ? 'Craft a sharp, punchy, appetizing description in exactly 1 concise sentence (under 18 words).'
      : 'Craft a well-balanced, mouth-watering description highlighting textures, dominant flavors, and presentation (1 to 2 sentences, 20-35 words).';

  return `Task: Generate a professional catering menu description for a single dish.

Dish Details:
- Name: "${payload.dishName}"
- Dietary: ${payload.category || 'Not specified'}
- Course: ${payload.course || 'Not specified'}
- Cuisine: ${payload.cuisine || 'Not specified'}
${payload.currentDescription ? `- Existing draft notes: "${payload.currentDescription}"` : ''}
${payload.eventContext?.functionType ? `- Event Function: ${payload.eventContext.functionType}` : ''}
${payload.eventContext?.venue ? `- Event Venue: ${payload.eventContext.venue}` : ''}

Tone Requirement:
${toneInstruction}

JSON Output Schema:
{
  "dishName": "${payload.dishName}",
  "description": "Generated catering description string",
  "keyNotes": "Brief 3-5 word aroma or pairing note"
}`;
}

export function buildImproveDescriptionPrompt(payload: ImproveDescriptionPayload): string {
  const toneInstruction =
    payload.tone === 'premium'
      ? 'Elevate this description into luxurious, high-end banquet language while retaining its core ingredients.'
      : payload.tone === 'concise'
      ? 'Shorten and sharpen this description into a crisp, elegant single sentence without losing the key culinary essence.'
      : 'Refine and polish the culinary phrasing for maximum appetizing appeal while preserving the exact factual meaning.';

  return `Task: Improve and polish an existing dish description.

Dish Name: "${payload.dishName}"
Current Description: "${payload.currentDescription}"
Dietary: ${payload.category || 'Not specified'}

Instruction:
${toneInstruction}
Do NOT invent unmentioned proteins or drastically alter the dish type. Enhance rhythm, culinary vocabulary, and banquet presentation appeal.

JSON Output Schema:
{
  "dishName": "${payload.dishName}",
  "description": "Improved polished description string",
  "keyNotes": "Key improvement rationale"
}`;
}

export function buildSectionIntroPrompt(payload: GenerateSectionIntroPayload): string {
  const dishList = (payload.dishes || [])
    .map(d => `- ${d.name} (${d.dietary || 'Mixed'})${d.description ? ': ' + d.description : ''}`)
    .join('\n');

  return `Task: Generate an elegant section/counter introduction and recommended accompaniments for a catering proposal.

Counter Name: "${payload.counterName}"
${payload.counterDescription ? `Current Draft Intro: "${payload.counterDescription}"` : ''}
${payload.eventContext?.functionType ? `Event Type: ${payload.eventContext.functionType}` : ''}
${payload.eventContext?.venue ? `Venue: ${payload.eventContext.venue}` : ''}
${payload.eventContext?.guestCount ? `Guests: ${payload.eventContext.guestCount}` : ''}

Dishes in this section:
${dishList || 'No dishes specified yet.'}

Guidelines:
- Write a 1-2 sentence refined introduction (30-45 words) that sets the mood, culinary concept, and service experience.
- Suggest 3 to 5 classic, perfectly matched accompaniments/condiments (comma-separated, e.g. "Mint Chutney, Laccha Onion, Lemon Wedges, Burani Raita").

JSON Output Schema:
{
  "counterName": "${payload.counterName}",
  "introduction": "Refined 1-2 sentence section narrative",
  "suggestedAccompaniments": "Comma-separated list of accompaniments"
}`;
}

export function buildGenerateAllDescriptionsPrompt(payload: GenerateAllDescriptionsPayload): string {
  const dishItems = payload.dishes.map((d, i) => ({
    index: i + 1,
    dish_id: d.dish_id,
    name: d.name,
    dietary: d.dietary || 'VEG',
    currentDescription: d.currentDescription || '',
    needsGeneration: !d.currentDescription || d.currentDescription.trim().length < 8 || payload.overwriteExisting,
  }));

  return `Task: Generate professional catering descriptions for dishes in "${payload.counterName || 'Menu Section'}".

Items to process:
${JSON.stringify(dishItems, null, 2)}

Rules:
- For each dish where needsGeneration is true, generate an appetizing, elegant 1-sentence catering description (15-28 words).
- If needsGeneration is false, you may return the existing description or subtly improve it.
- Keep output strictly formatted as a JSON array of dish objects.

JSON Output Schema:
{
  "dishes": [
    {
      "dish_id": "string",
      "name": "string",
      "description": "string",
      "wasUpdated": true
    }
  ]
}`;
}

export function buildReviewMenuPrompt(payload: ReviewMenuPayload): string {
  const menu = payload.menu;
  
  const formattedMenu = {
    client: menu.client_name,
    eventDate: menu.event_date,
    functionType: menu.function_type,
    guestCount: menu.guest_count,
    venue: menu.venue,
    requirements: menu.requirements_note,
    exclusions: menu.exclusions_note,
    counters: menu.counters.map(c => ({
      id: c.id,
      name: c.display_name,
      description: c.description,
      accompaniments: c.accompaniments,
      sections: c.sections.map(s => ({
        kind: s.kind,
        label: s.label,
        dishes: s.dishes.map(d => ({
          dish_id: d.dish_id,
          name: d.name,
          description: d.description,
          dietary: d.dietary,
        })),
      })),
    })),
  };

  return `Task: Perform a comprehensive, rigorous culinary review of this event catering menu.

Menu Data:
${JSON.stringify(formattedMenu, null, 2)}

Analyze specifically for:
1. Content Quality: Missing or poor dish descriptions, typos, unclear names, empty counters or sections.
2. Menu Balance: Veg vs Non-Veg ratio, protein variety (chicken/lamb/seafood/paneer/tofu), carbohydrate/bread balance, heaviness vs freshness.
3. Cuisine & Course Cohesion: Does the menu flow naturally for a "${menu.function_type || 'Dinner'}" with ${menu.guest_count || 'the given guests'} at ${menu.venue || 'the venue'}?
4. Repetition: Duplicated or overly similar preparations (e.g. multiple tomato-based gravies, repeat starches).
5. Exclusions & Requirements: Verify that no dishes conflict with the stated exclusions: "${menu.exclusions_note || 'None'}" and requirements: "${menu.requirements_note || 'None'}".

Score the menu from 1 to 100 on balance, completeness, and luxury banquet readiness. Provide actionable issues with severity (low, medium, high) and 2 to 4 high-impact dish suggestions to bridge gaps.

JSON Output Schema:
{
  "summary": "2-3 sentence executive evaluation of the menu",
  "overallScore": 85,
  "strengths": ["Strength 1", "Strength 2"],
  "issues": [
    {
      "id": "issue-1",
      "type": "duplicate" | "balance" | "missing_description" | "spelling_inconsistency" | "dietary_gap" | "exclusion_conflict" | "structure",
      "severity": "low" | "medium" | "high",
      "title": "Short title",
      "message": "Clear actionable explanation",
      "targetCounterId": "optional counter id if related",
      "targetDishId": "optional dish id if related",
      "suggestedAction": "What the user should do"
    }
  ],
  "suggestions": [
    {
      "id": "sug-1",
      "dishName": "Name of recommended dish",
      "dietary": "VEG" | "NON_VEG",
      "category": "Cuisine / Course type",
      "suggestedCounterName": "Name of target counter",
      "suggestedCounterId": "Counter id if applicable",
      "reason": "Why this addition elevates the menu",
      "description": "Professional 1-sentence description of the suggested dish",
      "accompanimentSuggestion": "Optional accompaniment"
    }
  ]
}`;
}

export function buildSuggestDishesPrompt(payload: SuggestDishesPayload): string {
  const menu = payload.menu;
  const count = payload.count || 4;

  const summary = {
    functionType: menu.function_type,
    guestCount: menu.guest_count,
    venue: menu.venue,
    requirements: menu.requirements_note,
    exclusions: menu.exclusions_note,
    existingCounters: menu.counters.map(c => ({
      id: c.id,
      name: c.display_name,
      dishes: c.sections.flatMap(s => s.dishes.map(d => `${d.name} (${d.dietary || s.kind})`)),
    })),
  };

  return `Task: Recommend ${count} complementary dishes to enhance this catering menu.

Event & Menu Context:
${JSON.stringify(summary, null, 2)}
${payload.targetCounterId ? `Target Specific Counter ID: ${payload.targetCounterId}` : ''}

Considerations:
- Bridge dietary, texture, or culinary gaps (e.g. adding a light refreshing salad, an Awadhi specialty, a live station element, or balancing veg/non-veg).
- MUST respect stated Exclusions: "${menu.exclusions_note || 'None'}".
- MUST suit the event type: "${menu.function_type || 'Dinner'}".

JSON Output Schema:
{
  "suggestions": [
    {
      "id": "sug-1",
      "dishName": "Dish Name",
      "dietary": "VEG" | "NON_VEG",
      "category": "Course or Cuisine",
      "suggestedCounterName": "Counter Name where it best fits",
      "suggestedCounterId": "Counter ID if matched",
      "reason": "Clear explanation why this complements the existing menu",
      "description": "Appetizing 1-sentence description of the dish",
      "accompanimentSuggestion": "Suggested accompaniment"
    }
  ]
}`;
}

export function buildProposalContentPrompt(payload: GenerateProposalPayload): string {
  const menu = payload.menu;
  
  const vegDishes = menu.counters.flatMap(c => c.sections.filter(s => s.kind === 'VEG').flatMap(s => s.dishes));
  const nonVegDishes = menu.counters.flatMap(c => c.sections.filter(s => s.kind === 'NON_VEG').flatMap(s => s.dishes));

  const menuOverview = {
    client: menu.client_name || 'Valued Client',
    eventDate: menu.event_date,
    functionType: menu.function_type,
    guestCount: menu.guest_count,
    venue: menu.venue,
    requirements: menu.requirements_note,
    exclusions: menu.exclusions_note,
    signedBy: menu.signed_by_name,
    counters: menu.counters.map(c => ({
      name: c.display_name,
      dishCount: c.sections.reduce((acc, s) => acc + s.dishes.length, 0),
    })),
    totalVeg: vegDishes.length,
    totalNonVeg: nonVegDishes.length,
  };

  return `Task: Generate luxury proposal narrative content for a client-facing catering presentation.

Menu Overview:
${JSON.stringify(menuOverview, null, 2)}

Generate:
1. Client Greeting: Warm, bespoke salutation acknowledging the occasion.
2. Executive Summary: 2-3 polished sentences summarizing the culinary vision.
3. Culinary Narrative: An evocative paragraph describing the gastronomic journey curated for the guests.
4. Curated Experience Notes: 3 to 4 bullet highlights (e.g. interactive live stations, authentic spice profiles, balanced pairings).
5. Service Style Note: Professional statement on service standards and culinary execution.
6. Dietary Overview: Clear breakdown and balance summary.

JSON Output Schema:
{
  "clientGreeting": "Warm opening greeting for the proposal",
  "executiveSummary": "Concise high-level summary",
  "culinaryNarrative": "Evocative culinary journey description",
  "curatedExperienceNotes": [
    "Highlight point 1",
    "Highlight point 2",
    "Highlight point 3"
  ],
  "serviceStyleNote": "Professional service & presentation guarantee",
  "dietaryOverview": {
    "totalVeg": ${vegDishes.length},
    "totalNonVeg": ${nonVegDishes.length},
    "balanceSummary": "Brief statement on dietary balance"
  }
}`;
}
