'use client';

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { playTickSound } from '@/lib/sound-fx';
import { AnimatedNoiseOverlay } from '@/components/animated-noise-overlay';

interface DisciplinesSceneProps {
  isActive?: boolean;
  onHoverStateChange?: (state: string | null) => void;
  isReducedMotion?: boolean;
}

type DirectionId = 'uiux' | 'brand' | 'marketing';

interface WorkImage {
  src: string;
  alt: string;
  aspectRatio?: string;
}

interface DirectionItem {
  id: DirectionId;
  label: string;
  images: WorkImage[];
}

const DIRECTIONS: DirectionItem[] = [
  {
    id: 'uiux',
    label: 'UI/UX',
    images: [
      { src: '/assets/work_uiux.png', alt: 'UI/UX Design Systems', aspectRatio: '1122 / 1402' },
      { src: '/assets/work_uiux_2.png', alt: 'UI/UX Interface Systems', aspectRatio: '1280 / 853' },
      { src: '/assets/work_uiux_3.png', alt: 'UI/UX Digital Architecture', aspectRatio: '4 / 3' },
      { src: '/assets/work_uiux_4.png', alt: 'UI/UX Product Experience', aspectRatio: '4 / 3' },
      { src: '/assets/work_uiux_5.png', alt: 'UI/UX Interaction Framework', aspectRatio: '4 / 3' },
    ],
  },
  {
    id: 'brand',
    label: 'BRAND',
    images: [
      { src: '/assets/work_brand.png', alt: 'Brand Identity Direction', aspectRatio: '1122 / 1402' },
      { src: '/assets/work_brand_2.png', alt: 'Brand Visual Culture', aspectRatio: '4 / 3' },
      { src: '/assets/work_brand_3.png', alt: 'Brand Narrative Architecture', aspectRatio: '4 / 3' },
      { src: '/assets/work_brand_4.png', alt: 'Brand Identity Systems', aspectRatio: '4 / 3' },
      { src: '/assets/work_brand_5.png', alt: 'Brand Typographic Universe', aspectRatio: '4 / 3' },
    ],
  },
  {
    id: 'marketing',
    label: 'MARKETING',
    images: [
      { src: '/assets/work_marketing.png', alt: 'Marketing Campaign Direction', aspectRatio: '1122 / 1402' },
      { src: '/assets/work_marketing_2.png', alt: 'Marketing Strategic Content', aspectRatio: '4 / 3' },
      { src: '/assets/work_marketing_3.png', alt: 'Marketing Digital Presence', aspectRatio: '4 / 3' },
      { src: '/assets/work_marketing_4.png', alt: 'Marketing Product Launch', aspectRatio: '4 / 3' },
      { src: '/assets/work_marketing_5.png', alt: 'Marketing Creative Strategy', aspectRatio: '4 / 3' },
    ],
  },
];

