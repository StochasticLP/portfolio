"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CANVAS_H, CANVAS_W } from "./constants";
import { stateLabel, createBridge, type Bridge } from "./types";

const LunarPendulumCanvas = dynamic(() => import("./LunarPendulumCanvas"), { ssr: false });

const IDS = [1, 2, 3, 4, 5, 6, 7, 8];

function Chip({
  id,
  selected,
  onSelect,
  group,
}: {
  id: number;
  selected: boolean;
  onSelect: (id: number) => void;
  group: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${group} state ${stateLabel(id)}`}
      onClick={() => onSelect(id)}
      className={`px-2 py-1 rounded-md text-sm border whitespace-nowrap ${
        selected
          ? "bg-[var(--text-primary)] text-[var(--bg-primary)] border-transparent"
          : "bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)]"
      }`}
    >
      {stateLabel(id)}
    </button>
  );
}

export default function LunarPendulumHero({ children }: { children: ReactNode }) {
  const bridgeRef = useRef<Bridge>(createBridge());
  const readoutRef = useRef<HTMLParagraphElement | null>(null);
  const [fromId, setFromId] = useState(1);
  const [toId, setToId] = useState(2);
  const [cycling, setCycling] = useState(true);
  const [dataOk, setDataOk] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCycling(false);
    }
  }, []);

  const play = () => {
    setCycling(false);
    bridgeRef.current.push({ type: "play", from: fromId, to: toId });
  };

  const toggleCycle = () => {
    const next = !cycling;
    setCycling(next);
    bridgeRef.current.push({ type: "cycle", on: next });
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 relative min-w-0" style={{ overflow: "visible" }}>
      <div className="md:w-1/2 w-full relative z-10 min-w-0">
        <div className="prose prose-neutral dark:prose-invert max-w-none">{children}</div>
        {dataOk ? (
          <div className="mt-4 pointer-events-auto max-w-full">
            <div className="text-sm text-[var(--text-secondary)] mb-1">From</div>
            <div className="flex flex-wrap gap-1.5">
              {IDS.map((id) => (
                <Chip key={id} id={id} group="From" selected={fromId === id} onSelect={setFromId} />
              ))}
            </div>
            <div className="text-sm text-[var(--text-secondary)] mt-3 mb-1">To</div>
            <div className="flex flex-wrap gap-1.5">
              {IDS.map((id) => (
                <Chip key={id} id={id} group="To" selected={toId === id} onSelect={setToId} />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={play}
                className="px-3 py-1.5 rounded-md text-sm font-medium bg-[var(--text-primary)] text-[var(--bg-primary)]"
              >
                Play
              </button>
              <button
                type="button"
                aria-pressed={cycling}
                onClick={toggleCycle}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
                  cycling
                    ? "bg-[#f9cc6c] text-[#1f2937] border-transparent"
                    : "bg-transparent text-[var(--text-primary)] border-[var(--border-color)]"
                }`}
              >
                Cycle
              </button>
            </div>
            <p
              ref={readoutRef}
              className="mt-2 text-sm text-[var(--text-secondary)] min-h-[1.25rem] break-words"
            >
              1 ↑↑↑ · a = 0.00 m/s² · Holding (LQR)
            </p>
          </div>
        ) : null}
      </div>
      <div className="md:w-1/2 w-full relative min-h-[520px] md:min-h-[560px] min-w-0">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 md:-translate-y-9/20"
          style={{
            zIndex: 0,
            width: CANVAS_W,
            height: CANVAS_H,
            pointerEvents: "none",
            overflow: "visible",
          }}
        >
          <LunarPendulumCanvas
            bridge={bridgeRef.current}
            readoutRef={readoutRef}
            onData={setDataOk}
          />
        </div>
      </div>
    </div>
  );
}
