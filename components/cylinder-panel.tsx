'use client';

import React, { useState, memo } from 'react';
import { motion, useMotionValue, useTransform, useMotionValueEvent } from 'motion/react';
import { ManifestoTransitionScene } from '@/components/manifesto-transition-scene';
import { DisciplinesScene } from '@/components/disciplines-scene';
import { TypographicProjectScene } from '@/components/typographic-project-scene';
import { ContactScene } from '@/components/contact-scene';
import {
  SCENE_CONFIGS,
  getSceneIndex,
  getMilestoneProgress,
} from '@/lib/cylinder-manifold';

export interface CylinderPanelProps {
  milestone: number;
  uMotion: ReturnType<typeof useMotionValue<number>>;
  cylinderPosMotion: ReturnType<typeof useMotionValue<number>>;
  portraitProgressMotion: ReturnType<typeof useMotionValue<number>>;
  fragmentsRotationMotion: ReturnType<typeof useMotionValue<number>>;
  isCurrent: boolean;
  isPeeking: boolean;
  loaderReady: boolean;
  isReducedMotion: boolean;
  isVrakCaseOpen?: boolean;
  onOpenVrakCase: (e?: React.MouseEvent) => void;
  onOpenMorfCase: (e?: React.MouseEvent) => void;
  vrakDockBounce: boolean;
  morfDockBounce: boolean;
  onHoverStateChange: (state: string | null) => void;
  onClickPeeking: (milestone: number) => void;
}

