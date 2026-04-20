// Replace these 8 paths with your own images placed in front-end/public/floating/.
export const floatingImageAssets = [
  '/floating/1.png',
  '/floating/2.png',
  '/floating/3.png',
  '/floating/4.png',
  '/floating/5.png',
  '/floating/6.png',
  '/floating/7.png',
  '/floating/8.png',
];

export const floatingDarkImageAssets = [
  '/floating-dark/1.png',
  '/floating-dark/2.png',
  '/floating-dark/3.png',
  '/floating-dark/4.png',
  '/floating-dark/5.png',
  '/floating-dark/6.png',
  '/floating-dark/7.png',
  '/floating-dark/8.png',
];

export const getFloatingAssetsByTheme = (resolvedTheme?: string) =>
  resolvedTheme === 'dark' ? floatingDarkImageAssets : floatingImageAssets;
