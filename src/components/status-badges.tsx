import { Badge } from "./ui";
import { CYCLE_STATUS, GOAL_STATUS, REVIEW_STATUS } from "@/lib/constants";
import type { CycleStatus, GoalStatus, ReviewStatus } from "@/lib/types";

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  const s = REVIEW_STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
export function GoalStatusBadge({ status }: { status: GoalStatus }) {
  const s = GOAL_STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
export function CycleStatusBadge({ status }: { status: CycleStatus }) {
  const s = CYCLE_STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
