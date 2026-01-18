import React from "react";

// Predefined star data to replace Math.random()
const STAR_COUNT = 120;
const stars = Array.from({ length: STAR_COUNT }, (_, i) => {
  // Deterministic values based on index
  const seed = i * 12345.6789; // Arbitrary constant for variation
  const top = (Math.sin(seed) * 10000 + 10000) % 100; // 0 to 100
  const left = (Math.cos(seed) * 10000 + 10000) % 100; // 0 to 100
  const size = (Math.sin(seed * 2) * 10000 + 10000) % 2 + 1; // 1 to 3
  const opacity = (Math.sin(seed * 3) * 10000 + 10000) % 0.4 + 0.2; // 0.2 to 0.6

  return {
    id: i,
    top,
    left,
    size,
    opacity,
  };
});

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
            WebkitBackdropFilter: "blur(0.5px)",
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