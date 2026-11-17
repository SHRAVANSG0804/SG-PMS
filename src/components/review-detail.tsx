import type { Goal, GoalRating, Review } from "@/lib/types";
import { formatDate, weightedScore } from "@/lib/utils";
import { Card, CardHeader } from "./ui";
import { RatingPill } from "./rating-input";

/**
 * Read-only review: self-appraisal on the left, manager assessment on the
 * right. `showManager` is false for an employee until the review is Completed,
 * so they never see a half-written manager rating.
 */
export function ReviewDetail({
  review,
  goals,
  ratings,
  showManager,
}: {
  review: Review;
  goals: Goal[];
  ratings: GoalRating[];
  showManager: boolean;
}) {
  const byGoal = new Map(ratings.map((r) => [r.goal_id, r]));
  const selfScore = weightedScore(goals.map((g) => ({ weightage: g.weightage, rating: byGoal.get(g.id)?.self_rating })));
  const mgrScore = weightedScore(goals.map((g) => ({ weightage: g.weightage, rating: byGoal.get(g.id)?.manager_rating })));

  return (
    <div className="space-y-4">
      {goals.map((g, i) => {
        const r = byGoal.get(g.id);
        return (
          <Card key={g.id}>
            <CardHeader title={<>Goal {i + 1}: {g.title}</>} description={`Weightage ${g.weightage}% · Target ${formatDate(g.target_date)}`} />
            <div className={showManager ? "grid divide-y divide-slate-100 md:grid-cols-2 md:divide-x md:divide-y-0" : ""}>
              <div className="space-y-2 p-5">
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Self-appraisal</p>
                <p className="text-sm whitespace-pre-line text-slate-700">{r?.self_comment || <span className="text-slate-400">No comment</span>}</p>
                <RatingPill value={r?.self_rating} />
              </div>
              {showManager && (
                <div className="space-y-2 bg-slate-50/60 p-5">
                  <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Manager assessment</p>
                  <p className="text-sm whitespace-pre-line text-slate-700">{r?.manager_comment || <span className="text-slate-400">No comment</span>}</p>
                  <RatingPill value={r?.manager_rating} />
                </div>
              )}
            </div>
          </Card>
        );
      })}

      <Card>
        <CardHeader title="Overall" />
        <div className={showManager ? "grid divide-y divide-slate-100 md:grid-cols-2 md:divide-x md:divide-y-0" : ""}>
          <div className="space-y-3 p-5">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Employee</p>
            <RatingPill value={review.overall_self_rating} label="Overall self-rating" />
            {selfScore !== null && <p className="text-xs text-slate-500">Weighted goal score: {selfScore} / 5</p>}
            {review.self_summary && <p className="text-sm whitespace-pre-line text-slate-700">{review.self_summary}</p>}
            {review.submitted_at && <p className="text-xs text-slate-400">Submitted {formatDate(review.submitted_at)}</p>}
          </div>
          {showManager && (
            <div className="space-y-3 bg-slate-50/60 p-5">
              <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Manager</p>
              <RatingPill value={review.overall_manager_rating} label="Overall rating" />
              {mgrScore !== null && <p className="text-xs text-slate-500">Weighted goal score: {mgrScore} / 5</p>}
              {review.manager_summary && <p className="text-sm whitespace-pre-line text-slate-700">{review.manager_summary}</p>}
              {review.completed_at && <p className="text-xs text-slate-400">Completed {formatDate(review.completed_at)}</p>}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
