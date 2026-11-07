import { DEFAULT_L, GRAY_CYCLE, PIVOT_X, PIVOT_Y, PX_PER_M } from "./constants";
import { stateLabel, type LunarData } from "./types";

export function catmullRom(p0: number, p1: number, p2: number, p3: number, u: number): number {
  const u2 = u * u;
  const u3 = u2 * u;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * u +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * u3)
  );
}

/** Uniform Catmull-Rom. End samples are repeated so t = 0 and t = last land on the data. */
export function sampleSeries(samples: number[], t: number, fps: number): number {
  const n = samples.length;
  if (n === 0) return 0;
  if (n === 1) return samples[0];
  const maxT = (n - 1) / fps;
  const tc = Math.min(Math.max(t, 0), maxT);
  const f = tc * fps;
  const i = Math.floor(f);
  if (i >= n - 1) return samples[n - 1];
  const u = f - i;
  const p0 = samples[i - 1] ?? samples[0];
  const p1 = samples[i];
  const p2 = samples[i + 1];
  const p3 = samples[i + 2] ?? samples[n - 1];
  return catmullRom(p0, p1, p2, p3, u);
}

/** U = 0 (straight up), D = π. Bit 2 is link 1, bit 0 is link 3. */
export function defaultTheta(id: number): [number, number, number] {
  const bits = id - 1;
  const down = Math.PI;
  return [(bits & 4) !== 0 ? down : 0, (bits & 2) !== 0 ? down : 0, (bits & 1) !== 0 ? down : 0];
}

export function stateTheta(data: LunarData | null, id: number): [number, number, number] {
  const s = data?.states.find((st) => st.id === id);
  if (s && s.theta.length >= 3) return [s.theta[0], s.theta[1], s.theta[2]];
  return defaultTheta(id);
}

export function stateLengths(data: LunarData | null): [number, number, number] {
  const l = data?.meta.l;
  if (l && l.length >= 3 && l.every((n) => typeof n === "number" && n > 0)) {
    return [l[0], l[1], l[2]];
  }
  return DEFAULT_L;
}

export function nextGray(id: number): number {
  const i = GRAY_CYCLE.indexOf(id);
  if (i < 0) return GRAY_CYCLE[0];
  return GRAY_CYCLE[(i + 1) % GRAY_CYCLE.length];
}

export function rotate(v: { x: number; y: number }, angle: number): { x: number; y: number } {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

/**
 * Joints in screen pixels. θ is absolute from straight up, clockwise positive.
 * Screen y grows downward, so the up direction is −cos.
 */
export function jointPoints(
  theta: [number, number, number],
  lengths: [number, number, number]
): { x: number; y: number }[] {
  const pts = [{ x: PIVOT_X, y: PIVOT_Y }];
  let x = PIVOT_X;
  let y = PIVOT_Y;
  for (let i = 0; i < 3; i++) {
    const L = lengths[i] * PX_PER_M;
    x += Math.sin(theta[i]) * L;
    y += -Math.cos(theta[i]) * L;
    pts.push({ x, y });
  }
  return pts;
}

export type View = {
  x: number;
  theta: [number, number, number];
  u: number;
  moving: boolean;
  inTransition: boolean;
  t: number;
  duration: number;
  fromId: number;
  toId: number;
  stateId: number;
  lengths: [number, number, number];
};

export function formatReadout(v: View): string {
  const a = `a = ${v.u.toFixed(2)} m/s²`;
  const phase = v.moving ? "Moving (TVLQR)" : "Holding (LQR)";
  if (!v.inTransition) {
    return `${stateLabel(v.stateId)} · ${a} · ${phase}`;
  }
  return `${stateLabel(v.fromId)} → ${stateLabel(v.toId)} · ${v.t.toFixed(1)}s / ${v.duration.toFixed(1)}s · ${a} · ${phase}`;
}
