import "server-only";
import { canReview } from "./auth";
import type { Employee, Review } from "./types";

export type ReviewAccess = { allowed: false } | { allowed: true; showSelf: boolean; showManager: boolean; as: "owner" | "reviewer" | "hr" };

/**
 * THE rule for who may read a review. Used by every read-only review page.
 *  - The employee: always their own; manager ratings only once Completed.
 *  - The reviewer (their manager): once the self-appraisal has been submitted.
 *  - HR Admin: any review once the self-appraisal has been submitted.
 *  - Anyone else — including another employee editing the URL — gets nothing.
 * Drafts (Not Started) are private to the employee who is writing them.
 */
export function reviewAccess(me: Employee, review: Review): ReviewAccess {
  if (review.employee_id === me.id) {
    return { allowed: true, as: "owner", showSelf: true, showManager: review.status === "completed" };
  }
  if (review.status === "not_started") return { allowed: false };
  if (canReview(me, review)) return { allowed: true, as: "reviewer", showSelf: true, showManager: true };
  if (me.role === "hr_admin") return { allowed: true, as: "hr", showSelf: true, showManager: true };
  return { allowed: false };
}
