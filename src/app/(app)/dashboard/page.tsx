import Link from "next/link";
import { isManager, requireEmployee } from "@/lib/auth";
import { ensureReview, getGoals, getGoalsForCycle, getOpenCycle, getReviewees, getReviewsForCycle } from "@/lib/data";
import { buildCycleReport } from "@/lib/report";
import { RATING_SCALE, REVIEW_STATUS, REVIEW_STATUS_ORDER } from "@/lib/constants";
import { formatDate, percent } from "@/lib/utils";
import { Alert, Avatar, Card, CardHeader, EmptyState, PageHeader, ProgressBar, Stat } from "@/components/ui";
import { ReviewStatusBadge } from "@/components/status-badges";
import { ReviewStepper } from "@/components/review-stepper";
import type { Employee, Goal, Review, ReviewCycle } from "@/lib/types";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const me = await requireEmployee();
  const [cycle, manager] = await Promise.all([getOpenCycle(), isManager(me)]);
  const first = me.full_name.split(" ")[0];

  return (
    <>
      <PageHeader
        title={`Hello, ${first}`}
        description={cycle ? `${cycle.name} is open · ${formatDate(cycle.start_date)} – ${formatDate(cycle.end_date)}` : "No review cycle is open right now."}
      />
      <div className="space-y-8">
        {me.role === "hr_admin" && <HrOverview cycle={cycle} />}
        {(manager || me.role === "hr_admin") && cycle && <TeamOverview me={me} cycle={cycle} />}
        <MyProgress me={me} cycle={cycle} />
      </div>
    </>
  );
}

/* ------------------------------ Employee ------------------------------ */

function nextStep(goals: Goal[], review: Review): { text: string; href: string; cta: string } | null {
  const total = goals.reduce((s, g) => s + g.weightage, 0);
  if (goals.length === 0) return { text: "Set your goals for this cycle. Weightages must total 100.", href: "/goals", cta: "Set goals" };
  if (goals.some((g) => g.status === "sent_back")) return { text: "Your manager sent back a goal with a comment. Update and resubmit it.", href: "/goals", cta: "Fix goals" };
  if (goals.some((g) => g.status === "draft") || total !== 100) return { text: `Finish your goals (total ${total}/100) and submit them for approval.`, href: "/goals", cta: "Continue goals" };
  if (goals.some((g) => g.status === "submitted")) return { text: "Your goals are waiting for your manager's approval.", href: "/goals", cta: "View goals" };
  if (review.status === "not_started") return { text: "All goals are approved. Complete your self-appraisal.", href: "/review", cta: "Start self-appraisal" };
  if (review.status === "completed") return { text: "Your review is complete. See your manager's assessment.", href: "/review", cta: "View review" };
  return { text: "Your self-appraisal is with your manager.", href: "/review", cta: "View submission" };
}

async function MyProgress({ me, cycle }: { me: Employee; cycle: ReviewCycle | null }) {
  if (!cycle) {
    return (
      <Card>
        <CardHeader title="My performance" />
        <EmptyState icon="◎" title="Nothing to do right now" description="When HR opens a review cycle you will set goals here. Past reviews are always available." action={<Link href="/history" className="btn btn-secondary">Past reviews</Link>} />
      </Card>
    );
  }
  const [goals, review] = await Promise.all([getGoals(me.id, cycle.id), ensureReview(me, cycle.id)]);
  const total = goals.reduce((s, g) => s + g.weightage, 0);
  const approved = goals.filter((g) => g.status === "approved").length;
  const step = nextStep(goals, review);

  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-slate-900">My performance</h2>
      <Card>
        <div className="border-b border-slate-100 px-3 py-5 sm:px-6"><ReviewStepper status={review.status} /></div>
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase">Goals approved</p>
            <p className="mt-1 text-2xl font-bold">{approved}<span className="text-base text-slate-400"> / {goals.length}</span></p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase">Weightage allocated</p>
            <p className="mt-1 text-2xl font-bold">{total}<span className="text-base text-slate-400"> / 100</span></p>
            <div className="mt-2"><ProgressBar value={total} tone={total === 100 ? "green" : "brand"} label="Weightage" /></div>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase">Review status</p>
            <div className="mt-2"><ReviewStatusBadge status={review.status} /></div>
          </div>
        </div>
        {step && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-brand-50/50 px-5 py-4">
            <p className="text-sm text-slate-700"><span className="font-semibold text-brand-700">Next: </span>{step.text}</p>
            <Link href={step.href} className="btn btn-primary btn-sm">{step.cta}</Link>
          </div>
        )}
      </Card>
    </section>
  );
}

/* ------------------------------ Manager ------------------------------- */

