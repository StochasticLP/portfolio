'use client';

import { useDrakeSimulation } from '../drake-simulation-context';

export default function StatusDisplay() {
  const { status } = useDrakeSimulation();

  return (
    <div className={`text-sm font-medium ${status.color}`}>
      {status.message}
    </div>
  );
}
