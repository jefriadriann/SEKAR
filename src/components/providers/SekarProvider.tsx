"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AppConfig } from "@/lib/config";
import { isValidISODate } from "@/lib/dates";
import { downloadText } from "@/lib/download";
import type { RequestPatch } from "@/lib/mutations";
import { DummyRepository, PREFS_KEY } from "@/lib/repository/dummy";
import type { DatasetSource, DocumentContent, LoadResult, SekarRepository } from "@/lib/repository/types";
import { canOpenDocument, scopeDatasetForViewer } from "@/lib/scope";
import type { ComplianceStatus, Dataset, DemoPersona, FindingStatus, ISODate, SekarDocument, Viewer } from "@/lib/types";

export type AppStatus = "loading" | "ready" | "error" | "config_error" | "needs_login" | "unmapped";

export interface Toast {
  id: number;
  message: string;
  tone: "success" | "error" | "info";
}

interface SekarContextValue {
  config: AppConfig;
  status: AppStatus;
  error: string | null;
  warning: string | null;
  /** Dataset lengkap (tanpa scope). Hanya untuk admin/ekspor. */
  fullDataset: Dataset | null;
  /** Dataset sesuai scope viewer. Dipakai seluruh halaman. */
  data: Dataset | null;
  viewer: Viewer | null;
  personas: DemoPersona[];
  source: DatasetSource | null;
  asOf: ISODate;
  datasetAsOf: ISODate | null;
  setAsOf: (d: ISODate) => void;
  resetAsOf: () => void;
  setPersona: (id: string) => void;
  updateFindingStatus: (id: string, status: FindingStatus) => Promise<boolean>;
  updateRequest: (id: string, patch: RequestPatch) => Promise<string | null>;
  updateCompliance: (id: string, status: ComplianceStatus) => Promise<boolean>;
  importDataset: (ds: Dataset, label: string) => Promise<boolean>;
  resetToSeed: () => Promise<boolean>;
  openDocument: (docId: string) => void;
  downloadDocument: (docId: string) => Promise<void>;
  previewDoc: { doc: SekarDocument; content: DocumentContent | null; error: string | null } | null;
  closePreview: () => void;
  toasts: Toast[];
  notify: (message: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: number) => void;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  retry: () => void;
}

const SekarContext = createContext<SekarContextValue | null>(null);

interface Prefs {
  personaId?: string;
  asOf?: ISODate;
}

function readPrefs(): Prefs {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    return raw ? (JSON.parse(raw) as Prefs) : {};
  } catch {
    return {};
  }
}

function writePrefs(p: Prefs) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* penyimpanan tidak tersedia: preferensi hanya untuk sesi ini */
  }
}

type SupabaseRepo = import("@/lib/repository/supabase").SupabaseRepository;

