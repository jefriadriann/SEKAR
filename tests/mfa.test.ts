import { describe, expect, it, vi } from "vitest";
import { beginTotpEnrollment, decideMfaGate, isTotpCode, readMfaGate, removeTotpWithStepUp, verifyTotp, type MfaApi } from "@/lib/auth/mfa";

type F = { id: string; factor_type: string; status: string; friendly_name?: string };

/** Tiruan minimal supabase.auth.mfa: kode benar = "123456". */
function fakeApi(factors: F[], level: "aal1" | "aal2" = "aal1") {
  const state = { factors: [...factors], level };
  const api = {
    listFactors: vi.fn(async () => ({ data: { all: state.factors, totp: state.factors.filter((f) => f.status === "verified"), phone: [] }, error: null })),
    getAuthenticatorAssuranceLevel: vi.fn(async () => ({
      data: { currentLevel: state.level, nextLevel: state.factors.some((f) => f.status === "verified") ? "aal2" : "aal1", currentAuthenticationMethods: [] },
      error: null,
    })),
    enroll: vi.fn(async () => {
      state.factors.push({ id: "new", factor_type: "totp", status: "unverified" });
      return { data: { id: "new", type: "totp", totp: { qr_code: "data:image/svg+xml;utf-8,<svg/>", secret: "PLACEHOLDER", uri: "otpauth://x" } }, error: null };
    }),
    challengeAndVerify: vi.fn(async ({ factorId, code }: { factorId: string; code: string }) => {
      if (code !== "123456" || !state.factors.some((f) => f.id === factorId)) return { data: null, error: { message: "Invalid TOTP code entered" } };
      state.factors = state.factors.map((f) => (f.id === factorId ? { ...f, status: "verified" } : f));
      state.level = "aal2";
      return { data: {}, error: null };
    }),
    unenroll: vi.fn(async ({ factorId }: { factorId: string }) => {
      state.factors = state.factors.filter((f) => f.id !== factorId);
      return { data: { id: factorId }, error: null };
    }),
    challenge: vi.fn(),
    verify: vi.fn(),
  };
  return { api: api as unknown as MfaApi & typeof api, state };
}
const verified = (id: string): F => ({ id, factor_type: "totp", status: "verified", friendly_name: id });

describe("MFA: keputusan gerbang", () => {
  it("aal2 → ok; aal1 + faktor terverifikasi → challenge; aal1 tanpa faktor → wajib daftar", () => {
    expect(decideMfaGate("aal2", [])).toEqual({ kind: "ok" });
    expect(decideMfaGate("aal1", [{ id: "a", status: "verified" }])).toMatchObject({ kind: "challenge" });
    expect(decideMfaGate("aal1", [])).toEqual({ kind: "enroll" });
    expect(decideMfaGate(null, [])).toEqual({ kind: "enroll" });
  });

  it("membaca AAL dan faktor dari Supabase Auth; faktor belum terverifikasi tidak dihitung", async () => {
    expect((await readMfaGate(fakeApi([], "aal1").api)).kind).toBe("enroll");
    expect((await readMfaGate(fakeApi([{ id: "u", factor_type: "totp", status: "unverified" }]).api)).kind).toBe("enroll");
    expect((await readMfaGate(fakeApi([verified("a")]).api)).kind).toBe("challenge");
    expect((await readMfaGate(fakeApi([verified("a")], "aal2").api)).kind).toBe("ok");
  });
});

describe("MFA: pendaftaran, verifikasi, penggantian faktor", () => {
  it("pendaftaran membersihkan faktor setengah jadi, lalu kode benar menaikkan sesi ke aal2", async () => {
    const { api, state } = fakeApi([{ id: "stale", factor_type: "totp", status: "unverified" }]);
    const e = await beginTotpEnrollment(api, "Authenticator SEKAR");
    expect(api.unenroll).toHaveBeenCalledWith({ factorId: "stale" });
    expect(e.qrCode).toMatch(/^data:image\/svg\+xml/);
    await expect(verifyTotp(api, e.factorId, "000000")).rejects.toThrow(/Invalid/);
    expect(state.level).toBe("aal1");
    await verifyTotp(api, e.factorId, "123456");
    expect(state.level).toBe("aal2");
    expect((await readMfaGate(api)).kind).toBe("ok");
  });

  it("menolak kode bukan 6 digit tanpa memanggil server", async () => {
    const { api } = fakeApi([verified("a")]);
    for (const c of ["12345", "abcdef", "1234567", ""]) await expect(verifyTotp(api, "a", c)).rejects.toThrow(/6 digit/);
    expect(api.challengeAndVerify).not.toHaveBeenCalled();
    expect(isTotpCode(" 123456 ")).toBe(true);
  });

  it("hapus faktor wajib kode step-up yang benar dan tidak boleh menghapus faktor terakhir", async () => {
    const one = fakeApi([verified("a")], "aal2");
    await expect(removeTotpWithStepUp(one.api, { factorId: "a", stepUpFactorId: "a", code: "123456" })).rejects.toThrow(/terakhir/);
    expect(one.api.unenroll).not.toHaveBeenCalled();

    const two = fakeApi([verified("a"), verified("b")], "aal2");
    await expect(removeTotpWithStepUp(two.api, { factorId: "a", stepUpFactorId: "b", code: "999999" })).rejects.toThrow();
    expect(two.api.unenroll).not.toHaveBeenCalled();
    await expect(removeTotpWithStepUp(two.api, { factorId: "x", stepUpFactorId: "b", code: "123456" })).rejects.toThrow(/tidak ditemukan/);
    await removeTotpWithStepUp(two.api, { factorId: "a", stepUpFactorId: "b", code: "123456" });
    expect(two.state.factors.map((f) => f.id)).toEqual(["b"]);
  });
});
