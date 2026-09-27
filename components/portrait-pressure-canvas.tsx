'use client';

import React, { useEffect, useRef, useState, memo } from 'react';
import * as THREE from 'three';

// ============================================================================
// Chrono-Slit Scan / Time Slit Shutter Shader (Concept A — Awwwards SOTD 2026)
//
// Mechanics:
// - Physical streak & slit-scan camera shutter model
// - High-speed micro-slits shear along cursor motion tangent
// - Optical prismatic chromatic aberration (sub-pixel RGB separation) along shear edges
// - Continuous viscous spring relaxation snapping back to pristine portrait
// - 35mm analog darkroom grain with luminosity response curve
// - Pinned right-bottom edge ("вбито в края") matching CSS object-cover
// - 60+ FPS GPU-parallelized calculation with zero layout thrashing
// ============================================================================

const TRAIL_COUNT = 8;

const VERTEX_SHADER = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER = `
uniform sampler2D uTexture;
uniform vec4 resolution;
uniform float uTime;

#define TRAIL_COUNT 8
uniform vec2 uTrail[TRAIL_COUNT];
uniform vec2 uTrailVel[TRAIL_COUNT];
uniform float uTrailWeight[TRAIL_COUNT];

varying vec2 vUv;

// High-precision pseudo-random noise generator
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  // Pinned to right-top edge so head/face is always preserved without vertical cropping
  vec2 baseUV = vec2(
    (vUv.x - 1.0) * resolution.z + 1.0,
    (vUv.y - 1.0) * resolution.w + 1.0
  );

  vec2 totalDisplace = vec2(0.0);
  vec2 primaryDir = vec2(0.0);
  float maxWeight = 0.0;

  // Evaluate Chrono-Slit Shutter ribbon trail
  for (int i = 0; i < TRAIL_COUNT; i++) {
    float w = uTrailWeight[i];
    if (w < 0.002) continue;

    vec2 vel = uTrailVel[i];
    float spd = length(vel);
    if (spd < 0.0001) continue;

    vec2 dir = vel / spd;
    vec2 norm = vec2(-dir.y, dir.x);

    vec2 delta = baseUV - uTrail[i];
    float crossDist = dot(delta, norm);
    float parallelDist = dot(delta, dir);

    // Controlled Gaussian spatial envelope across cursor wake
    float spatialDecay = exp(-crossDist * crossDist * 60.0) * exp(-parallelDist * parallelDist * 32.0);

    // Micro-slit scan shutter ribbons
    float bandFreq = 75.0;
    float bandId = floor(crossDist * bandFreq);
    float bandJitter = sin(bandId * 3.14159) * 0.5 + 0.5;

    // Stepped shear displacement along velocity direction
    float shear = (spd * 2.2) * spatialDecay * w;
    vec2 disp = dir * shear * (0.65 + 0.35 * bandJitter);

    totalDisplace += disp;
    if (w > maxWeight) {
      maxWeight = w;
      primaryDir = dir;
    }
  }

  // Smooth safety boundary clamping
  totalDisplace = clamp(totalDisplace, vec2(-0.06), vec2(0.06));

  // Prismatic chromatic aberration strictly on slit shear boundaries
  float dispMag = length(totalDisplace);
  float chromAberration = clamp(dispMag * 0.22, 0.0, 0.008);
  vec2 chromDir = length(primaryDir) > 0.001 ? primaryDir : vec2(1.0, 0.0);

  vec2 uvR = clamp(baseUV - totalDisplace + chromDir * chromAberration, vec2(0.0005), vec2(0.9995));
  vec2 uvG = clamp(baseUV - totalDisplace, vec2(0.0005), vec2(0.9995));
  vec2 uvB = clamp(baseUV - totalDisplace - chromDir * chromAberration, vec2(0.0005), vec2(0.9995));

  float r = texture2D(uTexture, uvR).r;
  float g = texture2D(uTexture, uvG).g;
  float b = texture2D(uTexture, uvB).b;
  vec4 color = vec4(r, g, b, 1.0);

  // High-character analog film grain & tactile editorial darkroom texture
  vec2 grainCoord1 = gl_FragCoord.xy * 0.85 + vec2(fract(uTime * 23.17), fract(uTime * 41.53)) * 60.0;
  vec2 grainCoord2 = gl_FragCoord.xy * 0.42 + vec2(fract(uTime * 11.29), fract(uTime * 19.83)) * 30.0;
  float grain1 = (hash(grainCoord1) - 0.5) * 2.0;
  float grain2 = (hash(grainCoord2) - 0.5) * 2.0;
  float compositeGrain = grain1 * 0.70 + grain2 * 0.30;

  // Modulate grain across luma range: expressive in shadows and midtones, tactile across highlights
  float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  float grainMask = (1.0 - luma * 0.45);
  float grainAmount = 0.088; // Distinct, rich tactile grain
  color.rgb += compositeGrain * grainAmount * grainMask;

  // Velvet shadow compression
  color.rgb = clamp(color.rgb, 0.0, 1.0);

  gl_FragColor = color;
}
`;

