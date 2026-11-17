import { REVIEW_STATUS, REVIEW_STATUS_ORDER } from "@/lib/constants";
import type { ReviewStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Not Started → Self-Appraisal Submitted → Manager Reviewed → Completed */
export function ReviewStepper({ status }: { status: ReviewStatus }) {
  const current = REVIEW_STATUS[status].step;
  return (
    <ol className="flex w-full items-start" aria-label="Review progress">
      {REVIEW_STATUS_ORDER.map((s, i) => {
        const done = i < current || status === "completed";
        const active = i === current && status !== "completed";
        return (
          <li key={s} className="flex flex-1 flex-col items-center text-center" aria-current={active ? "step" : undefined}>
            <div className="flex w-full items-center">
              <span className={cn("h-0.5 flex-1", i === 0 ? "bg-transparent" : i <= current ? "bg-brand-600" : "bg-slate-200")} />
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  done ? "bg-brand-600 text-white" : active ? "bg-white text-brand-700 ring-2 ring-brand-600" : "bg-slate-100 text-slate-400",
                )}
              >
                {done ? "✓" : i + 1}
              </span>
              <span className={cn("h-0.5 flex-1", i === REVIEW_STATUS_ORDER.length - 1 ? "bg-transparent" : i < current ? "bg-brand-600" : "bg-slate-200")} />
            </div>
            <span className={cn("mt-2 px-1 text-[11px] leading-tight sm:text-xs", active || done ? "font-semibold text-slate-900" : "text-slate-400")}>
              {REVIEW_STATUS[s].label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
