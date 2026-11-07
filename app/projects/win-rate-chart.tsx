"use client";

import { useEffect, useRef, useState } from "react";

export interface WinRatePoint {
  x: number;
  /** Win rate in percent. */
  y: number;
  /** Wilson 95 % interval in percent. */
  lo?: number;
  hi?: number;
}

export interface WinRateSeries {
  name: string;
  color: string;
  points: WinRatePoint[];
  /** Draws the Wilson interval as a band. */
  band?: boolean;
  dashed?: boolean;
}

interface Props {
  series: WinRateSeries[];
  xLabel: string;
  title: string;
  /** Horizontal reference line in percent, with a label. */
  reference?: { y: number; label: string };
  yMax?: number;
  /** Vertical marker lines, with labels. */
  markers?: { x: number; label: string }[];
}

const M = { top: 16, right: 16, bottom: 38, left: 42 };
const HEIGHT = 300;

export function WinRateChart({ series, xLabel, title, reference, yMax = 100, markers = [] }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hoverX, setHoverX] = useState<number | null>(null);

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const update = () => setWidth(Math.max(280, element.clientWidth));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const xs = Array.from(new Set(series.flatMap((s) => s.points.map((p) => p.x)))).sort(
    (a, b) => a - b,
  );
  const xMin = xs[0];
  const xMax = xs[xs.length - 1];
  const plotW = width - M.left - M.right;
  const plotH = HEIGHT - M.top - M.bottom;
  const px = (x: number) => M.left + ((x - xMin) / (xMax - xMin)) * plotW;
  const py = (y: number) => M.top + (1 - y / yMax) * plotH;

  const path = (points: WinRatePoint[]) =>
    points.map((p, i) => `${i ? "L" : "M"}${px(p.x).toFixed(1)},${py(p.y).toFixed(1)}`).join("");
  const band = (points: WinRatePoint[]) =>
    path(points.map((p) => ({ x: p.x, y: p.hi ?? p.y }))) +
    [...points]
      .reverse()
      .map((p) => `L${px(p.x).toFixed(1)},${py(p.lo ?? p.y).toFixed(1)}`)
      .join("") +
    "Z";

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * yMax));
  const xTickCount = width < 460 ? 4 : 6;
  const xTicks = Array.from({ length: xTickCount }, (_, i) =>
    Math.round(xMin + (i / (xTickCount - 1)) * (xMax - xMin)),
  );

  const nearest = (clientX: number, rect: DOMRect) => {
    const position = clientX - rect.left;
    let best = xs[0];
    for (const x of xs) if (Math.abs(px(x) - position) < Math.abs(px(best) - position)) best = x;
    return best;
  };

  const hoverRows =
    hoverX === null
      ? []
      : series.flatMap((s) => {
          const point = s.points.find((p) => p.x === hoverX);
          return point ? [{ series: s, point }] : [];
        });
  const tipLeft = hoverX !== null && px(hoverX) > width / 2;

  return (
    <div>
      <div className="mb-3 text-sm font-medium text-[var(--text-primary)]">{title}</div>
      {series.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-secondary)]">
          {series.map((s) => (
            <span key={s.name} className="flex items-center gap-1.5">
              <svg width="18" height="8" aria-hidden="true">
                <line
                  x1="0"
                  y1="4"
                  x2="18"
                  y2="4"
                  stroke={s.color}
                  strokeWidth="2"
                  strokeDasharray={s.dashed ? "5 3" : undefined}
                />
              </svg>
              {s.name}
            </span>
          ))}
        </div>
      )}
      <div ref={box} className="relative w-full">
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={title}
          className="block touch-none"
          onPointerMove={(event) =>
            setHoverX(nearest(event.clientX, event.currentTarget.getBoundingClientRect()))
          }
          onPointerLeave={() => setHoverX(null)}
        >
          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={M.left}
                x2={width - M.right}
                y1={py(tick)}
                y2={py(tick)}
                stroke="var(--text-secondary)"
                strokeOpacity="0.18"
              />
              <text
                x={M.left - 8}
                y={py(tick) + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--text-secondary)"
              >
                {tick}%
              </text>
            </g>
          ))}
          {xTicks.map((tick) => (
            <text
              key={tick}
              x={px(tick)}
              y={HEIGHT - M.bottom + 16}
              textAnchor="middle"
              fontSize="11"
              fill="var(--text-secondary)"
            >
              {tick}
            </text>
          ))}
          <text
            x={M.left + plotW / 2}
            y={HEIGHT - 4}
            textAnchor="middle"
            fontSize="11"
            fill="var(--text-secondary)"
          >
            {xLabel}
          </text>

          {markers.map((marker) => (
            <g key={marker.label}>
              <line
                x1={px(marker.x)}
                x2={px(marker.x)}
                y1={M.top}
                y2={HEIGHT - M.bottom}
                stroke="var(--text-secondary)"
                strokeOpacity="0.5"
                strokeDasharray="2 3"
              />
              <text x={px(marker.x) + 5} y={M.top + 10} fontSize="11" fill="var(--text-secondary)">
                {marker.label}
              </text>
            </g>
          ))}

          {reference && (
            <g>
              <line
                x1={M.left}
                x2={width - M.right}
                y1={py(reference.y)}
                y2={py(reference.y)}
                stroke="var(--text-primary)"
                strokeOpacity="0.6"
                strokeDasharray="6 4"
              />
              <text
                x={M.left + 4}
                y={py(reference.y) - 5}
                fontSize="11"
                fill="var(--text-primary)"
              >
                {reference.label}
              </text>
            </g>
          )}

          {series.map(
            (s) =>
              s.band && (
                <path key={`${s.name}-band`} d={band(s.points)} fill={s.color} fillOpacity="0.16" />
              ),
          )}
          {series.map((s) => (
            <path
              key={s.name}
              d={path(s.points)}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeDasharray={s.dashed ? "6 4" : undefined}
            />
          ))}

          {hoverX !== null && (
            <g>
              <line
                x1={px(hoverX)}
                x2={px(hoverX)}
                y1={M.top}
                y2={HEIGHT - M.bottom}
                stroke="var(--text-secondary)"
                strokeOpacity="0.6"
              />
              {hoverRows.map(({ series: s, point }) => (
                <circle
                  key={s.name}
                  cx={px(point.x)}
                  cy={py(point.y)}
                  r="4.5"
                  fill={s.color}
                  stroke="var(--bg-secondary)"
                  strokeWidth="2"
                />
              ))}
            </g>
          )}
        </svg>

        {hoverX !== null && hoverRows.length > 0 && (
          <div
            className="pointer-events-none absolute top-2 z-10 rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-xs shadow-md"
            style={tipLeft ? { right: width - px(hoverX) + 10 } : { left: px(hoverX) + 10 }}
          >
            <div className="mb-1 font-medium text-[var(--text-primary)]">
              {xLabel} {hoverX}
            </div>
            {hoverRows.map(({ series: s, point }) => (
              <div key={s.name} className="whitespace-nowrap text-[var(--text-secondary)]">
                <span
                  className="mr-1.5 inline-block h-2 w-2 rounded-full"
                  style={{ background: s.color }}
                />
                {s.name}:{" "}
                <span className="font-medium text-[var(--text-primary)]">{point.y.toFixed(1)}%</span>
                {point.lo !== undefined && (
                  <span>
                    {" "}
                    ({point.lo.toFixed(1)} to {point.hi?.toFixed(1)})
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <details className="mt-3 text-xs text-[var(--text-secondary)]">
        <summary className="cursor-pointer">Show the data as a table</summary>
        <div className="mt-2 max-h-60 overflow-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="pr-4 font-medium">{xLabel}</th>
                {series.map((s) => (
                  <th key={s.name} className="pr-4 font-medium">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {xs.map((x) => (
                <tr key={x}>
                  <td className="pr-4">{x}</td>
                  {series.map((s) => {
                    const point = s.points.find((p) => p.x === x);
                    return (
                      <td key={s.name} className="pr-4">
                        {point
                          ? `${point.y.toFixed(1)}%${
                              point.lo !== undefined
                                ? ` (${point.lo.toFixed(1)} to ${point.hi?.toFixed(1)})`
                                : ""
                            }`
                          : "-"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

/** Horizontal bars for a short ordered list, such as one result per training round. */
export function WinRateBars({
  title,
  rows,
  max = 50,
}: {
  title: string;
  rows: { label: string; value: number; detail?: string }[];
  max?: number;
}) {
  return (
    <div>
      <div className="mb-3 text-sm font-medium text-[var(--text-primary)]">{title}</div>
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="group grid grid-cols-[5.5rem_1fr] items-center gap-2 text-xs"
            title={row.detail}
          >
            <span className="text-[var(--text-secondary)]">{row.label}</span>
            <span className="flex items-center gap-2">
              <span
                className="h-4 rounded-r transition-opacity group-hover:opacity-80"
                style={{
                  width: `${(row.value / max) * 85}%`,
                  minWidth: 2,
                  background: "var(--chart-1)",
                }}
              />
              <span className="whitespace-nowrap font-medium text-[var(--text-primary)]">
                {row.value.toFixed(1)}%
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
