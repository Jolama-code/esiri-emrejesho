import { useEffect, useRef } from 'react';
import { subscribeLevel } from '../audioLevel';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'acting' | 'speaking' | 'error';

/**
 * eSiri's orb: a deep-blue glass sphere with glowing white-cyan plasma filaments
 * around a bright core (inspired by reference/orb.png, drawn entirely in code).
 * Layers: CSS sphere gradient → animated <canvas> plasma → CSS gloss highlight and dark rim.
 * One shared requestAnimationFrame ticker drives every orb on the page.
 */
export function Orb({ size, state, className = '' }: { size: number; state: OrbState; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<OrbState>(state);
  stateRef.current = state;

  useEffect(
    () =>
      subscribeLevel((lvl) => {
        ref.current?.style.setProperty('--level', lvl.toFixed(3));
      }),
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return registerPlasma(canvas, size, () => stateRef.current);
  }, [size]);

  return (
    <div ref={ref} className={`orb orb--${state} ${className}`} style={{ width: size, height: size }} aria-hidden="true" data-orb-state={state}>
      <div className="orb-glow" />
      <div className="orb-ring" />
      <div className="orb-body">
        <canvas ref={canvasRef} className="orb-plasma" />
        <div className="orb-highlight" />
        <div className="orb-rim" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plasma renderer

interface Filament {
  angle: number;
  drift: number;
  wobble: number;
  len: number;
  seed: number;
  width: number;
  branch: number; // segment index where a side branch starts (or -1)
}

interface PlasmaOrb {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  size: number;
  getState: () => OrbState;
  filaments: Filament[];
  intensity: number;
}

const orbs = new Set<PlasmaOrb>();
let raf = 0;
let level = 0;
let lastFrame = 0;
let unsubLevel: (() => void) | null = null;
const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function makeFilaments(n: number): Filament[] {
  return Array.from({ length: n }, (_, i) => ({
    angle: (i / n) * Math.PI * 2 + Math.random() * 0.6,
    drift: (Math.random() - 0.5) * 0.5,
    wobble: 0.4 + Math.random() * 0.9,
    len: 0.72 + Math.random() * 0.26,
    seed: Math.random() * 100,
    width: 0.7 + Math.random() * 0.8,
    branch: Math.random() < 0.55 ? 4 + Math.floor(Math.random() * 5) : -1,
  }));
}

function registerPlasma(canvas: HTMLCanvasElement, size: number, getState: () => OrbState): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => undefined;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const orb: PlasmaOrb = { canvas, ctx, size, getState, filaments: makeFilaments(size < 40 ? 5 : size < 90 ? 9 : 12), intensity: 0.7 };
  orbs.add(orb);
  if (!unsubLevel) unsubLevel = subscribeLevel((l) => (level = l));
  draw(orb, performance.now() / 1000); // first frame immediately (also for reduced motion)
  if (!raf && !reducedMotion) raf = requestAnimationFrame(tick);
  return () => {
    orbs.delete(orb);
    if (!orbs.size && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
}

function tick(now: number): void {
  raf = requestAnimationFrame(tick);
  // ~30 fps is plenty for the plasma and keeps the CPU cool.
  if (now - lastFrame < 32 || document.hidden) return;
  lastFrame = now;
  const t = now / 1000;
  orbs.forEach((o) => {
    if (o.canvas.isConnected && o.canvas.getClientRects().length) draw(o, t);
  });
}

const STATE_PARAMS: Record<OrbState, { speed: number; crackle: number; base: number; levelGain: number; active: number }> = {
  idle: { speed: 0.35, crackle: 0, base: 0.62, levelGain: 0, active: 0.7 },
  listening: { speed: 0.8, crackle: 0.02, base: 0.6, levelGain: 1.1, active: 0.85 },
  thinking: { speed: 2.6, crackle: 0.11, base: 0.95, levelGain: 0, active: 1 },
  acting: { speed: 1.1, crackle: 0.03, base: 0.8, levelGain: 0, active: 0.9 },
  speaking: { speed: 1.2, crackle: 0.02, base: 0.65, levelGain: 1.0, active: 1 },
  error: { speed: 1.8, crackle: 0.08, base: 0.85, levelGain: 0, active: 0.9 },
};

function draw(o: PlasmaOrb, t: number): void {
  const { ctx, size } = o;
  const p = STATE_PARAMS[o.getState()] ?? STATE_PARAMS.idle;
  const target = Math.min(1.25, p.base + level * p.levelGain);
  o.intensity += (target - o.intensity) * 0.25;
  const I = o.intensity;
  const R = size / 2;
  const cx = R;
  const cy = R;
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.97, 0, Math.PI * 2);
  ctx.clip();

  // Diffuse inner glow (blue haze around the core)
  const haze = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.95);
  haze.addColorStop(0, `rgba(120, 200, 255, ${0.55 * I})`);
  haze.addColorStop(0.45, `rgba(40, 120, 255, ${0.28 * I})`);
  haze.addColorStop(1, 'rgba(10, 40, 160, 0)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, size, size);

  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const segs = size < 40 ? 7 : 12;
  const tt = t * p.speed;
  const coreX = cx + Math.sin(tt * 0.7) * R * 0.05;
  const coreY = cy + Math.cos(tt * 0.9) * R * 0.05;

  for (const f of o.filaments) {
    const ang = f.angle + tt * f.drift + Math.sin(tt * f.wobble + f.seed) * 0.55;
    const len = R * f.len * (0.92 + Math.sin(tt * 1.3 + f.seed) * 0.08);
    const ex = coreX + Math.cos(ang) * len;
    const ey = coreY + Math.sin(ang) * len;
    const nx = -Math.sin(ang);
    const ny = Math.cos(ang);
    const pts: [number, number][] = [];
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const env = Math.sin(Math.PI * Math.min(1, u * 1.15)) * R * 0.2;
      const n =
        Math.sin(i * 1.7 + tt * 2.1 + f.seed) * 0.6 +
        Math.sin(i * 3.3 - tt * 3.4 + f.seed * 2) * 0.35 +
        (p.crackle ? (Math.random() - 0.5) * p.crackle * 12 : 0);
      pts.push([coreX + (ex - coreX) * u + nx * env * n, coreY + (ey - coreY) * u + ny * env * n]);
    }
    const flicker = p.crackle ? 0.75 + Math.random() * 0.25 : 1;
    const alpha = Math.min(1, I * flicker);
    stroke(ctx, pts, R * 0.075 * f.width, `rgba(60, 150, 255, ${0.22 * alpha})`);
    stroke(ctx, pts, R * 0.03 * f.width, `rgba(140, 215, 255, ${0.5 * alpha})`);
    stroke(ctx, pts, Math.max(0.6, R * 0.011 * f.width), `rgba(235, 250, 255, ${0.9 * alpha})`);
    if (f.branch > 0 && f.branch < pts.length - 2) {
      const [bx, by] = pts[f.branch];
      const bang = ang + (Math.sin(tt * 1.7 + f.seed) > 0 ? 0.9 : -0.9);
      const bl = R * 0.32;
      const bpts: [number, number][] = [];
      for (let i = 0; i <= 5; i++) {
        const u = i / 5;
        const w = Math.sin(i * 2.3 + tt * 3 + f.seed) * R * 0.05 * Math.sin(Math.PI * u);
        bpts.push([bx + Math.cos(bang) * bl * u - Math.sin(bang) * w, by + Math.sin(bang) * bl * u + Math.cos(bang) * w]);
      }
      stroke(ctx, bpts, R * 0.025, `rgba(120, 200, 255, ${0.35 * alpha})`);
      stroke(ctx, bpts, Math.max(0.5, R * 0.008), `rgba(225, 245, 255, ${0.75 * alpha})`);
    }
  }

  // Bright core
  const coreR = R * (0.2 + Math.min(0.25, level * p.levelGain * 0.18) + (p.crackle ? Math.random() * 0.03 : 0));
  const core = ctx.createRadialGradient(coreX, coreY, 0, coreX, coreY, coreR * 2.2);
  core.addColorStop(0, `rgba(255, 255, 255, ${Math.min(1, 0.95 * I + 0.1)})`);
  core.addColorStop(0.25, `rgba(210, 240, 255, ${0.8 * I})`);
  core.addColorStop(0.6, `rgba(90, 170, 255, ${0.3 * I})`);
  core.addColorStop(1, 'rgba(40, 110, 255, 0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(coreX, coreY, coreR * 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function stroke(ctx: CanvasRenderingContext2D, pts: [number, number][], width: number, color: string): void {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last[0], last[1]);
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke();
}
