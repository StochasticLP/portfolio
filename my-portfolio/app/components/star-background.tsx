import React from "react";

const STAR_COUNT = 120;
const stars = Array.from({ length: STAR_COUNT }, (_, i) => ({
  id: i,
  top: Math.random() * 100,
  left: Math.random() * 100,
  size: Math.random() * 2 + 1,
  opacity: Math.random() * 0.4 + 0.2, // subtle
}));

export default function StarBackground() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 z-0 pointer-events-none select-none"
      style={{ overflow: "hidden" }}
    >
      {stars.map((star) => (
        <div
          key={star.id}
          style={{
            position: "absolute",
            top: `${star.top}%`,
            left: `${star.left}%`,
            width: star.size,
            height: star.size,
            borderRadius: "50%",
            background: "white",
            opacity: star.opacity,
            filter: "blur(0.5px)",
          }}
        />
      ))}
      {/* Optional: fade out stars in the center for text visibility */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
