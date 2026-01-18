'use client';

import { useDrakeSimulation } from '../drake-simulation-context';

export default function ResetButton() {
  const { connected, reset } = useDrakeSimulation();

  if (!connected) return null;

  return (
    <button
      onClick={reset}
      className="px-4 py-2 rounded bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)] transition-colors"
    >
      Reset Simulation
    </button>
  );
}