export const DisciplinesScene = memo(function DisciplinesScene({
  isActive = true,
  onHoverStateChange,
  isReducedMotion = false,
}: DisciplinesSceneProps) {
  const [activeCategory, setActiveCategory] = useState<DirectionId>('uiux');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [canParallax, setCanParallax] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  // Pre-load all 15 images on mount for immediate zero-latency presentation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    DIRECTIONS.forEach((item) => {
      item.images.forEach((imgObj) => {
        const img = new window.Image();
        img.src = imgObj.src;
      });
    });
  }, []);

  // Check for fine pointer (desktop mouse)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const finePointer = window.matchMedia('(pointer: fine)').matches;
      setCanParallax(finePointer);
    }
  }, []);

  // Rock-solid 0.8s (800ms) auto-cycling interval
  useEffect(() => {
    if (isReducedMotion) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % 5);
    }, 800);

    return () => clearInterval(interval);
  }, [isReducedMotion, activeCategory]);

  // Desktop Pointer Parallax: smooth, isolated, GPU-only spring
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 90, damping: 26, mass: 0.3 });
  const springY = useSpring(pointerY, { stiffness: 90, damping: 26, mass: 0.3 });
  const mediaParallaxX = useTransform(springX, (val) => (isReducedMotion || !canParallax ? 0 : val * 8));
  const mediaParallaxY = useTransform(springY, (val) => (isReducedMotion || !canParallax ? 0 : val * 6));

  const handleContainerPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isReducedMotion || !canParallax) return;
      if (e.pointerType === 'touch') return;
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const clientX = e.clientX;
      const clientY = e.clientY;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const normX = ((clientX - rect.left) / rect.width - 0.5) * 2;
        const normY = ((clientY - rect.top) / rect.height - 0.5) * 2;
        pointerX.set(Math.max(-1, Math.min(1, normX)));
        pointerY.set(Math.max(-1, Math.min(1, normY)));
      });
    },
    [canParallax, isReducedMotion, pointerX, pointerY]
  );

  const handleContainerPointerLeave = useCallback(() => {
    pointerX.set(0);
    pointerY.set(0);
    onHoverStateChange?.(null);
  }, [onHoverStateChange, pointerX, pointerY]);

  // Category selection: switches category and starts from image 0
  const handleSelectCategory = useCallback(
    (id: DirectionId) => {
      if (activeCategory !== id) {
        setActiveCategory(id);
        setCurrentIndex(0);
        playTickSound(144, 0.02);
      }
      onHoverStateChange?.('action');
    },
    [activeCategory, onHoverStateChange]
  );

  // Manual click on visual stage immediately advances to next slide
  const handleStageClick = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % 5);
    playTickSound(156, 0.02);
  }, []);

  const activeImages = DIRECTIONS.find((d) => d.id === activeCategory)?.images || [];

  return (
    <section
      ref={containerRef}
      id="disciplines-stage"
      aria-label="Core Disciplines: UI/UX, Brand, Marketing"
      onPointerMove={handleContainerPointerMove}
      onPointerLeave={handleContainerPointerLeave}
      className="relative w-full h-full min-h-screen flex items-center justify-center bg-[var(--bg)] select-none isolate overflow-hidden"
    >
      {/* Semantic outline for accessibility */}
      <div className="sr-only">
        <h2>Core Disciplines</h2>
        <ul>
          <li>UI/UX Design</li>
          <li>Brand Identity</li>
          <li>Marketing Strategy</li>
        </ul>
      </div>

      {/* =====================================================================
          VISUAL STAGE
          - Aspect ratio 4:3 (1280x960 native match)
          - object-contain: 100% visible, zero cropping
          - Clean GPU crossfade every 0.8s (800ms)
          - Lightweight transparent SVG film grain overlay (never blocks images)
          ===================================================================== */}
      <motion.div
        id="disciplines-parallax-container"
        style={{
          x: mediaParallaxX,
          y: mediaParallaxY,
        }}
        className="absolute top-1/2 left-1/2 md:left-[53%] lg:left-[51%] -translate-x-1/2 -translate-y-1/2 w-[310px] sm:w-[420px] md:w-[520px] lg:w-[600px] xl:w-[680px] aspect-[4/3] max-h-[58vh] z-10"
      >
        <div
          id="disciplines-media-stage"
          onClick={handleStageClick}
          className="relative w-full h-full pointer-events-auto cursor-pointer"
        >
          {/* Active Category 5 Works */}
          {activeImages.map((imgItem, imgIdx) => {
            const isImageActive = imgIdx === currentIndex;

            return (
              <div
                key={`${activeCategory}-${imgItem.src}`}
                id={`media-plate-${activeCategory}-${imgIdx}`}
                className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none"
                style={{
                  opacity: isImageActive ? 1 : 0,
                  transform: isImageActive ? 'scale(1)' : 'scale(1.018)',
                  transition: isReducedMotion
                    ? 'opacity 120ms ease'
                    : 'opacity 240ms cubic-bezier(0.16, 1, 0.3, 1), transform 320ms cubic-bezier(0.16, 1, 0.3, 1)',
                  willChange: 'opacity, transform',
                  zIndex: isImageActive ? 5 : 1,
                }}
              >
                {/* 
                  Strictly dimensioned frame matching the exact rendered bounds of the image,
                  preventing any noise spill or noise "frame" outside the image.
                */}
                <div
                  className="relative max-w-full max-h-full overflow-hidden flex items-center justify-center select-none"
                  style={{
                    aspectRatio: imgItem.aspectRatio || '4 / 3',
                    height: '100%',
                    width: 'auto',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgItem.src}
                    alt={imgItem.alt}
                    draggable={false}
                    loading={imgIdx === 0 ? 'eager' : 'lazy'}
                    className="w-full h-full object-contain object-center select-none pointer-events-none block"
                  />
                  {/* Subtle analog film grain matching hero portrait strictly over the image */}
                  <AnimatedNoiseOverlay opacity={0.075} />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* =====================================================================
          ASYMMETRIC TYPOGRAPHIC COMPOSITION
          Manrope 800, uppercase, architectural spacing and rhythm.
          Clean hover selection, zero conflicting mousemove listeners.
          ===================================================================== */}
      <div className="relative w-full max-w-[1720px] h-full flex flex-col justify-between px-6 sm:px-10 md:px-14 lg:px-20 pt-28 sm:pt-32 md:pt-36 pb-24 sm:pb-28 md:pb-32 z-20 pointer-events-none">
        {/* ROW 1: UI/UX */}
        <div className="flex justify-start items-center w-full pl-0 md:pl-[3vw] lg:pl-[5vw]">
          <button
            type="button"
            id="discipline-link-uiux"
            onClick={() => handleSelectCategory('uiux')}
            onPointerEnter={() => handleSelectCategory('uiux')}
            onPointerLeave={() => onHoverStateChange?.(null)}
            className="group relative pointer-events-auto cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/40 rounded-sm text-left transition-all"
            style={{
              opacity: activeCategory === 'uiux' ? 1 : 0.28,
              transform:
                activeCategory === 'uiux' && !isReducedMotion
                  ? 'translate3d(-2px, -3px, 0)'
                  : 'translate3d(0, 0, 0)',
              transition: 'opacity 350ms cubic-bezier(0.16, 1, 0.3, 1), transform 350ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <span
              className="block font-extrabold uppercase text-[var(--text)] select-none tracking-[-0.04em] leading-[0.88] text-[clamp(54px,9.8vw,168px)]"
              style={{
                fontFamily: "var(--font-manrope), 'Manrope', -apple-system, sans-serif",
                fontWeight: 800,
              }}
            >
              UI/UX
            </span>
          </button>
        </div>

        {/* ROW 2: BRAND */}
        <div className="flex justify-end items-center w-full pr-0 md:pr-[4vw] lg:pr-[7vw]">
          <button
            type="button"
            id="discipline-link-brand"
            onClick={() => handleSelectCategory('brand')}
            onPointerEnter={() => handleSelectCategory('brand')}
            onPointerLeave={() => onHoverStateChange?.(null)}
            className="group relative pointer-events-auto cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/40 rounded-sm text-right transition-all"
            style={{
              opacity: activeCategory === 'brand' ? 1 : 0.28,
              transform:
                activeCategory === 'brand' && !isReducedMotion
                  ? 'translate3d(2px, -3px, 0)'
                  : 'translate3d(0, 0, 0)',
              transition: 'opacity 350ms cubic-bezier(0.16, 1, 0.3, 1), transform 350ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <span
              className="block font-extrabold uppercase text-[var(--text)] select-none tracking-[-0.04em] leading-[0.88] text-[clamp(54px,9.8vw,168px)]"
              style={{
                fontFamily: "var(--font-manrope), 'Manrope', -apple-system, sans-serif",
                fontWeight: 800,
              }}
            >
              BRAND
            </span>
          </button>
        </div>

        {/* ROW 3: MARKETING */}
        <div className="flex justify-start items-center w-full pl-0 md:pl-[6vw] lg:pl-[9vw]">
          <button
            type="button"
            id="discipline-link-marketing"
            onClick={() => handleSelectCategory('marketing')}
            onPointerEnter={() => handleSelectCategory('marketing')}
            onPointerLeave={() => onHoverStateChange?.(null)}
            className="group relative pointer-events-auto cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text)]/40 rounded-sm text-left transition-all"
            style={{
              opacity: activeCategory === 'marketing' ? 1 : 0.28,
              transform:
                activeCategory === 'marketing' && !isReducedMotion
                  ? 'translate3d(-2px, -3px, 0)'
                  : 'translate3d(0, 0, 0)',
              transition: 'opacity 350ms cubic-bezier(0.16, 1, 0.3, 1), transform 350ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <span
              className="block font-extrabold uppercase text-[var(--text)] select-none tracking-[-0.045em] leading-[0.88] text-[clamp(44px,8.8vw,150px)]"
              style={{
                fontFamily: "var(--font-manrope), 'Manrope', -apple-system, sans-serif",
                fontWeight: 800,
              }}
            >
              MARKETING
            </span>
          </button>
        </div>
      </div>
    </section>
  );
});
