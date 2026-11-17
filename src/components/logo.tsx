import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-bold text-slate-900">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
        <rect width="32" height="32" rx="8" fill="#4f46e5" />
        <path d="M9 20.5 13.5 15l3.5 3.5L23 11" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="23" cy="11" r="2" fill="#fff" />
      </svg>
      <span className="text-lg tracking-tight">{APP_NAME}</span>
    </Link>
  );
}
