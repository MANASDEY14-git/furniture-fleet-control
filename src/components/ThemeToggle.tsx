import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Ensure component renders only on client side to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const currentTheme = theme === 'system' ? systemTheme : theme;

  const toggleTheme = () => {
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className="px-3 py-1 rounded-md border border-muted-foreground hover:bg-muted transition-colors"
      aria-label="Toggle theme"
    >
      {currentTheme === 'dark' ? '🌙 Dark' : '☀️ Light'}
    </button>
  );
}