interface PortraitPressureCanvasProps {
  imageSrc: string;
  altText?: string;
  className?: string;
  isReducedMotion?: boolean;
}

export const PortraitPressureCanvas = memo(function PortraitPressureCanvas({
  imageSrc,
  altText = 'Portrait',
  className = '',
  isReducedMotion = false,
}: PortraitPressureCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  const [isWebglReady, setIsWebglReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Accessibility motion preference or touch-only device
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouchOnly = window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(pointer: fine)').matches;

    if (isReducedMotion || prefersReducedMotion || isTouchOnly) {
      return;
    }

    const container = containerRef.current;
    const img = imgRef.current;
    const mount = canvasMountRef.current;
    if (!container || !img || !mount) return;

    // Get stable layout dimensions immune to CSS 3D transform distortion
    const getLayoutDimensions = () => {
      let w = container.clientWidth;
      let h = container.clientHeight;
      if (!w || !h || w <= 10 || h <= 10) {
        w = Math.round(window.innerWidth * 0.52);
        h = window.innerHeight;
      }
      return { w, h };
    };

    let { w: width, h: height } = getLayoutDimensions();

    // 1. Scene & Orthographic Camera
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, -100, 100);
    camera.position.set(0, 0, 1);

    // 2. Renderer with pixelRatio capped at 1.5
    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(width, height);
      mount.appendChild(renderer.domElement);
    } catch (err) {
      console.warn('WebGL initialization failed, falling back to static portrait:', err);
      return;
    }

    // 3. Trail Buffers for Chrono-Slit Scan
    const trailPositions: THREE.Vector2[] = Array.from({ length: TRAIL_COUNT }, () => new THREE.Vector2(0.5, 0.5));
    const trailVelocities: THREE.Vector2[] = Array.from({ length: TRAIL_COUNT }, () => new THREE.Vector2(0, 0));
    const trailWeights = new Float32Array(TRAIL_COUNT);

    // 4. Portrait Texture
    const portraitTexture = new THREE.Texture(img);
    portraitTexture.wrapS = THREE.ClampToEdgeWrapping;
    portraitTexture.wrapT = THREE.ClampToEdgeWrapping;
    portraitTexture.minFilter = THREE.LinearFilter;
    portraitTexture.magFilter = THREE.LinearFilter;
    portraitTexture.generateMipmaps = false;

    // Aspect ratio resolution calculation (pins right-top so face/head is never cut off)
    let aspectA1 = 1;
    let aspectA2 = 1;

    const updateResolution = (w: number, h: number) => {
      const naturalH = img.naturalHeight || 1254;
      const naturalW = img.naturalWidth || 1254;
      const imageAspect = naturalH / naturalW;
      if (h / w > imageAspect) {
        aspectA1 = (w / h) * imageAspect;
        aspectA2 = 1.0;
      } else {
        aspectA1 = 1.0;
        aspectA2 = (h / w) / imageAspect;
      }
      material.uniforms.resolution.value.set(w, h, aspectA1, aspectA2);
    };

    // 5. Shader Material
    const material = new THREE.ShaderMaterial({
      uniforms: {
        resolution: { value: new THREE.Vector4(width, height, 1, 1) },
        uTexture: { value: portraitTexture },
        uTime: { value: 0 },
        uTrail: { value: trailPositions },
        uTrailVel: { value: trailVelocities },
        uTrailWeight: { value: trailWeights },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      depthTest: false,
      depthWrite: false,
    });

    const geometry = new THREE.PlaneGeometry(1, 1, 1, 1);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Texture update upon image load
    const onImageLoaded = () => {
      portraitTexture.needsUpdate = true;
      updateResolution(width, height);
    };

    if (img.complete && img.naturalWidth > 0) {
      onImageLoaded();
    } else {
      img.onload = onImageLoaded;
    }

    // 6. Cached layout rect for pointer normalization
    let cachedRect = container.getBoundingClientRect();
    const updateCachedRect = () => {
      if (container) cachedRect = container.getBoundingClientRect();
    };

    // 7. Pointer tracking with velocity
    const pointer = {
      x: 0.5,
      y: 0.5,
      prevX: 0.5,
      prevY: 0.5,
      vX: 0,
      vY: 0,
      isInside: false,
      hasMoved: false,
    };

    const onPointerEnter = () => {
      updateCachedRect();
      pointer.isInside = true;
    };

    const onPointerLeave = () => {
      pointer.isInside = false;
      pointer.vX = 0;
      pointer.vY = 0;
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = cachedRect;
      if (rect.width <= 0 || rect.height <= 0) return;

      const isInside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      if (isInside) {
        const normX = (e.clientX - rect.left) / rect.width;
        const normY = (e.clientY - rect.top) / rect.height;

        if (pointer.isInside) {
          pointer.vX = normX - pointer.prevX;
          pointer.vY = normY - pointer.prevY;
        } else {
          pointer.vX = 0;
          pointer.vY = 0;
          pointer.isInside = true;
        }

        pointer.x = normX;
        pointer.y = normY;
        pointer.prevX = normX;
        pointer.prevY = normY;
        pointer.hasMoved = true;
      } else {
        pointer.isInside = false;
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    container.addEventListener('pointerenter', onPointerEnter, { passive: true });
    container.addEventListener('pointerleave', onPointerLeave, { passive: true });

    // 8. Robust Resize Handling
    const resizeCanvas = () => {
      if (!renderer || !container) return;
      const { w, h } = getLayoutDimensions();
      if (w <= 0 || h <= 0) return;
      width = w;
      height = h;
      renderer.setSize(width, height);
      updateResolution(width, height);
    };

    const resizeObserver = new ResizeObserver((entries) => {
      if (!renderer || !container) return;
      const entry = entries[0];
      const w = entry?.contentRect?.width ? Math.round(entry.contentRect.width) : 0;
      const h = entry?.contentRect?.height ? Math.round(entry.contentRect.height) : 0;
      if (w > 10 && h > 10) {
        width = w;
        height = h;
        renderer.setSize(width, height);
        updateResolution(width, height);
      } else {
        resizeCanvas();
      }
    });
    resizeObserver.observe(container);
    window.addEventListener('resize', resizeCanvas, { passive: true });

    // 9. 60 FPS Render Loop & Chrono-Slit Simulation (with tab background throttling, Awwwards #88)
    let animationFrameId: number;
    let hasRenderedFirstFrame = false;

    const render = () => {
      if (document.hidden) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      if (renderer && container) {
        // Dynamic layout check self-repairs any size shift from 3D transitions
        const curW = container.clientWidth;
        const curH = container.clientHeight;
        if (curW > 10 && curH > 10 && (Math.abs(curW - width) > 2 || Math.abs(curH - height) > 2)) {
          width = curW;
          height = curH;
          renderer.setSize(width, height);
          updateResolution(width, height);
        }

        material.uniforms.uTime.value = performance.now() * 0.001;

        // Viscous spring decay of trail weights (relaxation back to resting state)
        for (let i = 0; i < TRAIL_COUNT; i++) {
          trailWeights[i] *= 0.88;
        }

        // When pointer moves, push new slit-scan shutter point into FIFO trail
        if (pointer.isInside && pointer.hasMoved) {
          const spd = Math.hypot(pointer.vX, pointer.vY);

          if (spd > 0.0005) {
            // Shift history down
            for (let i = TRAIL_COUNT - 1; i > 0; i--) {
              trailPositions[i].copy(trailPositions[i - 1]);
              trailVelocities[i].copy(trailVelocities[i - 1]);
              trailWeights[i] = trailWeights[i - 1] * 0.94;
            }

            // Map container normalized coordinates to texture baseUV space (pinned right-top)
            const texPointerX = (pointer.x - 1.0) * aspectA1 + 1.0;
            const texPointerY = ((1.0 - pointer.y) - 1.0) * aspectA2 + 1.0;

            trailPositions[0].set(texPointerX, texPointerY);
            trailVelocities[0].set(pointer.vX * aspectA1, -pointer.vY * aspectA2);
            trailWeights[0] = Math.min(1.0, spd * 14.0);
          }

          // Viscous decay of instantaneous velocity
          pointer.vX *= 0.70;
          pointer.vY *= 0.70;
          pointer.hasMoved = false;
        }

        renderer.render(scene, camera);

        if (!hasRenderedFirstFrame) {
          hasRenderedFirstFrame = true;
          setIsWebglReady(true);
        }
      }
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    // 10. WebGL Context Lost Handling
    const canvasElement = renderer.domElement;
    const onContextLost = (e: Event) => {
      e.preventDefault();
      setIsWebglReady(false);
      cancelAnimationFrame(animationFrameId);
    };
    canvasElement.addEventListener('webglcontextlost', onContextLost);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', resizeCanvas);
      container.removeEventListener('pointerenter', onPointerEnter);
      container.removeEventListener('pointerleave', onPointerLeave);
      canvasElement.removeEventListener('webglcontextlost', onContextLost);
      resizeObserver.disconnect();

      // Full lifecycle resource disposal (Awwwards Guide #114.9)
      if (renderer) {
        if (mount.contains(renderer.domElement)) {
          mount.removeChild(renderer.domElement);
        }
        renderer.dispose();
      }
      geometry.dispose();
      material.dispose();
      portraitTexture.dispose();
    };
  }, [isReducedMotion, imageSrc]);

  return (
    <div
      ref={containerRef}
      className={`portrait-wrap relative w-full h-full select-none overflow-hidden ${className}`}
    >
      {/* Fallback source <img> for SEO & accessibility - hidden once WebGL is ready */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={imageSrc}
        alt={altText}
        loading="eager"
        decoding="sync"
        className={`w-full h-full object-cover object-right-top select-none pointer-events-none transition-opacity duration-300 ${
          isWebglReady ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* Three.js Canvas mount container */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10 transition-opacity duration-300 [&>canvas]:w-full [&>canvas]:h-full [&>canvas]:object-cover [&>canvas]:object-right-top"
        style={{
          opacity: isWebglReady ? 1 : 0,
        }}
        aria-hidden="true"
      />
    </div>
  );
});

// Backward compatibility alias export
export const PortraitPixelDistortionCanvas = PortraitPressureCanvas;
