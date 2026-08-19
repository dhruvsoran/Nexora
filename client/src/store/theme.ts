import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  dark: boolean;
  toggle: () => void;
  setDark: (dark: boolean) => void;
}

function applyTheme(dark: boolean) {
  const root = document.documentElement;
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
}

const isDarkStored = () => {
  if (typeof window === 'undefined') return false;
  const raw = localStorage.getItem('nexora-theme');
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { state?: { dark?: boolean } };
      if (parsed?.state && typeof parsed.state.dark === 'boolean') return parsed.state.dark;
    } catch {
      /* ignore */
    }
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      dark: isDarkStored(),
      toggle: () => {
        const next = !get().dark;
        applyTheme(next);
        set({ dark: next });
      },
      setDark: (dark) => {
        applyTheme(dark);
        set({ dark });
      },
    }),
    { name: 'nexora-theme' }
  )
);

if (typeof window !== 'undefined') {
  applyTheme(useThemeStore.getState().dark);
}
