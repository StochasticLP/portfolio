'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';

const STEPS = [
  { path: '/projects/drake-sim', label: 'Intro' },
  { path: '/projects/drake-sim/pid', label: 'PID' },
  { path: '/projects/drake-sim/lqr', label: 'LQR' },
  { path: '/projects/drake-sim/fvi', label: 'RL' },
  { path: '/projects/drake-sim/traj-opt', label: 'Traj-Opt' },
];

export default function TutorialNavigation() {
  const pathname = usePathname();
  const currentIndex = STEPS.findIndex((step) => step.path === pathname);
  
  // Handle case where pathname might have trailing slash or query params, though exact match is safer for now
  // If not found (e.g. 404), default to -1
  
  const prevStep = currentIndex > 0 ? STEPS[currentIndex - 1] : null;
  const nextStep = currentIndex < STEPS.length - 1 && currentIndex !== -1 ? STEPS[currentIndex + 1] : null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-color)]">
      {/* Left Chevron */}
      <div className="w-8">
        {prevStep ? (
          <Link href={prevStep.path} className="text-[var(--text-secondary)] hover:text-[var(--color-accent-yellow)] transition-colors">
            <FaChevronLeft size={20} />
          </Link>
        ) : (
          <span className="text-[var(--bg-tertiary)] cursor-not-allowed">
            <FaChevronLeft size={20} />
          </span>
        )}
      </div>

      {/* Dots Indicator */}
      <div className="flex space-x-2">
        {STEPS.map((step, index) => (
          <Link key={step.path} href={step.path}>
             <div
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentIndex
                  ? 'bg-[var(--color-accent-yellow)]'
                  : 'bg-[var(--text-secondary)] hover:bg-[var(--text-primary)]'
              }`}
              title={step.label}
            />
          </Link>
        ))}
      </div>

      {/* Right Chevron */}
      <div className="w-8 flex justify-end">
        {nextStep ? (
          <Link href={nextStep.path} className="text-[var(--text-secondary)] hover:text-[var(--color-accent-yellow)] transition-colors">
            <FaChevronRight size={20} />
          </Link>
        ) : (
          <span className="text-[var(--bg-tertiary)] cursor-not-allowed">
            <FaChevronRight size={20} />
          </span>
        )}
      </div>
    </div>
  );
}
