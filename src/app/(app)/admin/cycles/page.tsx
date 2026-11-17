import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getAllCycles, getReviewsForCycle } from "@/lib/data";
import { formatDate, percent } from "@/lib/utils";
import { Card, CardHeader, EmptyState, PageHeader, ProgressBar } from "@/components/ui";
import { CycleStatusBadge } from "@/components/status-badges";
import { ActionButton } from "@/components/action-button";
import { CycleForm } from "./cycle-form";
import { closeCycle, deleteCycle, openCycle } from "./actions";

export const metadata = { title: "Review cycles" };

export default async function CyclesPage() {
  await requireRole("hr_admin");
  const cycles = await getAllCycles();
  const hasOpen = cycles.some((c) => c.status === "open");
  const stats = new Map(
    await Promise.all(
      cycles
        .filter((c) => c.status !== "draft")
        .map(async (c) => {
          const reviews = await getReviewsForCycle(c.id);
          return [c.id, { total: reviews.length, done: reviews.filter((r) => r.status === "completed").length }] as const;
        }),
    ),
  );

  return (
    <>
      <PageHeader title="Review cycles" description="Draft → Open → Closed. Only one cycle can be open at a time." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="h-fit">
          <CardHeader title="New cycle" description="Created as a draft so you can check it before opening." />
          <div className="p-5">
            <CycleForm />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="All cycles" />
          {cycles.length === 0 ? (
            <EmptyState title="No cycles yet" description="Create your first review cycle, e.g. “FY 2026–27 Annual”, then open it so employees can set goals." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {cycles.map((c) => {
                const s = stats.get(c.id);
                return (
                  <li key={c.id} className="flex flex-wrap items-center gap-4 p-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{c.name}</p>
                        <CycleStatusBadge status={c.status} />
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatDate(c.start_date)} – {formatDate(c.end_date)}
                      </p>
                      {s && (
                        <div className="mt-3 max-w-sm">
                          <div className="mb-1 flex justify-between text-xs text-slate-500">
                            <span>{s.done} of {s.total} reviews completed</span>
                            <span>{percent(s.done, s.total)}%</span>
                          </div>
                          <ProgressBar value={percent(s.done, s.total)} tone="green" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-start gap-2">
                      {c.status === "draft" && (
                        <>
                          <ActionButton
                            action={openCycle.bind(null, c.id)}
                            variant="success"
                            size="sm"
                            pendingText="Opening…"
                            confirm={hasOpen ? undefined : `Open "${c.name}"? Every active employee will be able to set goals.`}
                          >
                            Open cycle
                          </ActionButton>
                          <ActionButton action={deleteCycle.bind(null, c.id)} variant="ghost" size="sm" confirm={`Delete draft "${c.name}"?`}>
                            Delete
                          </ActionButton>
                        </>
                      )}
                      {c.status === "open" && (
                        <ActionButton
                          action={closeCycle.bind(null, c.id)}
                          variant="danger"
                          size="sm"
                          pendingText="Closing…"
                          confirm={`Close "${c.name}"? Goals and reviews become read-only.${s && s.done < s.total ? ` ${s.total - s.done} reviews are not completed yet.` : ""}`}
                        >
                          Close cycle
                        </ActionButton>
                      )}
                      {c.status !== "draft" && (
                        <Link href={`/admin/report?cycle=${c.id}`} className="btn btn-secondary btn-sm">Report</Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
