"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AppConfig } from "@/lib/config";
import { isValidISODate } from "@/lib/dates";
import { downloadText, downloadUrl } from "@/lib/download";
import type { RequestPatch } from "@/lib/mutations";
import { PREFS_KEY } from "@/lib/repository/storage-keys";
import type { DatasetSource, DocumentContent, LoadResult, SekarRepository } from "@/lib/repository/types";
import { beginTotpEnrollment, listTotpFactors, removeTotpWithStepUp, verifyTotp, type TotpEnrollment, type TotpFactor } from "@/lib/auth/mfa";
import { canOpenDocument, scopeDatasetForViewer } from "@/lib/scope";
import type { ComplianceStatus, Dataset, FindingStatus, ISODate, PendingInvite, Role, SekarDocument, Viewer } from "@/lib/types";

export type AppStatus =
  | "loading"
  | "ready"
  | "error"
  | "config_error"
  | "needs_login"
  | "unmapped"
  /** Mode Supabase: sudah login password (aal1), wajib mendaftarkan authenticator. */
  | "needs_mfa_enroll"
  /** Mode Supabase: sudah login password (aal1), wajib memasukkan kode authenticator. */
  | "needs_mfa_challenge"
  /** Mode Supabase: datang dari tautan reset dan sudah aal2 — wajib menetapkan kata sandi baru. */
  | "password_reset";

/** Kontrol MFA & akun (hanya mode Supabase). Seluruh operasi memakai Supabase Auth. */
export interface MfaControls {
  /** Faktor TOTP terverifikasi (untuk layar challenge / halaman keamanan). */
  factors: TotpFactor[];
  refreshFactors: () => Promise<TotpFactor[]>;
  beginEnrollment: () => Promise<TotpEnrollment>;
  /** Mengembalikan pesan error atau null bila sukses (sesi menjadi aal2). */
  verify: (factorId: string, code: string) => Promise<string | null>;
  removeFactor: (input: { factorId: string; stepUpFactorId: string; code: string }) => Promise<string | null>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<string | null>;
  signOutOthers: () => Promise<string | null>;
}

/** Kelola undangan pengguna (mode Supabase, DR/admin). Otorisasi sebenarnya di RLS. */
export interface UserAdminControls {
  list: () => Promise<PendingInvite[]>;
  create: (input: { email: string; role: Role; unit_id: string; display_name: string }) => Promise<string | null>;
  remove: (email: string) => Promise<string | null>;
}

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
  source: DatasetSource | null;
  asOf: ISODate;
  datasetAsOf: ISODate | null;
  setAsOf: (d: ISODate) => void;
  resetAsOf: () => void;
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
  /** null pada mode dummy. */
  mfa: MfaControls | null;
  /** Status password_reset: dari tautan reset ("recovery") atau undangan ("invite"). */
  passwordMode: "recovery" | "invite";
  /** null pada mode dummy. */
  userAdmin: UserAdminControls | null;
}

const SekarContext = createContext<SekarContextValue | null>(null);

