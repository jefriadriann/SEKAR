"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto mt-8 max-w-xl rounded-2xl border border-rose-200 bg-white p-6">
      <h1 className="text-2xl font-bold text-navy-900">Terjadi kesalahan</h1>
      <p className="mt-2 text-muted">Halaman tidak dapat ditampilkan. Detail: {error.message}</p>
      <button type="button" onClick={reset} className="mt-4 rounded-lg bg-navy-800 px-3.5 py-2 font-semibold text-white hover:bg-navy-700">
        Coba lagi
      </button>
    </div>
  );
}
