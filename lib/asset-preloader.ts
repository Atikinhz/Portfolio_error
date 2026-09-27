'use client';

/**
 * High-performance background asset warmer
 * Warms critical hero-level textures and waits for fonts without blocking the user.
 * Uses HTMLImageElement.decode() to prevent frame drops during first render.
 */

export async function preloadImage(src: string): Promise<HTMLImageElement | null> {
  if (typeof window === 'undefined') return null;
  const img = new Image();
  img.src = src;

  try {
    await img.decode();
  } catch {
    // Network / cache fallback: do not block ENTER
  }

  return img;
}

const CRITICAL_HERO_ASSETS = [
  '/assets/portrait.png',
  '/assets/portrait-crop.webp',
  '/assets/work_uiux.png',
  '/assets/work_uiux_2.png',
  '/assets/work_uiux_3.png',
  '/assets/work_uiux_4.png',
  '/assets/work_uiux_5.png',
  '/assets/work_brand.png',
  '/assets/work_brand_2.png',
  '/assets/work_brand_3.png',
  '/assets/work_brand_4.png',
  '/assets/work_brand_5.png',
  '/assets/work_marketing.png',
  '/assets/work_marketing_2.png',
  '/assets/work_marketing_3.png',
  '/assets/work_marketing_4.png',
  '/assets/work_marketing_5.png',
  '/assets/morf_preview.png',
  '/assets/vrak_hero.png',
  '/assets/crush_hero.png',
  '/assets/zip_hero.png',
  '/assets/twist_hero.png',
  '/assets/vrak/Crush Can.png',
  '/assets/vrak/Zip Can.png',
  '/assets/vrak/Twist Can.png',
];

let preloadStarted = false;

export function warmCriticalAssets() {
  if (typeof window === 'undefined' || preloadStarted) return;
  preloadStarted = true;

  // 1. Fonts readiness (resolves when typography is rasterizable without FOUT)
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.catch(() => {});
  }

  // 2. Decode critical hero textures concurrently in the background
  CRITICAL_HERO_ASSETS.forEach((src) => {
    preloadImage(src).catch(() => {});
  });
}
