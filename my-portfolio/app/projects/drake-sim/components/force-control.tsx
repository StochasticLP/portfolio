'use client';

import { useDrakeSimulation } from '../drake-simulation-context';

export default function ForceControl() {
  const { connected, controller, setForce } = useDrakeSimulation();

  if (!connected) return null;

  return (
    <label className="block text-[var(--text-primary)]">
      <span className="mr-2">Manual Force:</span>
      <input
        type="range"
        min="-20"
        max="20"
        step="4"
        value={controller.force}
        onChange={(e) => setForce(parseFloat(e.target.value))}
        className="w-64 accent-[var(--color-accent-blue)]"
      />
      <span className="ml-2 w-12 inline-block text-right">{controller.force.toFixed(1)}</span>
    </label>
  );
}
