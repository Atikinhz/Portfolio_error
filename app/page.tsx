'use client';

import React, { useState, useCallback, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { IntroOverlay } from '@/components/intro-overlay';
import { CylinderPanel } from '@/components/cylinder-panel';
import { VrakCaseView } from '@/components/vrak-case-view';
import { MorfCaseView } from '@/components/morf/morf-case-view';
import { setSoundEnabled } from '@/lib/sound-fx';
import { useCylinderPhysics } from '@/lib/use-cylinder-physics';
import { useCaseModalRouting } from '@/lib/use-case-modal-routing';

function getServerSnapshot(): boolean {
  return false;
}

function subscribeEmpty() {
  return () => {};
}

function getClientSnapshot(): boolean {
  return true;
}

function subscribeToReducedMotion(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}

function getReducedMotionSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function SpatialPortfolio() {
  const [, setCursorState] = useState<string | null>(null);
  const [loaderFinished, setLoaderFinished] = useState(false);
  const loaderReady = loaderFinished;

  const handleLoaderComplete = useCallback(() => {
    setSoundEnabled(false);
    setLoaderFinished(true);
  }, []);

  const isReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getServerSnapshot
  );

  const isMounted = useSyncExternalStore(
    subscribeEmpty,
    getClientSnapshot,
    getServerSnapshot
  );

  // 1. Case modals & browser URL deep linking via stable physics ref bridge
  const physicsRef = React.useRef<{
    currentURef: { current: number };
    scrollToMilestone: (m: number) => void;
  } | null>(null);

  const getCurrentU = useCallback(() => physicsRef.current?.currentURef.current ?? 0, []);
  const onScrollToMilestone = useCallback((m: number) => {
    physicsRef.current?.scrollToMilestone(m);
  }, []);

  const modalRouting = useCaseModalRouting({
    getCurrentU,
    onScrollToMilestone,
  });

  // 2. Master physics simulation governing cylinder surface & inputs
  const physics = useCylinderPhysics({
    isAnyCaseOpen: modalRouting.isAnyCaseOpen,
  });

  React.useEffect(() => {
    physicsRef.current = physics;
  });

  const handleHoverStateChange = useCallback((st: string | null) => {
    setCursorState(st);
  }, []);

  // On SSR and initial hydration, render strictly active center milestone (0)
  // Once mounted on client, render surrounding virtual panels for spatial immersion
  const visibleMilestones = isMounted
    ? [
        physics.centerMilestone - 2,
        physics.centerMilestone - 1,
        physics.centerMilestone,
        physics.centerMilestone + 1,
        physics.centerMilestone + 2,
      ]
    : [physics.centerMilestone];

  return (
    <main
      id="spatial-viewport"
      onMouseMove={physics.dragHandlers.onMouseMove}
      onMouseDown={physics.dragHandlers.onMouseDown}
      onMouseUp={physics.dragHandlers.onMouseUp}
      onTouchStart={physics.dragHandlers.onTouchStart}
      onTouchMove={physics.dragHandlers.onTouchMove}
      onTouchEnd={physics.dragHandlers.onTouchEnd}
      className="relative w-screen h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)] font-sans cursor-default select-none"
    >
      {/* Intro Preloader & Curtain Handoff */}
      {!loaderReady && (
        <IntroOverlay
          onComplete={handleLoaderComplete}
          isReducedMotion={isReducedMotion}
        />
      )}

      {/* Main Continuous Cylindrical Surface */}
      <motion.div
        id="main-site-content"
        suppressHydrationWarning
        initial={{ opacity: 0 }}
        animate={{
          opacity: !loaderReady ? 0 : modalRouting.isMorfCaseOpen ? 0 : 1,
          scale: modalRouting.isMorfCaseOpen ? 0.98 : 1,
        }}
        transition={{
          duration: 0.45,
          ease: [0.16, 1, 0.3, 1],
        }}
        style={{
          pointerEvents: !loaderReady || modalRouting.isAnyCaseOpen ? 'none' : 'auto',
          visibility: !loaderReady ? 'hidden' : 'visible',
        }}
        className="relative w-full h-full"
      >
        {/* Persistent Top Center Branding */}
        <header
          id="persistent-site-header"
          className={`fixed top-7 sm:top-8 md:top-10 left-1/2 -translate-x-1/2 z-50 pointer-events-auto transition-opacity duration-300 mix-blend-difference ${
            modalRouting.isAnyCaseOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <button
            type="button"
            onClick={physics.handleReturnToHero}
            onMouseEnter={() => setCursorState('action')}
            onMouseLeave={() => setCursorState(null)}
            aria-label="Nikita Zhorov — Return to Manifesto"
            className="group focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-sm"
          >
            <span
              className="font-manrope font-extrabold text-sm sm:text-base md:text-[17px] tracking-tight text-white uppercase select-none transition-opacity duration-300 group-hover:opacity-60"
              style={{
                fontFamily: 'var(--font-manrope), "Manrope", sans-serif',
                fontWeight: 800,
              }}
            >
              NIKITA.Z
            </span>
          </button>
        </header>

        {/* 3D Infinite Vertical Cylinder Viewport */}
        <div
          id="cylinder-stage-viewport"
          className="relative w-full h-full flex items-center justify-center pointer-events-none z-10"
          style={{
            perspective: '1250px',
            perspectiveOrigin: '50% 50%',
          }}
        >
          <motion.div
            id="cylinder-drum"
            suppressHydrationWarning
            className="relative w-full h-full flex items-center justify-center"
            style={{
              transformStyle: 'preserve-3d',
              rotateY: 0,
              rotateX: 0,
            }}
          >
            {visibleMilestones.map((m) => {
              const deltaFromCenter = Math.abs(m - physics.centerMilestone);
              const isCurrent = deltaFromCenter === 0;
              const isPeeking = deltaFromCenter === 1;

              return (
                <CylinderPanel
                  key={m}
                  milestone={m}
                  uMotion={physics.uMotion}
                  cylinderPosMotion={physics.cylinderPosMotion}
                  portraitProgressMotion={physics.portraitProgressMotion}
                  fragmentsRotationMotion={physics.fragmentsRotationMotion}
                  isCurrent={isCurrent}
                  isPeeking={isPeeking}
                  loaderReady={loaderReady}
                  isReducedMotion={isReducedMotion}
                  isVrakCaseOpen={modalRouting.isVrakCaseOpen}
                  onOpenVrakCase={modalRouting.handleOpenVrakCase}
                  onOpenMorfCase={modalRouting.handleOpenMorfCase}
                  vrakDockBounce={modalRouting.vrakDockBounce}
                  morfDockBounce={modalRouting.morfDockBounce}
                  onHoverStateChange={handleHoverStateChange}
                  onClickPeeking={physics.handleClickPeeking}
                />
              );
            })}
          </motion.div>
        </div>
      </motion.div>

      {/* Fullscreen Case Views */}
      <AnimatePresence mode="wait">
        {modalRouting.isVrakCaseOpen && (
          <VrakCaseView key="vrak-case-view" onClose={modalRouting.handleCloseVrakCase} />
        )}
        {modalRouting.isMorfCaseOpen && (
          <MorfCaseView key="morf-case-view" onClose={modalRouting.handleCloseMorfCase} />
        )}
      </AnimatePresence>
    </main>
  );
}
