import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getAllCycles, getCycle, getReportingCycle } from "@/lib/data";
import { buildCycleReport } from "@/lib/report";
import { REVIEW_STATUS, REVIEW_STATUS_ORDER } from "@/lib/constants";
import { formatDate, percent } from "@/lib/utils";
import { Card, CardHeader, EmptyState, PageHeader, ProgressBar } from "@/components/ui";
import { ReviewStatusBadge } from "@/components/status-badges";
import type { ReviewStatus } from "@/lib/types";

export const metadata = { title: "Completion report" };

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ cycle?: string; status?: string; dept?: string; q?: string }> }) {
  await requireRole("hr_admin");
  const sp = await searchParams;
  const cycles = (await getAllCycles()).filter((c) => c.status !== "draft");
  const cycle = sp.cycle && /^[0-9a-f-]{36}$/i.test(sp.cycle) ? await getCycle(sp.cycle) : await getReportingCycle();

  if (!cycle || cycle.status === "draft") {
    return (
      <>
        <PageHeader title="Completion report" />
        <Card><EmptyState icon="▤" title="No cycle to report on" description="Open a review cycle to start tracking completion." action={<Link href="/admin/cycles" className="btn btn-primary">Go to cycles</Link>} /></Card>
      </>
    );
  }

  const all = await buildCycleReport(cycle.id);
  const departments = [...new Set(all.map((r) => r.employee.department))].sort();
  const status = REVIEW_STATUS_ORDER.includes(sp.status as ReviewStatus) ? (sp.status as ReviewStatus) : undefined;
  const term = (sp.q ?? "").trim().toLowerCase();
  const rows = all
    .filter((r) => !status || r.status === status)
    .filter((r) => !sp.dept || r.employee.department === sp.dept)
    .filter((r) => !term || r.employee.full_name.toLowerCase().includes(term) || (r.manager?.full_name ?? "").toLowerCase().includes(term));

  const counts = Object.fromEntries(REVIEW_STATUS_ORDER.map((s) => [s, all.filter((r) => r.status === s).length])) as Record<ReviewStatus, number>;
  const byDept = departments.map((d) => {
    const inDept = all.filter((r) => r.employee.department === d);
    return { d, total: inDept.length, done: inDept.filter((r) => r.status === "completed").length };
  });

  return (
    <>
      <PageHeader
        title="Completion report"
        description={`${cycle.name} · ${formatDate(cycle.start_date)} – ${formatDate(cycle.end_date)} · ${cycle.status === "open" ? "Open" : "Closed"}`}
        action={<a href={`/api/admin/export?cycle=${cycle.id}`} className="btn btn-primary">Export CSV</a>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {REVIEW_STATUS_ORDER.map((s) => (
          <Link key={s} href={`/admin/report?cycle=${cycle.id}&status=${s}`} className={`rounded-xl border bg-white p-4 shadow-sm transition hover:border-brand-300 ${status === s ? "border-brand-500 ring-2 ring-brand-100" : "border-slate-200"}`}>
            <p className="text-xs font-medium text-slate-500">{REVIEW_STATUS[s].label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{counts[s]}</p>
            <p className="text-xs text-slate-400">{percent(counts[s], all.length)}% of {all.length}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-4">
        <Card className="h-fit xl:col-span-1">
          <CardHeader title="By department" description="Reviews completed" />
          <ul className="space-y-4 p-5">
            {byDept.map(({ d, total, done }) => (
              <li key={d}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-slate-700">{d}</span>
                  <span className="text-slate-500">{done}/{total}</span>
                </div>
                <ProgressBar value={percent(done, total)} tone="green" label={`${d} completion`} />
              </li>
            ))}
          </ul>
        </Card>

        <Card className="xl:col-span-3">
          <form className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
            <select name="cycle" defaultValue={cycle.id} className="input w-auto" aria-label="Cycle">
              {cycles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select name="status" defaultValue={status ?? ""} className="input w-auto" aria-label="Status">
              <option value="">All statuses</option>
              {REVIEW_STATUS_ORDER.map((s) => <option key={s} value={s}>{REVIEW_STATUS[s].label}</option>)}
            </select>
            <select name="dept" defaultValue={sp.dept ?? ""} className="input w-auto" aria-label="Department">
              <option value="">All departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <input name="q" defaultValue={sp.q} placeholder="Employee or manager" className="input w-44" aria-label="Search" />
            <button className="btn btn-secondary">Apply</button>
            {(status || sp.dept || sp.q) && <Link href={`/admin/report?cycle=${cycle.id}`} className="btn btn-ghost">Clear</Link>}
          </form>
          {rows.length === 0 ? (
            <EmptyState title="No employees match" description="Change or clear the filters." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="table-th">Employee</th>
                    <th className="table-th">Manager</th>
                    <th className="table-th">Goals</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Self</th>
                    <th className="table-th">Manager</th>
                    <th className="table-th"><span className="sr-only">View</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r) => (
                    <tr key={r.employee.id} className="hover:bg-slate-50">
                      <td className="table-td">
                        <p className="font-medium text-slate-900">{r.employee.full_name}</p>
                        <p className="text-xs text-slate-500">{r.employee.department}</p>
                      </td>
                      <td className="table-td">{r.manager?.full_name ?? <span className="text-slate-400">HR</span>}</td>
                      <td className="table-td whitespace-nowrap">{r.goalsApproved}/{r.goalsTotal} approved</td>
                      <td className="table-td"><ReviewStatusBadge status={r.status} /></td>
                      <td className="table-td">{r.review?.overall_self_rating ?? "—"}</td>
                      <td className="table-td font-semibold">{r.review?.overall_manager_rating ?? "—"}</td>
                      <td className="table-td text-right">
                        {r.review && r.status !== "not_started" ? <Link href={`/reviews/${r.review.id}`} className="btn btn-ghost btn-sm">View</Link> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
