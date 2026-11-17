# Research Note — Performance Management System

> **Draft for you to rewrite.** The lab manual says this note must be in *your own words* and you will be questioned on it. Read each section, check it against your own reading, and rewrite it in your voice before you submit.

## 1. KRA vs KPI vs Goal

| Term | What it is | Example (Software Engineer) |
|---|---|---|
| **KRA** (Key Result Area) | A broad area of the job you are accountable for. Stable over years. | *Product quality* |
| **KPI** (Key Performance Indicator) | The metric that tells you how you are doing in that area. | *Production bugs per release; P1 fix time* |
| **Goal** | A specific, time-bound target on a KPI for **this** cycle. | *Reduce P1 bug turnaround from 72h to under 48h by 31 Dec 2026* |

KRA = *where* you are measured, KPI = *how*, goal = *how much, by when*. In this app a **goal** is the unit of work: it has a weightage and a target date, and it belongs to one cycle.

## 2. SMART goals

**S**pecific, **M**easurable, **A**chievable, **R**elevant, **T**ime-bound.
A badly written goal: *"Improve customer satisfaction."* You can't measure it, it has no deadline, and at review time the manager and employee will argue about what "improve" meant. A better one: *"Raise CSAT for my accounts from 78% to 85% by Q3, measured by the quarterly survey."*
**In the app:** the goal form asks for a success measure, a numeric weightage and a target date that must fall inside the cycle.

## 3. The appraisal cycle — stages and who acts

| Stage | Who acts | In this app |
|---|---|---|
| 1. Cycle set-up | HR | HR creates a cycle (Draft) and opens it |
| 2. Goal setting | Employee | Adds goals, weightages total 100, submits |
| 3. Goal approval | Manager | Approves, or sends back with a comment |
| 4. (Mid-year check-in) | Both | *Out of scope* |
| 5. Self-appraisal | Employee | Comment + self-rating per goal, overall rating |
| 6. Manager review | Manager | Side-by-side comment + rating per goal, overall rating, summary |
| 7. (Calibration) | HR + managers | *Out of scope (§6.2)* |
| 8. Closure / sharing | Manager, then HR | Manager marks Completed and the employee sees the ratings; HR closes the cycle |

Review status: **Not Started → Self-Appraisal Submitted → Manager Reviewed → Completed.**
*Manager Reviewed* means the review is written but not yet shared. That gives the manager time to discuss it with the employee before it is final.

## 4. Why ask the employee first (self-appraisal)

- The employee knows what they did; the manager sees only part of it.
- It turns the review into a conversation instead of a verdict, which improves acceptance.
- Gaps between the self and manager ratings are exactly what the review meeting should discuss. The app shows both side by side for that reason.
- It creates a written record in the employee's own words.

## 5. Rating scales

| Scale | Pros | Cons |
|---|---|---|
| 3-point | Simple, fast | Too coarse; can't separate good from great |
| 4-point | No middle, so it forces a lean either way | Pushes "solid" people into an artificial choice |
| 5-point | Familiar, has a true "meets expectations" | Central tendency: everyone gets a 3 |

Some companies avoid a middle option to fight central tendency ("everyone is a 3"). **This app uses a 5-point scale** (1 Unsatisfactory … 5 Outstanding). Most people in a healthy organisation genuinely *meet* expectations, and a forced choice would distort that. To counter central tendency, every rating needs a written comment of at least 10 characters, and the app shows a weighted goal score as a reference.

## 6. Normalisation / calibration and the bell curve

**Calibration** is when managers meet to compare ratings across teams, so a "4" from a lenient manager means the same as a "4" from a strict one. **Normalisation / forced distribution** goes further: it forces the ratings into a fixed shape (e.g. 10% / 20% / 40% / 20% / 10%, a bell curve).
It is controversial because real teams are not normally distributed (a small, high-performing team gets people pushed down), it pits colleagues against each other, and it erodes trust. Many large companies have dropped forced ranking.
**In this app:** out of scope (§6.2). HR does get a **rating distribution chart** on the dashboard and a CSV export, which is the input a calibration meeting would use.

## 7. OKRs vs KRA-based appraisal

| | OKRs | KRA-based |
|---|---|---|
| Purpose | Alignment and stretch | Evaluation, linked to pay and promotion |
| Cadence | Quarterly | Annual / half-yearly |
| Targets | Ambitious; ~70% achieved counts as success | Expected to be fully met |
| Visibility | Often public across the company | Private between employee, manager and HR |
| Link to pay | Deliberately decoupled | Directly linked |

This app is KRA/goal-based with weightages, because the problem statement is an annual appraisal whose rating "affects somebody's salary".

## 8. Real PMS products (research and fill in your own opinion)

| Product | Main screens | Liked | Disliked |
|---|---|---|---|
| **Darwinbox** (Performance) | Goals, check-ins, review forms, 9-box | Very configurable; mobile app | Heavy; long set-up |
| **Keka** (PMS) | Goals/OKRs, review cycles, 360 feedback, analytics | Clean UI; popular with Indian SMBs | Many features locked to higher plans |
| **Lattice** | Goals, reviews, 1:1s, engagement surveys | Excellent manager UX | Expensive; US-centric |

*Ideas taken into this build:* a status stepper everywhere, side-by-side self/manager view, an HR completion dashboard, "action needed" lists for managers.

## 9. Sensitive data and who must never see it

| Data | Sensitive because | Who must NOT see it | How the app enforces it |
|---|---|---|---|
| Manager ratings and comments | Affect pay and promotion | Other employees; **the employee themselves until Completed** | `reviewAccess()` in `src/lib/review-access.ts` |
| Self-appraisal drafts | Unfinished thoughts | Manager and HR until submitted | Reviews in *Not Started* are visible only to the owner |
| Another person's goals and reviews | Private | Peers, managers of other teams | Every page checks `canManage` / `canReview`; a wrong URL returns 404 |
| Reporting hierarchy, roles | Controls access | Editable by HR only | `requireRole("hr_admin")` on every admin page and action |
| Personal data (e-mail, date of joining) | PII | Public internet | RLS ON in Supabase; anon key reads nothing; service key stays on the server only |
| API keys | Full access | Everyone | `.env.local` is git-ignored; keys live in Vercel env vars |

Defence in depth: (1) the navigation hides links; (2) every **page** and **server action** re-checks the role or ownership; (3) Supabase **RLS** blocks the public key entirely; (4) the database itself enforces rules such as *one open cycle* and *one review per employee per cycle*.
