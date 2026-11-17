# Screens

> The manual asks for a **hand-drawn sketch**, photographed and committed (e.g. `docs/sketch.jpg`). This file maps the screens that were built; draw your sketch from it.

| # | Screen | Route | Who | What it shows |
|---|---|---|---|---|
| 1 | Landing | `/` | Public | Product pitch, workflow steps, three feature cards, Sign in |
| 2 | Sign in / up | `/sign-in`, `/sign-up` | Public | Clerk |
| 3 | Not registered | `/not-registered` | Signed in, no employee row | "Your account is not yet set up. Please contact HR." |
| 4 | Dashboard | `/dashboard` | All, role-aware | **Employee:** stepper + next step. **Manager:** + team completion, action-needed list. **HR:** + company completion, status breakdown, rating distribution |
| 5 | My Goals | `/goals` | All | Weightage meter (must hit 100), add/edit/delete drafts, submit for approval, manager's send-back comment |
| 6 | My Review | `/review` | All | Self-appraisal per goal (comment + 1–5), overall rating, draft/submit; read-only after submitting; manager ratings shown once Completed |
| 7 | Past Reviews | `/history` | All | Every cycle with status and final rating |
| 8 | My Team | `/team` | Managers (+HR for top-level staff) | Direct reports with review status and "next action" badge |
| 9 | Review Employee | `/team/[employeeId]` | That employee's manager | Goal approval (approve / send back with comment) → self-appraisal **left**, manager input **right** → submit → mark completed |
| 10 | Review (read-only) | `/reviews/[reviewId]` | Owner / reviewer / HR | Single permission-checked view used by history, team and report |
| 11 | Admin: Employees | `/admin/employees` (+ `/new`, `/[id]`) | HR | Search, add, edit, assign manager and role, deactivate |
| 12 | Admin: Cycles | `/admin/cycles` | HR | Create (draft) → open → close; completion bar per cycle |
| 13 | Admin: Completion Report | `/admin/report` | HR | Status tiles, by-department progress, filterable table, **Export CSV** |
