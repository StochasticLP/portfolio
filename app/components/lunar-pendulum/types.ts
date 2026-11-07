export type PendulumState = {
  id: number;
  name: string;
  theta: number[];
};

export type Transition = {
  from: number;
  to: number;
  T: number;
  duration: number;
  via: number | null;
  x: number[];
  th1: number[];
  th2: number[];
  th3: number[];
  u: number[];
};

export type LunarData = {
  meta: {
    g: number;
    l: number[];
    m: number[];
    uMax: number;
    xMax: number;
    fps: number;
    method: string;
    holdSeconds: number;
  };
  states: PendulumState[];
  transitions: Record<string, Transition>;
};

export type Command =
  | { type: "play"; from: number; to: number }
  | { type: "cycle"; on: boolean };

export type Bridge = {
  handler: ((cmd: Command) => void) | null;
  push: (cmd: Command) => void;
};

export function createBridge(): Bridge {
  return {
    handler: null,
    push(cmd) {
      this.handler?.(cmd);
    },
  };
}

const NAMES = ["UUU", "UUD", "UDU", "UDD", "DUU", "DUD", "DDU", "DDD"];

export function stateName(id: number): string {
  return NAMES[id - 1] ?? "???";
}

export function stateArrows(id: number): string {
  return stateName(id).replace(/U/g, "↑").replace(/D/g, "↓");
}

export function stateLabel(id: number): string {
  return `${id} ${stateArrows(id)}`;
}

export function isLunarData(value: unknown): value is LunarData {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, any>;
  const meta = v.meta;
  if (!meta || typeof meta.fps !== "number" || !(meta.fps > 0)) return false;
  if (!Array.isArray(meta.l) || meta.l.length < 3) return false;
  if (!Array.isArray(v.states)) return false;
  for (let id = 1; id <= 8; id++) {
    const s = v.states.find((st: any) => st && st.id === id);
    if (!s || !Array.isArray(s.theta) || s.theta.length < 3) return false;
  }
  if (!v.transitions || typeof v.transitions !== "object") return false;
  for (let a = 1; a <= 8; a++) {
    for (let b = 1; b <= 8; b++) {
      if (a === b) continue;
      const tr = v.transitions[`${a}-${b}`];
      if (!tr || tr.from !== a || tr.to !== b) return false;
      if (typeof tr.T !== "number" || typeof tr.duration !== "number") return false;
      if (!Array.isArray(tr.x) || tr.x.length < 2) return false;
      const n = tr.x.length;
      if (
        !Array.isArray(tr.th1) ||
        !Array.isArray(tr.th2) ||
        !Array.isArray(tr.th3) ||
        !Array.isArray(tr.u) ||
        tr.th1.length !== n ||
        tr.th2.length !== n ||
        tr.th3.length !== n ||
        tr.u.length !== n
      ) {
        return false;
      }
    }
  }
  return true;
}
