"use client";

import { useEffect, useRef, type RefObject } from "react";
import { CANVAS_H, CANVAS_W } from "./constants";
import { formatReadout } from "./kinematics";
import { applyCommand, attachData, createMachine, step, viewOf } from "./machine";
import { LunarScene } from "./scene";
import { isLunarData, type Bridge, type Command, type LunarData } from "./types";

type Props = {
  bridge: Bridge;
  readoutRef: RefObject<HTMLParagraphElement | null>;
  onData: (ok: boolean) => void;
};

export default function LunarPendulumCanvas({ bridge, readoutRef, onData }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onDataRef = useRef(onData);
  onDataRef.current = onData;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let alive = true;
    let raf = 0;
    let data: LunarData | null = null;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const machine = createMachine(reduced);
    const scene = new LunarScene(canvas);
    const cmds: Command[] = [];

    bridge.handler = (cmd) => {
      cmds.push(cmd);
    };

    scene.apply(viewOf(machine, null));

    const ac = new AbortController();
    fetch("/data/lunar-pendulum.json", { signal: ac.signal })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((json) => {
        if (!alive) return;
        if (!isLunarData(json)) throw new Error("bad data");
        data = json;
        attachData(machine, json);
        onDataRef.current(true);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        if (err && typeof err === "object" && (err as { name?: string }).name === "AbortError") return;
        onDataRef.current(false);
      });

    let last = performance.now();

    const loop = (now: number) => {
      if (!alive) return;
      if (document.hidden) {
        raf = 0;
        return;
      }
      let dt = (now - last) / 1000;
      last = now;
      if (!Number.isFinite(dt) || dt < 0) dt = 0;
      if (dt > 0.05) dt = 0.05;

      while (cmds.length) {
        const cmd = cmds.shift();
        if (cmd) applyCommand(machine, data, cmd);
      }
      step(machine, data, dt);
      const view = viewOf(machine, data);
      scene.apply(view);
      scene.draw();

      const el = readoutRef.current;
      if (el) {
        const text = formatReadout(view);
        if (el.textContent !== text) el.textContent = text;
      }
      raf = requestAnimationFrame(loop);
    };

    const onVis = () => {
      if (!alive) return;
      if (document.hidden) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        return;
      }
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };

    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(loop);

    return () => {
      alive = false;
      ac.abort();
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      if (bridge.handler) bridge.handler = null;
      scene.destroy();
    };
  }, [bridge, readoutRef]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      className="block"
      aria-hidden
    />
  );
}
