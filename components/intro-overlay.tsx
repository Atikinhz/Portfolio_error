'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ParticleHeading } from '@/components/particle-heading';
import { warmCriticalAssets } from '@/lib/asset-preloader';

interface IntroOverlayProps {
  onComplete: () => void;
  isReducedMotion?: boolean;
}

export function IntroOverlay({ onComplete, isReducedMotion = false }: IntroOverlayProps) {
  // Phase management:
  // 'counting': minimal tech typography counting 000% -> 100% in 2.6s with authentic stutters
  // 'burst': 100% dissolves into dust particles (300ms)
  // 'reveal': COME IN. crystallizes out of particles
  const [phase, setPhase] = useState<'counting' | 'burst' | 'reveal'>('counting');
  const [percent, setPercent] = useState(0);
  const [showStartBtn, setShowStartBtn] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [intensifyText, setIntensifyText] = useState(false);
  const startBtnRef = useRef<HTMLButtonElement>(null);

  // 1. Kick off background asset warm-up immediately on mount
  useEffect(() => {
    warmCriticalAssets();
  }, []);

  // 2. Realistic, non-linear counter: 0 -> 100 over ~2.6 seconds with authentic pauses
  useEffect(() => {
    let startTime: number | null = null;
    let animId: number;

    const totalDuration = isReducedMotion ? 600 : 2500; // ms

    // Natural progression curve with micro-accelerations and pauses
    const calculateProgress = (t: number): number => {
      // t in [0, 1]
      if (t <= 0.12) {
        // Fast start: 0 -> 21%
        return (t / 0.12) * 21;
      } else if (t <= 0.35) {
        // Steady climb: 21 -> 48%
        const sub = (t - 0.12) / (0.35 - 0.12);
        return 21 + sub * 27;
      } else if (t <= 0.48) {
        // Micro-hesitation (loading heavy asset / shader): 48 -> 53%
        const sub = (t - 0.35) / (0.48 - 0.35);
        return 48 + Math.pow(sub, 2) * 5;
      } else if (t <= 0.72) {
        // Confident burst: 53 -> 85%
        const sub = (t - 0.48) / (0.72 - 0.48);
        return 53 + Math.sin((sub * Math.PI) / 2) * 32;
      } else if (t <= 0.90) {
        // Controlled settling: 85 -> 96%
        const sub = (t - 0.72) / (0.90 - 0.72);
        return 85 + sub * 11;
      } else {
        // Final lock: 96 -> 100%
        const sub = (t - 0.90) / (1.0 - 0.90);
        return 96 + sub * 4;
      }
    };

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const t = Math.min(1, elapsed / totalDuration);

      const currentVal = Math.min(100, Math.floor(calculateProgress(t)));
      setPercent(currentVal);

      if (t < 1) {
        animId = requestAnimationFrame(step);
      } else {
        setPercent(100);
        // Hold 100 briefly, then trigger burst & transition to COME IN.
        setTimeout(() => {
          setPhase('burst');
          setTimeout(() => {
            setPhase('reveal');
          }, 320);
        }, 180);
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [isReducedMotion]);

  // 3. Reveal START button after COME IN. particles condense
  useEffect(() => {
    if (phase === 'reveal') {
      const timer = setTimeout(() => {
        setShowStartBtn(true);
      }, 550);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // 4. Auto-focus START button when ready for keyboard navigation
  useEffect(() => {
    if (showStartBtn) {
      startBtnRef.current?.focus();
    }
  }, [showStartBtn]);

  // 5. Handle START transition (smooth curtain sweep to live site)
  const handleStart = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setIntensifyText(true);

    const completeDuration = isReducedMotion ? 350 : 750;

    setTimeout(() => {
      onComplete();
    }, completeDuration);
  }, [isTransitioning, isReducedMotion, onComplete]);

  // Keyboard shortcut: pressing Enter or Space activates START once available
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Enter' || e.code === 'Space') && showStartBtn && !isTransitioning) {
        e.preventDefault();
        handleStart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStart, showStartBtn, isTransitioning]);

  // Format 0 -> '000 %', 42 -> '042 %', 100 -> '100 %'
  const formattedPercent = String(percent).padStart(3, '0');

  return (
    <motion.div
      key="intro-surface"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Nikita Zhorov Portfolio"
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[var(--bg)] select-none will-change-[clip-path,opacity]"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#F5F5F5',
        pointerEvents: isTransitioning ? 'none' : 'auto',
      }}
      initial={{ opacity: 1 }}
      animate={{
        opacity: isTransitioning ? (isReducedMotion ? 0 : [1, 1, 0]) : 1,
        clipPath: isTransitioning
          ? isReducedMotion
            ? 'none'
            : 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)'
          : 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
      }}
      transition={{
        duration: isReducedMotion ? 0.35 : 0.72,
        ease: [0.76, 0, 0.24, 1],
      }}
    >
      {/* Center Stage: Counter OR Particle COME IN. */}
      <div className="relative w-full h-[70vh] max-h-[720px] flex items-center justify-center overflow-visible px-4 sm:px-6">
        <AnimatePresence mode="wait">
          {phase === 'counting' && (
            <motion.div
              key="counter-display"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{
                opacity: 0,
                scale: 1.08,
                filter: 'blur(8px)',
              }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center justify-center select-none"
            >
              {/* Minimalist, clean digital typography */}
              <div className="flex items-baseline space-x-2.5 sm:space-x-4">
                <span
                  className="font-manrope tabular-nums text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-light text-[var(--text)] tracking-tight"
                  style={{ fontFeatureSettings: '"tnum" on, "zero" on' }}
                >
                  {formattedPercent}
                </span>
                <span className="text-xl sm:text-2xl md:text-3xl text-[var(--text-secondary)] font-normal">
                  %
                </span>
              </div>

              {/* Ultra-subtle minimal progress rail */}
              <div className="mt-6 sm:mt-8 w-32 sm:w-44 h-[1.5px] bg-[var(--border)] overflow-hidden rounded-full">
                <div
                  className="h-full bg-[var(--text)] transition-all duration-75 ease-out"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </motion.div>
          )}

          {phase === 'reveal' && (
            <motion.div
              key="particles-display"
              initial={{ opacity: 0, filter: 'blur(10px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="w-full h-full flex items-center justify-center"
            >
              <ParticleHeading
                lines={['COME IN.']}
                align="center"
                verticalAlign="slightly-above-center"
                maxFontSize={280}
                targetWidthRatio={0.92}
                intensify={intensifyText}
                isReducedMotion={isReducedMotion}
                semanticHeading="h1"
                className="w-full h-full"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Area: Circular START button with clockwise stroke animation */}
      <div className="absolute bottom-[8vh] sm:bottom-[10vh] flex flex-col items-center">
        <AnimatePresence>
          {showStartBtn && !isTransitioning && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center"
            >
              <button
                ref={startBtnRef}
                onClick={handleStart}
                className="group relative w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48 rounded-full bg-transparent flex items-center justify-center cursor-pointer select-none transition-transform duration-500 hover:scale-[1.04] active:scale-[0.98] focus-visible:outline-none"
                aria-label="Start experience"
              >
                {/* SVG Stroke loader appearing left-to-right (clockwise) */}
                <svg
                  className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
                  viewBox="0 0 160 160"
                >
                  {/* Subtle track background */}
                  <circle
                    cx="80"
                    cy="80"
                    r="76"
                    fill="none"
                    stroke="var(--border)"
                    strokeWidth="1.2"
                    strokeOpacity="0.6"
                  />
                  {/* Animated stroke line */}
                  <motion.circle
                    cx="80"
                    cy="80"
                    r="76"
                    fill="none"
                    stroke="var(--text)"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeDasharray={477.5} // 2 * PI * 76
                    initial={{ strokeDashoffset: 477.5 }}
                    animate={{ strokeDashoffset: 0 }}
                    transition={{
                      duration: 0.85,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  />
                </svg>

                {/* START typography: Manrope, CAPS, clean tracking */}
                <span className="font-manrope text-xs sm:text-sm font-semibold tracking-[0.24em] text-[var(--text)] uppercase transition-colors group-hover:text-black">
                  START
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
