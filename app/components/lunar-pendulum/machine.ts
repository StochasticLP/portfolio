import { HOLD_S } from "./constants";
import { defaultTheta, nextGray, sampleSeries, stateLengths, stateTheta, type View } from "./kinematics";
import type { Command, LunarData, Transition } from "./types";

export type Queue =
  | { kind: "play"; from: number; to: number }
  | { kind: "leg"; from: number; to: number };

export type Machine = {
  hasData: boolean;
  cycling: boolean;
  mode: "rest" | "play";
  restState: number;
  fromId: number;
  toId: number;
  elapsed: number;
  queue: Queue | null;
  heldX: number;
  heldTheta: [number, number, number];
  /** Pose gap at the start of a leg. It fades out so that recordings join without a snap. */
  gapX: number;
  gapTheta: [number, number, number];
};

const BLEND_S = 0.8;

function wrapPi(a: number): number {
  return a - 2 * Math.PI * Math.round(a / (2 * Math.PI));
}

export function createMachine(reducedMotion: boolean): Machine {
  return {
    hasData: false,
    cycling: !reducedMotion,
    mode: "rest",
    restState: 1,
    fromId: 1,
    toId: 1,
    elapsed: 0,
    queue: null,
    heldX: 0,
    heldTheta: defaultTheta(1),
    gapX: 0,
    gapTheta: [0, 0, 0],
  };
}

export function attachData(m: Machine, data: LunarData): void {
  m.hasData = true;
  m.heldTheta = stateTheta(data, m.restState);
  m.heldX = 0;
}

function clip(data: LunarData, from: number, to: number): Transition | null {
  const tr = data.transitions[`${from}-${to}`];
  return tr ?? null;
}

function beginLeg(m: Machine, data: LunarData, from: number, to: number): boolean {
  const tr = clip(data, from, to);
  if (!tr) return false;
  m.gapX = m.heldX - tr.x[0];
  m.gapTheta = [
    wrapPi(m.heldTheta[0] - tr.th1[0]),
    wrapPi(m.heldTheta[1] - tr.th2[0]),
    wrapPi(m.heldTheta[2] - tr.th3[0]),
  ];
  m.mode = "play";
  m.fromId = from;
  m.toId = to;
  m.elapsed = 0;
  return true;
}

function holdAt(m: Machine, data: LunarData, tr: Transition): void {
  const fps = data.meta.fps;
  const t = tr.duration;
  m.heldX = sampleSeries(tr.x, t, fps);
  m.heldTheta = [
    sampleSeries(tr.th1, t, fps),
    sampleSeries(tr.th2, t, fps),
    sampleSeries(tr.th3, t, fps),
  ];
  m.restState = tr.to;
  m.mode = "rest";
  m.elapsed = 0;
}

/** Start From → To from a settled pose. A different current state plays current → From first. */
export function startPlay(m: Machine, data: LunarData, from: number, to: number): void {
  m.cycling = false;
  if (m.restState !== from) {
    const ok = beginLeg(m, data, m.restState, from);
    if (ok && from !== to) m.queue = { kind: "leg", from, to };
    return;
  }
  if (from !== to) beginLeg(m, data, from, to);
}

export function applyCommand(m: Machine, data: LunarData | null, cmd: Command): void {
  if (!m.hasData || !data) return;
  if (cmd.type === "cycle") {
    m.cycling = cmd.on;
    if (cmd.on) {
      m.queue = null;
      if (m.mode === "rest") m.elapsed = 0;
    }
    return;
  }
  m.cycling = false;
  if (m.mode === "play") {
    m.queue = { kind: "play", from: cmd.from, to: cmd.to };
    return;
  }
  startPlay(m, data, cmd.from, cmd.to);
}

function finish(m: Machine, data: LunarData, tr: Transition): void {
  holdAt(m, data, tr);
  const q = m.queue;
  m.queue = null;
  if (!q) return;
  if (q.kind === "leg") {
    beginLeg(m, data, q.from, q.to);
    return;
  }
  startPlay(m, data, q.from, q.to);
}

export function step(m: Machine, data: LunarData | null, dt: number): void {
  if (!m.hasData || !data) return;
  if (m.mode === "play") {
    const tr = clip(data, m.fromId, m.toId);
    if (!tr) {
      m.mode = "rest";
      m.elapsed = 0;
      return;
    }
    m.elapsed += dt;
    if (m.elapsed >= tr.duration) finish(m, data, tr);
    return;
  }
  m.elapsed += dt;
  if (m.cycling && m.elapsed >= HOLD_S) {
    beginLeg(m, data, m.restState, nextGray(m.restState));
  }
}

export function viewOf(m: Machine, data: LunarData | null): View {
  const lengths = stateLengths(data);
  if (m.mode === "play" && data) {
    const tr = clip(data, m.fromId, m.toId);
    if (tr) {
      const t = Math.min(Math.max(m.elapsed, 0), tr.duration);
      const fps = data.meta.fps;
      const r = Math.max(0, 1 - t / BLEND_S);
      const w = r * r * (3 - 2 * r);
      return {
        x: sampleSeries(tr.x, t, fps) + m.gapX * w,
        theta: [
          sampleSeries(tr.th1, t, fps) + m.gapTheta[0] * w,
          sampleSeries(tr.th2, t, fps) + m.gapTheta[1] * w,
          sampleSeries(tr.th3, t, fps) + m.gapTheta[2] * w,
        ],
        u: sampleSeries(tr.u, t, fps),
        moving: t < tr.T,
        inTransition: true,
        t,
        duration: tr.duration,
        fromId: m.fromId,
        toId: m.toId,
        stateId: m.restState,
        lengths,
      };
    }
  }
  return {
    x: m.heldX,
    theta: [m.heldTheta[0], m.heldTheta[1], m.heldTheta[2]],
    u: 0,
    moving: false,
    inTransition: false,
    t: 0,
    duration: 0,
    fromId: m.restState,
    toId: m.restState,
    stateId: m.restState,
    lengths,
  };
}
