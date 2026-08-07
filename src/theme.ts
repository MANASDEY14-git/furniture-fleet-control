// src/theme.ts
// Helper functions for theme toggling using Tailwind's 'dark' class and localStorage

export const getCurrentTheme = (): 'light' | 'dark' => {
  if (typeof document === 'undefined') return 'light';
  const stored = localStorage.getItem('theme');
  if (stored === 'dark' || stored === 'light') return stored as 'light' | 'dark';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
};

export const setTheme = (theme: 'light' | 'dark') => {
  if (typeof document === 'undefined') return;
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  localStorage.setItem('theme', theme);
};

export const toggleTheme = () => {
  const current = getCurrentTheme();
  setTheme(current === 'dark' ? 'light' : 'dark');
};
