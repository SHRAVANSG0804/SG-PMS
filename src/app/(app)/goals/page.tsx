import Link from "next/link";
import { requireEmployee } from "@/lib/auth";
import { getEmployee, getGoals, getOpenCycle, getReview } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { Alert, Card, CardHeader, EmptyState, PageHeader, ProgressBar } from "@/components/ui";
import { GoalStatusBadge } from "@/components/status-badges";
import { ActionButton } from "@/components/action-button";
import { GoalForm } from "./goal-form";
import { deleteGoal, submitGoals } from "./actions";

export const metadata = { title: "My goals" };

export default async function GoalsPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const me = await requireEmployee();
  const { edit } = await searchParams;
  const cycle = await getOpenCycle();

  if (!cycle) {
    return (
      <>
        <PageHeader title="My goals" />
        <Card>
          <EmptyState icon="◎" title="No open review cycle" description="Goals are set against an open review cycle. HR has not opened one yet — you will be able to add goals as soon as they do." action={<Link href="/history" className="btn btn-secondary">See past reviews</Link>} />
        </Card>
      </>
    );
  }

  const [goals, review, manager] = await Promise.all([
    getGoals(me.id, cycle.id),
    getReview(me.id, cycle.id),
    me.manager_id ? getEmployee(me.manager_id) : Promise.resolve(null),
  ]);
  const locked = !!review && review.status !== "not_started";
  const total = goals.reduce((s, g) => s + g.weightage, 0);
  const editable = (g: (typeof goals)[number]) => !locked && (g.status === "draft" || g.status === "sent_back");
  const pendingSubmit = goals.filter(editable).length;
  const allApproved = goals.length > 0 && goals.every((g) => g.status === "approved");
  const editing = edit ? goals.find((g) => g.id === edit && editable(g)) : undefined;

  return (
    <>
      <PageHeader
        title="My goals"
        description={`${cycle.name} · ${formatDate(cycle.start_date)} – ${formatDate(cycle.end_date)} · Approver: ${manager?.full_name ?? "HR Admin"}`}
        action={
          !locked && pendingSubmit > 0 ? (
            <ActionButton action={submitGoals} variant="primary" pendingText="Submitting…" confirm={total === 100 ? `Submit ${pendingSubmit} goal(s) to ${manager?.full_name ?? "HR"} for approval?` : undefined}>
              Submit for approval
            </ActionButton>
          ) : undefined
        }
      />

      <div className="mb-6 space-y-3">
        {locked && <Alert tone="blue">Your self-appraisal has been submitted, so goals for this cycle are locked.</Alert>}
        {!locked && allApproved && (
          <Alert tone="green" title="All goals approved">
            Next step: <Link href="/review" className="font-semibold underline">complete your self-appraisal</Link>.
          </Alert>
        )}
        {goals.some((g) => g.status === "sent_back") && !locked && (
          <Alert tone="red">Your manager sent back one or more goals. Read their comment, edit the goal, and submit again.</Alert>
        )}
      </div>

      <Card className="mb-6 p-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">Total weightage</span>
          <span className={total === 100 ? "font-bold text-emerald-600" : total > 100 ? "font-bold text-red-600" : "font-bold text-slate-900"}>
            {total} / 100
          </span>
        </div>
        <ProgressBar value={total} tone={total === 100 ? "green" : total > 100 ? "red" : "brand"} label="Total weightage" />
        {total !== 100 && goals.length > 0 && (
          <p className="mt-2 text-xs text-slate-500">Weightages must add up to exactly 100 before you can submit. {100 - total} left to allocate.</p>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          {goals.length === 0 ? (
            <Card>
              <EmptyState icon="◎" title="No goals yet" description="Add 3–5 goals that together describe what you will achieve this cycle. Give each a weightage so they total 100." />
            </Card>
          ) : (
            goals.map((g) =>
              editing?.id === g.id ? (
                <Card key={g.id} className="border-brand-300 p-5 ring-2 ring-brand-100">
                  <p className="mb-4 text-sm font-semibold text-slate-900">Edit goal</p>
                  <GoalForm goal={g} remaining={100 - (total - g.weightage)} minDate={cycle.start_date} maxDate={cycle.end_date} />
                </Card>
              ) : (
                <Card key={g.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-900">{g.title}</h3>
                      {g.description && <p className="mt-1 text-sm whitespace-pre-line text-slate-600">{g.description}</p>}
                    </div>
                    <GoalStatusBadge status={g.status} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500">
                    <span>Weightage <strong className="text-slate-900">{g.weightage}%</strong></span>
                    <span>Target <strong className="text-slate-900">{formatDate(g.target_date)}</strong></span>
                  </div>
                  {g.manager_comment && g.status === "sent_back" && (
                    <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                      <span className="font-semibold">Manager comment:</span> {g.manager_comment}
                    </div>
                  )}
                  {editable(g) && (
                    <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                      <Link href={`/goals?edit=${g.id}`} className="btn btn-secondary btn-sm">Edit</Link>
                      <ActionButton action={deleteGoal.bind(null, g.id)} variant="ghost" size="sm" confirm={`Delete "${g.title}"?`}>
                        Delete
                      </ActionButton>
                    </div>
                  )}
                </Card>
              ),
            )
          )}
        </div>

        <div className="lg:col-span-2">
          {!locked && total < 100 && !editing ? (
            <Card className="lg:sticky lg:top-24">
              <CardHeader title="Add a goal" description="Write it SMART: specific, measurable, achievable, relevant, time-bound." />
              <div className="p-5">
                <GoalForm key={`new-${goals.length}-${total}`} remaining={100 - total} minDate={cycle.start_date} maxDate={cycle.end_date} />
              </div>
            </Card>
          ) : !locked && !editing ? (
            <Card className="p-5 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Weightage fully allocated</p>
              <p className="mt-1">To add another goal, reduce the weightage of an existing draft goal first.</p>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