export function SekarProvider({ config, children }: { config: AppConfig; children: ReactNode }) {
  const repoRef = useRef<SekarRepository | null>(null);
  const [status, setStatus] = useState<AppStatus>(config.configError ? "config_error" : "loading");
  const [error, setError] = useState<string | null>(config.configError ?? null);
  const [warning, setWarning] = useState<string | null>(null);
  const [result, setResult] = useState<LoadResult | null>(null);
  const [personaId, setPersonaId] = useState<string>("demo-dr");
  const [asOfOverride, setAsOfOverride] = useState<ISODate | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [previewDoc, setPreviewDoc] = useState<SekarContextValue["previewDoc"]>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const toastId = useRef(0);

  const notify = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  // Inisialisasi repository + muat data.
  useEffect(() => {
    if (config.configError) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    const prefs = readPrefs();

    async function init() {
      try {
        if (config.mode === "dummy") {
          const repo = (repoRef.current as DummyRepository | null) ?? new DummyRepository();
          repoRef.current = repo;
          const res = await repo.load();
          if (cancelled) return;
          setWarning(repo.warning);
          setResult(res);
          if (prefs.personaId && res.dataset.demo_personas.some((p) => p.id === prefs.personaId)) setPersonaId(prefs.personaId);
          if (prefs.asOf && isValidISODate(prefs.asOf)) setAsOfOverride(prefs.asOf);
          setStatus("ready");
          return;
        }
        // Mode Supabase: tidak ada fallback ke dummy bila gagal.
        const { SupabaseRepository } = await import("@/lib/repository/supabase");
        const repo = (repoRef.current as SupabaseRepo | null) ?? new SupabaseRepository(config.supabaseUrl, config.supabaseAnonKey);
        repoRef.current = repo;
        const { data: sub } = repo.client.auth.onAuthStateChange((event) => {
          if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
            setStatus("loading");
            setReloadKey((k) => k + 1);
          }
        });
        unsubscribe = () => sub.subscription.unsubscribe();
        const { data } = await repo.client.auth.getSession();
        if (cancelled) return;
        if (!data.session) {
          setStatus("needs_login");
          return;
        }
        const viewer = await repo.getViewer();
        if (cancelled) return;
        if (!viewer) {
          setStatus("unmapped");
          return;
        }
        const res = await repo.load();
        if (cancelled) return;
        setResult(res);
        if (prefs.asOf && isValidISODate(prefs.asOf)) setAsOfOverride(prefs.asOf);
        setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        setError((e as Error).message);
        setStatus(config.mode === "supabase" && (e as Error).name === "SupabaseConfigError" ? "config_error" : "error");
      }
    }
    init();
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [config, reloadKey]);

  const fullDataset = result?.dataset ?? null;
  const personas = useMemo(() => fullDataset?.demo_personas ?? [], [fullDataset]);

  const viewer: Viewer | null = useMemo(() => {
    if (!result) return null;
    if (result.viewer) return result.viewer;
    const p = personas.find((x) => x.id === personaId) ?? personas[0];
    return p ? { id: p.id, name: p.name, role: p.role, unit_id: p.unit_id, simulated: true } : null;
  }, [result, personas, personaId]);

  const data = useMemo(() => (fullDataset && viewer ? scopeDatasetForViewer(fullDataset, viewer) : null), [fullDataset, viewer]);
  const datasetAsOf = fullDataset?.metadata.as_of ?? null;
  const asOf = asOfOverride ?? datasetAsOf ?? "2026-10-05";

  const persistPrefs = useCallback((patch: Prefs) => writePrefs({ ...readPrefs(), ...patch }), []);

  const setAsOf = useCallback(
    (d: ISODate) => {
      if (!isValidISODate(d)) return;
      setAsOfOverride(d);
      persistPrefs({ asOf: d });
    },
    [persistPrefs],
  );
  const resetAsOf = useCallback(() => {
    setAsOfOverride(null);
    persistPrefs({ asOf: undefined });
  }, [persistPrefs]);

  const setPersona = useCallback(
    (id: string) => {
      setPersonaId(id);
      persistPrefs({ personaId: id });
      const p = personas.find((x) => x.id === id);
      if (p) notify(`Persona demo diganti ke ${p.name} (simulasi, bukan login).`, "info");
    },
    [personas, persistPrefs, notify],
  );

  const run = useCallback(
    async (fn: (repo: SekarRepository) => Promise<LoadResult>, success: string): Promise<string | null> => {
      const repo = repoRef.current;
      if (!repo) return "Data belum siap.";
      try {
        const res = await fn(repo);
        setResult((prev) => ({ ...res, viewer: res.viewer ?? prev?.viewer }));
        if (repo instanceof DummyRepository) setWarning(repo.warning);
        notify(success, "success");
        return null;
      } catch (e) {
        const msg = (e as Error).message;
        notify(msg, "error");
        return msg;
      }
    },
    [notify],
  );

  const updateFindingStatus = useCallback(
    async (id: string, s: FindingStatus) => (await run((r) => r.updateFindingStatus(id, s, asOf), `Status temuan ${id} diperbarui.`)) === null,
    [run, asOf],
  );
  const updateRequest = useCallback(
    (id: string, patch: RequestPatch) => run((r) => r.updateDocumentRequest(id, patch, asOf), `Permintaan ${id} disimpan.`),
    [run, asOf],
  );
  const updateCompliance = useCallback(
    async (id: string, s: ComplianceStatus) => (await run((r) => r.updateComplianceStatus(id, s), `Status kewajiban ${id} diperbarui.`)) === null,
    [run],
  );
  const importDataset = useCallback(
    async (ds: Dataset, label: string) => {
      const ok = (await run((r) => r.replaceDataset(ds, label), "Dataset baru berhasil diterapkan.")) === null;
      if (ok) {
        setAsOfOverride(null);
        persistPrefs({ asOf: undefined });
      }
      return ok;
    },
    [run, persistPrefs],
  );
  const resetToSeed = useCallback(async () => {
    const ok = (await run((r) => r.resetToSeed(), "Dataset dikembalikan ke seed awal.")) === null;
    if (ok) {
      setAsOfOverride(null);
      persistPrefs({ asOf: undefined });
    }
    return ok;
  }, [run, persistPrefs]);

  const findDoc = useCallback(
    (docId: string): SekarDocument | null => {
      const doc = data?.documents.find((d) => d.id === docId) ?? null;
      if (!doc || !viewer || !canOpenDocument(viewer, doc.scope)) return null;
      return doc;
    },
    [data, viewer],
  );

  const openDocument = useCallback(
    (docId: string) => {
      const doc = findDoc(docId);
      if (!doc) {
        notify("Dokumen tidak ditemukan atau tidak tersedia untuk persona ini.", "error");
        return;
      }
      setPreviewDoc({ doc, content: null, error: null });
      repoRef.current
        ?.getDocumentContent(doc)
        .then((content) => setPreviewDoc((p) => (p?.doc.id === doc.id ? { ...p, content } : p)))
        .catch((e: Error) => setPreviewDoc((p) => (p?.doc.id === doc.id ? { ...p, error: e.message } : p)));
    },
    [findDoc, notify],
  );

  const downloadDocument = useCallback(
    async (docId: string) => {
      const doc = findDoc(docId);
      if (!doc || !repoRef.current) {
        notify("Dokumen tidak ditemukan atau tidak tersedia untuk persona ini.", "error");
        return;
      }
      try {
        const c = await repoRef.current.getDocumentContent(doc);
        if (c.kind === "text") downloadText(c.filename, c.text);
        else window.open(c.url, "_blank", "noopener");
        notify(`Berkas ${c.filename} diunduh.`, "success");
      } catch (e) {
        notify((e as Error).message, "error");
      }
    },
    [findDoc, notify],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    const repo = repoRef.current as SupabaseRepo | null;
    if (!repo || repo.mode !== "supabase") return "Login hanya tersedia di mode Supabase.";
    const { error: e } = await repo.client.auth.signInWithPassword({ email, password });
    return e ? e.message : null;
  }, []);

  const signOut = useCallback(async () => {
    const repo = repoRef.current as SupabaseRepo | null;
    if (repo?.mode === "supabase") await repo.client.auth.signOut();
    setResult(null);
  }, []);

  const value: SekarContextValue = {
    config,
    status,
    error,
    warning,
    fullDataset,
    data,
    viewer,
    personas,
    source: result?.source ?? null,
    asOf,
    datasetAsOf,
    setAsOf,
    resetAsOf,
    setPersona,
    updateFindingStatus,
    updateRequest,
    updateCompliance,
    importDataset,
    resetToSeed,
    openDocument,
    downloadDocument,
    previewDoc,
    closePreview: () => setPreviewDoc(null),
    toasts,
    notify,
    dismissToast,
    signIn,
    signOut,
    retry: () => {
      setStatus("loading");
      setReloadKey((k) => k + 1);
    },
  };

  return <SekarContext.Provider value={value}>{children}</SekarContext.Provider>;
}

export function useSekar(): SekarContextValue {
  const ctx = useContext(SekarContext);
  if (!ctx) throw new Error("useSekar harus dipakai di dalam SekarProvider");
  return ctx;
}

/** Untuk halaman: data dijamin siap (AppShell hanya merender halaman saat status ready). */
export function useReadySekar() {
  const ctx = useSekar();
  if (!ctx.data || !ctx.viewer || !ctx.fullDataset) throw new Error("Data belum siap");
  return { ...ctx, data: ctx.data, viewer: ctx.viewer, fullDataset: ctx.fullDataset };
}
