'use client';

import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import * as THREE from 'three';

export interface ParticleHeadingProps {
  lines?: string[];
  align?: 'left' | 'center';
  verticalAlign?: 'center' | 'slightly-above-center' | 'top';
  targetWidthRatio?: number;
  maxFontSize?: number;
  onHoverStateChange?: (isNear: boolean) => void;
  className?: string;
  isActive?: boolean;
  intensify?: boolean;
  isReducedMotion?: boolean;
  semanticHeading?: 'h1' | 'h2' | 'p';
}

const DEFAULT_LINES = [
  'I design what',
  'people use',
  'and what makes',
  'them notice it.',
];

const VERTEX_SHADER = `
  uniform float uTime;
  uniform float uPixelRatio;

  attribute float aSize;
  attribute float aAlpha;
  attribute float aGray;
  attribute vec4 aWander;   // (freqX, freqY, amp, phase)
  attribute vec3 aTwinkle;  // (twinkleFreq, twinklePhase, twinkleAmp)

  varying float vAlpha;
  varying float vGray;

  void main() {
    float t = uTime;

    float fx = aWander.x;
    float fy = aWander.y;
    float amp = aWander.z;
    float ph = aWander.w;

    // Organic micro-hovering in 3D (restrained so letterforms remain razor-sharp)
    vec3 hoverOffset = vec3(
      sin(t * fx + ph) * amp,
      cos(t * fy + ph * 1.3) * amp,
      sin(t * (fx + fy) * 0.4 + ph * 1.8) * (amp * 1.2)
    );

    vec3 animatedPos = position + hoverOffset;

    // Firefly twinkling glow pulse (living shimmer)
    float twk = sin(t * aTwinkle.x + aTwinkle.y);
    float pulse = twk * 0.5 + 0.5;

    // Maintain high contrast at all times: alpha 0.90 to 1.0, deep graphite black
    vAlpha = aAlpha * mix(0.92, 1.0, pulse);
    vGray = mix(aGray, min(0.14, aGray * 1.4), pulse);

    vec4 mvPosition = modelViewMatrix * vec4(animatedPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Subtle breathing pulse in point size
    float pulseScale = mix(0.95, 1.15, pulse);
    gl_PointSize = aSize * pulseScale * uPixelRatio;
  }
`;

const FRAGMENT_SHADER = `
  varying float vAlpha;
  varying float vGray;

  void main() {
    // Pure circular point sprite with crisp anti-aliased edge
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;

    float edge = smoothstep(0.5, 0.36, dist);
    gl_FragColor = vec4(vec3(vGray), vAlpha * edge);
  }
`;