async function TeamOverview({ me, cycle }: { me: Employee; cycle: ReviewCycle }) {
  const team = await getReviewees(me);
  if (team.length === 0) return null;
  const [reviews, goals] = await Promise.all([getReviewsForCycle(cycle.id), getGoalsForCycle(cycle.id)]);
  const rows = team.map((e) => ({
    e,
    status: reviews.find((r) => r.employee_id === e.id)?.status ?? "not_started",
    pending: goals.filter((g) => g.employee_id === e.id && g.status === "submitted").length,
  }));
  const done = rows.filter((r) => r.status === "completed").length;
  const todo = rows.filter((r) => r.pending > 0 || r.status === "self_submitted" || r.status === "manager_reviewed");

  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-slate-900">My team</h2>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-1 lg:grid-cols-1">
          <Stat label="Team completion" value={`${percent(done, team.length)}%`} hint={`${done} of ${team.length} completed`} href="/team" />
          <Stat label="Waiting on you" value={todo.length} hint="Goals to approve or reviews to write" href="/team" />
        </div>
        <Card className="lg:col-span-2">
          <CardHeader title="Action needed" action={<Link href="/team" className="btn btn-ghost btn-sm">All team ›</Link>} />
          {todo.length === 0 ? (
            <EmptyState icon="✓" title="You're all caught up" description="Nothing needs your action right now." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {todo.slice(0, 6).map(({ e, status, pending }) => (
                <li key={e.id}>
                  <Link href={`/team/${e.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3 hover:bg-slate-50">
                    <Avatar name={e.full_name} size="sm" />
                    <span className="flex-1 text-sm font-medium text-slate-900">{e.full_name}</span>
                    <span className="text-xs text-amber-700">
                      {pending > 0 ? `${pending} goal${pending > 1 ? "s" : ""} to approve` : status === "self_submitted" ? "Write review" : "Mark completed"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </section>
  );
}

/* -------------------------------- HR ---------------------------------- */

async function HrOverview({ cycle }: { cycle: ReviewCycle | null }) {
  if (!cycle) {
    return (
      <Alert tone="amber" title="No cycle is open">
        Employees cannot set goals until a review cycle is open. <Link href="/admin/cycles" className="font-semibold underline">Create or open a cycle</Link>.
      </Alert>
    );
  }
  const rows = await buildCycleReport(cycle.id);
  const total = rows.length;
  const count = (s: string) => rows.filter((r) => r.status === s).length;
  const completed = rows.filter((r) => r.status === "completed");
  const noGoals = rows.filter((r) => r.goalsTotal === 0).length;
  const dist = RATING_SCALE.map((r) => ({ ...r, n: completed.filter((x) => x.review?.overall_manager_rating === r.value).length }));
  const maxN = Math.max(1, ...dist.map((d) => d.n));

  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-slate-900">Company overview</h2>
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Employees in cycle" value={total} href="/admin/report" />
        <Stat label="Completion" value={`${percent(completed.length, total)}%`} hint={`${completed.length} review${completed.length === 1 ? "" : "s"} completed`} href="/admin/report?status=completed" />
        <Stat label="Awaiting manager" value={count("self_submitted") + count("manager_reviewed")} hint="Self-appraisal submitted" href="/admin/report?status=self_submitted" />
        <Stat label="No goals yet" value={noGoals} hint="Need a nudge" href="/admin/report?status=not_started" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Review status" description={cycle.name} />
          <ul className="space-y-4 p-5">
            {REVIEW_STATUS_ORDER.map((s) => (
              <li key={s}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-slate-700">{REVIEW_STATUS[s].label}</span>
                  <span className="font-medium text-slate-900">{count(s)}</span>
                </div>
                <ProgressBar value={percent(count(s), total)} tone={s === "completed" ? "green" : s === "not_started" ? "red" : "brand"} label={REVIEW_STATUS[s].label} />
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Final rating distribution" description={`${completed.length} completed review${completed.length === 1 ? "" : "s"}`} />
          {completed.length === 0 ? (
            <EmptyState icon="▥" title="No completed reviews yet" description="The distribution of final manager ratings appears here as reviews are completed." />
          ) : (
            <ul className="space-y-3 p-5">
              {dist.map((d) => (
                <li key={d.value} className="grid grid-cols-[9.5rem_1fr_2rem] items-center gap-3 text-sm">
                  <span className="truncate text-slate-700">{d.value} · {d.label}</span>
                  <div className="h-5 overflow-hidden rounded bg-slate-100">
                    <div className="h-full rounded bg-brand-500" style={{ width: `${(d.n / maxN) * 100}%` }} />
                  </div>
                  <span className="text-right font-medium text-slate-900">{d.n}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </section>
  );
}
