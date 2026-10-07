"use client";

/**
 * NumberTicker — diadaptasi dari Magic UI (MIT, tersedia di 21st.dev).
 * Angka beranimasi ke nilai akhir; menghormati prefers-reduced-motion.
 */
import { useEffect, useRef, type ComponentPropsWithoutRef } from "react";
import { useInView, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { cn } from "@/lib/utils";

interface NumberTickerProps extends ComponentPropsWithoutRef<"span"> {
  value: number;
  decimalPlaces?: number;
}

const fmt = (n: number, d: number) => Intl.NumberFormat("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(n.toFixed(d)));

export function NumberTicker({ value, className, decimalPlaces = 0, ...props }: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { damping: 40, stiffness: 140 });
  const isInView = useInView(ref, { once: true, margin: "0px" });

  useEffect(() => {
    if (reduce) {
      if (ref.current) ref.current.textContent = fmt(value, decimalPlaces);
      return;
    }
    if (isInView) motionValue.set(value);
  }, [motionValue, isInView, value, reduce, decimalPlaces]);

  useEffect(
    () =>
      springValue.on("change", (latest) => {
        if (ref.current) ref.current.textContent = fmt(latest, decimalPlaces);
      }),
    [springValue, decimalPlaces],
  );

  // Pastikan teks akhir tepat (spring dapat berhenti sedikit sebelum target).
  useEffect(
    () =>
      springValue.on("animationComplete", () => {
        if (ref.current) ref.current.textContent = fmt(value, decimalPlaces);
      }),
    [springValue, value, decimalPlaces],
  );

  return (
    <span ref={ref} className={cn("inline-block tabular-nums", className)} {...props}>
      {reduce ? fmt(value, decimalPlaces) : "0"}
    </span>
  );
}