// Safely resolve the font family for HTML5 Canvas 2D without invalid CSS variables
function getCanvasFontFamily(): string {
  if (typeof document === 'undefined') {
    return 'Manrope, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  }

  try {
    for (const face of document.fonts) {
      if (face.family && face.family.toLowerCase().includes('manrope') && !face.family.includes('var(')) {
        return `"${face.family}", Manrope, -apple-system, BlinkMacSystemFont, sans-serif`;
      }
    }
  } catch {}

  try {
    const computed = window.getComputedStyle(document.body).fontFamily;
    if (computed && !computed.includes('var(')) {
      return computed;
    }
  } catch {}

  return 'Manrope, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
}

function ParticleHeadingComponent({
  lines = DEFAULT_LINES,
  align = 'left',
  verticalAlign = 'center',
  targetWidthRatio: propTargetWidthRatio,
  maxFontSize = 140,
  onHoverStateChange,
  className = '',
  isActive = true,
  intensify = false,
  isReducedMotion = false,
  semanticHeading = 'h1',
}: ParticleHeadingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fontLoaded, setFontLoaded] = useState(false);
  const isActiveRef = useRef(isActive);
  const intensifyRef = useRef(intensify);
  const isReducedMotionRef = useRef(isReducedMotion);
  const isTouchRef = useRef(false);
  const animateRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      isTouchRef.current = window.matchMedia('(hover: none)').matches || 'ontouchstart' in window;
    }
  }, []);

  useEffect(() => {
    isActiveRef.current = isActive;
    if (isActive && !animFrameIdRef.current && animateRef.current) {
      clockRef.current.getDelta();
      animateRef.current();
    }
  }, [isActive]);

  useEffect(() => {
    intensifyRef.current = intensify;
  }, [intensify]);

  useEffect(() => {
    isReducedMotionRef.current = isReducedMotion;
  }, [isReducedMotion]);

  // Keep latest onHoverStateChange in ref so it NEVER triggers effect re-runs
  const onHoverRef = useRef(onHoverStateChange);
  useEffect(() => {
    onHoverRef.current = onHoverStateChange;
  }, [onHoverStateChange]);

  const lastNearRef = useRef(false);

  // Three.js instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  // Physics buffers
  const particleCountRef = useRef(0);
  const homePositionsRef = useRef<Float32Array | null>(null);
  const currentPositionsRef = useRef<Float32Array | null>(null);
  const velocitiesRef = useRef<Float32Array | null>(null);
  const seedsRef = useRef<Float32Array | null>(null);

  // Global mouse coordinates in canvas space
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -9999,
    y: -9999,
    active: false,
  });

  const clockRef = useRef(new THREE.Clock());
  const animFrameIdRef = useRef<number | null>(null);

  const propsRef = useRef({ align, lines, maxFontSize, propTargetWidthRatio, verticalAlign });
  useEffect(() => {
    propsRef.current = { align, lines, maxFontSize, propTargetWidthRatio, verticalAlign };
  }, [align, lines, maxFontSize, propTargetWidthRatio, verticalAlign]);

  // 1. Ensure fonts are loaded before rasterizing typography
  useEffect(() => {
    let active = true;
    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready
        .then(() => {
          if (active) setFontLoaded(true);
        })
        .catch(() => {
          if (active) setFontLoaded(true);
        });
    }

    const timer = setTimeout(() => {
      if (active) setFontLoaded(true);
    }, 100);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  // 2. Generate high-density, bold typography point cloud
  const generateParticles = useCallback((width: number, height: number) => {
    const {
      align: curAlign,
      lines: curLines,
      maxFontSize: curMaxFontSize,
      propTargetWidthRatio: curPropTargetWidthRatio,
      verticalAlign: curVerticalAlign,
    } = propsRef.current;

    const offscreen = document.createElement('canvas');
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    offscreen.width = Math.floor(width * scale);
    offscreen.height = Math.floor(height * scale);

    const ctx = offscreen.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.scale(scale, scale);

    // Resolve robust font-family, guaranteeing NO CSS var() strings in ctx.font
    const fontFamily = getCanvasFontFamily();

    const targetWidthRatio = curPropTargetWidthRatio ?? (
      curAlign === 'center'
        ? (width >= 1024 ? 0.60 : width >= 768 ? 0.72 : 0.86)
        : (width >= 1440 ? 0.74 : width >= 1024 ? 0.76 : width >= 768 ? 0.82 : 0.88)
    );

    const targetWidth = width * targetWidthRatio;
    const maxHeightBudget = height * (curAlign === 'center' ? 0.85 : 0.72);

    let candidateSize = Math.max(26, Math.floor(width * (curAlign === 'center' ? 0.16 : 0.082)));

    ctx.font = `700 ${candidateSize}px ${fontFamily}`;
    let maxMeasured = 0;
    for (const line of curLines) {
      const w = ctx.measureText(line).width;
      if (w > maxMeasured) maxMeasured = w;
    }

    if (maxMeasured > 0) {
      candidateSize = Math.floor(candidateSize * (targetWidth / maxMeasured));
    }

    const maxAllowedByHeight = Math.floor(maxHeightBudget / (curLines.length * 1.15));
    const fontSize = Math.max(24, Math.min(candidateSize, maxAllowedByHeight, curMaxFontSize));
    const lineHeight = Math.floor(fontSize * 1.15);

    let startX: number;
    if (curAlign === 'center') {
      startX = Math.floor(width / 2);
    } else if (width >= 1440) {
      startX = Math.max(64, Math.floor(width * 0.055));
    } else if (width >= 1024) {
      startX = Math.max(48, Math.floor(width * 0.050));
    } else if (width >= 768) {
      startX = Math.max(36, Math.floor(width * 0.045));
    } else {
      startX = Math.max(20, Math.floor(width * 0.040));
    }

    const totalTextHeight = curLines.length * lineHeight;
    let startY: number;
    if (curVerticalAlign === 'slightly-above-center') {
      startY = Math.max(20, Math.floor((height - totalTextHeight) * 0.44));
    } else if (curVerticalAlign === 'top') {
      startY = Math.max(20, Math.floor(height * 0.12));
    } else {
      startY = Math.max(36, Math.floor((height - totalTextHeight) * 0.48));
    }

    // Use pure Manrope SemiBold/Bold for natural organic curves without harsh blockiness
    ctx.font = `650 ${fontSize}px ${fontFamily}`;

    if (ctx.font.includes('10px') && fontSize > 20) {
      ctx.font = `650 ${fontSize}px "Manrope", sans-serif`;
      if (ctx.font.includes('10px') && fontSize > 20) {
        ctx.font = `650 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      }
      if (ctx.font.includes('10px') && fontSize > 20) {
        ctx.font = `bold ${fontSize}px sans-serif`;
      }
    }

    ctx.textBaseline = 'top';
    ctx.textAlign = curAlign === 'center' ? 'center' : 'left';

    // Avoid heavy strokeText that makes letters square/boxy; keep crisp natural fill with micro hairline
    ctx.fillStyle = '#000000';

    curLines.forEach((line, i) => {
      const y = startY + i * lineHeight;
      ctx.fillText(line, startX, y);
    });

    const imageData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
    const data = imageData.data;

    const pointsList: {
      x: number;
      y: number;
      z: number;
      size: number;
      alpha: number;
      gray: number;
      seed: number;
      wanderFreqX: number;
      wanderFreqY: number;
      wanderAmp: number;
      wanderPhase: number;
      twinkleFreq: number;
      twinklePhase: number;
      twinkleAmp: number;
    }[] = [];

    const imgWidth = offscreen.width;
    const imgHeight = offscreen.height;
    // Sampling stride: fine-grained for high-fidelity typographic resolution
    const stride = scale > 1
      ? (fontSize >= 180 ? 4 : fontSize >= 110 ? 3 : 2)
      : (fontSize >= 180 ? 3 : fontSize >= 110 ? 2 : 2);

    for (let py = 0; py < imgHeight; py += stride) {
      for (let px = 0; px < imgWidth; px += stride) {
        const index = (py * imgWidth + px) * 4;
        const alpha = data[index + 3];

        if (alpha > 35) {
          // Controlled organic retention
          const keepChance = alpha > 160 ? 0.88 : alpha > 90 ? 0.65 : 0.40;
          if (Math.random() > keepChance) continue;

          // Controlled subtle subpixel organic jitter (removes strict LED grid/disco matrix look)
          const jitterAmount = (stride / scale) * 0.42;
          const jitterX = (Math.random() - 0.5) * jitterAmount;
          const jitterY = (Math.random() - 0.5) * jitterAmount;

          const cssX = px / scale + jitterX;
          const cssY = py / scale + jitterY;

          // Subtle organic 3D depth volume
          const zDepth = (Math.random() - 0.5) * 10.0;

          // Deep graphite black for high contrast against #F5F5F5
          const gray = 0.05 + Math.random() * 0.04;
          const pAlpha = 0.90 + Math.random() * 0.10;
          const seed = Math.random();

          // Controlled micro-hovering so letters breathe smoothly
          const wanderFreqX = 0.5 + Math.random() * 0.9;
          const wanderFreqY = 0.4 + Math.random() * 0.8;
          const wanderAmp = 0.4 + Math.random() * 0.5;
          const wanderPhase = Math.random() * Math.PI * 2;

          // Living shimmer pulse
          const twinkleFreq = 0.8 + Math.random() * 1.6;
          const twinklePhase = Math.random() * Math.PI * 2;
          const twinkleAmp = 0.15 + Math.random() * 0.15;

          // Crisp, distinct point size (2.0 - 3.6px) proportional to font scale
          const baseSize = Math.max(2.0, Math.min(3.6, fontSize * 0.018)) + Math.random() * 0.5;

          pointsList.push({
            x: cssX,
            y: cssY,
            z: zDepth,
            size: baseSize,
            alpha: pAlpha,
            gray,
            seed,
            wanderFreqX,
            wanderFreqY,
            wanderAmp,
            wanderPhase,
            twinkleFreq,
            twinklePhase,
            twinkleAmp,
          });
        }
      }
    }

    return pointsList;
  }, []);

  // 3. Initialize Three.js scene & simulation — RUNS ONCE per container lifecycle
  useEffect(() => {
    if (!fontLoaded || !containerRef.current || !canvasRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;

    let width = container.clientWidth;
    let height = container.clientHeight;
    if (width <= 0 || height <= 0) {
      width = window.innerWidth || 1200;
      height = window.innerHeight || 800;
    }

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.OrthographicCamera(0, width, 0, -height, -500, 500);
    camera.position.z = 200;
    cameraRef.current = camera;

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height);
    rendererRef.current = renderer;

    // Generate point cloud
    const pointsData = generateParticles(width, height);
    if (!pointsData || pointsData.length === 0) return;

    const count = pointsData.length;
    particleCountRef.current = count;

    const positions = new Float32Array(count * 3);
    const homePositions = new Float32Array(count * 3);
    const currentPositions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    const grays = new Float32Array(count);
    const seeds = new Float32Array(count);
    const wanderParams = new Float32Array(count * 4);
    const twinkleParams = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const p = pointsData[i];
      const i3 = i * 3;
      const i4 = i * 4;

      positions[i3] = p.x;
      positions[i3 + 1] = -p.y;
      positions[i3 + 2] = p.z;

      homePositions[i3] = p.x;
      homePositions[i3 + 1] = -p.y;
      homePositions[i3 + 2] = p.z;

      currentPositions[i3] = p.x;
      currentPositions[i3 + 1] = -p.y;
      currentPositions[i3 + 2] = p.z;

      velocities[i3] = 0;
      velocities[i3 + 1] = 0;
      velocities[i3 + 2] = 0;

      sizes[i] = p.size;
      alphas[i] = p.alpha;
      grays[i] = p.gray;
      seeds[i] = p.seed;

      wanderParams[i4] = p.wanderFreqX;
      wanderParams[i4 + 1] = p.wanderFreqY;
      wanderParams[i4 + 2] = p.wanderAmp;
      wanderParams[i4 + 3] = p.wanderPhase;

      twinkleParams[i3] = p.twinkleFreq;
      twinkleParams[i3 + 1] = p.twinklePhase;
      twinkleParams[i3 + 2] = p.twinkleAmp;
    }

    homePositionsRef.current = homePositions;
    currentPositionsRef.current = currentPositions;
    velocitiesRef.current = velocities;
    seedsRef.current = seeds;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    geometry.setAttribute('aGray', new THREE.BufferAttribute(grays, 1));
    geometry.setAttribute('aWander', new THREE.BufferAttribute(wanderParams, 4));
    geometry.setAttribute('aTwinkle', new THREE.BufferAttribute(twinkleParams, 3));
    geometryRef.current = geometry;

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: pixelRatio },
      },
    });
    materialRef.current = material;

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    clockRef.current.start();

    // 4. Physics simulation loop (tactile elasticity + GPU living shimmer)
    const animate = () => {
      if (!isActiveRef.current) {
        animFrameIdRef.current = null;
        return;
      }
      animFrameIdRef.current = requestAnimationFrame(animate);

      const time = clockRef.current.getElapsedTime();
      if (materialRef.current) {
        materialRef.current.uniforms.uTime.value = time;
      }

      const currentCount = particleCountRef.current;
      const posAttr = geometry.attributes.position as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;

      const home = homePositionsRef.current;
      const current = currentPositionsRef.current;
      const vel = velocitiesRef.current;
      const seedsArr = seedsRef.current;

      if (!home || !current || !vel || !seedsArr) return;

      const mouse = mouseRef.current;
      const isTouch = isTouchRef.current;
      const mouseActive = mouse.active && !isTouch;
      const mouseX = mouse.x;
      const mouseY = -mouse.y;

      const isIntense = intensifyRef.current;
      const isRedMotion = isReducedMotionRef.current;
      const influenceRadius = isIntense
        ? Math.max(260, width * 0.32)
        : Math.max(140, Math.min(220, width * 0.15));
      const maxDisplacement = isRedMotion ? 0 : isIntense ? 34.0 : 14.0;
      const springK = isIntense ? 0.07 : 0.05;
      const damping = 0.88;

      let nearAny = false;
      let hasMovement = false;

      for (let i = 0; i < currentCount; i++) {
        const i3 = i * 3;
        const seed = seedsArr[i];

        const cx = current[i3];
        const cy = current[i3 + 1];
        const cz = current[i3 + 2];

        const hx = home[i3];
        const hy = home[i3 + 1];
        const hz = home[i3 + 2];

        let vx = vel[i3];
        let vy = vel[i3 + 1];
        let vz = vel[i3 + 2];

        let targetX = hx;
        let targetY = hy;
        let targetZ = hz;

        if (mouseActive) {
          const dx = hx - mouseX;
          const dy = hy - mouseY;
          const distSq = dx * dx + dy * dy;

          if (distSq < influenceRadius * influenceRadius) {
            nearAny = true;
            const dist = Math.sqrt(distSq);

            const u = dist / influenceRadius;
            const falloff = (1.0 - u) * (1.0 - u) * (1.0 + 2.0 * u);

            const invDist = dist > 0.001 ? 1.0 / dist : 0;
            // Push gently away from mouse (tactile repulsion)
            const dirX = dx * invDist;
            const dirY = dy * invDist;

            const stretch = falloff * maxDisplacement * (0.8 + seed * 0.4);

            targetX = hx + dirX * stretch;
            targetY = hy + dirY * stretch;
            targetZ = hz + falloff * 6.0 * (0.5 + seed * 0.5);
          }
        }

        // Tactile excitation pulse when user triggers ENTER
        if (isIntense && !isRedMotion) {
          const centerX = width / 2;
          const centerY = -height * 0.44;
          const dxC = hx - centerX;
          const dyC = hy - centerY;
          const distC = Math.sqrt(dxC * dxC + dyC * dyC);
          const uC = Math.min(1.0, distC / Math.max(100, width * 0.4));
          const wave = Math.sin(uC * Math.PI) * 14.0 * (0.8 + seed * 0.4);
          const invDC = distC > 0.001 ? 1.0 / distC : 0;
          targetX += dxC * invDC * wave;
          targetY += dyC * invDC * wave;
          targetZ += wave * 0.4;
          nearAny = true;
        }

        const fx = (targetX - cx) * springK;
        const fy = (targetY - cy) * springK;
        const fz = (targetZ - cz) * springK;

        vx = (vx + fx) * damping;
        vy = (vy + fy) * damping;
        vz = (vz + fz) * damping;

        const nextX = cx + vx;
        const nextY = cy + vy;
        const nextZ = cz + vz;

        if (Math.abs(vx) > 0.002 || Math.abs(vy) > 0.002 || Math.abs(targetX - nextX) > 0.005) {
          hasMovement = true;
        }

        current[i3] = nextX;
        current[i3 + 1] = nextY;
        current[i3 + 2] = nextZ;

        posArray[i3] = nextX;
        posArray[i3 + 1] = nextY;
        posArray[i3 + 2] = nextZ;

        vel[i3] = vx;
        vel[i3 + 1] = vy;
        vel[i3 + 2] = vz;
      }

      if (hasMovement || mouseActive) {
        posAttr.needsUpdate = true;
      }

      renderer.render(scene, camera);

      // Only notify parent when hover status changes, avoiding unnecessary updates
      if (lastNearRef.current !== nearAny) {
        lastNearRef.current = nearAny;
        onHoverRef.current?.(nearAny);
      }
    };

    animateRef.current = animate;
    if (isActiveRef.current) {
      animate();
    }

    // 5. Seamless pointer tracking
    const handleWindowPointerMove = (e: PointerEvent) => {
      if (!isActiveRef.current || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const inZone =
        x >= -40 &&
        x <= rect.width + 40 &&
        y >= -40 &&
        y <= rect.height + 40;

      if (inZone) {
        mouseRef.current.x = x;
        mouseRef.current.y = y;
        mouseRef.current.active = true;
      } else {
        mouseRef.current.active = false;
        mouseRef.current.x = -9999;
        mouseRef.current.y = -9999;
      }
    };

    const handleWindowPointerLeave = () => {
      mouseRef.current.active = false;
      mouseRef.current.x = -9999;
      mouseRef.current.y = -9999;
      if (lastNearRef.current) {
        lastNearRef.current = false;
        onHoverRef.current?.(false);
      }
    };

    window.addEventListener('pointermove', handleWindowPointerMove, { passive: true });
    window.addEventListener('pointerleave', handleWindowPointerLeave);

    // 6. Debounced resize handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      if (newWidth <= 0 || newHeight <= 0) return;

      cameraRef.current.right = newWidth;
      cameraRef.current.bottom = -newHeight;
      cameraRef.current.updateProjectionMatrix();

      const newPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      rendererRef.current.setPixelRatio(newPixelRatio);
      rendererRef.current.setSize(newWidth, newHeight);

      if (materialRef.current) {
        materialRef.current.uniforms.uPixelRatio.value = newPixelRatio;
      }

      const newPoints = generateParticles(newWidth, newHeight);
      if (!newPoints || newPoints.length === 0) return;

      const newCount = newPoints.length;
      particleCountRef.current = newCount;

      const positions = new Float32Array(newCount * 3);
      const home = new Float32Array(newCount * 3);
      const cur = new Float32Array(newCount * 3);
      const vel = new Float32Array(newCount * 3);
      const sizes = new Float32Array(newCount);
      const alphas = new Float32Array(newCount);
      const grays = new Float32Array(newCount);
      const seeds = new Float32Array(newCount);
      const wander = new Float32Array(newCount * 4);
      const twinkle = new Float32Array(newCount * 3);

      for (let i = 0; i < newCount; i++) {
        const p = newPoints[i];
        const i3 = i * 3;
        const i4 = i * 4;

        positions[i3] = p.x;
        positions[i3 + 1] = -p.y;
        positions[i3 + 2] = p.z;

        home[i3] = p.x;
        home[i3 + 1] = -p.y;
        home[i3 + 2] = p.z;

        cur[i3] = p.x;
        cur[i3 + 1] = -p.y;
        cur[i3 + 2] = p.z;

        vel[i3] = 0;
        vel[i3 + 1] = 0;
        vel[i3 + 2] = 0;

        sizes[i] = p.size;
        alphas[i] = p.alpha;
        grays[i] = p.gray;
        seeds[i] = p.seed;

        wander[i4] = p.wanderFreqX;
        wander[i4 + 1] = p.wanderFreqY;
        wander[i4 + 2] = p.wanderAmp;
        wander[i4 + 3] = p.wanderPhase;

        twinkle[i3] = p.twinkleFreq;
        twinkle[i3 + 1] = p.twinklePhase;
        twinkle[i3 + 2] = p.twinkleAmp;
      }

      homePositionsRef.current = home;
      currentPositionsRef.current = cur;
      velocitiesRef.current = vel;
      seedsRef.current = seeds;

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
      geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
      geometry.setAttribute('aGray', new THREE.BufferAttribute(grays, 1));
      geometry.setAttribute('aWander', new THREE.BufferAttribute(wander, 4));
      geometry.setAttribute('aTwinkle', new THREE.BufferAttribute(twinkle, 3));
    };

    let resizeTimer: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(handleResize, 150);
    };

    window.addEventListener('resize', debouncedResize);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerleave', handleWindowPointerLeave);
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(resizeTimer);
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [fontLoaded, generateParticles]);

  const HeadingTag = semanticHeading;

  return (
    <div
      ref={containerRef}
      className={`relative select-none cursor-default overflow-visible ${className}`}
    >
      <HeadingTag className="sr-only">{lines.join(' ')}</HeadingTag>
      <canvas
        ref={canvasRef}
        className="w-full h-full block pointer-events-auto"
        style={{
          touchAction: 'none',
        }}
      />
    </div>
  );
}

export const ParticleHeading = memo(ParticleHeadingComponent);
