'use client';

import { useDrakeSimulation } from '../drake-simulation-context';

interface MeshcatIframeProps {
  width?: number | string;
  height?: number | string;
}

export default function MeshcatIframe({ width = '100%', height = '600px' }: MeshcatIframeProps) {
  const { meshcatUrl } = useDrakeSimulation();

  if (!meshcatUrl) {
    return (
      <div 
        className="flex items-center justify-center bg-[var(--bg-primary)] rounded border-2 border-dashed border-[var(--border-color)] text-[var(--text-secondary)]"
        style={{ width, height }}
      >
        Waiting for simulation to start...
      </div>
    );
  }

  return (
    <iframe
      src={meshcatUrl}
      width={width}
      height={height}
      style={{ border: 'none' }}
      className="rounded shadow-sm bg-[var(--bg-primary)] block"
    />
  );
}
