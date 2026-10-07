"use client";

/**
 * SpotlightCard — terinspirasi MagicCard (Magic UI, MIT, tersedia di 21st.dev):
 * sorotan gradien mengikuti kursor di atas kartu.
 */
import { motion, useMotionTemplate, useMotionValue } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SpotlightCard({ children, className, color = "rgba(68,158,254,0.12)", size = 320 }: { children: ReactNode; className?: string; color?: string; size?: number }) {
  const x = useMotionValue(-size);
  const y = useMotionValue(-size);
  return (
    <div
      className={cn("group/spot relative", className)}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - r.left);
        y.set(e.clientY - r.top);
      }}
      onPointerLeave={() => {
        x.set(-size);
        y.set(-size);
      }}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
        style={{ background: useMotionTemplate`radial-gradient(${size}px circle at ${x}px ${y}px, ${color}, transparent 70%)` }}
      />
      {children}
    </div>
  );
}
