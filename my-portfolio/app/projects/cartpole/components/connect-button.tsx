'use client';

import { useDrakeSimulation } from '../drake-simulation-context';

export default function ConnectButton() {
  const { connected, connect, disconnect } = useDrakeSimulation();

  return (
    <button
      onClick={connected ? disconnect : connect}
      className={`px-4 py-2 rounded text-[var(--text-primary)] font-medium transition-colors ${
        connected ? 'bg-[var(--color-accent-red)] hover:opacity-90' : 'bg-[var(--color-accent-green)] hover:opacity-90'
      }`}
    >
      {connected ? 'Disconnect' : 'Connect'}
    </button>
  );
}
