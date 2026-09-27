'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useMotionValue } from 'motion/react';
import {
  evaluateSurface,
  getDwellCenterU,
  getSceneIndex,
  TOTAL_SCENES,
} from '@/lib/cylinder-manifold';
import { playTickSound } from '@/lib/sound-fx';

interface UseCylinderPhysicsOptions {
  isAnyCaseOpen: boolean;
  onHoverStateChange?: (state: string | null) => void;
}

export function useCylinderPhysics({ isAnyCaseOpen }: UseCylinderPhysicsOptions) {
  // Motion values for GPU transform layer (0 React re-renders during 60fps continuous glide)
  const cylinderPosMotion = useMotionValue(0);
  const portraitProgressMotion = useMotionValue(0);
  const fragmentsRotationMotion = useMotionValue(0);
  const uMotion = useMotionValue(0);

  // Discrete integer milestone that is currently centered in viewport
  const [centerMilestone, setCenterMilestone] = useState(0);

  const isAnyCaseOpenRef = useRef(false);
  useEffect(() => {
    isAnyCaseOpenRef.current = isAnyCaseOpen;
  }, [isAnyCaseOpen]);

  // Master unified physics state
  const targetURef = useRef(0);
  const currentURef = useRef(0);
  const velocityURef = useRef(0);
  const settleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Drag & touch tracking
  const dragStartYRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const touchHistoryRef = useRef<Array<{ y: number; t: number }>>([]);

  // Schedule gentle magnetic resting alignment when user finishes interaction
  const scheduleSettle = useCallback(() => {
    if (settleTimeoutRef.current) {
      clearTimeout(settleTimeoutRef.current);
    }
    settleTimeoutRef.current = setTimeout(() => {
      const currentSurface = evaluateSurface(currentURef.current);
      const nearestDwellU = getDwellCenterU(currentSurface.activeMilestone);
      const diff = Math.abs(currentURef.current - nearestDwellU);

      if (diff < 0.65) {
        targetURef.current = nearestDwellU;
      }
    }, 450);
  }, []);

  // UNIFIED MASTER PHYSICS LOOP
  useEffect(() => {
    let animId: number;

    const tick = () => {
      // Pause cylinder loop when a case modal is open to preserve 100% CPU/GPU for the case study
      if (isAnyCaseOpenRef.current) {
        animId = requestAnimationFrame(tick);
        return;
      }

      // 1. Kinetic velocity decay
      if (Math.abs(velocityURef.current) > 0.00004) {
        targetURef.current += velocityURef.current;
        velocityURef.current *= 0.905;
      } else {
        velocityURef.current = 0;
      }

      // 2. Exponential follow for calm, weighty, controlled motion
      const diffU = targetURef.current - currentURef.current;
      const ease = 0.088;

      if (Math.abs(diffU) > 0.00004) {
        currentURef.current += diffU * ease;
      } else {
        currentURef.current = targetURef.current;
      }

      // 3. Evaluate surface state deterministically from current scalar u
      const surface = evaluateSurface(currentURef.current);
      cylinderPosMotion.set(surface.cylinderPos);
      portraitProgressMotion.set(surface.portraitProgress);
      fragmentsRotationMotion.set(surface.fragmentsRotation);
      uMotion.set(currentURef.current);

      // 4. Update discrete center milestone when crossing integer boundaries
      const newMilestone = surface.activeMilestone;
      setCenterMilestone((prev) => {
        if (prev !== newMilestone) {
          const idx = getSceneIndex(newMilestone);
          playTickSound(115 + idx * 10, 0.028);
          return newMilestone;
        }
        return prev;
      });

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [cylinderPosMotion, portraitProgressMotion, fragmentsRotationMotion, uMotion]);

  // WHEEL & TRACKPAD LISTENER
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (isAnyCaseOpenRef.current) return;
      if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);

      const dy = e.deltaY;
      if (Math.abs(dy) < 0.2) return;

      const absDy = Math.abs(dy);
      const sign = Math.sign(dy);

      if (absDy >= 55) {
        const impulse = sign * Math.min(0.38, 0.19 + (absDy - 55) * 0.0014);
        targetURef.current += impulse;
      } else {
        const trackpadStep = dy * 0.0024;
        targetURef.current += trackpadStep;
      }

      scheduleSettle();
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [scheduleSettle]);

  // KEYBOARD NAVIGATION
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnyCaseOpenRef.current) return;

      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);
        const currentMilestone = evaluateSurface(currentURef.current).activeMilestone;
        targetURef.current = getDwellCenterU(currentMilestone + 1);
        scheduleSettle();
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);
        const currentMilestone = evaluateSurface(currentURef.current).activeMilestone;
        targetURef.current = getDwellCenterU(currentMilestone - 1);
        scheduleSettle();
      } else if (e.key === 'Home') {
        e.preventDefault();
        if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);
        const currentMilestone = evaluateSurface(currentURef.current).activeMilestone;
        const nearestHero = Math.round(currentMilestone / TOTAL_SCENES) * TOTAL_SCENES;
        targetURef.current = getDwellCenterU(nearestHero);
        scheduleSettle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scheduleSettle]);

  // DRAG & TOUCH HANDLERS
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isAnyCaseOpenRef.current) return;
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('a, button, [data-carousel-drag]')) return;
    if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);

    dragStartYRef.current = e.clientY;
    isDraggingRef.current = true;
    velocityURef.current = 0;
    touchHistoryRef.current = [{ y: e.clientY, t: performance.now() }];
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current || dragStartYRef.current === null) return;
    const deltaY = dragStartYRef.current - e.clientY;
    dragStartYRef.current = e.clientY;

    touchHistoryRef.current.push({ y: e.clientY, t: performance.now() });
    if (touchHistoryRef.current.length > 5) touchHistoryRef.current.shift();

    const dragStep = (deltaY / window.innerHeight) * 3.6;
    targetURef.current += dragStep;
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isDraggingRef.current) {
      if (touchHistoryRef.current.length >= 2) {
        const first = touchHistoryRef.current[0];
        const last = touchHistoryRef.current[touchHistoryRef.current.length - 1];
        const dt = Math.max(16, last.t - first.t);
        const dy = first.y - last.y;
        const v = dy / dt;
        if (Math.abs(v) > 0.22) {
          const fling = Math.sign(v) * Math.min(0.24, Math.abs(v) * 0.055);
          velocityURef.current = fling;
        }
      }
      isDraggingRef.current = false;
      dragStartYRef.current = null;
      touchHistoryRef.current = [];
      scheduleSettle();
    }
  }, [scheduleSettle]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isAnyCaseOpenRef.current) return;
    if ((e.target as HTMLElement).closest('a, button, [data-carousel-drag]')) return;
    if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);

    const clientY = e.touches[0].clientY;
    dragStartYRef.current = clientY;
    velocityURef.current = 0;
    touchHistoryRef.current = [{ y: clientY, t: performance.now() }];
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isAnyCaseOpenRef.current) return;
    if (dragStartYRef.current === null) return;
    const clientY = e.touches[0].clientY;
    const deltaY = dragStartYRef.current - clientY;
    dragStartYRef.current = clientY;

    touchHistoryRef.current.push({ y: clientY, t: performance.now() });
    if (touchHistoryRef.current.length > 5) touchHistoryRef.current.shift();

    const dragStep = (deltaY / window.innerHeight) * 4.0;
    targetURef.current += dragStep;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchHistoryRef.current.length >= 2) {
      const first = touchHistoryRef.current[0];
      const last = touchHistoryRef.current[touchHistoryRef.current.length - 1];
      const dt = Math.max(16, last.t - first.t);
      const dy = first.y - last.y;
      const v = dy / dt;
      if (Math.abs(v) > 0.22) {
        const fling = Math.sign(v) * Math.min(0.25, Math.abs(v) * 0.060);
        velocityURef.current = fling;
      }
    }
    dragStartYRef.current = null;
    touchHistoryRef.current = [];
    scheduleSettle();
  }, [scheduleSettle]);

  const handleClickPeeking = useCallback((milestone: number) => {
    if (isAnyCaseOpenRef.current) return;
    if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);
    targetURef.current = getDwellCenterU(milestone);
    scheduleSettle();
  }, [scheduleSettle]);

  const handleReturnToHero = useCallback(() => {
    if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);
    const currentMilestone = evaluateSurface(currentURef.current).activeMilestone;
    const nearestHero = Math.round(currentMilestone / TOTAL_SCENES) * TOTAL_SCENES;
    targetURef.current = getDwellCenterU(nearestHero);
    scheduleSettle();
  }, [scheduleSettle]);

  const scrollToMilestone = useCallback((milestone: number) => {
    if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);
    targetURef.current = getDwellCenterU(milestone);
    scheduleSettle();
  }, [scheduleSettle]);

  return {
    uMotion,
    cylinderPosMotion,
    portraitProgressMotion,
    fragmentsRotationMotion,
    centerMilestone,
    targetURef,
    currentURef,
    handleClickPeeking,
    handleReturnToHero,
    scrollToMilestone,
    dragHandlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
