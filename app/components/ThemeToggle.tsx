'use client';

import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex items-center gap-2 rounded-lg border border-border/70 bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-[0_10px_28px_rgba(0,0,0,0.14)] transition hover:-translate-y-[1px] hover:border-foreground/40"
      aria-label="Theme umschalten"
    >
      <span
        className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-base shadow-sm"
        aria-hidden
      >
        {isDark ? '☀️' : '🌙'}
      </span>
      {isDark ? 'Hell' : 'Dunkel'}
    </button>
  );
}
