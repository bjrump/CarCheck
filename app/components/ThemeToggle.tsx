'use client';

import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-semibold text-foreground transition hover:shadow-soft hover:-translate-y-[1px]"
      aria-label="Theme umschalten"
    >
      <span
        className="flex h-6 w-6 items-center justify-center rounded-full bg-card text-base shadow-sm"
        aria-hidden
      >
        {isDark ? '☀️' : '🌙'}
      </span>
      {isDark ? 'Hell' : 'Dunkel'}
    </button>
  );
}


