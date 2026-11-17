# Cadence — Performance Management System

A web app that lets **HR** run a performance cycle end to end, **employees** set weighted goals and complete a self-appraisal, and **managers** approve goals and review their direct reports. The whole record is stored, searchable and auditable.

Built for *AI Applications in New Age HR — Project 2 (AI PMS Lab)*.

**Stack:** Next.js 15 (App Router, TypeScript, Server Actions) · Tailwind CSS 4 · Clerk (auth) · Supabase Postgres · Resend (e-mail) · Vercel (hosting)

- Research note: [`RESEARCH.md`](RESEARCH.md)
- Data model diagram: [`docs/data-model.md`](docs/data-model.md)
- Screen map: [`docs/screens.md`](docs/screens.md)

---

## Features (manual §6.1, all 12 in-scope modules)

| # | Module | Where |
|---|---|---|
| 1 | Clerk sign-in; on first login the Clerk user is linked to an employee row by **verified** e-mail | `src/lib/auth.ts` |
| 2 | Roles: Employee / Manager / HR Admin. Navigation **and** data change by role. "Manager" also means *anyone with direct reports* | `src/app/(app)/layout.tsx` |
| 3 | Employee directory: name, e-mail, designation, department, DOJ, manager (dropdown), role, active | `/admin/employees` |
| 4 | Review cycles: Draft → Open → Closed; only one open (enforced by the DB) | `/admin/cycles` |
| 5 | Goals: title, description, weightage, target date; weightages must total **100** | `/goals` |
| 6 | Goal approval: Draft → Submitted → Approved, or **Sent back** with a required comment | `/team/[id]` |
| 7 | Self-appraisal: comment + 1–5 rating per approved goal, overall rating; save draft / submit | `/review` |
| 8 | Manager review: self-appraisal **left**, manager input **right**; per-goal rating, overall rating, summary | `/team/[id]` |
| 9 | Status workflow: Not Started → Self-Appraisal Submitted → Manager Reviewed → Completed, shown everywhere with a stepper | `src/components/review-stepper.tsx` |
| 10 | Role-aware dashboards: employee progress, team completion, company-wide completion and rating distribution | `/dashboard` |
| 11 | E-mail (Resend): self-appraisal submitted → manager (**required**); also goals submitted, goal sent back, review completed | `src/lib/email.ts`, `/api/notify-manager` |
| 12 | Responsive, works on a phone | tested at iPhone 13 size |

**Extras:** audit log, CSV export of ratings, reporting-loop prevention, weighted goal score, past-review history, manager reassignment mid-cycle, HR as the fallback reviewer for staff with no manager.

---

## Setup (about 20 minutes)

### 1. Install
```bash
npm install
cp .env.example .env.local
```

### 2. Supabase
1. Create a free project at supabase.com.
2. **SQL Editor → New query →** paste [`supabase/schema.sql`](supabase/schema.sql) → Run.
3. Open [`supabase/seed.sql`](supabase/seed.sql), **replace the four `@example.com` e-mails with addresses you can sign in with** (Gmail `+` aliases work: `you+hr@gmail.com`, `you+mgr@gmail.com`, `you+emp@gmail.com`), then run it.
4. **Project Settings → API:** copy the Project URL into `NEXT_PUBLIC_SUPABASE_URL` and the **service_role** key into `SUPABASE_SERVICE_ROLE_KEY`.

