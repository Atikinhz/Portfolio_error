import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white px-6">
      <h1 className="text-6xl font-extrabold tracking-tight mb-4">404</h1>
      <p className="text-xl text-neutral-400 mb-8">Page not found</p>
      <Link
        href="/"
        className="px-6 py-3 rounded-full bg-white text-black font-medium hover:bg-neutral-200 transition-colors"
      >
        Return Home
      </Link>
    </div>
  );
}
