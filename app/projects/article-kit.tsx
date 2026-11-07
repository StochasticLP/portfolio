import Link from "next/link";
import type { ReactNode } from "react";

/** Shared layout pieces for the long project articles. Colors come from the site theme. */

export function ArticleShell({ children }: { children: ReactNode }) {
  return <article className="mx-auto mt-12 w-full px-4 md:w-3/5">{children}</article>;
}

export function H1({ children }: { children: ReactNode }) {
  return (
    <h1 className="mb-4 text-3xl font-medium tracking-tighter text-[var(--text-primary)]">
      {children}
    </h1>
  );
}

export function H2({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="mb-4 mt-14 scroll-mt-8 text-xl font-medium text-[var(--text-primary)]"
    >
      {children}
    </h2>
  );
}

export function H3({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-2 mt-8 text-base font-medium text-[var(--text-primary)]">{children}</h3>
  );
}

export function P({ children }: { children: ReactNode }) {
  return (
    <p className="mb-4 text-sm leading-relaxed text-[var(--text-secondary)]">{children}</p>
  );
}

export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="mb-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--text-secondary)]">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-[var(--bg-secondary)] px-1 py-0.5 font-mono text-xs text-[var(--text-primary)]">
      {children}
    </code>
  );
}

export function LinkRow({
  links,
}: {
  links: { label: string; href: string; note?: string; primary?: boolean }[];
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      {links.map((link) => {
        const style = link.primary
          ? "border-transparent bg-[var(--text-primary)] text-[var(--bg-primary)]"
          : "border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)]";
        return (
          <Link
            key={link.label}
            href={link.href}
            className={`rounded-md border px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80 ${style}`}
          >
            {link.label}
            {link.note && <span className="ml-2 text-xs font-normal opacity-70">{link.note}</span>}
          </Link>
        );
      })}
    </div>
  );
}

export function Figure({
  number,
  caption,
  children,
}: {
  number: number;
  caption: ReactNode;
  children: ReactNode;
}) {
  return (
    <figure className="my-8">
      <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
        {children}
      </div>
      <figcaption className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
        <span className="font-medium text-[var(--text-primary)]">Figure {number}.</span> {caption}
      </figcaption>
    </figure>
  );
}

/** A labelled box inside a diagram. */
export function Box({
  title,
  detail,
  accent,
  children,
}: {
  title: string;
  detail?: ReactNode;
  accent?: "red" | "green" | "blue" | "yellow";
  children?: ReactNode;
}) {
  return (
    <div
      className="rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] p-3"
      style={accent ? { borderTop: `3px solid var(--color-accent-${accent})` } : undefined}
    >
      <div className="text-sm font-medium text-[var(--text-primary)]">{title}</div>
      {detail && (
        <div className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">{detail}</div>
      )}
      {children}
    </div>
  );
}

export function Chips({ items }: { items: string[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {items.map((item) => (
        <span
          key={item}
          className="rounded bg-[var(--bg-secondary)] px-1.5 py-0.5 text-[11px] text-[var(--text-primary)]"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

/** A connector between two diagram rows. It carries a label so that the flow does not need color. */
export function Flow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-2 py-2 text-center text-[11px] leading-snug text-[var(--text-secondary)]">
      <span aria-hidden="true" className="text-sm">
        ↕
      </span>
      <span>{children}</span>
    </div>
  );
}

export function Stats({ items }: { items: { value: string; label: string }[] }) {
  return (
    <dl className="my-8 grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3"
        >
          <dd className="text-xl font-medium tracking-tight text-[var(--text-primary)]">
            {item.value}
          </dd>
          <dt className="mt-1 text-xs leading-snug text-[var(--text-secondary)]">{item.label}</dt>
        </div>
      ))}
    </dl>
  );
}

export function DataTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="my-6 overflow-x-auto rounded-lg border border-[var(--border-color)]">
      <table
        className="w-full min-w-[32rem] border-collapse text-left text-xs"
        style={{ display: "table", maxWidth: "none", whiteSpace: "normal" }}
      >
        <thead className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-3 py-2 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-[var(--text-secondary)]">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-[var(--border-color)] align-top">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2 leading-relaxed">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <aside className="my-6 border-l-2 border-[var(--color-accent-yellow)] pl-4 text-sm leading-relaxed text-[var(--text-secondary)]">
      {children}
    </aside>
  );
}
