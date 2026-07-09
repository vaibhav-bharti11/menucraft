// MenuCraft — Core TypeScript Types
// Matches PRD v2.0 data model exactly

export type Dietary = 'VEG' | 'NON_VEG';

export type MenuStatus =
  | 'DRAFT'
  | 'READY'
  | 'SENT'
  | 'CONFIRMED'
  | 'ARCHIVED';

export type FunctionType =
  | 'Cocktail Dinner'
  | 'Dinner'
  | 'Lunch'
  | 'Brunch'
  | 'Corporate Gala'
  | 'Private Party'
  | 'Other';

export type SectionKind = 'VEG' | 'NON_VEG' | 'MIXED';

// ─── Dish (Master Repository) ────────────────────────────────────────────────

export interface Dish {
  id: string;
  name: string;
  description: string;
  dietary: Dietary;
  cuisine_tags: string[];
  course_tags: string[];
  counter_type_ids: string[];
  is_signature: boolean;
  is_active: boolean;
  created_by: string;
  updated_at: string;
  source?: string;
}

// ─── Counter Type (Library) ───────────────────────────────────────────────────

export interface CounterType {
  id: string;
  display_name: string;
  category: string;
  default_description: string;
  veg_section_label: string;
  non_veg_section_label: string;
  sort_order: number;
  is_active: boolean;
}

// ─── Menu Structure ───────────────────────────────────────────────────────────

export interface DishRef {
  dish_id: string;
  name: string;
  description: string;
  dietary?: Dietary;
}

export interface MenuSection {
  label: string;
  kind: SectionKind;
  dishes: DishRef[];
}

export interface MenuCounter {
  id: string;
  counter_type_id: string;
  display_name: string;
  display_name_print: string;
  description: string;
  accompaniments_label?: string | null;
  accompaniments?: string | null;
  sections: MenuSection[];
}

export interface Menu {
  id: string;
  client_name: string;
  event_date: string;
  function_type: string;
  guest_count: string;
  venue: string;
  requirements_note: string;
  exclusions_note: string;
  signed_by_name: string;
  signed_by_phone: string;
  status: MenuStatus;
  created_at: string;
  updated_at: string;
  counters: MenuCounter[];
}

// ─── Template ─────────────────────────────────────────────────────────────────

export interface Template {
  id: string;
  name: string;
  description: string;
  guest_scale_label: string;
  counter_count: number;
  counters: TemplateCounter[];
}

export interface TemplateCounter {
  counter_type_id: string;
  display_name: string;
  display_name_print: string;
  description: string;
  sections: TemplateSection[];
}

export interface TemplateSection {
  label: string;
  kind: SectionKind;
  dishes: DishRef[];
}

// ─── PDF Generation ──────────────────────────────────────────────────────────

export type PdfMode = 'classic' | 'modern';

export interface PdfRequest {
  menu: Menu;
  mode: PdfMode;
}

// ─── Filters ─────────────────────────────────────────────────────────────────

export interface DishFilters {
  dietary?: Dietary | '';
  cuisine?: string;
  course?: string;
  counter_type?: string;
  is_signature?: boolean;
  is_active?: boolean;
  search?: string;
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface BrandingSettings {
  signed_by_name: string;
  signed_by_phone: string;
  default_requirements: string;
  default_exclusions: string;
}
