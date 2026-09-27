'use client';

import React, { useEffect, useRef } from 'react';

// ============================================================================
// Interactive & Damn Satisfying Elastic Cursor
// Based on Ksenia Kondrashova (@uuuulala) tutorial:
// "Coding an Interactive (and Damn Satisfying) Cursor: 7 Simple Steps + 2kb of Code"
// https://dev.to/uuuulala/coding-an-interactive-and-damn-satisfying-cursor-7-simple-steps-2kb-of-code-1c8b
// ============================================================================

interface TrailPoint {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

export function GlobalElasticCursor() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Only run on desktop / fine-pointer devices
    if (typeof window === 'undefined') return;
    const isFinePointer = window.matchMedia('(pointer: fine)').matches;
    if (!isFinePointer) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Enable custom cursor hiding class on document
    document.documentElement.classList.add('custom-cursor-active');

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize, { passive: true });

    // Tutorial parameters
    const params = {
      pointsNumber: 30,
      widthFactor: 0.32,
      mouseThreshold: 0.6,
      spring: 0.36,
      friction: 0.52,
    };

    const pointer = {
      x: width / 2,
      y: height / 2,
      active: false,
      hoverScale: 1.0,
      targetHoverScale: 1.0,
    };

    const trail: TrailPoint[] = Array.from({ length: params.pointsNumber }, () => ({
      x: pointer.x,
      y: pointer.y,
      dx: 0,
      dy: 0,
    }));

    const onPointerMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;

      if (!pointer.active) {
        pointer.active = true;
        // Snap entire trail to pointer on initial entry
        for (let i = 0; i < params.pointsNumber; i++) {
          trail[i].x = pointer.x;
          trail[i].y = pointer.y;
          trail[i].dx = 0;
          trail[i].dy = 0;
        }
      }

      // Check if hovering interactive element
      const target = e.target as HTMLElement | null;
      const isInteractive = Boolean(
        target?.closest('a, button, [role="button"], input, select, textarea, label, [data-cursor="interactive"]')
      );
      pointer.targetHoverScale = isInteractive ? 1.35 : 1.0;
    };

    const onPointerLeave = () => {
      pointer.active = false;
      pointer.targetHoverScale = 1.0;
    };

    const onPointerEnter = () => {
      pointer.active = true;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('mouseleave', onPointerLeave);
    document.addEventListener('mouseenter', onPointerEnter);

    let animationFrameId: number;

    const render = () => {
      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      if (pointer.active) {
        // Smooth hover scale interpolation
        pointer.hoverScale += (pointer.targetHoverScale - pointer.hoverScale) * 0.16;

        // Step 4 & 5: Spring physics step along the trail of points
        trail.forEach((p, pIdx) => {
          const prev = pIdx === 0 ? pointer : trail[pIdx - 1];
          const spring = pIdx === 0 ? 0.4 * params.spring : params.spring;

          p.dx += (prev.x - p.x) * spring;
          p.dy += (prev.y - p.y) * spring;
          p.dx *= params.friction;
          p.dy *= params.friction;
          p.x += p.dx;
          p.y += p.dy;
        });

        // 1. Draw head circle for immediate tactile responsiveness
        const headRadius = 2.5 * pointer.hoverScale;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(trail[0].x, trail[0].y, headRadius, 0, Math.PI * 2);
        ctx.fill();

        // 2. Steps 6 & 7: Smooth Bézier curves with dynamic tapering lineWidth
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);

        for (let i = 1; i < trail.length - 1; i++) {
          const xc = 0.5 * (trail[i].x + trail[i + 1].x);
          const yc = 0.5 * (trail[i].y + trail[i + 1].y);
          ctx.quadraticCurveTo(trail[i].x, trail[i].y, xc, yc);

          // Line width decreases from head to tail
          const segmentWidth = Math.max(
            0.5,
            params.widthFactor * (params.pointsNumber - i) * pointer.hoverScale
          );
          ctx.lineWidth = segmentWidth;
          ctx.stroke();
        }

        ctx.lineTo(trail[trail.length - 1].x, trail[trail.length - 1].y);
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      document.documentElement.classList.remove('custom-cursor-active');
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('mouseleave', onPointerLeave);
      document.removeEventListener('mouseenter', onPointerEnter);
    };
  }, []);

  return (
    <canvas
      id="cursor-canvas"
      ref={canvasRef}
      className="fixed inset-0 w-screen h-screen pointer-events-none z-[999999]"
      style={{
        mixBlendMode: 'difference',
      }}
      aria-hidden="true"
    />
  );
}
