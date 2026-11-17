import Link from "next/link";
import { requireEmployee } from "@/lib/auth";
import { getAllCycles } from "@/lib/data";
import { db, must } from "@/lib/supabase";
import { ratingLabel } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { CycleStatusBadge, ReviewStatusBadge } from "@/components/status-badges";
import type { Review } from "@/lib/types";

export const metadata = { title: "Past reviews" };

export default async function HistoryPage() {
  const me = await requireEmployee();
  // Filtered by MY id on the server — the list can only ever contain my reviews.
  const [reviews, cycles] = await Promise.all([
    db().from("reviews").select("*").eq("employee_id", me.id).then((r) => must(r, "Load my reviews") as Review[]),
    getAllCycles(),
  ]);
  const cycleById = new Map(cycles.map((c) => [c.id, c]));
  const rows = reviews
    .map((r) => ({ r, c: cycleById.get(r.cycle_id) }))
    .sort((a, b) => (b.c?.start_date ?? "").localeCompare(a.c?.start_date ?? ""));

  return (
    <>
      <PageHeader title="Past reviews" description="Every review cycle you have taken part in. Manager ratings show once a review is completed." />
      <Card>
        {rows.length === 0 ? (
          <EmptyState icon="▤" title="No reviews yet" description="Your reviews will be listed here after your first review cycle." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="table-th">Cycle</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Self-rating</th>
                  <th className="table-th">Final rating</th>
                  <th className="table-th">Completed</th>
                  <th className="table-th"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(({ r, c }) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="table-td">
                      <p className="font-medium text-slate-900">{c?.name}</p>
                      {c && <div className="mt-1"><CycleStatusBadge status={c.status} /></div>}
                    </td>
                    <td className="table-td"><ReviewStatusBadge status={r.status} /></td>
                    <td className="table-td whitespace-nowrap">{ratingLabel(r.overall_self_rating)}</td>
                    <td className="table-td whitespace-nowrap font-medium">{r.status === "completed" ? ratingLabel(r.overall_manager_rating) : "—"}</td>
                    <td className="table-td whitespace-nowrap">{formatDate(r.completed_at)}</td>
                    <td className="table-td text-right">
                      {c?.status === "open" ? (
                        <Link href="/review" className="btn btn-ghost btn-sm">Open</Link>
                      ) : (
                        <Link href={`/reviews/${r.id}`} className="btn btn-ghost btn-sm">View</Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
