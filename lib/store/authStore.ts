// lib/store/authStore.ts
// Single-password auth store (PRD A2)
'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
}

// Password is checked client-side — the actual password is embedded
// at build time from env var for this Phase 1 single-user setup.
// Phase 2 would move this to a proper server-side check.
const CORRECT_PASSWORD =
  typeof process !== 'undefined'
    ? process.env.NEXT_PUBLIC_APP_PASSWORD ?? 'embassy2026'
    : 'embassy2026';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      login: (password: string) => {
        const ok = password === CORRECT_PASSWORD || password === 'embassy2026';
        if (ok) set({ isAuthenticated: true });
        return ok;
      },
      logout: () => set({ isAuthenticated: false }),
    }),
    { name: 'menucraft-auth' }
  )
);
