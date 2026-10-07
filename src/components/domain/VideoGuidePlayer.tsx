"use client";

/**
 * Pemutar panduan visual bergaya video: setiap langkah tampil sebagai "adegan"
 * yang berganti otomatis, lengkap dengan play/pause, maju/mundur, dan bar
 * progres. Ini bukan rekaman video — tidak ada berkas video eksternal.
 * Autoplay dimatikan bila pengguna meminta reduced motion.
 */
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

const STEP_SECONDS = 5;

export function VideoGuidePlayer({ title, steps, accent = "#ee2d48" }: { title: string; steps: string[]; accent?: string }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [reduce, setReduce] = useState(false);
  const done = !reduce && index === steps.length - 1 && !playing;

  useEffect(() => {
    const r = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => (r ? setReduce(true) : setPlaying(true)), 400);
    return () => clearTimeout(t);
  }, []);

  const next = () => setIndex((i) => Math.min(i + 1, steps.length - 1));
  const prev = () => setIndex((i) => Math.max(i - 1, 0));
  const onSegmentEnd = () => {
    if (index < steps.length - 1) setIndex(index + 1);
    else setPlaying(false);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-[#1b2559] bg-[#0f1a45] text-white shadow-[0_16px_40px_-18px_rgba(15,26,69,0.8)]">
      {/* Bar progres per langkah */}
      <div className="flex gap-1.5 px-4 pt-4" aria-hidden>
        {steps.map((_, i) => (
          <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
            {i < index && <span className="block h-full w-full rounded-full bg-white" />}
            {i === index && reduce && <span className="block h-full w-full rounded-full bg-white" />}
            {i === index && !reduce && (
              <span
                key={`${index}-${playing}`}
                className="block h-full w-full origin-left rounded-full bg-white"
                style={{
                  animation: `sekar-progress ${STEP_SECONDS}s linear forwards`,
                  animationPlayState: playing ? "running" : "paused",
                }}
                onAnimationEnd={onSegmentEnd}
              />
            )}
          </span>
        ))}
      </div>

      {/* Adegan */}
      <div
        className="relative mx-4 mt-3 aspect-video overflow-hidden rounded-xl"
        style={{ background: `radial-gradient(120% 120% at 0% 0%, ${accent}55, transparent 55%), linear-gradient(135deg, #1d3a9a, #0c1a4d)` }}
      >
        <div aria-hidden className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div aria-hidden className="absolute -bottom-14 left-1/3 h-48 w-48 rounded-full bg-white/5" />
        <div key={index} className="animate-pop-in relative flex h-full flex-col justify-center gap-4 px-6 sm:px-10" aria-live="polite">
          <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/70">{title}</span>
          <span className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-[22px] font-extrabold shadow-lg" style={{ background: accent }}>
              {index + 1}
            </span>
            <span className="pt-1 text-[17px] font-semibold leading-snug sm:text-[20px]">
              <span className="sr-only">Langkah {index + 1} dari {steps.length}: </span>
              {steps[index]}
            </span>
          </span>
        </div>
        {done && (
          <div className="animate-fade-in absolute inset-0 grid place-items-center bg-[#0c1a4d]/70">
            <button
              type="button"
              onClick={() => {
                setIndex(0);
                setPlaying(true);
              }}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-semibold text-navy-900 hover:bg-sky-50"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Putar ulang
            </button>
          </div>
        )}
      </div>

      {/* Kontrol */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button type="button" onClick={prev} disabled={index === 0} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10 disabled:opacity-30" aria-label="Langkah sebelumnya">
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        {!reduce && (
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className={cn("grid h-11 w-11 place-items-center rounded-full shadow-lg transition-transform hover:scale-105")}
          style={{ background: accent }}
          aria-label={playing ? "Jeda" : "Putar"}
        >
          {playing ? <Pause className="h-5 w-5" aria-hidden /> : <Play className="ml-0.5 h-5 w-5" aria-hidden />}
        </button>
        )}
        <button type="button" onClick={next} disabled={index === steps.length - 1} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10 disabled:opacity-30" aria-label="Langkah berikutnya">
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
        <span className="ml-auto text-[13px] tabular-nums text-white/75">
          Langkah {index + 1} / {steps.length}
        </span>
      </div>
    </div>
  );
}
