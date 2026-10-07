/**
 * Template dirender ulang setiap navigasi: memberi transisi masuk halaman
 * yang halus (opacity + transform, dikerjakan GPU).
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in h-full motion-reduce:animate-none">{children}</div>;
}
