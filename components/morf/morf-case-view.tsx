'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { isSoundEnabled, playTickSound, playReverseImplosionSound } from '@/lib/sound-fx';

// Register GSAP plugins safely on client side
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface MorfCaseViewProps {
  onClose?: () => void;
}

// 6 Dedicated MORF Social/Gallery items (strictly MORF soc_ assets)
const MORF_GALLERY_ITEMS = [
  {
    src: '/assets/morf/soc_1.png',
    alt: 'MORF Dogwear campaign identity visual 01',
  },
  {
    src: '/assets/morf/soc_2.png',
    alt: 'MORF Dogwear campaign identity visual 02',
  },
  {
    src: '/assets/morf/soc_3.png',
    alt: 'MORF Dogwear campaign identity visual 03',
  },
  {
    src: '/assets/morf/soc_4.png',
    alt: 'MORF Dogwear campaign identity visual 04',
  },
  {
    src: '/assets/morf/soc_5.png',
    alt: 'MORF Dogwear campaign identity visual 05',
  },
  {
    src: '/assets/morf/soc_6.png',
    alt: 'MORF Dogwear campaign identity visual 06',
  },
];

export function MorfCaseView({ onClose }: MorfCaseViewProps): React.ReactElement {
  const router = useRouter();
  const [isNavVisible, setIsNavVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef(0);

  // Scroll to top on mount
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, []);

  // Monitor scroll direction on case container: hide back button on scroll down, reveal on scroll up
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const currentScrollTop = container.scrollTop;
      const diff = currentScrollTop - lastScrollTopRef.current;

      if (Math.abs(diff) < 8) return;

      if (currentScrollTop <= 35) {
        setIsNavVisible(true);
      } else if (diff > 0) {
        setIsNavVisible(false);
      } else {
        setIsNavVisible(true);
      }

      lastScrollTopRef.current = currentScrollTop;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (isSoundEnabled()) {
      playReverseImplosionSound();
    } else {
      playTickSound(140, 0.04);
    }
    if (onClose) {
      onClose();
    } else {
      router.push('/?scene=morf');
    }
  }, [onClose, router]);

  // Handle escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        playTickSound(120, 0.03);
        handleBack();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleBack]);

  // =========================================================================
  // STICKY GRID APERTURE ZOOM FINALE (Identical math and physics to VRAK)
  // =========================================================================
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Refresh triggers once images settle
    const t1 = setTimeout(() => ScrollTrigger.refresh(), 300);
    const t2 = setTimeout(() => ScrollTrigger.refresh(), 1200);

    const ctx = gsap.context(() => {
      const stickySection = container.querySelector('.morf-sticky-grid-section');
      const stickyWrapper = container.querySelector('.morf-sticky-grid-wrapper');
      const gridContainer = container.querySelector('.morf-sticky-grid');
      const gridItems = gsap.utils.toArray<HTMLElement>('.morf-sticky-grid-item');
      const centerContent = container.querySelector('.morf-sticky-center-content');
      const centerTitle = container.querySelector('.morf-sticky-title');
      const centerButton = container.querySelector('.morf-sticky-cta');

      if (stickySection && stickyWrapper && gridContainer && gridItems.length === 6) {
        // Distribute 6 items into 3 columns:
        // Col 0 (left): items 0 & 3
        // Col 1 (center): items 1 & 4
        // Col 2 (right): items 2 & 5
        const col0 = [gridItems[0], gridItems[3]];
        const col1 = [gridItems[1], gridItems[4]];
        const col2 = [gridItems[2], gridItems[5]];

        const isMobile = window.innerWidth < 768;
        const initialDy = window.innerHeight * 1.35;
        const targetScale = isMobile ? 1.6 : 1.95;
        const xOffset = isMobile ? 44 : 54;
        const yOffset = isMobile ? 48 : 58;

        // Initial setup:
        // Even columns (0 and 2) start from above the viewport (-initialDy)
        // Odd column (1, center) starts from below the viewport (+initialDy)
        gsap.set([col0, col2], { y: -initialDy, opacity: 0.95 });
        gsap.set(col1, { y: initialDy, opacity: 0.95 });
        gsap.set(gridContainer, { scale: 1, transformOrigin: 'center center' });

        // Center content initial state
        if (centerContent) {
          gsap.set(centerContent, { opacity: 0, pointerEvents: 'none' });
        }
        if (centerTitle) {
          gsap.set(centerTitle, { y: 35, opacity: 0 });
        }
        if (centerButton) {
          gsap.set(centerButton, { y: 20, opacity: 0 });
        }

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: stickySection,
            scroller: container,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.8,
          },
        });

        // Phase 1: Grid Reveal (Columns slide in to assemble the 3x2 grid)
        tl.to(
          col0,
          {
            y: 0,
            opacity: 1,
            stagger: 0.08,
            duration: 1.5,
            ease: 'power2.out',
          },
          'reveal'
        );

        tl.to(
          col2,
          {
            y: 0,
            opacity: 1,
            stagger: 0.08,
            duration: 1.5,
            ease: 'power2.out',
          },
          'reveal'
        );

        tl.to(
          col1,
          {
            y: 0,
            opacity: 1,
            stagger: 0.08,
            duration: 1.5,
            ease: 'power2.out',
          },
          'reveal'
        );

        // Phase 2: Settle / brief pause where user sees full grid
        tl.to({}, { duration: 0.4 });

        // Phase 3: Grid Zoom & Aperture Expansion
        tl.to(
          gridContainer,
          {
            scale: targetScale,
            duration: 1.8,
            ease: 'power2.inOut',
          },
          'zoom'
        );

        tl.to(
          col0,
          {
            xPercent: -xOffset,
            duration: 1.8,
            ease: 'power2.inOut',
          },
          'zoom'
        );

        tl.to(
          col2,
          {
            xPercent: xOffset,
            duration: 1.8,
            ease: 'power2.inOut',
          },
          'zoom'
        );

        // In center column: top item moves UP, bottom item moves DOWN
        tl.to(
          col1[0],
          {
            yPercent: -yOffset,
            duration: 1.8,
            ease: 'power2.inOut',
          },
          'zoom'
        );

        tl.to(
          col1[1],
          {
            yPercent: yOffset,
            duration: 1.8,
            ease: 'power2.inOut',
          },
          'zoom'
        );

        // Soften background images so center text has immaculate readability
        tl.to(
          gridItems,
          {
            opacity: 0.42,
            duration: 1.2,
            ease: 'power1.out',
          },
          'zoom+=0.4'
        );

        // Phase 4: Center Content Reveal ("THANKS FOR WATCHING")
        if (centerContent) {
          tl.to(
            centerContent,
            {
              opacity: 1,
              pointerEvents: 'auto',
              duration: 0.2,
            },
            'zoom+=0.7'
          );
        }

        if (centerTitle) {
          tl.to(
            centerTitle,
            {
              y: 0,
              opacity: 1,
              duration: 0.8,
              ease: 'power3.out',
            },
            'zoom+=0.8'
          );
        }

        if (centerButton) {
          tl.to(
            centerButton,
            {
              y: 0,
              opacity: 1,
              duration: 0.7,
              ease: 'power3.out',
            },
            'zoom+=0.95'
          );
        }

        // Phase 5: Holding phase at the end
        tl.to({}, { duration: 1.2 });
      }
    }, container);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      ctx.revert();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      id="morf-case-container"
      className="fixed inset-0 z-50 w-full h-full overflow-y-auto overflow-x-hidden bg-[var(--bg)] text-[var(--text)] font-manrope selection:bg-[var(--text)] selection:text-[var(--bg)]"
    >
      {/* Minimalist Floating Back Trigger (Flies away on scroll down, reappears on scroll up) */}
      <motion.button
        type="button"
        onClick={handleBack}
        initial={{ opacity: 1, y: 0 }}
        animate={{
          opacity: isNavVisible ? 1 : 0,
          y: isNavVisible ? 0 : -32,
          pointerEvents: isNavVisible ? 'auto' : 'none',
        }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-6 left-6 sm:top-8 sm:left-8 z-50 flex items-center gap-2.5 text-[var(--text)] font-manrope font-semibold text-xs sm:text-sm tracking-[0.22em] uppercase hover:opacity-50 transition-opacity cursor-pointer group select-none"
        aria-label="Back to overview"
      >
        <span className="text-sm transition-transform duration-200 group-hover:-translate-x-1">←</span>
        <span>BACK</span>
      </motion.button>

      <main className="flex flex-col items-center relative w-full bg-[var(--bg)]">
        {/* =========================================================================
            1. HERO TITLE STATEMENT
            ========================================================================= */}
        <header className="relative w-full max-w-[1920px] px-6 sm:px-12 lg:px-20 pt-24 sm:pt-32 lg:pt-36 pb-8 sm:pb-12">
          <h1 className="font-manrope font-extralight text-[var(--text)] text-4xl sm:text-6xl md:text-7xl lg:text-[100px] xl:text-[124px] tracking-[-0.02em] leading-[1.05] sm:leading-[1.02] max-w-[1760px]">
            ONE IDEA, SHAPED ACROSS IDENTITY, CAMPAIGN AND E-COMMERCE.
          </h1>
        </header>

        {/* =========================================================================
            2. HERO VIDEO: FULL VIEWPORT WIDTH (HUD-free, seamlessly looped, muted, autoPlay)
            ========================================================================= */}
        <section className="relative w-full pb-16 sm:pb-24 lg:pb-36" aria-label="MORF campaign hero video">
          <figure className="m-0 relative w-full aspect-[16/9] sm:aspect-[1.78] overflow-hidden bg-[var(--surface-dark)]">
            <video
              className="w-full h-full object-cover"
              src="/assets/morf/main_video.mp4"
              autoPlay
              loop
              muted
              playsInline
              controls={false}
              disablePictureInPicture
              disableRemotePlayback
              aria-label="MORF campaign scene featuring a dog and owner in an urban setting"
            />
          </figure>
        </section>

        {/* =========================================================================
            3. CHALLENGE & SOLUTION SECTION (2-Column Editorial Grid)
            ========================================================================= */}
        <section
          aria-label="Project overview"
          className="relative w-full max-w-[1920px] px-6 sm:px-12 lg:px-20 pb-16 sm:pb-24 lg:pb-36"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 sm:gap-16 lg:gap-12 xl:gap-24 w-full">
            <article className="flex flex-col items-start gap-4 sm:gap-6">
              <h2 className="font-manrope font-normal text-[var(--text)] text-3xl sm:text-5xl lg:text-[64px] tracking-[-0.01em] leading-tight lg:leading-[64px]">
                CHALLENGE
              </h2>
              <p className="font-manrope font-extralight text-[var(--text)] text-base sm:text-lg lg:text-xl tracking-[0] leading-7 sm:leading-8 lg:leading-9">
                Most dogwear is designed by scaling the same pattern across sizes,
                overlooking how radically body proportions can differ. The challenge
                was to create a brand that treats fit as a design problem while
                still feeling relevant within contemporary fashion.
              </p>
            </article>

            <article className="flex flex-col items-start gap-4 sm:gap-6">
              <h2 className="font-manrope font-normal text-[var(--text)] text-3xl sm:text-5xl lg:text-[64px] tracking-[-0.01em] leading-tight lg:leading-[64px]">
                SOLUTION
              </h2>
              <p className="font-manrope font-extralight text-[var(--text)] text-base sm:text-lg lg:text-xl tracking-[0] leading-7 sm:leading-8 lg:leading-9">
                I built MORF around a proportional system rather than conventional
                sizing. One design adapts across three body types, while the
                identity, art direction and digital experience reinforce the same
                balance of function, clarity and fashion.
              </p>
            </article>
          </div>
        </section>

        {/* =========================================================================
            4. CAMPAIGN PORTRAIT (Right-Aligned 1-Column Portrait)
            ========================================================================= */}
        <section
          aria-label="Campaign portrait"
          className="relative w-full max-w-[1920px] px-6 sm:px-12 lg:px-20 pb-16 sm:pb-24 lg:pb-36"
        >
          <div className="flex w-full justify-end">
            <figure className="m-0 w-full md:w-1/2 lg:w-[868px] aspect-[0.67] overflow-hidden bg-[var(--surface-dark)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="w-full h-full object-cover"
                alt="MORF campaign portrait with a dog and owner"
                src="/assets/morf/women_dogs.png"
                loading="lazy"
                decoding="async"
              />
            </figure>
          </div>
        </section>

        {/* =========================================================================
            5. DESIGN SYSTEM SECTION
            Left: Sticky Text block (pinned on scroll, stops at end of image)
            Right: Large Showcase Image
            ========================================================================= */}
        <section
          aria-labelledby="design-system-heading"
          className="relative w-full max-w-[1920px] px-6 sm:px-12 lg:px-20 pb-16 sm:pb-24 lg:pb-36"
        >
          <div className="flex flex-col lg:flex-row items-start gap-10 lg:gap-16 xl:gap-24 w-full relative">
            {/* Sticky Text Block on the Left */}
            <div className="w-full lg:w-[380px] xl:w-[440px] shrink-0 lg:sticky lg:top-24 self-start">
              <article className="flex flex-col items-start gap-5">
                <h2
                  id="design-system-heading"
                  className="font-manrope font-normal text-[var(--text)] text-3xl sm:text-5xl lg:text-[64px] tracking-[-0.01em] leading-tight lg:leading-[64px]"
                >
                  DESIGN
                  <br />
                  SYSTEM
                </h2>
                <p className="font-manrope font-extralight text-[var(--text)] text-base sm:text-lg lg:text-xl tracking-[0] leading-7 sm:leading-8 lg:leading-9">
                  The visual system was built to feel closer to contemporary fashion
                  than traditional pet retail. I used restrained typography, a
                  neutral palette, generous spacing and a flexible editorial grid to
                  give the product room to lead, while keeping every touchpoint
                  consistent across campaign, product and e-commerce.
                </p>
              </article>
            </div>

            {/* Design System Image on the Right */}
            <figure className="m-0 flex-1 w-full overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="w-full h-auto object-contain"
                alt="MORF design system presentation"
                src="/assets/morf/Design System.png"
                loading="lazy"
                decoding="async"
              />
            </figure>
          </div>
        </section>

        {/* =========================================================================
            6. EDITORIAL TRANSITION STATEMENT (Full-Width Large Typography)
            ========================================================================= */}
        <section
          aria-label="Digital experience statement"
          className="relative w-full max-w-[1920px] px-6 sm:px-12 lg:px-20 pb-16 sm:pb-24 lg:pb-36"
        >
          <p className="font-manrope font-extralight text-[var(--text)] text-3xl sm:text-5xl md:text-6xl lg:text-[88px] xl:text-[96px] tracking-[-0.02em] leading-[1.08] max-w-[1760px]">
            THE BRAND SYSTEM CONTINUES INTO THE DIGITAL EXPERIENCE, WHERE
            IDENTITY, HIERARCHY AND INTERACTION BECOME PART OF THE SAME LANGUAGE.
          </p>
        </section>

        {/* =========================================================================
            7. DARK DIGITAL EXPERIENCE SHOWCASE (Full-Width Bleed, HOME + PDP COAT 01)
            ========================================================================= */}
        <section
          aria-label="MORF digital experience"
          className="relative w-full bg-[#161616] text-white py-16 sm:py-24 lg:py-32 my-6 sm:my-10"
        >
          <div className="max-w-[1920px] mx-auto px-6 sm:px-12 lg:px-20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-start justify-center">
              {/* Home Page Layout */}
              <figure className="m-0 w-full overflow-hidden bg-[#1E1E1E]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="w-full h-auto aspect-[0.22] object-cover"
                  alt="MORF home page digital experience"
                  src="/assets/morf/HOME.png"
                  loading="lazy"
                  decoding="async"
                />
              </figure>

              {/* PDP Coat Layout */}
              <figure className="m-0 w-full overflow-hidden bg-[#1E1E1E]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="w-full h-auto aspect-[0.32] object-cover"
                  alt="MORF coat product detail page"
                  src="/assets/morf/PDP COAT 01.png"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== window.location.origin + '/assets/morf/HOME.png') {
                      target.src = '/assets/morf/HOME.png';
                    }
                  }}
                  loading="lazy"
                  decoding="async"
                />
              </figure>
            </div>
          </div>
        </section>

        {/* =========================================================================
            8. BRAND COHERENCE SECTION (Left: Vertical Video / mob_video.mp4, Right: Manifesto)
            ========================================================================= */}
        <section
          aria-labelledby="coherent-brand-heading"
          className="relative w-full max-w-[1920px] px-6 sm:px-12 lg:px-20 py-16 sm:py-24 lg:py-36"
        >
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-12 xl:gap-16 w-full">
            {/* Left: Vertical Video (mob_video.mp4) */}
            <figure className="m-0 w-full sm:w-[423px] shrink-0 aspect-[0.57] overflow-hidden bg-[var(--surface-dark)]">
              <video
                className="w-full h-full object-cover"
                src="/assets/morf/mob_video.mp4"
                poster="/assets/morf/mob_1.png"
                autoPlay
                loop
                muted
                playsInline
                controls={false}
                disablePictureInPicture
                disableRemotePlayback
                aria-label="MORF brand identity application"
              />
            </figure>

            {/* Right: Large Heading & Paragraph */}
            <article className="flex flex-col flex-1 items-start gap-6 sm:gap-8">
              <h2
                id="coherent-brand-heading"
                className="font-manrope font-extralight text-[var(--text)] text-3xl sm:text-5xl md:text-6xl lg:text-[88px] xl:text-[104px] tracking-[-0.02em] leading-[1.05]"
              >
                BUILDING A BRAND THAT FEELS COHERENT BEFORE IT FEELS DECORATIVE.
              </h2>
              <p className="font-manrope font-extralight text-[var(--text)] text-base sm:text-lg lg:text-xl tracking-[0] leading-7 sm:leading-8 lg:leading-9">
                The visual system was built to feel closer to contemporary fashion
                than traditional pet retail. I used restrained typography, a neutral
                palette, generous spacing and a flexible editorial grid to give the
                product room to lead, while keeping every touchpoint consistent
                across campaign, product and e-commerce.
              </p>
            </article>
          </div>
        </section>

        {/* =========================================================================
            9. DESIGNED FOR EVERY SCREEN
            Left: 2 Mobile Screens Side-by-Side (2nd screen offset down gracefully)
            Right: Sticky Heading & Description (pinned on scroll, stops at end of screens)
            ========================================================================= */}
        <section
          aria-labelledby="every-screen-heading"
          className="relative z-10 w-full max-w-[1920px] px-6 sm:px-12 lg:px-20 pb-20 sm:pb-28 lg:pb-36 bg-[var(--bg)]"
        >
          <div className="flex flex-col lg:flex-row items-start gap-10 lg:gap-12 xl:gap-20 w-full relative">
            {/* Left: 2 Mobile Screens Side-by-Side */}
            <div className="flex flex-row items-start gap-6 sm:gap-10 lg:gap-12 w-full lg:w-[68%] xl:w-[1314px] shrink-0">
              {/* Screen 1: Top aligned */}
              <figure className="m-0 flex-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="w-full h-auto object-contain"
                  alt="MORF responsive mobile product experience"
                  src="/assets/morf/mob_1.png"
                  loading="lazy"
                  decoding="async"
                />
              </figure>

              {/* Screen 2: Shifted down gracefully without clipping or black background */}
              <figure className="m-0 flex-1 mt-12 sm:mt-20 lg:mt-28 xl:mt-36">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="w-full h-auto object-contain"
                  alt="MORF responsive screen layout"
                  src="/assets/morf/mob_2.png"
                  loading="lazy"
                  decoding="async"
                />
              </figure>
            </div>

            {/* Right: Sticky Heading & Description */}
            <article className="flex flex-col w-full lg:w-[32%] xl:w-[422px] items-start gap-5 lg:sticky lg:top-24 self-start pt-2 lg:pt-0">
              <h2
                id="every-screen-heading"
                className="font-manrope font-normal text-[var(--text)] text-3xl sm:text-5xl lg:text-[64px] tracking-[-0.01em] leading-tight lg:leading-[64px]"
              >
                DESIGNED FOR EVERY SCREEN
              </h2>
              <p className="font-manrope font-extralight text-[var(--text)] text-base sm:text-lg lg:text-xl tracking-[0] leading-7 sm:leading-8 lg:leading-9">
                The responsive system was designed around the way each screen is
                actually used, not by simply scaling down the desktop layout.
                Content hierarchy, navigation, spacing and interactions were
                reworked for smaller screens while keeping the same visual language.
                The result is a consistent experience across devices without forcing
                one composition to fit every format.
              </p>
            </article>
          </div>
        </section>

        {/* =========================================================================
            10. STICKY GRID APERTURE FINALE (Identical math and physics to VRAK)
            6 Distinct MORF Campaign Assets with Aperture Zoom revealing
            "THANKS FOR WATCHING" in Manrope Bold.
            ========================================================================= */}
        <section
          className="morf-sticky-grid-section relative z-20 w-full h-[380vh] bg-[var(--bg)]"
          aria-label="MORF campaign finale and gallery"
        >
          <div className="morf-sticky-grid-wrapper sticky top-0 w-full h-screen max-h-[100dvh] overflow-hidden flex items-center justify-center relative select-none">
            {/* Center Content: revealed in the aperture created by the parting images */}
            <div className="morf-sticky-center-content absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-6 pointer-events-none">
              <h2 className="morf-sticky-title font-manrope font-bold text-4xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight text-[var(--text)] uppercase leading-none select-none">
                THANKS FOR WATCHING
              </h2>
              <div className="morf-sticky-cta mt-6 sm:mt-10 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="group inline-flex items-center gap-2.5 text-[var(--text)] font-manrope font-bold text-xs sm:text-sm md:text-base uppercase tracking-[0.2em] hover:opacity-50 transition-opacity cursor-pointer pointer-events-auto"
                >
                  <span className="text-sm transition-transform duration-200 group-hover:-translate-x-1">←</span>
                  <span>BACK TO OVERVIEW</span>
                </button>
              </div>
            </div>

            {/* Gallery Grid (3 Columns x 2 Rows = 6 Assets) */}
            <div className="morf-sticky-gallery relative z-10 w-[96vw] sm:w-[94vw] lg:w-[92vw] max-w-[1280px] 2xl:max-w-[1400px] flex items-center justify-center">
              <div className="morf-sticky-grid grid grid-cols-3 gap-3.5 sm:gap-6 lg:gap-8 w-full items-center justify-items-center will-change-transform">
                {MORF_GALLERY_ITEMS.map((item, index) => (
                  <div
                    key={`morf-gallery-item-${index}`}
                    className="morf-sticky-grid-item relative w-full aspect-[4/5] overflow-hidden bg-[var(--surface-dark)] will-change-transform shadow-2xl"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.src}
                      alt={item.alt}
                      className="w-full h-full object-cover select-none pointer-events-none"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
