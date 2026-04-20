import { useRef } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

const THEME_TRANSITION_CLASS = 'theme-transitioning';

const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const cleanupTimer = useRef<number | null>(null);

  const applyTheme = (nextSelected: boolean) => {
    const nextTheme = nextSelected ? 'dark' : 'light';
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = document.documentElement;

    if (cleanupTimer.current) {
      window.clearTimeout(cleanupTimer.current);
      cleanupTimer.current = null;
    }

    if (reducedMotion) {
      setTheme(nextTheme);
      return;
    }

    root.classList.add(THEME_TRANSITION_CLASS);
    cleanupTimer.current = window.setTimeout(() => {
      root.classList.remove(THEME_TRANSITION_CLASS);
    }, 240);

    setTheme(nextTheme);
  };

  return (
    <button
      type="button"
      aria-label="Toggle light and dark mode"
      aria-pressed={isDark}
      className={`theme-toggle ${isDark ? 'theme-toggle--dark' : ''}`}
      onClick={() => applyTheme(!isDark)}
    >
      <span className="theme-toggle__icon theme-toggle__icon--sun" aria-hidden="true">
        <Sun size={13} />
      </span>
      <span className="theme-toggle__icon theme-toggle__icon--moon" aria-hidden="true">
        <Moon size={13} />
      </span>
      <span className="theme-toggle__thumb" aria-hidden="true" />
    </button>
  );
};

export default ThemeToggle;