export const CylinderPanel = memo(function CylinderPanel({
  milestone,
  uMotion,
  cylinderPosMotion,
  portraitProgressMotion,
  fragmentsRotationMotion,
  isCurrent,
  isPeeking,
  loaderReady,
  isReducedMotion,
  isVrakCaseOpen,
  onOpenVrakCase,
  onOpenMorfCase,
  vrakDockBounce,
  morfDockBounce,
  onHoverStateChange,
  onClickPeeking,
}: CylinderPanelProps) {
  const sceneIndex = getSceneIndex(milestone);
  const scene = SCENE_CONFIGS[sceneIndex];

  // Deterministic local scrub state computed directly from master scalar u for this specific milestone
  const [milestoneProg, setMilestoneProg] = useState(() =>
    getMilestoneProgress(milestone, uMotion.get())
  );

  useMotionValueEvent(uMotion, 'change', (u) => {
    if (scene.id !== 'portrait') return;
    const next = getMilestoneProgress(milestone, u);
    setMilestoneProg((prev) => {
      const dPortrait = Math.abs(prev.portraitProgress - next.portraitProgress);
      if (
        dPortrait > 0.001 ||
        (next.portraitProgress === 0 && prev.portraitProgress !== 0) ||
        (next.portraitProgress === 1 && prev.portraitProgress !== 1)
      ) {
        return next;
      }
      return prev;
    });
  });

  // Track if VRAK is in the central stable resting state of the cylinder drum (dist < 0.16)
  const [isStableCenter, setIsStableCenter] = useState(() => {
    if (scene.id !== 'vrak') return false;
    const initialPos = cylinderPosMotion.get();
    return Math.abs(milestone - initialPos) < 0.16;
  });

  useMotionValueEvent(cylinderPosMotion, 'change', (pos: number) => {
    if (scene.id !== 'vrak') return;
    const dist = Math.abs(milestone - pos);
    const stable = dist < 0.16;
    setIsStableCenter((prev) => (prev !== stable ? stable : prev));
  });

  // GPU 3D Cylinder geometry transforms
  const y = useTransform(cylinderPosMotion, (pos: number) => {
    if (milestone === 0 && pos <= 0) {
      return '0vh';
    }
    const d = milestone - pos;
    return `${d * 84}vh`;
  });

  const z = useTransform(cylinderPosMotion, (pos: number) => {
    if (milestone === 0 && pos <= 0) {
      return 0;
    }
    const d = milestone - pos;
    if (isReducedMotion) {
      return -Math.min(90, Math.abs(d) * 35);
    }
    if (d <= 0) {
      // Receding UP into depth: deep cylindrical curvature
      const up = -d;
      return -Math.min(980, Math.pow(up, 1.38) * 280);
    } else {
      // Emerging from BELOW: shallower curve so preview is prominent
      const down = d;
      return -Math.min(700, Math.pow(down, 1.22) * 190);
    }
  });

  const rotateX = useTransform(cylinderPosMotion, (pos: number) => {
    if (milestone === 0 && pos <= 0) {
      return 0;
    }
    const d = milestone - pos;
    if (isReducedMotion) {
      return -Math.max(-3, Math.min(3, d * 2));
    }
    if (d <= 0) {
      const up = -d;
      return up * 16.5;
    } else {
      const down = d;
      return -down * 12.5;
    }
  });

  const scale = useTransform(cylinderPosMotion, (pos: number) => {
    if (milestone === 0 && pos <= 0) {
      return 1;
    }
    const d = milestone - pos;
    if (d <= 0) {
      const up = -d;
      return Math.max(0.68, 1 - up * 0.08);
    } else {
      const down = d;
      return Math.max(0.78, 1 - down * 0.055);
    }
  });

  const opacity = useTransform(cylinderPosMotion, (pos: number) => {
    const d = milestone - pos;
    if (d <= 0) {
      const up = -d;
      if (up <= 0.35) return 1;
      if (up >= 0.95) return 0;
      const t = (up - 0.35) / (0.95 - 0.35);
      return Math.max(0, 1 - t * t * (3 - 2 * t));
    } else {
      const down = d;
      if (down <= 0.35) return 1;
      if (down >= 1.15) return 0;
      const t = (down - 0.35) / (1.15 - 0.35);
      return Math.max(0, 1 - t * t * (3 - 2 * t));
    }
  });

  const filter = useTransform(cylinderPosMotion, (pos: number) => {
    if (isReducedMotion) return 'none';
    const d = milestone - pos;
    if (d <= 0) {
      const up = -d;
      if (up <= 0.42) return 'none';
      const t = Math.min(1, (up - 0.42) / (1.6 - 0.42));
      const blurPx = t * t * 4.8;
      return blurPx > 0.2 ? `blur(${blurPx.toFixed(2)}px)` : 'none';
    } else {
      return 'none';
    }
  });

  const zIndex = useTransform(cylinderPosMotion, (pos: number) => {
    const d = milestone - pos;
    if (Math.abs(d) <= 0.5) return 25;
    if (d > 0) return 10;
    return 5;
  });

  return (
    <motion.section
      key={milestone}
      id={`scene-${scene.id}-${milestone}`}
      suppressHydrationWarning
      aria-hidden={!isCurrent}
      inert={!isCurrent ? true : undefined}
      onClick={() => {
        if (isPeeking) onClickPeeking(milestone);
      }}
      onMouseEnter={() => {
        if (isPeeking) onHoverStateChange('action');
      }}
      onMouseLeave={() => {
        if (isPeeking) onHoverStateChange(null);
      }}
      style={{
        y,
        z,
        rotateX,
        scale,
        opacity,
        filter,
        zIndex,
        transformStyle: 'preserve-3d',
        pointerEvents: isCurrent ? 'auto' : isPeeking ? 'auto' : 'none',
        willChange: 'transform, opacity, filter',
      }}
      className={`absolute inset-0 w-full h-full flex flex-col justify-center items-center bg-[var(--bg)] ${
        isPeeking ? 'cursor-pointer select-none' : ''
      } ${
        scene.id === 'morf' || scene.id === 'vrak' || scene.id === 'disciplines'
          ? 'px-0 py-0 overflow-visible'
          : 'px-0 py-0 overflow-hidden'
      }`}
    >
      {/* FRAGMENT 0: PORTRAIT SCENE / MANIFESTO */}
      {scene.id === 'portrait' && (
        <ManifestoTransitionScene
          progress={milestoneProg.portraitProgress}
          onHoverStateChange={(st) => onHoverStateChange(st)}
          isReducedMotion={isReducedMotion}
        />
      )}

      {/* FRAGMENT 1: DISCIPLINES SCENE */}
      {scene.id === 'disciplines' && (
        <DisciplinesScene
          isActive={isCurrent}
          onHoverStateChange={onHoverStateChange}
          isReducedMotion={isReducedMotion}
        />
      )}

      {/* FRAGMENT 2: MORF */}
      {scene.id === 'morf' && (
        <TypographicProjectScene
          projectId="morf"
          title="MORF"
          imageSrc="/assets/morf_preview.png"
          imageAlt="MORF Canine Architectural Fashion"
          href="/work/morf"
          isActive={isCurrent}
          isPeeking={isPeeking}
          onOpenCase={onOpenMorfCase}
          onHoverStateChange={onHoverStateChange}
          bounceEffect={morfDockBounce}
        />
      )}

      {/* FRAGMENT 3: VRAK */}
      {scene.id === 'vrak' && (
        <TypographicProjectScene
          projectId="vrak"
          title="VRAK"
          imageSrc="/assets/vrak/hand.png"
          imageAlt="VRAK Energy Beverage — Brand in Hand"
          href="/work/vrak"
          isActive={isCurrent}
          isPeeking={isPeeking}
          onOpenCase={onOpenVrakCase}
          onHoverStateChange={onHoverStateChange}
          bounceEffect={vrakDockBounce}
        />
      )}

      {/* FRAGMENT 4: CONTACT */}
      {scene.id === 'contact' && (
        <ContactScene
          isActive={isCurrent}
          onHoverStateChange={onHoverStateChange}
        />
      )}
    </motion.section>
  );
});
