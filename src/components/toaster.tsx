"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Toast = { id: number; message: string; ok: boolean };

/** Fire-and-forget notification that survives the re-render after an action. */
export function toast(message: string, ok = true) {
  window.dispatchEvent(new CustomEvent("app:toast", { detail: { message, ok } }));
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => {
    const onToast = (e: Event) => {
      const { message, ok } = (e as CustomEvent<{ message: string; ok: boolean }>).detail;
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, message, ok }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
    };
    window.addEventListener("app:toast", onToast);
    return () => window.removeEventListener("app:toast", onToast);
  }, []);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            "pointer-events-auto w-full max-w-md rounded-lg px-4 py-3 text-sm font-medium shadow-lg ring-1",
            t.ok ? "bg-slate-900 text-white ring-slate-800" : "bg-red-600 text-white ring-red-700",
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
