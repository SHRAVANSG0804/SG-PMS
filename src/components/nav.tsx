"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  section?: "admin";
}

/**
 * Role-aware navigation. The SERVER decides which items this user gets
 * (see app/(app)/layout.tsx) — this component only renders them.
 * Hiding a link is cosmetic; the real protection is on every page/action.
 */
export function Nav({ items, name, roleLabel }: { items: NavItem[]; name: string; roleLabel: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const main = items.filter((i) => !i.section);
  const admin = items.filter((i) => i.section === "admin");

  const link = (item: NavItem, mobile = false) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={() => setOpen(false)}
      aria-current={isActive(item.href) ? "page" : undefined}
      className={cn(
        "rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition",
        mobile && "block",
        isActive(item.href) ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
      )}
    >
      {item.label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Logo href="/dashboard" />
        <nav className="ml-4 hidden flex-1 items-center gap-1 lg:flex" aria-label="Main">
          {main.map((i) => link(i))}
          {admin.length > 0 && <span className="mx-2 h-5 w-px bg-slate-200" aria-hidden />}
          {admin.map((i) => link(i))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-slate-900">{name}</p>
            <p className="text-xs text-slate-500">{roleLabel}</p>
          </div>
          <UserButton />
          <button
            type="button"
            className="btn btn-ghost px-2 lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <nav className="space-y-1 border-t border-slate-200 bg-white px-4 py-3 lg:hidden" aria-label="Mobile">
          <p className="px-3 pb-1 text-xs text-slate-500 sm:hidden">
            {name} · {roleLabel}
          </p>
          {main.map((i) => link(i, true))}
          {admin.length > 0 && <p className="px-3 pt-3 pb-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">HR Admin</p>}
          {admin.map((i) => link(i, true))}
        </nav>
      )}
    </header>
  );
}
