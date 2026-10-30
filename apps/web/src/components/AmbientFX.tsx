"use client";

/**
 * AmbientFX — the global living backdrop.
 *
 * Aurora fields, a perspective table grid and a pointer-tracked spotlight give
 * every screen depth without adding DOM weight inside the game surface. The
 * pointer position is written straight to CSS variables inside a single
 * animation frame, so moving the mouse never triggers a React render.
 */

import { useEffect } from "react";

export function AmbientFX() {
  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;

    const onPointerMove = (event: PointerEvent) => {
      if (frame !== 0) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        root.style.setProperty(
          "--pointer-x",
          `${Math.round((event.clientX / window.innerWidth) * 100)}%`,
        );
        root.style.setProperty(
          "--pointer-y",
          `${Math.round((event.clientY / window.innerHeight) * 100)}%`,
        );
      });
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="ambient-fx" aria-hidden>
      <div className="ambient-aurora ambient-aurora-a" />
      <div className="ambient-aurora ambient-aurora-b" />
      <div className="ambient-aurora ambient-aurora-c" />
      <div className="ambient-grid" />
      <div className="ambient-spotlight" />
      <div className="ambient-vignette" />
      <div className="ambient-grain" />
    </div>
  );
}
