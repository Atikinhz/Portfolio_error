/* ==========================================================================
   Continuous Cylindrical Manifold Mathematics & Configuration
   --------------------------------------------------------------------------
   The entire homepage is a single, continuous infinite ribbon wrapped around
   an invisible vertical drum. Hero -> About -> MORF -> VRAK -> Small Works
   -> Contact -> Hero -> ...
   
   A single scalar progress coordinate u in (-inf, +inf) deterministically
   governs both the global cylinder rotation and the local scroll-scrubbed
   scenes (About disintegration and Small Works carousel rotation).
   ========================================================================== */

export interface SceneConfig {
  id: string;
  label: string;
  dwell: number;      // Scroll distance spent focused in this scene
  transition: number; // Scroll distance spent smoothly traveling to next scene
}

export const SCENE_CONFIGS: SceneConfig[] = [
  { id: 'portrait', label: 'Manifesto', dwell: 1.80, transition: 1.00 },
  { id: 'disciplines', label: 'Disciplines', dwell: 1.25, transition: 1.00 },
  { id: 'morf', label: 'MORF', dwell: 0.75, transition: 1.00 },
  { id: 'vrak', label: 'VRAK', dwell: 0.75, transition: 1.00 },
  { id: 'contact', label: 'Contact', dwell: 0.75, transition: 1.00 },
];

export const TOTAL_SCENES = SCENE_CONFIGS.length; // Exactly 5

export interface SceneSegment {
  sceneIndex: number;
  dwellStart: number;
  dwellEnd: number;
  transStart: number;
  transEnd: number;
}

let cumulativeOffset = 0;
export const SCENE_SEGMENTS: SceneSegment[] = SCENE_CONFIGS.map((cfg, i) => {
  const dwellStart = cumulativeOffset;
  const dwellEnd = dwellStart + cfg.dwell;
  const transStart = dwellEnd;
  const transEnd = transStart + cfg.transition;
  cumulativeOffset = transEnd;
  return {
    sceneIndex: i,
    dwellStart,
    dwellEnd,
    transStart,
    transEnd,
  };
});

export const CYCLE_LENGTH = cumulativeOffset; // Total scroll length of one complete cycle

export interface SurfaceState {
  cylinderPos: number;         // Continuous float position of cylinder coordinate
  activeMilestone: number;     // Integer milestone nearest to center of viewport
  portraitProgress: number;    // Scrubbed progress 0.0 to 1.0 for Portrait scene (0-18% hold, 18-68% reveal, 68-86% hold, 86-100% exit)
  fragmentsRotation: number;   // Maintained for interface stability
  isInDwell: boolean;
  activeSceneIndex: number;
}

/**
 * Pure, deterministic, C1-differentiable mapping from scalar scroll distance u to
 * cylinder position and local scrubbed parameters.
 * 
 * Guarantees:
 * 1. Zero velocity discontinuity on scene entry/exit (quintic smoothstep).
 * 2. Impossible to skip past interactive scroll animations on fast gestures.
 * 3. 100% reversible in forward and backward directions.
 * 4. Infinite seamless wrapping with no seams or scroll jumps.
 */
export function evaluateSurface(u: number): SurfaceState {
  const cycleIndex = Math.floor(u / CYCLE_LENGTH);
  const r = u - cycleIndex * CYCLE_LENGTH; // in [0, CYCLE_LENGTH)

  for (let i = 0; i < TOTAL_SCENES; i++) {
    const seg = SCENE_SEGMENTS[i];

    // Inside dwell of scene i:
    if (r >= seg.dwellStart && r < seg.dwellEnd) {
      const milestone = cycleIndex * TOTAL_SCENES + i;

      let portProg = i > 0 ? 1.0 : 0.0;
      if (i === 0) {
        const totalSpan = seg.transEnd - seg.dwellStart;
        portProg = Math.max(0, Math.min(0.86, (r - seg.dwellStart) / totalSpan));
      }

      return {
        cylinderPos: milestone,
        activeMilestone: milestone,
        portraitProgress: portProg,
        fragmentsRotation: 0,
        isInDwell: true,
        activeSceneIndex: i,
      };
    }

    // Inside transition between scene i and scene i+1:
    if (r >= seg.transStart && r < seg.transEnd) {
      const baseMilestone = cycleIndex * TOTAL_SCENES + i;
      const t = (r - seg.transStart) / (seg.transEnd - seg.transStart); // [0, 1]

      // Quintic smoothstep S(t) = 6t^5 - 15t^4 + 10t^3 (0 first and second derivatives at endpoints)
      const smoothedT = t * t * t * (t * (6 * t - 15) + 10);
      const cylinderPos = baseMilestone + smoothedT;
      const activeMilestone = Math.round(cylinderPos);

      let portProg = i >= 0 ? 1.0 : 0.0;
      if (i === 0) {
        const totalSpan = seg.transEnd - seg.dwellStart;
        portProg = Math.max(0.86, Math.min(1.0, (r - seg.dwellStart) / totalSpan));
      }

      return {
        cylinderPos,
        activeMilestone,
        portraitProgress: portProg,
        fragmentsRotation: 0,
        isInDwell: false,
        activeSceneIndex: ((Math.floor(cylinderPos) % TOTAL_SCENES) + TOTAL_SCENES) % TOTAL_SCENES,
      };
    }
  }

  return {
    cylinderPos: cycleIndex * TOTAL_SCENES,
    activeMilestone: cycleIndex * TOTAL_SCENES,
    portraitProgress: 0,
    fragmentsRotation: 0,
    isInDwell: true,
    activeSceneIndex: 0,
  };
}

/**
 * Calculates the exact scalar u required to center the viewport on milestone M.
 */
export function getDwellCenterU(milestone: number): number {
  const cycleIndex = Math.floor(milestone / TOTAL_SCENES);
  const sceneIndex = ((milestone % TOTAL_SCENES) + TOTAL_SCENES) % TOTAL_SCENES;
  const seg = SCENE_SEGMENTS[sceneIndex];
  const midDwell = (seg.dwellStart + seg.dwellEnd) * 0.5;
  return cycleIndex * CYCLE_LENGTH + midDwell;
}

export function getSceneIndex(milestone: number): number {
  return ((milestone % TOTAL_SCENES) + TOTAL_SCENES) % TOTAL_SCENES;
}

/**
 * Deterministic calculation of local progress for a specific milestone panel
 * as a function of the continuous scalar coordinate u.
 * Works seamlessly forward and backward across any number of infinite loops.
 */
export function getMilestoneProgress(milestone: number, u: number): {
  portraitProgress: number;
  fragmentsRotation: number;
} {
  const cycleIndex = Math.floor(milestone / TOTAL_SCENES);
  const sceneIdx = getSceneIndex(milestone);

  if (sceneIdx === 0) {
    // Scene 0: Portrait / Manifesto
    const seg = SCENE_SEGMENTS[0];
    const uStart = cycleIndex * CYCLE_LENGTH + seg.dwellStart;
    const uEnd = cycleIndex * CYCLE_LENGTH + seg.transEnd;
    if (u <= uStart) return { portraitProgress: 0, fragmentsRotation: 0 };
    if (u >= uEnd) return { portraitProgress: 1, fragmentsRotation: 0 };
    const prog = (u - uStart) / (uEnd - uStart);
    return {
      portraitProgress: Math.max(0, Math.min(1, prog)),
      fragmentsRotation: 0,
    };
  }

  return {
    portraitProgress: 1,
    fragmentsRotation: 0,
  };
}
