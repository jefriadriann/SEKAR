"use client";

/**
 * ShineBorder — diadaptasi dari Magic UI (MIT, tersedia di 21st.dev).
 * Bingkai bergradasi lembut. Dibuat statis (tanpa animasi background-position)
 * agar tidak memicu repaint setiap frame.
 */
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export function ShineBorder({ borderWidth = 1.5, shineColor = ["#449efe", "#22c3a6", "#a98ce8"], className }: { borderWidth?: number; duration?: number; shineColor?: string | string[]; className?: string }) {
  return (
    <div
      aria-hidden
      style={
        {
          "--border-width": `${borderWidth}px`,
          backgroundImage: `radial-gradient(transparent,transparent, ${Array.isArray(shineColor) ? shineColor.join(",") : shineColor},transparent,transparent)`,
          backgroundSize: "200% 200%",
          backgroundPosition: "30% 20%",
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          padding: "var(--border-width)",
        } as CSSProperties
      }
      className={cn("pointer-events-none absolute inset-0 size-full rounded-[inherit]", className)}
    />
  );
}
