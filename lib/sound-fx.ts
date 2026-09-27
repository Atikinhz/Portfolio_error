'use client';

// Web Audio micro-haptics synthesizer
// Creates warm, precision tactile clicks (inspired by mechanical dials) with zero external audio files.

let audioCtx: AudioContext | null = null;
let soundEnabled = false;

function getAudioContext(): AudioContext | null {
  return null;
}

export function toggleSound(): boolean {
  soundEnabled = false;
  return false;
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = false;
}

export async function unlockAudioContext(): Promise<boolean> {
  return false;
}

export function isSoundEnabled(): boolean {
  return false;
}

// Gentle, quiet spatial resonance when crossing the threshold into the site
export function playEnterSpatialSound() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx || ctx.state === 'suspended') return;
    const now = ctx.currentTime;

    // Soft resonant chord (warm acoustic breath)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(146.83, now); // D3
    osc1.frequency.exponentialRampToValueAtTime(220, now + 0.45);
    gain1.gain.setValueAtTime(0.0001, now);
    gain1.gain.linearRampToValueAtTime(0.02, now + 0.08);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.58);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    const filter2 = ctx.createBiquadFilter();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(440, now); // A4
    osc2.frequency.exponentialRampToValueAtTime(659.25, now + 0.35); // E5
    filter2.type = 'lowpass';
    filter2.frequency.setValueAtTime(1200, now);
    gain2.gain.setValueAtTime(0.0001, now);
    gain2.gain.linearRampToValueAtTime(0.015, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    osc2.connect(filter2);
    filter2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.48);
  } catch {
    // Graceful fallback
  }
}

export function playTickSound(freq = 90, duration = 0.035) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx || ctx.state === 'suspended') return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + duration);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, ctx.currentTime);

    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Graceful fallback if audio is blocked
  }
}

// Whisper-quiet tactile paper / wet print friction rustle
export function playPaperRustle(intensity = 0.5) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx || ctx.state === 'suspended') return;

    // Filtered pink-ish noise burst simulating paper sliding
    const bufferSize = Math.floor(ctx.sampleRate * 0.04);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800 + intensity * 400, ctx.currentTime);
    filter.Q.setValueAtTime(1.5, ctx.currentTime);

    const gain = ctx.createGain();
    const vol = Math.min(0.025, 0.008 + intensity * 0.015);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    whiteNoise.start();
  } catch {
    // Graceful fallback
  }
}

// VRAK "Contained Chaos" depressurization and particle release sound
// Layered: 1) sharp aluminium tab pop (high frequency transient) 2) pressurized gas hiss 3) sub-bass kinetic punch 4) particle sizzle
export function playContainedChaosRelease() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx || ctx.state === 'suspended') return;
    const now = ctx.currentTime;

    // 1. Aluminium tab snap / metallic transient
    const tabOsc = ctx.createOscillator();
    const tabGain = ctx.createGain();
    tabOsc.type = 'triangle';
    tabOsc.frequency.setValueAtTime(2400, now);
    tabOsc.frequency.exponentialRampToValueAtTime(140, now + 0.04);
    tabGain.gain.setValueAtTime(0.09, now);
    tabGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    tabOsc.connect(tabGain);
    tabGain.connect(ctx.destination);
    tabOsc.start(now);
    tabOsc.stop(now + 0.05);

    // 2. High-pressure CO2 gas burst (filtered noise hiss)
    const noiseLength = Math.floor(ctx.sampleRate * 0.35);
    const noiseBuffer = ctx.createBuffer(1, noiseLength, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseLength; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (noiseLength * 0.22));
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(3200, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(900, now + 0.35);
    noiseFilter.Q.setValueAtTime(2.2, now);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.08, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseSource.start(now);

    // 3. Sub-bass kinetic thud (contained shockwave)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(95, now);
    subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.45);
    subGain.gain.setValueAtTime(0.12, now);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.52);

    // 4. Particle shimmer / dispersion sizzle (0.15s - 0.7s)
    const shimmerBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
    const sData = shimmerBuffer.getChannelData(0);
    for (let i = 0; i < sData.length; i++) {
      sData[i] = (Math.random() * 2 - 1) * Math.sin((i / sData.length) * Math.PI);
    }
    const shimmer = ctx.createBufferSource();
    shimmer.buffer = shimmerBuffer;
    const shimmerFilter = ctx.createBiquadFilter();
    shimmerFilter.type = 'highpass';
    shimmerFilter.frequency.setValueAtTime(4500, now + 0.1);
    const shimmerGain = ctx.createGain();
    shimmerGain.gain.setValueAtTime(0.0001, now);
    shimmerGain.gain.linearRampToValueAtTime(0.025, now + 0.12);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
    shimmer.connect(shimmerFilter);
    shimmerFilter.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);
    shimmer.start(now + 0.08);
  } catch {
    // Graceful fallback
  }
}

// Reverse implosion & spatial pull sound (when closing case and docking back into 3D scene)
export function playReverseImplosionSound() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx || ctx.state === 'suspended') return;
    const now = ctx.currentTime;

    // Inward vacuum suck
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(40, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.35);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.07, now + 0.32);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.44);

    // Magnetic dock snap at end
    setTimeout(() => {
      playTickSound(140, 0.03);
    }, 320);
  } catch {
    // Graceful fallback
  }
}

// Tactile dot selection tick
export function playSwitchDotSound() {
  playTickSound(110, 0.025);
}

// Canister pressure decompression / hiss when exploding or opening can
export function playDecompressionSound() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx || ctx.state === 'suspended') return;
    const now = ctx.currentTime;

    // 1. Initial mechanical metal snap
    const snapOsc = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snapOsc.type = 'triangle';
    snapOsc.frequency.setValueAtTime(320, now);
    snapOsc.frequency.exponentialRampToValueAtTime(80, now + 0.06);
    snapGain.gain.setValueAtTime(0.08, now);
    snapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    snapOsc.connect(snapGain);
    snapGain.connect(ctx.destination);
    snapOsc.start(now);
    snapOsc.stop(now + 0.08);

    // 2. Pressurized white noise burst
    const bufferSize = ctx.sampleRate * 0.25;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(2400, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(1200, now + 0.22);
    noiseFilter.Q.setValueAtTime(3.0, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.05, now + 0.01);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    whiteNoise.start(now + 0.01);
    whiteNoise.stop(now + 0.25);
  } catch {
    // Graceful fallback
  }
}

// Snap back / contain sound when collapsing the exploded view
export function playCanSnapSound() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx || ctx.state === 'suspended') return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.09);

    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  } catch {
    // Graceful fallback
  }
}
