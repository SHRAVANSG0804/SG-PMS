"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/lib/types";
import { toast } from "./toaster";

/**
 * A one-click button that calls a server action (e.g. "Open cycle"),
 * optionally asks for confirmation, and shows the result as a toast (the
 * button itself often disappears once the status changes).
 */
export function ActionButton({
  action,
  children,
  confirm,
  variant = "secondary",
  size,
  pendingText = "Working…",
}: {
  action: () => Promise<ActionState>;
  children: React.ReactNode;
  confirm?: string;
  variant?: "primary" | "secondary" | "danger" | "success" | "ghost";
  size?: "sm";
  pendingText?: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      className={cn("btn", `btn-${variant}`, size === "sm" && "btn-sm")}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        start(async () => {
          const r = await action();
          if (r.message) toast(r.message, r.ok);
          router.refresh();
        });
      }}
    >
      {pending ? pendingText : children}
    </button>
  );
}