### 3. Clerk
1. Create an application at clerk.com with **E-mail** sign-in enabled.
2. Copy the keys into `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.

### 4. Resend
1. Create a free account at resend.com and an API key, then put it in `RESEND_API_KEY`.
2. Keep `EMAIL_FROM="PMS <onboarding@resend.dev>"`.
   ⚠️ With the free test sender, Resend **only delivers to the e-mail address you signed up to Resend with**. For the demo, make the *manager's* employee e-mail that same address (a `+alias` of it does **not** count).

### 5. Run
```bash
npm run dev
```
Open http://localhost:3000 and sign in with the HR e-mail from the seed.

### 6. Deploy to Vercel
1. Push to GitHub, then on vercel.com choose **Add New → Project** and import the repo.
2. **Settings → Environment Variables:** add every variable from `.env.local`. Set `NEXT_PUBLIC_APP_URL` to your Vercel URL, then **Redeploy**.
3. In Clerk, add the Vercel domain to the allowed domains / production instance.

---

## Demo script (manual §10, run the night before)

1. Sign in as **HR** → Cycles → create "FY 2026–27 Annual" → **Open cycle**.
2. Employees → **Add employee** → assign a manager.
3. Sign in as **that employee** → My Goals → add 3 goals totalling 100 → **Submit for approval**.
4. Sign in as the **manager** → My Team → the employee → **Approve** (try **Send back** on one first).
5. Sign in as the **employee** → My Review → fill in each goal → **Submit self-appraisal**.
6. Check the manager's inbox for the e-mail.
7. Sign in as the **manager** → write the review → **Submit review** → **Mark review as completed**.
8. Sign in as **HR** → Completion Report shows the employee as **Completed**. Use **Export CSV** to download the ratings.

**Security check to show:** signed in as a different employee, paste the first employee's `/reviews/<id>` or `/team/<id>` URL. You get a 404.

---

## How it works (for the viva)

**Who is this user?** `src/lib/auth.ts → getCurrentEmployee()` runs on the **server**. It reads the Clerk session, then finds the `employees` row with that `clerk_user_id`. On first sign-in it matches the user's *verified* e-mail and stores the Clerk id. Roles come from our database, not from Clerk, so HR controls them.

**Why can't someone read another person's review?** Four layers:
1. The navigation is built on the server per role. Hiding links is cosmetic only.
2. Every page and server action re-checks permissions (`requireRole`, `canManage`, `canReview`, `reviewAccess`). Not found and not allowed both return a **404**, so a probed URL reveals nothing.
3. **Supabase RLS is ON** for every table with no public policies. The browser never queries the database, and the public anon key can read nothing. Server code uses the service-role key, which is marked `server-only` so the build fails if it is ever imported into browser code.
4. Database constraints: one open cycle, one review per employee per cycle, valid statuses, ratings 1–5.

**Why is e-mail sent from the server?** The Resend key is a secret. Anything that runs in the browser is public. E-mail is also a *side effect*: if it fails, the self-appraisal is still saved and the user is told.

**Workflow state machine**

| Object | States | Guarded in |
|---|---|---|
| Cycle | draft → open → closed | `admin/cycles/actions.ts` |
| Goal | draft → submitted → approved, submitted → sent_back → submitted | `goals/actions.ts`, `team/actions.ts` |
| Review | not_started → self_submitted → manager_reviewed → completed | `review/actions.ts`, `team/actions.ts` |

Each update includes the expected current status in its `WHERE` clause (e.g. `.eq("status", "submitted")`), so double-clicks and races cannot skip a state.

## Project structure
```
src/
  middleware.ts                 Clerk: everything except / and /sign-* requires sign-in
  lib/                          server-only helpers: auth, db client, data, email, audit, report
  components/                   UI kit, nav, stepper, rating input, review view, toasts
  app/
    page.tsx                    landing page
    (app)/                      signed-in area (layout checks the employee + builds the nav)
      dashboard  goals  review  history  reviews/[id]  team  team/[employeeId]
      admin/employees  admin/cycles  admin/report
    api/notify-manager          re-send the self-appraisal e-mail (owner only)
    api/admin/export            CSV export (HR only)
supabase/schema.sql, seed.sql
```

## Scripts
`npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck`

## Known notes
- `npm audit` flags PostCSS (bundled inside Next's build tooling; it only processes our own CSS) and Zod (a memory issue when validating large arrays; this app never validates arrays from users). Both fixes need major-version upgrades (Next 16, Zod 4).
- Out of scope per the manual: payroll, 360° feedback, calibration / bell curve, 9-box, mobile app.
