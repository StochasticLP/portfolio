"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import MeshcatViewer from "./meshcat-viewer";

interface LayoutProps {
  pages: ReactNode[];
}

export default function ResizableLayout({ pages }: LayoutProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [leftWidth, setLeftWidth] = useState(50); // percentage
  const [isDragging, setIsDragging] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
    // Set initial viewport height minus footer
    const updateHeight = () => {
      setViewportHeight(window.innerHeight - 64 -64 - 61); // 64px for footer (h-16) 61px for header
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

  const nextPage = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="flex flex-col">
      <div ref={containerRef} className="flex-1 flex relative">
        {/* Left Panel - Content */}
        <div
          className="overflow-y-auto overflow-x-hidden"
          style={{ width: `${leftWidth}%`, height: `${viewportHeight + 56}px` }}
        >
          <div className="px-8 py-2">
            {pages[currentPage]}
          </div>
        </div>

        {/* Divider */}
        <div
          className="w-1 bg-gray-300 cursor-col-resize hover:bg-blue-500 transition-colors relative"
          onMouseDown={handleMouseDown}
        >
        </div>

        {/* Right Panel - Simulation (persistent) */}
        <div
          className="overflow-hidden p-8 "
          style={{ width: `${100 - leftWidth}%`}}
        >
          <MeshcatViewer width="100%" height={viewportHeight} />
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="h-16 flex items-center justify-between px-8">
        {/* Previous Button */}
        <button
          onClick={prevPage}
          disabled={currentPage === 0}
          className="text-white disabled:text-gray-500 disabled:cursor-not-allowed hover:text-blue-400 transition-colors"
        >
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        {/* Page Indicators */}
        <div className="flex gap-3">
          {pages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentPage(index)}
              className="focus:outline-none"
            >
              <div
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentPage
                    ? "bg-yellow-400"
                    : "bg-white hover:bg-gray-300"
                }`}
              />
            </button>
          ))}
        </div>

        {/* Next Button */}
        <button
          onClick={nextPage}
          disabled={currentPage === pages.length - 1}
          className="text-white disabled:text-gray-500 disabled:cursor-not-allowed hover:text-blue-400 transition-colors"
        >
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
