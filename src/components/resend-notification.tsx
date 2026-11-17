"use client";

import { useState } from "react";

/** Calls POST /api/notify-manager to re-send the "self-appraisal submitted" e-mail. */
export function ResendNotificationButton({ reviewId }: { reviewId: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        disabled={state === "sending"}
        onClick={async () => {
          setState("sending");
          const res = await fetch("/api/notify-manager", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reviewId }),
          }).catch(() => null);
          const data = res ? await res.json().catch(() => ({})) : {};
          setState(res?.ok ? "sent" : "error");
          setMsg(res?.ok ? "E-mail sent to your manager." : data.error ?? "Could not send the e-mail.");
        }}
      >
        {state === "sending" ? "Sending…" : "Re-send e-mail to manager"}
      </button>
      {msg && <span className={state === "sent" ? "text-xs text-emerald-700" : "text-xs text-red-600"}>{msg}</span>}
    </span>
  );
}
