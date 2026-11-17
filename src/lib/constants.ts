import type { CycleStatus, GoalStatus, ReviewStatus, Role } from "./types";

export const APP_NAME = "Cadence";
export const APP_TAGLINE = "Performance management, from goal to rating.";

/**
 * 5-point scale. We keep a middle option ("Meets Expectations") because most
 * people in a healthy organisation genuinely meet expectations; forcing a
 * choice either side (4-point scale) inflates or deflates ratings.
 * See RESEARCH.md §5.
 */
export const RATING_SCALE = [
  { value: 1, label: "Unsatisfactory", hint: "Did not meet most expectations" },
  { value: 2, label: "Needs Improvement", hint: "Met some expectations" },
  { value: 3, label: "Meets Expectations", hint: "Fully met expectations" },
  { value: 4, label: "Exceeds Expectations", hint: "Frequently went beyond" },
  { value: 5, label: "Outstanding", hint: "Consistently exceptional" },
] as const;

export function ratingLabel(value: number | null | undefined): string {
  if (!value) return "—";
  return `${value} · ${RATING_SCALE.find((r) => r.value === value)?.label ?? ""}`;
}

export const ROLE_LABEL: Record<Role, string> = {
  employee: "Employee",
  manager: "Manager",
  hr_admin: "HR Admin",
};

type Tone = "gray" | "blue" | "amber" | "green" | "red" | "violet";

export const CYCLE_STATUS: Record<CycleStatus, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "gray" },
  open: { label: "Open", tone: "green" },
  closed: { label: "Closed", tone: "violet" },
};

export const GOAL_STATUS: Record<GoalStatus, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "gray" },
  submitted: { label: "Pending approval", tone: "amber" },
  approved: { label: "Approved", tone: "green" },
  sent_back: { label: "Sent back", tone: "red" },
};

export const REVIEW_STATUS: Record<ReviewStatus, { label: string; tone: Tone; step: number }> = {
  not_started: { label: "Not Started", tone: "gray", step: 0 },
  self_submitted: { label: "Self-Appraisal Submitted", tone: "blue", step: 1 },
  manager_reviewed: { label: "Manager Reviewed", tone: "amber", step: 2 },
  completed: { label: "Completed", tone: "green", step: 3 },
};

export const REVIEW_STATUS_ORDER: ReviewStatus[] = [
  "not_started",
  "self_submitted",
  "manager_reviewed",
  "completed",
];

export const DEPARTMENTS = [
  "Engineering",
  "Quality Assurance",
  "Product",
  "Design",
  "Sales",
  "Marketing",
  "Customer Success",
  "Finance",
  "Human Resources",
  "Operations",
] as const;