interface Prefs {
  /** Email akun demo yang sedang masuk (mode dummy; simulasi, bukan sesi aman). */
  demoEmail?: string;
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
  const [demoViewer, setDemoViewer] = useState<Viewer | null>(null);
  const [asOfOverride, setAsOfOverride] = useState<ISODate | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [previewDoc, setPreviewDoc] = useState<SekarContextValue["previewDoc"]>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [factors, setFactors] = useState<TotpFactor[]>([]);
  const toastId = useRef(0);
  /** Sesi berasal dari tautan reset kata sandi (event PASSWORD_RECOVERY). */
  const recoveryRef = useRef(false);
  /** Sesi berasal dari tautan undangan; pengguna wajib membuat kata sandi setelah MFA. */
  const inviteRef = useRef<boolean | null>(null);
  const [passwordMode, setPasswordMode] = useState<"recovery" | "invite">("recovery");

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
        // Build Supabase: cabang demo dibuang saat build (konstanta), sehingga kode,
        // akun demo, dan dataset dummy tidak ikut terkirim ke browser.
        if (process.env.NEXT_PUBLIC_SEKAR_BUILD_MODE !== "supabase" && config.mode === "dummy") {
          const { DummyRepository } = await import("@/lib/repository/dummy");
          const { viewerForDemoEmail } = await import("@/lib/demo-accounts");
          const repo = (repoRef.current as InstanceType<typeof DummyRepository> | null) ?? new DummyRepository();
          repoRef.current = repo;
          const res = await repo.load();
          if (cancelled) return;
          setWarning(repo.warning);
          setResult(res);
          if (prefs.asOf && isValidISODate(prefs.asOf)) setAsOfOverride(prefs.asOf);
          const restored = prefs.demoEmail ? viewerForDemoEmail(prefs.demoEmail, res.dataset.units) : null;
          setDemoViewer(restored);
          setStatus(restored ? "ready" : "needs_login");
          return;
        }
        if (config.mode !== "supabase") throw new Error("Build ini khusus mode Supabase; mode demo tidak tersedia.");
        // Mode Supabase: tidak ada fallback ke dummy bila gagal.
        const { SupabaseRepository } = await import("@/lib/repository/supabase");
        const repo = (repoRef.current as SupabaseRepo | null) ?? new SupabaseRepository(config.supabaseUrl, config.supabaseAnonKey);
        repoRef.current = repo;
        if (inviteRef.current === null) inviteRef.current = repo.inviteFlow;
        const { data: sub } = repo.client.auth.onAuthStateChange((event) => {
          if (event === "PASSWORD_RECOVERY") recoveryRef.current = true;
          if (event === "SIGNED_OUT") recoveryRef.current = false;
          if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "MFA_CHALLENGE_VERIFIED" || event === "PASSWORD_RECOVERY") {
            setStatus("loading");
            setReloadKey((k) => k + 1);
          }
        });
        unsubscribe = () => sub.subscription.unsubscribe();
        const { data } = await repo.client.auth.getSession();
        if (cancelled) return;
        if (!data.session) {
          setResult(null);
          setStatus("needs_login");
          return;
        }
        // MFA wajib sebelum data apa pun dimuat (RLS juga menolak sesi aal1).
        const gate = await repo.mfaGate();
        if (cancelled) return;
        if (gate.kind !== "ok") {
          setResult(null);
          setFactors(gate.kind === "challenge" ? gate.factors : []);
          setStatus(gate.kind === "enroll" ? "needs_mfa_enroll" : "needs_mfa_challenge");
          return;
        }
        if (recoveryRef.current || inviteRef.current) {
          setResult(null);
          setPasswordMode(inviteRef.current ? "invite" : "recovery");
          setStatus("password_reset");
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
  const viewer: Viewer | null = useMemo(() => {
    if (!result) return null;
    return result.viewer ?? demoViewer;
  }, [result, demoViewer]);

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

  const run = useCallback(
    async (fn: (repo: SekarRepository) => Promise<LoadResult>, success: string): Promise<string | null> => {
      const repo = repoRef.current;
      if (!repo) return "Data belum siap.";
      try {
        const res = await fn(repo);
        setResult((prev) => ({ ...res, viewer: res.viewer ?? prev?.viewer }));
        if (repo.mode === "dummy") setWarning((repo as { warning?: string | null }).warning ?? null);
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
        else if (doc.file_url) downloadUrl(c.url, c.filename);
        else window.open(c.url, "_blank", "noopener");
        notify(`Berkas ${c.filename} diunduh.`, "success");
      } catch (e) {
        notify((e as Error).message, "error");
      }
    },
    [findDoc, notify],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (process.env.NEXT_PUBLIC_SEKAR_BUILD_MODE !== "supabase" && config.mode === "dummy") {
        if (!fullDataset) return "Data demo belum siap.";
        const { signInDemo } = await import("@/lib/demo-accounts");
        const res = signInDemo(email, password, fullDataset.units);
        if (typeof res === "string") return res;
        setDemoViewer(res);
        persistPrefs({ demoEmail: email.trim().toLowerCase() });
        setStatus("ready");
        notify(`Selamat datang, ${res.name}.`, "success");
        return null;
      }
      const repo = repoRef.current as SupabaseRepo | null;
      if (!repo || repo.mode !== "supabase") return "Layanan login belum siap.";
      const { error: e } = await repo.client.auth.signInWithPassword({ email, password });
      return e ? e.message : null;
    },
    [config.mode, fullDataset, persistPrefs, notify],
  );

  const signOut = useCallback(async () => {
    if (config.mode === "dummy") {
      setDemoViewer(null);
      persistPrefs({ demoEmail: undefined });
      setPreviewDoc(null);
      setStatus("needs_login");
      return;
    }
    const repo = repoRef.current as SupabaseRepo | null;
    recoveryRef.current = false;
    inviteRef.current = false;
    setPreviewDoc(null);
    setResult(null);
    setFactors([]);
    if (repo?.mode === "supabase") await repo.client.auth.signOut();
    setStatus("needs_login");
  }, [config.mode, persistPrefs]);

  const supabaseRepo = useCallback(() => {
    const repo = repoRef.current as SupabaseRepo | null;
    if (!repo || repo.mode !== "supabase") throw new Error("Layanan autentikasi belum siap.");
    return repo;
  }, []);
  const reload = useCallback(() => {
    setStatus("loading");
    setReloadKey((k) => k + 1);
  }, []);
  const mfa: MfaControls | null = useMemo(() => {
    if (config.mode !== "supabase") return null;
    const attempt = async (fn: () => Promise<unknown>): Promise<string | null> => {
      try {
        await fn();
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    };
    return {
      factors,
      refreshFactors: async () => {
        const { verified } = await listTotpFactors(supabaseRepo().mfa);
        setFactors(verified);
        return verified;
      },
      beginEnrollment: () => beginTotpEnrollment(supabaseRepo().mfa, "Authenticator SEKAR"),
      verify: async (factorId, code) => {
        const err = await attempt(() => verifyTotp(supabaseRepo().mfa, factorId, code));
        if (!err) reload();
        return err;
      },
      removeFactor: async (input) => {
        const repo = supabaseRepo();
        const err = await attempt(async () => {
          await removeTotpWithStepUp(repo.mfa, input);
          // Perbarui token agar daftar faktor/aal di sesi segera mutakhir.
          await repo.client.auth.refreshSession();
        });
        if (!err) setFactors((await listTotpFactors(repo.mfa)).verified);
        return err;
      },
      requestPasswordReset: (email) => supabaseRepo().requestPasswordReset(email, `${window.location.origin}/`),
      updatePassword: async (password) => {
        const err = await attempt(() => supabaseRepo().updatePassword(password));
        if (!err) {
          recoveryRef.current = false;
          inviteRef.current = false;
          await supabaseRepo().client.auth.signOut();
          notify("Kata sandi tersimpan. Silakan masuk dengan email, kata sandi, dan kode authenticator.", "success");
        }
        return err;
      },
      signOutOthers: () => attempt(() => supabaseRepo().signOutOthers()),
    };
  }, [config.mode, factors, supabaseRepo, reload, notify]);

  const userAdmin: UserAdminControls | null = useMemo(() => {
    if (config.mode !== "supabase") return null;
    const attempt = async (fn: () => Promise<unknown>): Promise<string | null> => {
      try {
        await fn();
        return null;
      } catch (e) {
        return (e as Error).message;
      }
    };
    return {
      list: () => supabaseRepo().listInvites(),
      create: (input) => attempt(() => supabaseRepo().createInvite(input)),
      remove: (email) => attempt(() => supabaseRepo().deleteInvite(email)),
    };
  }, [config.mode, supabaseRepo]);

  const value: SekarContextValue = {
    config,
    status,
    error,
    warning,
    fullDataset,
    data,
    viewer,
    source: result?.source ?? null,
    asOf,
    datasetAsOf,
    setAsOf,
    resetAsOf,
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
    retry: reload,
    mfa,
    passwordMode,
    userAdmin,
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
