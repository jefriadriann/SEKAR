"use client";

/**
 * Pratinjau berkas materi demo: PDF (iframe), worksheet Excel (tabel contoh
 * dari content_text), dan video (autoplay, tanpa suara agar diizinkan browser).
 */
import { useEffect, useRef } from "react";
import { FileSpreadsheet } from "lucide-react";
import { fileKind, videoSources, worksheetPreview } from "@/lib/materials";
import type { SekarDocument } from "@/lib/types";

export function MaterialViewer({ doc, url, compact = false }: { doc: SekarDocument; url: string; compact?: boolean }) {
  const kind = fileKind(url);
  if (kind === "pdf") {
    return (
      <div className="space-y-2">
        <iframe
          src={`${url}#view=FitH`}
          title={`Pratinjau ${doc.title}`}
          className={compact ? "h-[60vh] w-full rounded-xl border border-line bg-slate-50" : "h-[70vh] w-full rounded-xl border border-line bg-slate-50"}
        />
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-[13px] font-semibold text-sky-700 underline">
          PDF tidak tampil? Buka di tab baru
        </a>
      </div>
    );
  }
  if (kind === "video") return <AutoplayVideo src={url} title={doc.title} />;
  if (kind === "xlsx") {
    const p = worksheetPreview(doc);
    return (
      <div className="space-y-3">
        <p className="flex items-center gap-2 text-[14px] text-muted">
          <FileSpreadsheet className="h-4 w-4 text-[#2e7d5b]" aria-hidden />
          {p?.intro ?? "Worksheet Excel simulasi."}
        </p>
        {p && (
          <div className="scrollbar-thin overflow-x-auto rounded-xl border border-line">
            <table className="min-w-[900px] text-left text-[12.5px]">
              <caption className="sr-only">Contoh isi worksheet</caption>
              <thead className="bg-[#1d4f9e] text-white">
                <tr>
                  {p.header.map((h) => (
                    <th key={h} scope="col" className="px-2.5 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {p.rows.map((r, i) => (
                  <tr key={i} className={i % 2 ? "bg-[#eef2f9]" : "bg-white"}>
                    {r.map((c, j) => (
                      <td key={j} className="border-t border-line px-2.5 py-2 align-top text-navy-900">
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[12.5px] text-muted">Pratinjau menampilkan sebagian baris. Unduh berkas Excel untuk melihat seluruh lembar, daftar pilihan, dan rumus rekap.</p>
      </div>
    );
  }
  return <pre className="whitespace-pre-wrap rounded-xl border border-line bg-slate-50 p-4 font-mono text-[13px]">{doc.content_text}</pre>;
}

/** Video yang langsung diputar saat tampil. Tanpa suara (berkas demo tidak memiliki audio). */
export function AutoplayVideo({ src, title, loop = false, className }: { src: string; title: string; loop?: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => {
      /* autoplay diblokir: kontrol tetap tersedia */
    });
  }, [src]);
  return (
    <video
      ref={ref}
      key={src}
      title={title}
      aria-label={title}
      className={className ?? "aspect-video w-full rounded-xl bg-[#0f1a45]"}
      autoPlay
      muted
      playsInline
      loop={loop}
      controls
      preload="auto"
    >
      {videoSources(src).map((v) => (
        <source key={v.src} src={v.src} type={v.type} />
      ))}
    </video>
  );
}
