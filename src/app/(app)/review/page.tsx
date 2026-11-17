import Link from "next/link";
import { requireEmployee } from "@/lib/auth";
import { ensureReview, getEmployee, getGoalRatings, getGoals, getOpenCycle } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { Alert, Card, EmptyState, PageHeader } from "@/components/ui";
import { ReviewStatusBadge } from "@/components/status-badges";
import { ReviewStepper } from "@/components/review-stepper";
import { ReviewDetail } from "@/components/review-detail";
import { ResendNotificationButton } from "@/components/resend-notification";
import { SelfAppraisalForm } from "./self-appraisal-form";

export const metadata = { title: "My review" };

export default async function MyReviewPage() {
  const me = await requireEmployee();
  const cycle = await getOpenCycle();

  if (!cycle) {
    return (
      <>
        <PageHeader title="My review" />
        <Card>
          <EmptyState icon="✎" title="No open review cycle" description="Your self-appraisal opens when HR opens a review cycle. Past reviews are always available." action={<Link href="/history" className="btn btn-secondary">See past reviews</Link>} />
        </Card>
      </>
    );
  }

  // Always the signed-in user's OWN review — there is no id in this URL to tamper with.
  const review = await ensureReview(me, cycle.id);
  const [goals, ratings, manager] = await Promise.all([
    getGoals(me.id, cycle.id),
    getGoalRatings(review.id),
    review.manager_id ? getEmployee(review.manager_id) : Promise.resolve(null),
  ]);
  const total = goals.reduce((s, g) => s + g.weightage, 0);
  const ready = goals.length > 0 && total === 100 && goals.every((g) => g.status === "approved");

  return (
    <>
      <PageHeader
        title="My review"
        description={`${cycle.name} · Reviewer: ${manager?.full_name ?? "HR Admin"}`}
        action={<ReviewStatusBadge status={review.status} />}
      />
      <Card className="mb-6 px-3 py-5 sm:px-6">
        <ReviewStepper status={review.status} />
      </Card>

      {review.status === "not_started" && !ready && (
        <Card>
          <EmptyState
            icon="◎"
            title="Your goals need approval first"
            description={
              goals.length === 0
                ? "You have not set any goals for this cycle yet. Set goals totalling 100 weightage and submit them to your manager."
                : `${goals.filter((g) => g.status === "approved").length} of ${goals.length} goals approved (total weightage ${total}). The self-appraisal opens once every goal is approved.`
            }
            action={<Link href="/goals" className="btn btn-primary">Go to my goals</Link>}
          />
        </Card>
      )}

      {review.status === "not_started" && ready && (
        <>
          <div className="mb-4">
            <Alert tone="blue" title="Self-appraisal">
              For each goal, describe what you actually achieved and rate yourself. Save a draft any time; your manager sees
              nothing until you submit.
            </Alert>
          </div>
          <SelfAppraisalForm review={review} goals={goals} ratings={ratings} />
        </>
      )}

      {(review.status === "self_submitted" || review.status === "manager_reviewed") && (
        <>
          <div className="mb-4">
            <Alert tone="blue" title={`Submitted on ${formatDate(review.submitted_at)}`}>
              <p>Your manager is reviewing your self-appraisal. You will see their ratings once the review is completed.</p>
              {review.status === "self_submitted" && (
                <div className="mt-3">
                  <ResendNotificationButton reviewId={review.id} />
                </div>
              )}
            </Alert>
          </div>
          <ReviewDetail review={review} goals={goals} ratings={ratings} showManager={false} />
        </>
      )}

      {review.status === "completed" && (
        <>
          <div className="mb-4">
            <Alert tone="green" title={`Review completed on ${formatDate(review.completed_at)}`}>
              Here is your manager&apos;s assessment alongside your self-appraisal.
            </Alert>
          </div>
          <ReviewDetail review={review} goals={goals} ratings={ratings} showManager />
        </>
      )}
    </>
  );
}
