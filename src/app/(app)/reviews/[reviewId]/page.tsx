import Link from "next/link";
import { notFound } from "next/navigation";
import { requireEmployee } from "@/lib/auth";
import { getCycle, getEmployee, getGoalRatings, getGoals, getReviewById } from "@/lib/data";
import { reviewAccess } from "@/lib/review-access";
import { formatDate } from "@/lib/utils";
import { Alert, Avatar, Card, PageHeader } from "@/components/ui";
import { ReviewStatusBadge } from "@/components/status-badges";
import { ReviewStepper } from "@/components/review-stepper";
import { ReviewDetail } from "@/components/review-detail";

export const metadata = { title: "Review" };

export default async function ReviewPage({ params }: { params: Promise<{ reviewId: string }> }) {
  const me = await requireEmployee();
  const { reviewId } = await params;
  const review = /^[0-9a-f-]{36}$/i.test(reviewId) ? await getReviewById(reviewId) : null;
  // Not found and not allowed look identical: a 404 leaks nothing.
  if (!review) notFound();
  const access = reviewAccess(me, review);
  if (!access.allowed) notFound();

  const [employee, reviewer, cycle, goals, ratings] = await Promise.all([
    getEmployee(review.employee_id),
    review.manager_id ? getEmployee(review.manager_id) : Promise.resolve(null),
    getCycle(review.cycle_id),
    getGoals(review.employee_id, review.cycle_id),
    getGoalRatings(review.id),
  ]);
  const back = access.as === "owner" ? "/history" : access.as === "hr" ? `/admin/report?cycle=${review.cycle_id}` : `/team/${review.employee_id}`;

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {employee && <Avatar name={employee.full_name} />}
            {access.as === "owner" ? "My review" : employee?.full_name}
          </span>
        }
        description={`${cycle?.name ?? "Cycle"} · ${employee?.designation ?? ""} · Reviewer: ${reviewer?.full_name ?? "HR Admin"}`}
        action={
          <>
            <ReviewStatusBadge status={review.status} />
            <Link href={back} className="btn btn-secondary">← Back</Link>
          </>
        }
      />
      <Card className="mb-6 px-3 py-5 sm:px-6"><ReviewStepper status={review.status} /></Card>
      {access.as === "owner" && !access.showManager && review.status !== "not_started" && (
        <div className="mb-4"><Alert tone="blue">Your manager&apos;s ratings appear here once the review is completed.</Alert></div>
      )}
      {review.status === "not_started" && access.as === "owner" ? (
        <Alert tone="gray">This self-appraisal was never submitted{cycle?.status === "open" ? " — continue it from My Review" : ""}.</Alert>
      ) : (
        <ReviewDetail review={review} goals={goals.filter((g) => g.status === "approved")} ratings={ratings} showManager={access.showManager} />
      )}
      {review.completed_at && <p className="mt-4 text-xs text-slate-400">Completed {formatDate(review.completed_at)}</p>}
    </>
  );
}
