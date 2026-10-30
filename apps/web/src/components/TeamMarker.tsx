/**
 * TeamMarker — colour + symbol + pattern, physically placed above the board
 * with radial lighting and shadow (§44). Drop animation (§45): appears above
 * the cell, drops, compresses, settles with a ring pulse (~300ms).
 */

"use client";

import { motion, useReducedMotion } from "framer-motion";
import { markerLabel, teamVisual } from "@/lib/team-visuals";

export interface TeamMarkerProps {
  teamId: string;
  teamName: string;
  isNew?: boolean;
  animationSpeed?: number;
  compact?: boolean;
}

export function TeamMarker({
  teamId,
  teamName,
  isNew = false,
  animationSpeed = 1,
  compact = false,
}: TeamMarkerProps) {
  const visual = teamVisual(teamId);
  const reduced = useReducedMotion();

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      initial={
        isNew && !reduced
          ? { y: "-58%", scale: 0.55, rotateX: 35, opacity: 0 }
          : false
      }
      animate={{ y: 0, scale: 1, rotateX: 0, opacity: 1 }}
      transition={
        reduced
          ? { duration: 0.01 }
          : {
              type: "spring",
              stiffness: 480,
              damping: 22,
              mass: 0.7,
              duration: 0.36 / (animationSpeed || 1),
            }
      }
      role="img"
      aria-label={markerLabel(teamId, teamName)}
      style={{ transformStyle: "preserve-3d" }}
    >
      <span className="marker-shadow" aria-hidden />
      <div
        className={`team-marker ${visual.markerClass}`}
        style={{
          width: compact ? "58%" : "64%",
          height: compact ? "58%" : "64%",
        }}
      />
      {isNew && !reduced && (
        <>
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: `2px solid ${visual.ringColor}` }}
            initial={{ scale: 0.55, opacity: 0.9 }}
            animate={{ scale: 1.55, opacity: 0 }}
            transition={{ duration: 0.55 / (animationSpeed || 1) }}
          />
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: `1px solid ${visual.ringColor}` }}
            initial={{ scale: 0.4, opacity: 0.7 }}
            animate={{ scale: 1.15, opacity: 0 }}
            transition={{
              duration: 0.4 / (animationSpeed || 1),
              delay: 0.08,
            }}
          />
        </>
      )}
    </motion.div>
  );
}

/** Small inline marker for player panels and legends. */
export function TeamBadge({
  teamId,
  teamName,
  size = 18,
}: {
  teamId: string;
  teamName: string;
  size?: number;
}) {
  const visual = teamVisual(teamId);
  return (
    <span
      className={`team-marker ${visual.markerClass} inline-block shrink-0`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={markerLabel(teamId, teamName)}
    />
  );
}
