import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-semibold text-brand-600">404</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        This page does not exist, or you do not have access to it.
      </p>
      <Link href="/dashboard" className="btn btn-primary mt-6">
        Back to dashboard
      </Link>
    </main>
  );
}
