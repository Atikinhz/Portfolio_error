'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Flip } from 'gsap/Flip';
import { isSoundEnabled, playTickSound, playReverseImplosionSound } from '@/lib/sound-fx';

// Register GSAP plugins safely
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, Flip);
}

interface VrakCaseViewProps {
  onClose?: () => void;
}

const vrakSlides = [
  { src: '/assets/vrak/crush_bg.png', alt: 'VRAK CRUSH' },
  { src: '/assets/vrak/zip_bg.png', alt: 'VRAK ZIP' },
  { src: '/assets/vrak/twist_bg.png', alt: 'VRAK TWIST' },
];

const typefaces = [
  {
    category: 'DISPLAY',
    name: 'ANYBODY',
    nameClass:
      'font-anybody font-extrabold text-[var(--text)] text-4xl sm:text-5xl lg:text-[64px] tracking-[0] leading-[1.0]',
  },
  {
    category: 'UTILITY',
    name: 'ONEST',
    nameClass:
      'font-onest font-extralight text-[var(--text)] text-4xl sm:text-5xl lg:text-[64px] tracking-[0] leading-[1.0]',
  },
];

export function VrakCaseView({ onClose }: VrakCaseViewProps): React.ReactElement {
  const router = useRouter();
  const [slideIndex, setSlideIndex] = useState(0);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const heroHeadingRef = useRef<HTMLHeadingElement>(null);
  const lastScrollTopRef = useRef(0);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % vrakSlides.length);
    }, 1500);
    return () => clearInterval(timer);
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

  const handleBack = useCallback(() => {
    if (isSoundEnabled()) {
      playReverseImplosionSound();
    } else {
      playTickSound(140, 0.04);
    }
    if (onClose) {
      onClose();
    } else {
      router.push('/?scene=vrak');
    }
  }, [onClose, router]);

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
  // VRAK MOTION SYSTEM: CONTAINED -> PRESSURE -> RELEASE (GSAP + ScrollTrigger)
  // =========================================================================
  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // 1. HERO TEXT ENTRANCE (Fade-up line reveal without destructive overflow clipping)
      const heroInners = gsap.utils.toArray<HTMLElement>('.hero-line-inner');
      if (heroInners.length > 0) {
        gsap.fromTo(
          heroInners,
          {
            y: 28,
            opacity: 0,
            filter: 'blur(4px)',
          },
          {
            y: 0,
            opacity: 1,
            filter: 'blur(0px)',
            duration: 0.9,
            stagger: 0.09,
            ease: 'power3.out',
            delay: 0.1,
          }
        );
      }

      // 2. HERO SECTION PIN & PRESSURE ON SCROLL (Targets heading container, never colliding with line inner tweens)
      const heroSec = containerRef.current?.querySelector('.vrak-hero-section');
      if (heroSec && heroHeadingRef.current) {
        gsap.to(heroHeadingRef.current, {
          scrollTrigger: {
            trigger: heroSec,
            scroller: containerRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.6,
          },
          scale: 0.97,
          opacity: 0.35,
          ease: 'power1.inOut',
        });
      }

      // 3. FLAVOR SHOWCASE (CONTAINED SLIDESHOW REVEAL)
      const showcaseSec = containerRef.current?.querySelector('.vrak-showcase-section');
      if (showcaseSec) {
        gsap.fromTo(
          showcaseSec.querySelector('.showcase-frame'),
          {
            clipPath: 'inset(12% 8% 12% 8%)',
            scale: 0.94,
            filter: 'contrast(1.15) brightness(0.9)',
          },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            scale: 1,
            filter: 'contrast(1) brightness(1)',
            ease: 'power2.out',
            scrollTrigger: {
              trigger: showcaseSec,
              scroller: containerRef.current,
              start: 'top 85%',
              end: 'top 20%',
              scrub: 1,
            },
          }
        );
      }

      // 4. EDITORIAL SECTIONS (PRESSURE & UNMASKING FOR HEADINGS & CARDS)
      const headings = gsap.utils.toArray<HTMLElement>('.vrak-reveal-heading');
      headings.forEach((heading) => {
        gsap.from(heading, {
          y: 40,
          opacity: 0,
          filter: 'blur(4px)',
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: heading,
            scroller: containerRef.current,
            start: 'top 88%',
            toggleActions: 'play none none reverse',
          },
        });
      });

      // 5. POSTER & VISUAL FRAMES: CONTAINED -> PRESSURE (COMPRESSION) -> RELEASE (UNMASK)
      const visualFrames = gsap.utils.toArray<HTMLElement>('.vrak-visual-frame');
      visualFrames.forEach((frame) => {
        const img = frame.querySelector('img');
        if (img) {
          gsap.fromTo(
            img,
            { scale: 1.12, yPercent: -5 },
            {
              scale: 1.0,
              yPercent: 5,
              ease: 'none',
              scrollTrigger: {
                trigger: frame,
                scroller: containerRef.current,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 1.2,
              },
            }
          );
        }

        gsap.fromTo(
          frame,
          {
            clipPath: 'polygon(0% 8%, 100% 0%, 100% 92%, 0% 100%)',
            opacity: 0.85,
          },
          {
            clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
            opacity: 1,
            duration: 1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: frame,
              scroller: containerRef.current,
              start: 'top 85%',
              end: 'top 30%',
              scrub: 0.8,
            },
          }
        );
      });

      // 6. TYPEFACE SYSTEM CARDS (PRESSURE REVEAL)
      const typeItems = gsap.utils.toArray<HTMLElement>('.vrak-type-item');
      if (typeItems.length > 0) {
        gsap.from(typeItems, {
          x: -30,
          opacity: 0,
          stagger: 0.15,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.vrak-type-wrapper',
            scroller: containerRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        });
      }

      // 7. STICKY GRID SCROLL (Codrops-inspired scroll-driven animated grid with central aperture reveal)
      const stickySection = containerRef.current?.querySelector('.vrak-sticky-grid-section');
      const stickyWrapper = containerRef.current?.querySelector('.vrak-sticky-grid-wrapper');
      const gridContainer = containerRef.current?.querySelector('.vrak-sticky-grid');
      const gridItems = gsap.utils.toArray<HTMLElement>('.vrak-sticky-grid-item');
      const centerContent = containerRef.current?.querySelector('.vrak-sticky-center-content');
      const centerTitle = containerRef.current?.querySelector('.vrak-sticky-title');
      const centerButton = containerRef.current?.querySelector('.vrak-sticky-cta');

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
            scroller: containerRef.current,
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
        // Entire grid zooms in, lateral columns part horizontally, center items part vertically
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

        // Subtly soften background images so center text has immaculate readability
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

        // Phase 5: Comfortable holding phase at the end
        tl.to({}, { duration: 1.2 });
      }
    }, containerRef);

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      id="vrak-case-container"
      className="fixed inset-0 z-50 w-full h-full overflow-y-auto overflow-x-hidden bg-[var(--bg)] text-[var(--text)] font-sans selection:bg-[var(--text)] selection:text-[var(--bg)]"
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
            1. FIRST SCREEN: Frame (Hero Typography Statement)
            Typography: Responsive, fully unmasked, and balanced across all viewports
            ========================================================================= */}
        <section
          className="vrak-hero-section relative flex min-h-[70vh] lg:min-h-[82vh] w-full max-w-[1920px] flex-col items-start justify-center pt-28 pb-16 sm:pt-36 sm:pb-20 lg:pt-40 lg:pb-24 px-6 sm:px-12 lg:pl-20 lg:pr-12 bg-[var(--bg)]"
          aria-labelledby="hero-statement-heading"
        >
          <div className="relative flex w-full max-w-[1760px] flex-none flex-col items-start justify-center gap-6">
            <h1
              ref={heroHeadingRef}
              id="hero-statement-heading"
              className="relative self-stretch font-manrope text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extralight leading-[1.12] tracking-[-0.01em] text-[var(--text)] uppercase select-none"
            >
              <span className="hero-line">
                <span className="hero-line-inner">A LOUD CATEGORY DOESN&apos;T</span>
              </span>
              <span className="hero-line">
                <span className="hero-line-inner">NEED MORE NOISE. IT NEEDS</span>
              </span>
              <span className="hero-line">
                <span className="hero-line-inner">SOMETHING PEOPLE REMEMBER.</span>
              </span>
            </h1>
          </div>
        </section>

        {/* =========================================================================
            2. FLAVOR SHOWCASE SLIDESHOW (Crush -> Zip -> Twist)
            Motion: CONTAINED (Masked inset frame) -> PRESSURE (Expansion) -> RELEASE
            ========================================================================= */}
        <section
          className="vrak-showcase-section relative self-stretch w-full overflow-hidden bg-[var(--bg)]"
          aria-label="VRAK Flavor Slideshow"
        >
          <div className="showcase-frame relative w-full aspect-[1672/941] overflow-hidden will-change-transform">
            {vrakSlides.map((slide, idx) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={slide.src}
                src={slide.src}
                alt={slide.alt}
                loading="eager"
                decoding="sync"
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out ${
                  idx === slideIndex ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
              />
            ))}
          </div>
        </section>

        {/* =========================================================================
            3. BRAND SYSTEM OVERVIEW SECTION
            ========================================================================= */}
        <section
          className="flex flex-col lg:flex-row items-start gap-8 lg:gap-6 px-6 sm:px-12 lg:pl-20 lg:pr-0 py-16 lg:py-20 relative self-stretch w-full shrink-0"
          aria-labelledby="brand-system-heading"
        >
          <div className="inline-flex flex-col items-start justify-center gap-6 relative self-stretch shrink-0 flex-1">
            <div className="flex w-full lg:w-[1314px] max-w-full items-start relative shrink-0">
              <h2
                id="brand-system-heading"
                className="vrak-reveal-heading relative flex-1 mt-[-1.00px] font-anybody font-extrabold text-[var(--text)] text-5xl sm:text-7xl lg:text-[90px] tracking-[0] leading-[0.95] lg:leading-[normal]"
              >
                BRAND SYSTEM
              </h2>
            </div>
            <div className="flex w-full lg:w-[868px] max-w-full items-start lg:items-end justify-start lg:justify-end relative flex-1 grow">
              <p className="relative w-full lg:w-[422px] font-manrope font-extralight text-[var(--text-secondary)] text-lg sm:text-xl tracking-[0] leading-8 lg:leading-9">
                I used Anybody for the loud, compressed brand voice and Onest for
                functional information. The contrast gave me a flexible hierarchy:
                expressive enough for campaigns, but controlled enough to keep
                packaging, flavor names and product details clear.
              </p>
            </div>
          </div>

          <div className="w-full lg:w-[417px] min-h-[auto] lg:h-[403px] items-start lg:items-center justify-center gap-5 flex flex-col relative shrink-0">
            <p className="relative flex-1 self-stretch mt-[-1.00px] font-manrope font-normal text-[var(--text)] text-2xl sm:text-3xl lg:text-4xl tracking-[0] leading-tight lg:leading-[44px]">
              I BUILT VRAK AS A SYSTEM, NOT A SET OF SEPARATE CANS.
            </p>
            <p className="relative self-stretch font-manrope font-extralight text-[var(--text-secondary)] text-lg sm:text-xl tracking-[0] leading-8 lg:leading-9">
              The same typography, structure and brand codes hold the range
              together, while each flavor gets its own color, character and visual
              behavior. This balance gives the lineup strong shelf recognition
              without making the three products feel interchangeable.
            </p>
          </div>
        </section>

        {/* =========================================================================
            4. PRODUCT LINEUP SECTION: Typography + 3_hero.png
            ========================================================================= */}
        <section
          className="flex flex-col lg:flex-row items-start justify-end gap-8 lg:gap-6 px-6 sm:px-12 lg:px-20 py-8 lg:py-0 relative self-stretch w-full shrink-0"
          aria-label="Product lineup"
        >
          <div className="vrak-type-wrapper flex flex-col w-full lg:w-[422px] min-h-[auto] lg:h-[986px] items-start justify-start gap-6 relative shrink-0 py-4">
            <div className="items-start gap-8 lg:gap-10 flex-1 self-stretch w-full grow flex flex-col relative">
              {typefaces.map((typeface) => (
                <div
                  key={typeface.name}
                  className="vrak-type-item flex flex-col items-start gap-4 lg:gap-6 relative self-stretch w-full shrink-0"
                >
                  <p className="relative self-stretch mt-[-1.00px] font-manrope font-normal text-[var(--text)] text-xl sm:text-2xl tracking-[0] leading-6">
                    {typeface.category}
                  </p>
                  <h2 className={`relative self-stretch ${typeface.nameClass}`}>
                    {typeface.name}
                  </h2>
                </div>
              ))}
            </div>
          </div>

          <div className="vrak-visual-frame relative w-full lg:w-[1314px] h-auto lg:h-[986px] aspect-[1.33] overflow-hidden shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="relative w-full h-full object-cover will-change-transform"
              alt="Product lineup"
              src="/assets/vrak/3_hero.png"
              loading="eager"
            />
          </div>
        </section>

        {/* =========================================================================
            5. CHARACTERS INTRO SECTION
            ========================================================================= */}
        <section
          className="flex flex-col lg:flex-row items-start gap-8 lg:gap-6 px-6 sm:px-12 lg:pl-20 lg:pr-0 py-16 lg:py-20 relative self-stretch w-full shrink-0"
          aria-labelledby="characters-heading"
        >
          <div className="w-full lg:w-[1314px] max-w-full items-end self-stretch flex relative">
            <h2
              id="characters-heading"
              className="vrak-reveal-heading relative flex-1 font-anybody font-extrabold text-[var(--text)] text-5xl sm:text-7xl lg:text-[90px] tracking-[0] leading-[0.95] lg:leading-[normal]"
            >
              CHARACTERS
            </h2>
          </div>
          <div className="flex flex-col w-full lg:w-[417px] items-start lg:items-center justify-center gap-5 relative shrink-0">
            <p className="relative self-stretch mt-[-1.00px] font-manrope font-normal text-[var(--text)] text-2xl sm:text-3xl lg:text-4xl tracking-[0] leading-tight lg:leading-[44px]">
              I WANTED EACH FLAVOR TO BE RECOGNIZABLE BEFORE YOU EVEN READ ITS NAME.
            </p>
            <p className="relative self-stretch font-manrope font-extralight text-[var(--text-secondary)] text-lg sm:text-xl tracking-[0] leading-8 lg:leading-9">
              So I turned the three SKUs into distinct characters, each built around
              a different type of energy: pressure, acceleration and mutation. This
              gave me a visual system that could work on packaging, social content
              and advertising while keeping every flavor tied to the same brand
              idea.
            </p>
          </div>
        </section>

        {/* =========================================================================
            6. CRUSH CHARACTER SECTION (crush_poster.png)
            ========================================================================= */}
        <section
          className="flex flex-col lg:flex-row min-h-[auto] lg:h-[758px] items-start gap-6 relative self-stretch w-full"
          aria-labelledby="crush-heading"
        >
          <div className="vrak-visual-frame relative w-full lg:w-[948px] h-auto lg:h-[758px] aspect-[1.25] overflow-hidden shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="relative w-full h-full object-cover will-change-transform"
              alt="CRUSH product design"
              src="/assets/vrak/crush_poster.png"
              loading="eager"
            />
          </div>
          <div className="w-full lg:w-[948px] min-h-[auto] lg:h-[758px] px-6 sm:px-12 lg:px-0 items-start justify-center gap-5 flex flex-col relative py-8 lg:py-0">
            <h2
              id="crush-heading"
              className="vrak-reveal-heading relative self-stretch font-manrope font-normal text-[var(--text)] text-4xl sm:text-5xl lg:text-[64px] tracking-[0] leading-tight lg:leading-[64px]"
            >
              CRUSH
            </h2>
            <p className="relative self-stretch max-w-[640px] font-manrope font-extralight text-[var(--text-secondary)] text-lg sm:text-xl tracking-[0] leading-8 lg:leading-9">
              I designed CRUSH around pressure and impact. The dense red mass,
              forward movement and heavier composition make the flavor feel physical
              and aggressive before the viewer reads a single word.
            </p>
          </div>
        </section>

        {/* =========================================================================
            7. ZIP CHARACTER SECTION (zip_poster.png)
            ========================================================================= */}
        <section
          className="relative flex flex-col-reverse lg:flex-row min-h-[auto] lg:h-[758px] w-full self-stretch items-start justify-end gap-6"
          aria-labelledby="zip-heading"
        >
          <div className="relative flex min-h-[auto] lg:h-[758px] w-full lg:w-[948px] px-6 sm:px-12 lg:px-0 flex-col items-start lg:items-center justify-center gap-5 py-8 lg:py-0">
            <div className="w-full max-w-[640px] flex flex-col gap-5">
              <h2
                id="zip-heading"
                className="vrak-reveal-heading relative self-stretch font-manrope text-4xl sm:text-5xl lg:text-[64px] font-normal leading-tight lg:leading-[64px] tracking-[0] text-[var(--text)]"
              >
                ZIP
              </h2>
              <p className="relative self-stretch font-manrope text-lg sm:text-xl font-extralight leading-8 lg:leading-9 tracking-[0] text-[var(--text-secondary)]">
                With ZIP, I shifted the system toward speed. The diagonal motion,
                sharper silhouette and acid-lime palette create a lighter, faster
                energy while keeping the character clearly inside the same VRAK world.
              </p>
            </div>
          </div>
          <div className="vrak-visual-frame relative m-0 w-full lg:w-[948px] h-auto lg:h-[758px] aspect-[1.25] overflow-hidden shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="relative w-full h-full object-cover will-change-transform"
              alt="ZIP character design"
              src="/assets/vrak/zip_poster.png"
              loading="eager"
            />
          </div>
        </section>

        {/* =========================================================================
            8. TWIST CHARACTER SECTION (twist_poster.png)
            ========================================================================= */}
        <section
          className="relative flex flex-col lg:flex-row min-h-[auto] lg:h-[758px] w-full self-stretch items-start gap-6"
          aria-labelledby="twist-character-heading"
        >
          <div className="vrak-visual-frame relative w-full lg:w-[948px] h-auto lg:h-[758px] aspect-[1.25] overflow-hidden shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="relative w-full h-full object-cover will-change-transform"
              alt="TWIST character design"
              src="/assets/vrak/twist_poster.png"
              loading="eager"
            />
          </div>
          <div className="relative flex min-h-[auto] lg:h-[758px] w-full lg:w-[948px] px-6 sm:px-12 lg:px-0 flex-col items-start justify-center gap-5 py-8 lg:py-0">
            <h2
              id="twist-character-heading"
              className="vrak-reveal-heading relative self-stretch font-manrope text-4xl sm:text-5xl lg:text-[64px] font-normal leading-tight lg:leading-[64px] tracking-[0] text-[var(--text)]"
            >
              TWIST
            </h2>
            <p className="relative self-stretch max-w-[640px] font-manrope text-lg sm:text-xl font-extralight leading-8 lg:leading-9 tracking-[0] text-[var(--text-secondary)]">
              TWIST was built around mutation and unpredictability. I used
              rotational movement, stretched forms and a violet-cyan palette to make
              it feel less stable, more experimental and visually distinct from the
              other two flavors.
            </p>
          </div>
        </section>

        {/* =========================================================================
            9. BRAND IN HAND INTRO SECTION
            ========================================================================= */}
        <section
          className="flex flex-col-reverse lg:flex-row items-start gap-8 lg:gap-6 px-6 sm:px-12 lg:pl-20 lg:pr-0 py-16 lg:py-20 relative self-stretch w-full shrink-0"
          aria-labelledby="brand-in-hand-heading"
        >
          <div className="flex flex-col w-full lg:w-[417px] items-start lg:items-center justify-center gap-5 relative shrink-0">
            <p className="relative self-stretch mt-[-1.00px] font-manrope font-normal text-[var(--text)] text-2xl sm:text-3xl lg:text-4xl tracking-[0] leading-tight lg:leading-[44px]">
              I DIDN&apos;T WANT VRAK TO EXIST ONLY AS A PACKAGING EXERCISE.
            </p>
            <p className="relative self-stretch font-manrope font-extralight text-[var(--text-secondary)] text-lg sm:text-xl tracking-[0] leading-8 lg:leading-9">
              I designed the identity to stay recognizable in real product moments —
              in someone&apos;s hand, in photography and in campaign content. The
              can remains the hero, while color, character and attitude do the rest.
            </p>
          </div>
          <header className="w-full lg:w-[1314px] max-w-full items-start justify-start lg:justify-end self-stretch flex relative">
            <h2
              id="brand-in-hand-heading"
              className="vrak-reveal-heading relative w-fit mt-[-1.00px] font-anybody font-extrabold text-[var(--text)] text-5xl sm:text-7xl lg:text-[90px] tracking-[0] leading-[0.95] lg:leading-[normal]"
            >
              BRAND IN HAND
            </h2>
          </header>
        </section>

        {/* =========================================================================
            10. BRAND IN HAND VISUAL (hand.png)
            ========================================================================= */}
        <section
          className="vrak-visual-frame relative self-stretch w-full h-[60vh] sm:h-[80vh] lg:h-[1080px] overflow-hidden"
          aria-label="Brand in hand"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="w-full h-full object-cover will-change-transform"
            alt="Hands holding Vrank beverage cans"
            src="/assets/vrak/hand.png"
            loading="eager"
          />
        </section>

        {/* =========================================================================
            11. DARK TYPOGRAPHIC STATEMENT BANNER (Kinetic Velocity Marquee)
            ========================================================================= */}
        <section className="flex min-h-[140px] lg:h-[180px] items-center gap-6 py-6 lg:py-8 relative self-stretch w-full bg-[var(--surface-dark)] overflow-hidden select-none">
          <div className="flex w-max whitespace-nowrap overflow-hidden">
            <motion.div
              animate={{ x: ['0%', '-50%'] }}
              transition={{
                repeat: Infinity,
                ease: 'linear',
                duration: 18,
              }}
              className="flex items-center gap-12 text-white font-anybody font-extrabold text-4xl sm:text-6xl md:text-7xl lg:text-[90px] tracking-[0] uppercase"
            >
              <span>ENERGY, BARELY CONTAINED.</span>
              <span className="text-[var(--text-muted)] font-mono text-3xl sm:text-5xl">{'//'}</span>
              <span>CONTAINED CHAOS</span>
              <span className="text-[var(--text-muted)] font-mono text-3xl sm:text-5xl">{'//'}</span>
              <span>ENERGY, BARELY CONTAINED.</span>
              <span className="text-[var(--text-muted)] font-mono text-3xl sm:text-5xl">{'//'}</span>
              <span>CONTAINED CHAOS</span>
              <span className="text-[var(--text-muted)] font-mono text-3xl sm:text-5xl">{'//'}</span>
            </motion.div>
          </div>
        </section>

        {/* =========================================================================
            12. PRODUCT PHOTOGRAPHY (ice.png)
            ========================================================================= */}
        <section
          className="flex flex-col-reverse lg:flex-row w-full max-w-[1760px] items-start lg:items-end justify-between relative shrink-0 px-6 sm:px-12 lg:px-0 gap-8 lg:gap-6"
          aria-label="Product photography"
        >
          <div className="w-full lg:w-[422px] items-start lg:items-center justify-center flex flex-col gap-5 relative shrink-0 pb-6 lg:pb-0">
            <p className="relative self-stretch mt-[-1.00px] font-manrope font-extralight text-[var(--text-secondary)] text-lg sm:text-xl tracking-[0] leading-8 lg:leading-9">
              I treated product photography as part of the identity, not just a
              way to show the cans. Cold surfaces, condensation, ice and strong
              flavor colors make the product feel physical and immediate, while
              the composition keeps the branding clear enough to work across
              launch visuals, social and retail.
            </p>
          </div>

          <div className="vrak-visual-frame relative w-full lg:w-[1314px] h-auto lg:h-[701px] aspect-[1.87] overflow-hidden shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="relative w-full h-full object-cover shrink-0 will-change-transform"
              alt="Three Vrank cans surrounded by ice"
              src="/assets/vrak/ice.png"
              loading="eager"
            />
          </div>
        </section>

        {/* =========================================================================
            14. OUTDOOR ADVERTISING (social.png)
            ========================================================================= */}
        <section className="flex items-start gap-6 px-6 sm:px-12 lg:pl-20 lg:pr-0 py-16 lg:py-20 relative self-stretch w-full shrink-0">
          <div className="w-full max-w-[1760px] items-start lg:items-end flex flex-col gap-5 relative">
            <p className="relative w-full lg:w-[867px] mt-[-1.00px] font-manrope font-extralight text-[var(--text-secondary)] text-lg sm:text-xl tracking-[0] leading-8 lg:leading-9">
              The final test was scale. I adapted the system for outdoor
              advertising, where the idea has to work in seconds and from a
              distance. Large product imagery, character-led color and minimal
              messaging keep each execution instantly readable while making the
              three flavors feel like one campaign.
            </p>
          </div>
        </section>

        <section
          className="vrak-visual-frame relative self-stretch w-full overflow-hidden"
          aria-label="Outdoor advertising campaign"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="relative self-stretch w-full h-auto aspect-[2.0] sm:aspect-[2.23] object-cover will-change-transform"
            alt="Vrank outdoor advertising campaign"
            src="/assets/vrak/social.png"
            loading="eager"
          />
        </section>

        {/* =========================================================================
            14. STICKY GRID SCROLL (CODROPS-INSPIRED SCROLL-DRIVEN ANIMATED GRID)
            6 Campaign Assets with Aperture Zoom revealing "THANKS FOR WATCHING" in Manrope Bold
            ========================================================================= */}
        <section
          className="vrak-sticky-grid-section relative w-full h-[380vh] bg-[var(--bg)]"
          aria-label="VRAK campaign finale and gallery"
        >
          <div className="vrak-sticky-grid-wrapper sticky top-0 w-full h-screen max-h-[100dvh] overflow-hidden flex items-center justify-center relative select-none">
            {/* Center Content: revealed in the aperture created by the parting images */}
            <div className="vrak-sticky-center-content absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-6 pointer-events-none">
              <h2 className="vrak-sticky-title font-manrope font-bold text-4xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight text-[var(--text)] uppercase leading-none select-none">
                THANKS FOR WATCHING
              </h2>
              <div className="vrak-sticky-cta mt-6 sm:mt-10 flex flex-col sm:flex-row items-center gap-3">
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

            {/* Gallery Grid (3 Columns x 2 Rows = 6 Assets) - Significantly larger initial presentation */}
            <div className="vrak-sticky-gallery relative z-10 w-[96vw] sm:w-[94vw] lg:w-[92vw] max-w-[1280px] 2xl:max-w-[1400px] flex items-center justify-center">
              <div className="vrak-sticky-grid grid grid-cols-3 gap-3.5 sm:gap-6 lg:gap-8 w-full items-center justify-items-center will-change-transform">
                {/* Col 0: Item 0 (Top-Left) */}
                <div className="vrak-sticky-grid-item relative w-full aspect-[4/5] overflow-hidden bg-[var(--surface-dark)] will-change-transform shadow-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/assets/vrak/soc_1.png"
                    alt="VRAK Social campaign visual 01"
                    className="w-full h-full object-cover select-none pointer-events-none"
                    loading="lazy"
                  />
                </div>

                {/* Col 1: Item 1 (Top-Center) */}
                <div className="vrak-sticky-grid-item relative w-full aspect-[4/5] overflow-hidden bg-[var(--surface-dark)] will-change-transform shadow-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/assets/vrak/soc_2.png"
                    alt="VRAK Social campaign visual 02"
                    className="w-full h-full object-cover select-none pointer-events-none"
                    loading="lazy"
                  />
                </div>

                {/* Col 2: Item 2 (Top-Right) */}
                <div className="vrak-sticky-grid-item relative w-full aspect-[4/5] overflow-hidden bg-[var(--surface-dark)] will-change-transform shadow-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/assets/vrak/soc_3.png"
                    alt="VRAK Social campaign visual 03"
                    className="w-full h-full object-cover select-none pointer-events-none"
                    loading="lazy"
                  />
                </div>

                {/* Col 0: Item 3 (Bottom-Left) */}
                <div className="vrak-sticky-grid-item relative w-full aspect-[4/5] overflow-hidden bg-[var(--surface-dark)] will-change-transform shadow-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/assets/vrak/soc_4.png"
                    alt="VRAK Social campaign visual 04"
                    className="w-full h-full object-cover select-none pointer-events-none"
                    loading="lazy"
                  />
                </div>

                {/* Col 1: Item 4 (Bottom-Center) */}
                <div className="vrak-sticky-grid-item relative w-full aspect-[4/5] overflow-hidden bg-[var(--surface-dark)] will-change-transform shadow-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/assets/vrak/soc_5.png"
                    alt="VRAK Social campaign visual 05"
                    className="w-full h-full object-cover select-none pointer-events-none"
                    loading="lazy"
                  />
                </div>

                {/* Col 2: Item 5 (Bottom-Right) */}
                <div className="vrak-sticky-grid-item relative w-full aspect-[4/5] overflow-hidden bg-[var(--surface-dark)] will-change-transform shadow-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/assets/vrak/soc_6.png"
                    alt="VRAK Social campaign visual 06"
                    className="w-full h-full object-cover select-none pointer-events-none"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

