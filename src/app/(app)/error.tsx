"use client";

import { useEffect } from "react";
import { Card } from "@/components/ui";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <Card className="mx-auto max-w-lg p-8 text-center">
      <h1 className="text-lg font-bold text-slate-900">Something went wrong</h1>
      <p className="mt-2 text-sm text-slate-600">
        The page could not be loaded. If this keeps happening, check the server logs (Vercel → Logs).
      </p>
      {error.digest && <p className="mt-2 font-mono text-xs text-slate-400">Ref: {error.digest}</p>}
      <button onClick={reset} className="btn btn-primary mt-6">
        Try again
      </button>
    </Card>
  );
}
