import Link from "next/link";
import { notFound } from "next/navigation";
import { canManage, requireEmployee } from "@/lib/auth";
import { getAllCycles, getEmployee, getGoalRatings, getGoals, getOpenCycle, getReview, ensureReview } from "@/lib/data";
import { db, must } from "@/lib/supabase";
import { formatDate, percent } from "@/lib/utils";
import { Alert, Avatar, Card, CardHeader, EmptyState, PageHeader, ProgressBar } from "@/components/ui";
import { GoalStatusBadge, ReviewStatusBadge } from "@/components/status-badges";
import { ReviewStepper } from "@/components/review-stepper";
import { ReviewDetail } from "@/components/review-detail";
import { ActionButton } from "@/components/action-button";
import { approveAllGoals, approveGoal, completeReview } from "../actions";
import { SendBackForm } from "./send-back-form";
import { ManagerReviewForm } from "./manager-review-form";
import type { Review } from "@/lib/types";

export const metadata = { title: "Review employee" };

export default async function TeamMemberPage({ params }: { params: Promise<{ employeeId: string }> }) {
  const me = await requireEmployee();
  const { employeeId } = await params;
  const isUuid = /^[0-9a-f-]{36}$/i.test(employeeId);
  const employee = isUuid ? await getEmployee(employeeId) : null;
  // Same 404 whether the employee does not exist or is not yours — URL edits reveal nothing.
  if (!employee || !canManage(me, employee)) notFound();

  const [cycle, cycles] = await Promise.all([getOpenCycle(), getAllCycles()]);
  const cycleName = new Map(cycles.map((c) => [c.id, c.name]));
  const past = must(
    await db().from("reviews").select("*").eq("employee_id", employee.id).eq("status", "completed").neq("cycle_id", cycle?.id ?? "00000000-0000-0000-0000-000000000000").order("completed_at", { ascending: false }),
    "Load past reviews",
  ) as Review[];

  const header = (
    <PageHeader
      title={
        <span className="flex items-center gap-3">
          <Avatar name={employee.full_name} />
          {employee.full_name}
        </span>
      }
      description={`${employee.designation} · ${employee.department} · Joined ${formatDate(employee.date_of_joining)}`}
      action={<Link href="/team" className="btn btn-secondary">← My team</Link>}
    />
  );

  if (!cycle) {
    return (
      <>
        {header}
        <Card><EmptyState title="No open review cycle" description="Goals and reviews can be worked on once HR opens a cycle." /></Card>
      </>
    );
  }

  const review = (await getReview(employee.id, cycle.id)) ?? (employee.is_active ? await ensureReview(employee, cycle.id) : null);
  const [goals, ratings] = await Promise.all([getGoals(employee.id, cycle.id), review ? getGoalRatings(review.id) : Promise.resolve([])]);
  const total = goals.reduce((s, g) => s + g.weightage, 0);
  const pending = goals.filter((g) => g.status === "submitted");
  const approvedGoals = goals.filter((g) => g.status === "approved");

  return (
    <>
      {header}

      {review && (
        <Card className="mb-6 px-3 py-5 sm:px-6">
          <ReviewStepper status={review.status} />
        </Card>
      )}

      {/* ---------------- Goals ---------------- */}
      <Card className="mb-8">
        <CardHeader
          title={`Goals · ${cycle.name}`}
          description={`${approvedGoals.length} of ${goals.length} approved · total weightage ${total}/100`}
          action={
            pending.length > 1 ? (
              <ActionButton action={approveAllGoals.bind(null, employee.id)} variant="success" size="sm" confirm={`Approve all ${pending.length} pending goals?`}>
                Approve all {pending.length}
              </ActionButton>
            ) : undefined
          }
        />
        <div className="px-5 pt-4">
          <ProgressBar value={percent(total, 100)} tone={total === 100 ? "green" : "brand"} label="Total weightage" />
        </div>
        {goals.length === 0 ? (
          <EmptyState icon="◎" title="No goals yet" description={`${employee.full_name.split(" ")[0]} has not created any goals for this cycle.`} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {goals.map((g) => (
              <li key={g.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{g.title}</p>
                    {g.description && <p className="mt-1 text-sm whitespace-pre-line text-slate-600">{g.description}</p>}
                    <p className="mt-2 text-sm text-slate-500">
                      Weightage <strong className="text-slate-900">{g.weightage}%</strong> · Target <strong className="text-slate-900">{formatDate(g.target_date)}</strong>
                    </p>
                    {g.status === "sent_back" && g.manager_comment && (
                      <p className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-800">Your comment: {g.manager_comment}</p>
                    )}
                  </div>
                  <GoalStatusBadge status={g.status} />
                </div>
                {g.status === "submitted" && (
                  <div className="mt-4 flex flex-wrap items-start gap-2">
                    <ActionButton action={approveGoal.bind(null, employee.id, g.id)} variant="success" size="sm" pendingText="Approving…">
                      Approve
                    </ActionButton>
                    <SendBackForm employeeId={employee.id} goalId={g.id} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ---------------- Review ---------------- */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">Performance review</h2>
        {review && <ReviewStatusBadge status={review.status} />}
      </div>

      {!review || review.status === "not_started" ? (
        <Card>
          <EmptyState icon="✎" title="Waiting for the self-appraisal" description="Once all goals are approved, the employee completes their self-appraisal. You will get an e-mail when it is submitted." />
        </Card>
      ) : review.status === "completed" ? (
        <>
          <div className="mb-4"><Alert tone="green">Completed on {formatDate(review.completed_at)} and shared with the employee.</Alert></div>
          <ReviewDetail review={review} goals={approvedGoals} ratings={ratings} showManager />
        </>
      ) : (
        <>
          {review.status === "manager_reviewed" && (
            <div className="mb-4">
              <Alert tone="amber" title="Review submitted — not yet shared">
                <p>Discuss the review with {employee.full_name.split(" ")[0]}, adjust if needed, then mark it completed. Completing locks the review and shares your ratings with them.</p>
                <div className="mt-3">
                  <ActionButton action={completeReview.bind(null, employee.id)} variant="success" pendingText="Completing…" confirm="Mark this review as Completed? It will be locked and shared with the employee.">
                    Mark review as completed
                  </ActionButton>
                </div>
              </Alert>
            </div>
          )}
          <ManagerReviewForm employeeId={employee.id} employeeName={employee.full_name} review={review} goals={approvedGoals} ratings={ratings} />
        </>
      )}

      {past.length > 0 && (
        <Card className="mt-8">
          <CardHeader title="Previous reviews" />
          <ul className="divide-y divide-slate-100">
            {past.map((r) => (
              <li key={r.id}>
                <Link href={`/reviews/${r.id}`} className="flex items-center justify-between p-4 text-sm hover:bg-slate-50 sm:px-5">
                  <span><span className="font-medium text-slate-900">{cycleName.get(r.cycle_id)}</span> · completed {formatDate(r.completed_at)}</span>
                  <span className="font-medium text-brand-700">Rating {r.overall_manager_rating}/5 ›</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
