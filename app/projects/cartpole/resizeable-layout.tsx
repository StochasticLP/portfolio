"use client";

import { useState, useRef, useEffect, ReactNode } from "react";

interface ResizableLayoutProps {
  left: ReactNode;
  right: ReactNode;
}

export default function ResizableLayout({ left, right }: ResizableLayoutProps) {
  const [leftWidth, setLeftWidth] = useState(50); // percentage
  const [isDragging, setIsDragging] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
    // Set initial viewport height minus header and navbar (106px)
    const updateHeight = () => {
      setViewportHeight(window.innerHeight - 106); 
    };
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    
    // Constrain between 20% and 80%
    setLeftWidth(Math.min(Math.max(newLeftWidth, 20), 80));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging]);

  return (
    <div className="flex flex-col">
      <div ref={containerRef} className="flex-1 flex relative">
        {/* Left Panel - Content */}
        <div
          className="overflow-y-auto overflow-x-hidden"
          style={{ width: `${leftWidth}%`, height: `${viewportHeight}px` }}
        >
          <div className="px-8 py-4">
            {left}
          </div>
        </div>

        {/* Divider */}
        <div
          className="w-1 bg-[var(--border-color)] cursor-col-resize hover:bg-[var(--color-accent-yellow)] transition-colors relative z-10"
          onMouseDown={handleMouseDown}
        >
        </div>

        {/* Right Panel - Simulation */}
        <div
          className="overflow-hidden p-4"
          style={{ width: `${100 - leftWidth}%`, height: `${viewportHeight}px` }}
        >
          {right}
        </div>
      </div>
    </div>
  );
}
