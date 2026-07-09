// lib/store/menuStore.ts
// Zustand store for menu builder state
'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Menu, MenuCounter, DishRef, MenuSection, MenuStatus } from '../types';

interface MenuState {
  // Current menu being edited
  currentMenu: Menu | null;
  isDirty: boolean;
  lastSaved: string | null;

  // Actions
  setCurrentMenu: (menu: Menu) => void;
  clearCurrentMenu: () => void;
  updateHeader: (fields: Partial<Menu>) => void;
  addCounter: (counter: MenuCounter) => void;
  removeCounter: (counterId: string) => void;
  reorderCounters: (counters: MenuCounter[]) => void;
  updateCounter: (counterId: string, updates: Partial<MenuCounter>) => void;
  addDishToCounter: (counterId: string, sectionKind: string, dish: DishRef) => void;
  removeDishFromCounter: (counterId: string, sectionKind: string, dishId: string) => void;
  reorderDishesInSection: (counterId: string, sectionKind: string, dishes: DishRef[]) => void;
  setStatus: (status: MenuStatus) => void;
  markSaved: () => void;
  markDirty: () => void;
}

export const useMenuStore = create<MenuState>()(
  persist(
    (set) => ({
      currentMenu: null,
      isDirty: false,
      lastSaved: null,

      setCurrentMenu: (menu) =>
        set({ currentMenu: menu, isDirty: false, lastSaved: new Date().toISOString() }),

      clearCurrentMenu: () =>
        set({ currentMenu: null, isDirty: false, lastSaved: null }),

      updateHeader: (fields) =>
        set((state) => ({
          currentMenu: state.currentMenu
            ? { ...state.currentMenu, ...fields, updated_at: new Date().toISOString() }
            : null,
          isDirty: true,
        })),

      addCounter: (counter) =>
        set((state) => ({
          currentMenu: state.currentMenu
            ? {
                ...state.currentMenu,
                counters: [...state.currentMenu.counters, counter],
                updated_at: new Date().toISOString(),
              }
            : null,
          isDirty: true,
        })),

      removeCounter: (counterId) =>
        set((state) => ({
          currentMenu: state.currentMenu
            ? {
                ...state.currentMenu,
                counters: state.currentMenu.counters.filter((c) => c.id !== counterId),
                updated_at: new Date().toISOString(),
              }
            : null,
          isDirty: true,
        })),

      reorderCounters: (counters) =>
        set((state) => ({
          currentMenu: state.currentMenu
            ? { ...state.currentMenu, counters, updated_at: new Date().toISOString() }
            : null,
          isDirty: true,
        })),

      updateCounter: (counterId, updates) =>
        set((state) => ({
          currentMenu: state.currentMenu
            ? {
                ...state.currentMenu,
                counters: state.currentMenu.counters.map((c) =>
                  c.id === counterId ? { ...c, ...updates } : c
                ),
                updated_at: new Date().toISOString(),
              }
            : null,
          isDirty: true,
        })),

      addDishToCounter: (counterId, sectionKind, dish) =>
        set((state) => {
          if (!state.currentMenu) return {};
          return {
            currentMenu: {
              ...state.currentMenu,
              counters: state.currentMenu.counters.map((c) => {
                if (c.id !== counterId) return c;
                const existingSection = c.sections.find((s) => s.kind === sectionKind);
                let sections: MenuSection[];
                if (existingSection) {
                  sections = c.sections.map((s) =>
                    s.kind === sectionKind
                      ? { ...s, dishes: [...s.dishes, dish] }
                      : s
                  );
                } else {
                  sections = [
                    ...c.sections,
                    {
                      label: sectionKind === 'VEG' ? 'Vegetarian' : 'Non Vegetarian',
                      kind: sectionKind as 'VEG' | 'NON_VEG' | 'MIXED',
                      dishes: [dish],
                    },
                  ];
                }
                return { ...c, sections };
              }),
              updated_at: new Date().toISOString(),
            },
            isDirty: true,
          };
        }),

      removeDishFromCounter: (counterId, sectionKind, dishId) =>
        set((state) => ({
          currentMenu: state.currentMenu
            ? {
                ...state.currentMenu,
                counters: state.currentMenu.counters.map((c) => {
                  if (c.id !== counterId) return c;
                  return {
                    ...c,
                    sections: c.sections.map((s) =>
                      s.kind === sectionKind
                        ? { ...s, dishes: s.dishes.filter((d) => d.dish_id !== dishId) }
                        : s
                    ),
                  };
                }),
                updated_at: new Date().toISOString(),
              }
            : null,
          isDirty: true,
        })),

      reorderDishesInSection: (counterId, sectionKind, dishes) =>
        set((state) => ({
          currentMenu: state.currentMenu
            ? {
                ...state.currentMenu,
                counters: state.currentMenu.counters.map((c) => {
                  if (c.id !== counterId) return c;
                  return {
                    ...c,
                    sections: c.sections.map((s) =>
                      s.kind === sectionKind ? { ...s, dishes } : s
                    ),
                  };
                }),
                updated_at: new Date().toISOString(),
              }
            : null,
          isDirty: true,
        })),

      setStatus: (status) =>
        set((state) => ({
          currentMenu: state.currentMenu
            ? { ...state.currentMenu, status, updated_at: new Date().toISOString() }
            : null,
          isDirty: true,
        })),

      markSaved: () => set({ isDirty: false, lastSaved: new Date().toISOString() }),
      markDirty: () => set({ isDirty: true }),
    }),
    {
      name: 'menucraft-builder',
      partialize: (state) => ({ currentMenu: state.currentMenu }),
    }
  )
);
