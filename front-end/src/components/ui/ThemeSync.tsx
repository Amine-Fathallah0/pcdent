import { useEffect } from 'react';
import { useTheme } from 'next-themes';

const ThemeSync = () => {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const theme = resolvedTheme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-color-scheme', theme);
  }, [resolvedTheme]);

  return null;
};

export default ThemeSync;
