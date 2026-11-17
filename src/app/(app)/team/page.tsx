import Link from "next/link";
import { notFound } from "next/navigation";
import { isManager, requireEmployee } from "@/lib/auth";
import { getGoalsForCycle, getOpenCycle, getReviewees, getReviewsForCycle } from "@/lib/data";
import { percent } from "@/lib/utils";
import { Avatar, Badge, Card, EmptyState, PageHeader, ProgressBar, Stat } from "@/components/ui";
import { ReviewStatusBadge } from "@/components/status-badges";
import type { ReviewStatus } from "@/lib/types";

export const metadata = { title: "My team" };

export default async function TeamPage() {
  const me = await requireEmployee();
  if (!(await isManager(me)) && me.role !== "hr_admin") notFound();

  const [team, cycle] = await Promise.all([getReviewees(me), getOpenCycle()]);
  const [reviews, goals] = cycle ? await Promise.all([getReviewsForCycle(cycle.id), getGoalsForCycle(cycle.id)]) : [[], []];

  const rows = team.map((e) => {
    const myGoals = goals.filter((g) => g.employee_id === e.id);
    const review = reviews.find((r) => r.employee_id === e.id);
    const status: ReviewStatus = review?.status ?? "not_started";
    const pendingGoals = myGoals.filter((g) => g.status === "submitted").length;
    const approved = myGoals.filter((g) => g.status === "approved").length;
    let next: { label: string; tone: "amber" | "blue" | "gray" | "green" } = { label: "Waiting on employee", tone: "gray" };
    if (pendingGoals > 0) next = { label: `${pendingGoals} goal${pendingGoals > 1 ? "s" : ""} to approve`, tone: "amber" };
    else if (status === "self_submitted") next = { label: "Ready for your review", tone: "amber" };
    else if (status === "manager_reviewed") next = { label: "Mark as completed", tone: "blue" };
    else if (status === "completed") next = { label: "Done", tone: "green" };
    else if (myGoals.length === 0) next = { label: "No goals set yet", tone: "gray" };
    return { e, status, myGoals, approved, next };
  });

  const completed = rows.filter((r) => r.status === "completed").length;
  const actionNeeded = rows.filter((r) => r.next.tone === "amber" || r.next.tone === "blue").length;

  return (
    <>
      <PageHeader title="My team" description={cycle ? `${cycle.name} — goals, self-appraisals and reviews for the people you manage.` : "No review cycle is open right now."} />

      {team.length === 0 ? (
        <Card>
          <EmptyState icon="☺" title="No direct reports" description="Nobody reports to you yet. HR assigns managers in the employee directory." />
        </Card>
      ) : (
        <>
          {cycle && (
            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              <Stat label="Team members" value={team.length} />
              <Stat label="Need your action" value={actionNeeded} hint="Goals to approve or reviews to write" />
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Reviews completed</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{completed}<span className="text-lg text-slate-400"> / {team.length}</span></p>
                <div className="mt-3"><ProgressBar value={percent(completed, team.length)} tone="green" label="Team completion" /></div>
              </div>
            </div>
          )}
          <Card>
            <ul className="divide-y divide-slate-100">
              {rows.map(({ e, status, myGoals, approved, next }) => (
                <li key={e.id}>
                  <Link href={`/team/${e.id}`} className="flex flex-wrap items-center gap-4 p-4 transition hover:bg-slate-50 sm:px-5">
                    <Avatar name={e.full_name} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">{e.full_name}</p>
                      <p className="truncate text-sm text-slate-500">{e.designation} · {e.department}</p>
                    </div>
                    {cycle && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-500">Goals {approved}/{myGoals.length} approved</span>
                        <ReviewStatusBadge status={status} />
                        <Badge tone={next.tone}>{next.label}</Badge>
                      </div>
                    )}
                    <span className="text-slate-300" aria-hidden>›</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </>
  );
}
