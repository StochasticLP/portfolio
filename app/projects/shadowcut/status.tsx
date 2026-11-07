"use client";

import { useEffect, useState } from "react";

const SHADOWCUT_URL = "https://shadowcut.lukedphillips.com";
const HEALTH_URL = `${SHADOWCUT_URL}/health`;

type ServerState = "checking" | "online" | "offline";

const linkClassName =
  "inline-flex items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--text-primary)] px-4 py-2 text-sm font-medium text-[var(--bg-primary)] transition-opacity hover:opacity-80";

const disabledClassName =
  "inline-flex cursor-not-allowed items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] opacity-60";

export function ShadowCutStatus() {
  const [serverState, setServerState] = useState<ServerState>("checking");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    let ignore = false;

    fetch(HEALTH_URL, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          return { ok: false as const };
        }
        const data: { ok?: unknown; busy?: unknown } = await response.json();
        return data;
      })
      .then((data) => {
        if (ignore) {
          return;
        }
        if (data?.ok === true) {
          setBusy(data.busy === true);
          setServerState("online");
          return;
        }
        setServerState("offline");
      })
      .catch(() => {
        if (!ignore) {
          setServerState("offline");
        }
      })
      .finally(() => {
        clearTimeout(timeout);
      });

    return () => {
      ignore = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  const statusText =
    serverState === "checking"
      ? "Checking the server."
      : serverState === "online"
        ? busy
          ? "Live, and busy with a photo."
          : "Live"
        : "Offline right now. The PC that runs it is off.";

  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-sm text-[var(--text-secondary)]">{statusText}</p>
      {serverState === "offline" ? (
        <button type="button" disabled className={disabledClassName}>
          Open ShadowCut
        </button>
      ) : (
        <a href={SHADOWCUT_URL} className={linkClassName}>
          Open ShadowCut
        </a>
      )}
    </div>
  );
}
