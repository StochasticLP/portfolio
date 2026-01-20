'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import ResizableLayout from './resizeable-layout';
import DrakeSimulationProvider from './drake-simulation-provider';
import MeshcatIframe from './components/meshcat-iframe';
import ConnectButton from './components/connect-button';
import ResetButton from './components/reset-button';
import ControllerToggle from './components/controller-toggle';
import ForceControl from './components/force-control';
import StatusDisplay from './components/status-display';
import TutorialNavigation from './components/tutorial-navigation';

interface DrakeSimLayoutProps {
  children: ReactNode;
  initialControllers?: string[];
}

export default function DrakeSimLayout({ children, initialControllers }: DrakeSimLayoutProps) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState<number>(600);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Determine available controllers based on path
  const isIntro = pathname === '/projects/cartpole';
  const isPID = pathname === '/projects/cartpole/pid';
  const isLQR = pathname === '/projects/cartpole/lqr';
  const isRL = pathname === '/projects/cartpole/fvi';
  const isTrajOpt = pathname === '/projects/cartpole/traj-opt';

  const leftPanel = (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto px-8 py-4">
        <article className="prose prose-neutral dark:prose-invert max-w-none">
          {children}
        </article>
      </div>
    </div>
  );

  const rightPanel = (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Simulation Control</h2>
        <StatusDisplay />
      </div>

      {/* Dev Controls - To be removed later */}
      <div className="flex flex-wrap gap-2">
        <ConnectButton />
        <ResetButton />
      </div>

      <div ref={containerRef} className="flex-1 min-h-0 border border-[var(--border-color)] rounded overflow-hidden bg-[var(--bg-primary)] relative">
        <MeshcatIframe height={containerHeight} />
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {isPID && <ControllerToggle type="pid" label="PID Controller" />}

        {isLQR && <ControllerToggle type="lqr" label="LQR Controller" />}

        {isRL && <ControllerToggle type="fvi" label="RL Controller" />}

        {isTrajOpt && <ControllerToggle type="traj-opt" label="Traj-Opt Controller" />}
      
        {isIntro && <ForceControl />}
      </div>
      


      <div className="text-xs text-[var(--text-secondary)] text-center">
        {isIntro && <p>Use Arrow Keys to apply force when Manual controller is active.</p>}
      </div>
    </div>
  );

  return (
    <DrakeSimulationProvider initialControllers={initialControllers}>
      <ResizableLayout
        left={leftPanel}
        right={rightPanel}
      />
      <TutorialNavigation />
    </DrakeSimulationProvider>
  );
}
