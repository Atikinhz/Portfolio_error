'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { playTickSound } from '@/lib/sound-fx';

interface TypographicProjectSceneProps {
  projectId: 'morf' | 'vrak';
  title: 'MORF' | 'VRAK';
  imageSrc: string;
  imageAlt: string;
  href: string;
  isActive: boolean; // True when this scene is at center dwell in cylinder drum
  isPeeking: boolean; // True when peeking above/below center
  onOpenCase?: () => void; // Dedicated modal opener for VRAK
  onHoverStateChange: (state: string | null) => void;
  bounceEffect?: boolean;
}

export function TypographicProjectScene({
  projectId,
  title,
  imageSrc,
  imageAlt,
  href,
  isActive,
  isPeeking,
  onOpenCase,
  onHoverStateChange,
  bounceEffect = false,
}: TypographicProjectSceneProps) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const hasEnteredRef = useRef(false);

  // Detect touch/mobile devices to provide an authentic touch-first active state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkTouch = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(hover: none), (pointer: coarse)').matches
      );
    };
    checkTouch();
    window.addEventListener('resize', checkTouch, { passive: true });
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  const isMorf = projectId === 'morf';
  const effectiveHovered = isActive && isHovered;
  const effectiveOpening = isActive && isOpening;

  // Hover enter with sound and cursor activation
  const handlePointerEnter = useCallback(() => {
    if (!isActive || isTouchDevice) return;
    setIsHovered(true);
    onHoverStateChange('action');

    if (!hasEnteredRef.current) {
      hasEnteredRef.current = true;
      playTickSound(isMorf ? 96 : 108, 0.024);
    }
  }, [isActive, isTouchDevice, onHoverStateChange, isMorf]);

  const handlePointerLeave = useCallback(() => {
    setIsHovered(false);
    hasEnteredRef.current = false;
    onHoverStateChange(null);
  }, [onHoverStateChange]);

  // Click / Open case action
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isActive) return;
      e.preventDefault();
      setIsOpening(true);
      playTickSound(isMorf ? 120 : 135, 0.035);

      if (onOpenCase) {
        // VRAK case view modal
        onOpenCase();
      } else {
        // MORF project page
        router.push(href);
      }
    },
    [isActive, isMorf, onOpenCase, router, href]
  );

  // KEYBOARD ACCESSIBILITY: Enter / Space triggers case
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isActive) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick(e as unknown as React.MouseEvent);
      }
    },
    [isActive, handleClick]
  );

  /* --------------------------------------------------------------------------
     STATE PARAMETERS:
     A. Idle State (not center): Title present, image very quiet / nearly hidden
     B. Active Center State: Title crisp & dominant, image gently perceptible
     C. Hover / Pointer Interaction: Image smoothly intensifies & floats forward
     D. Mobile / Touch State: Image elevated automatically at center state
     -------------------------------------------------------------------------- */
  const isRevealed = effectiveHovered || effectiveOpening;
  const isMobileActive = isTouchDevice && isActive;

  // Image Opacity
  let imageOpacity = 0.08; // Idle state
  if (isRevealed) {
    imageOpacity = 0.98; // Hover state
  } else if (isMobileActive) {
    imageOpacity = 0.85; // Mobile active state
  } else if (isActive) {
    imageOpacity = 0.28; // Desktop active center state
  }

  // Depth / translateZ
  let imageTranslateZ = -12; // Idle state
  if (isRevealed) {
    imageTranslateZ = 18; // Hover elevation
  } else if (isActive) {
    imageTranslateZ = 0; // Active resting plane
  }

  // Image Scale
  let imageScale = 0.96;
  if (isRevealed) {
    imageScale = 1.015;
  } else if (isMobileActive) {
    imageScale = 1.0;
  } else if (isActive) {
    imageScale = 0.985;
  }

  // Filter: Saturation & Contrast
  let imageFilter = 'saturate(0.3) brightness(0.9) contrast(0.96)';
  if (isRevealed || isMobileActive) {
    imageFilter = 'saturate(1.04) brightness(1.0) contrast(1.02)';
  } else if (isActive) {
    imageFilter = 'saturate(0.58) brightness(0.95) contrast(0.98)';
  }

  // Title TranslateZ
  const titleTranslateZ = isRevealed ? 48 : isActive ? 34 : 15;

  return (
    <div
      id={`typographic-scene-${projectId}`}
      role="button"
      tabIndex={isActive ? 0 : -1}
      aria-label={`${title} — Open case project`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      className={`group relative w-full max-w-6xl mx-auto flex items-center justify-center px-4 sm:px-8 select-none focus:outline-none ${
        isActive ? 'cursor-pointer' : ''
      }`}
      style={{
        transformStyle: 'preserve-3d',
      }}
    >
      {/* 
        UNIFIED SCENOGRAPHIC STAGE
        The monumental title is the primary anchor of the scene.
        The preview canvas is an integrated architectural plane in the depth layer.
      */}
      <div
        className={`relative w-full flex flex-col md:flex-row items-center justify-center transition-transform duration-700 ease-out ${
          bounceEffect ? 'scale-[1.01]' : ''
        }`}
        style={{
          transformStyle: 'preserve-3d',
        }}
      >
        {/* 
          1. PREVIEW IMAGE PLANE (The Secondary Revealing Visual Layer)
          Positioned as an architectural backdrop canvas that gently reveals the project's world.
        */}
        <div
          className="relative w-[88vw] sm:w-[78vw] md:w-[62vw] lg:w-[660px] xl:w-[720px] aspect-[16/10] overflow-hidden rounded-[2px] shadow-[0_20px_60px_-20px_rgba(22,22,22,0.14)] transition-all md:translate-x-10 lg:translate-x-16 bg-[var(--surface-dark)]"
          style={{
            transform: `translateZ(${imageTranslateZ}px) scale(${imageScale})`,
            opacity: imageOpacity,
            filter: imageFilter,
            transformStyle: 'preserve-3d',
            transitionProperty: 'transform, opacity, filter, box-shadow',
            transitionDuration: isHovered ? '820ms' : '1180ms',
            transitionTimingFunction: isHovered
              ? 'cubic-bezier(0.16, 1, 0.3, 1)'
              : 'cubic-bezier(0.25, 1, 0.35, 1)',
            willChange: 'transform, opacity, filter',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={imageAlt}
            draggable={false}
            className="w-full h-full object-cover block select-none"
          />

          {/* Quiet vignette binding the image plane organically to the canvas tone */}
          <div
            className={`absolute inset-0 pointer-events-none transition-opacity ${
              isHovered ? 'opacity-20' : 'opacity-40'
            } bg-gradient-to-t from-[var(--surface-dark)]/60 via-transparent to-transparent`}
            style={{
              transitionDuration: isHovered ? '800ms' : '1200ms',
            }}
          />
        </div>

        {/* 
          2. MONUMENTAL DISPLAY TITLE (The Primary Visual Anchor)
          Scale: clamp occupying ~35–45% of viewport width on desktop.
          Typography: Anybody Black, tight architectural tracking, ultra-condensed leading.
          Floats in foreground depth layer across the scene.
        */}
        <div
          className="pointer-events-none absolute z-20 flex items-center justify-center transition-transform md:left-4 lg:left-10 md:top-1/2 md:-translate-y-1/2 -top-10 sm:-top-14 md:top-auto"
          style={{
            transform: `translateZ(${titleTranslateZ}px)`,
            transformStyle: 'preserve-3d',
            transitionDuration: isHovered ? '820ms' : '1180ms',
            transitionTimingFunction: isHovered
              ? 'cubic-bezier(0.16, 1, 0.3, 1)'
              : 'cubic-bezier(0.25, 1, 0.35, 1)',
            willChange: 'transform',
          }}
        >
          <h2
            id={`scene-title-${projectId}`}
            className={`${
              projectId === 'vrak' ? 'font-anybody font-black' : 'font-manrope font-extrabold'
            } tracking-[-0.04em] uppercase text-[var(--text)] select-none text-[clamp(4.25rem,13.5vw,13.5rem)] leading-[0.82] drop-shadow-[0_2px_12px_rgba(245,245,245,0.65)]`}
            style={{
              fontFamily: projectId === 'vrak' ? 'var(--font-anybody), "Anybody", sans-serif' : 'var(--font-manrope), "Manrope", sans-serif',
              fontWeight: projectId === 'vrak' ? 900 : 800,
            }}
          >
            {title}
          </h2>
        </div>
      </div>
    </div>
  );
}
