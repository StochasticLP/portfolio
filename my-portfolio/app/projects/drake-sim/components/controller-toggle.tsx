'use client';

import { useDrakeSimulation } from '../drake-simulation-context';

interface ControllerToggleProps {
  type: string;
  label: string;
}

export default function ControllerToggle({ type, label }: ControllerToggleProps) {
  const { connected, activeControllers, toggleController } = useDrakeSimulation();

  if (!connected) return null;

  const isActive = activeControllers.includes(type);

  return (
    <button
      onClick={() => toggleController(type)}
      className={`px-3 py-1 rounded border transition-colors ${
        isActive
          ? 'bg-[var(--color-accent-green)] text-[var(--bg-primary)] border-[var(--color-accent-green)] font-medium'
          : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]'
      }`}
    >
      {label}
    </button>
  );
}
