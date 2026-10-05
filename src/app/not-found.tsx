import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-line bg-white p-6">
      <p className="text-sm font-bold uppercase tracking-widest text-teal-700">404</p>
      <h1 className="mt-1 text-2xl font-bold text-navy-900">Halaman tidak ditemukan</h1>
      <p className="mt-2 text-muted">Alamat yang Anda buka tidak tersedia di SEKAR. Gunakan navigasi di atas atau kembali ke beranda.</p>
      <Link href="/" className="mt-4 inline-flex rounded-lg bg-navy-800 px-3.5 py-2 font-semibold text-white hover:bg-navy-700">
        Kembali ke beranda
      </Link>
    </div>
  );
}
