/**
 * DotPattern — diadaptasi dari Magic UI (MIT, tersedia di 21st.dev). Latar titik dekoratif.
 */
import { useId } from "react";
import { cn } from "@/lib/utils";

export function DotPattern({ width = 18, height = 18, cr = 1, className }: { width?: number; height?: number; cr?: number; className?: string }) {
  const id = useId();
  return (
    <svg aria-hidden focusable="false" className={cn("pointer-events-none absolute inset-0 h-full w-full fill-[#9cc3ec]/40", className)}>
      <defs>
        <pattern id={id} width={width} height={height} patternUnits="userSpaceOnUse">
          <circle cx={width / 2} cy={height / 2} r={cr} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
