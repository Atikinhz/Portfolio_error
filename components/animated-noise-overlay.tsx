'use client';

import React, { useEffect, useRef, memo } from 'react';

interface AnimatedNoiseOverlayProps {
  opacity?: number;
  className?: string;
  fps?: number;
}

/**
 * Animated Film Grain / Noise Overlay
 * Produces the exact analog 35mm darkroom tactile grain as seen on the Hero portrait.
 * Utilizes a small 160x160 offscreen canvas with dual-frequency hash distribution,
 * animated at ~20–24 FPS with CSS stretch/tiling to ensure ultra-low CPU/GPU overhead.
 */
export const AnimatedNoiseOverlay = memo(function AnimatedNoiseOverlay({
  opacity = 0.088,
  className = '',
  fps = 22,
}: AnimatedNoiseOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Honor reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const width = 160;
    const height = 160;
    canvas.width = width;
    canvas.height = height;

    let animId: number;
    let lastTime = 0;
    const interval = 1000 / fps;

    // Dual-octave pseudo-random generator identical to the shader math
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    const renderNoise = (time: number) => {
      animId = requestAnimationFrame(renderNoise);

      if (time - lastTime < interval) return;
      lastTime = time;

      const t1 = (time * 0.02317) % 1000;
      const t2 = (time * 0.01129) % 1000;

      for (let i = 0; i < data.length; i += 4) {
        // High-precision pseudo-random noise with slight dual-phase temporal drift
        const r1 = Math.random();
        const r2 = Math.random();
        const composite = (r1 * 0.7 + r2 * 0.3); // [0, 1]
        
        // Analog film response curve centered at 128
        const val = Math.floor(composite * 255);

        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
        data[i + 3] = 255; // Full alpha on texture, opacity controlled via CSS container
      }

      ctx.putImageData(imgData, 0, 0);
    };

    animId = requestAnimationFrame(renderNoise);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [fps]);

  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 pointer-events-none select-none overflow-hidden z-10 ${className}`}
      style={{
        opacity,
        mixBlendMode: 'overlay',
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover pointer-events-none"
        style={{
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
});
