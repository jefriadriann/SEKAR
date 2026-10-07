/**
 * BorderBeam — diadaptasi dari Magic UI (MIT, tersedia di 21st.dev).
 * Versi ringan: animasi CSS murni (tanpa JS per frame) yang hanya berjalan
 * saat kartu induk (.group) di-hover. Nonaktif bila prefers-reduced-motion.
 */
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

interface BorderBeamProps {
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
  className?: string;
  borderWidth?: number;
}

export function BorderBeam({ className, size = 80, delay = 0, duration = 8, colorFrom = "#449efe", colorTo = "#7c5cdb", borderWidth = 2 }: BorderBeamProps) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-[inherit] border-(length:--border-beam-width) border-transparent opacity-0 transition-opacity duration-300 mask-[linear-gradient(transparent,transparent),linear-gradient(#000,#000)] mask-intersect [mask-clip:padding-box,border-box] group-hover:opacity-100 motion-reduce:hidden"
      style={{ "--border-beam-width": `${borderWidth}px` } as CSSProperties}
    >
      <div
        className={cn(
          "absolute aspect-square bg-linear-to-l from-(--color-from) via-(--color-to) to-transparent [animation-play-state:paused] group-hover:[animation-play-state:running]",
          className,
        )}
        style={
          {
            width: size,
            offsetPath: `rect(0 auto auto 0 round ${size}px)`,
            offsetDistance: "0%",
            animation: `sekar-beam ${duration}s linear ${-delay}s infinite`,
            "--color-from": colorFrom,
            "--color-to": colorTo,
          } as CSSProperties
        }
      />
    </div>
  );
}
