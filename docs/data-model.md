# Data model

GitHub renders this Mermaid diagram automatically. The SQL lives in [`supabase/schema.sql`](../supabase/schema.sql).

```mermaid
erDiagram
    employees ||--o{ employees : "manager_id (reports to)"
    employees ||--o{ goals : "employee_id"
    employees ||--o{ reviews : "employee_id (appraisee)"
    employees ||--o{ reviews : "manager_id (reviewer snapshot)"
    employees ||--o{ review_cycles : "created_by"
    employees ||--o{ audit_log : "actor_id"
    review_cycles ||--o{ goals : "cycle_id"
    review_cycles ||--o{ reviews : "cycle_id"
    reviews ||--o{ goal_ratings : "review_id"
    goals ||--o| goal_ratings : "goal_id"

    employees {
        uuid id PK
        text clerk_user_id UK "set on first sign-in"
        text full_name
        text email UK "lower-case"
        text designation
        text department
        date date_of_joining
        uuid manager_id FK "self-reference"
        enum role "employee | manager | hr_admin"
        bool is_active
    }
    review_cycles {
        uuid id PK
        text name UK
        date start_date
        date end_date "> start_date"
        enum status "draft | open | closed (one open max)"
        uuid created_by FK
    }
    goals {
        uuid id PK
        uuid employee_id FK
        uuid cycle_id FK
        text title
        text description
        int weightage "1..100, total = 100 to submit"
        date target_date "inside the cycle"
        enum status "draft | submitted | approved | sent_back"
        text manager_comment "required when sent back"
    }
    reviews {
        uuid id PK
        uuid employee_id FK
        uuid manager_id FK
        uuid cycle_id FK "UNIQUE(employee_id, cycle_id)"
        enum status "not_started | self_submitted | manager_reviewed | completed"
        smallint overall_self_rating "1..5"
        smallint overall_manager_rating "1..5"
        text self_summary
        text manager_summary
        timestamptz submitted_at
        timestamptz reviewed_at
        timestamptz completed_at
    }
    goal_ratings {
        uuid id PK
        uuid review_id FK "UNIQUE(review_id, goal_id)"
        uuid goal_id FK
        text self_comment
        smallint self_rating "1..5"
        text manager_comment
        smallint manager_rating "1..5"
    }
    audit_log {
        bigint id PK
        uuid actor_id FK
        text action "e.g. goal.approved"
        text entity_type
        uuid entity_id
        jsonb details
    }
```

## Changes from the manual's suggested model, and why

| Change | Why |
|---|---|
| `audit_log` table (6th table) | The problem statement says the record must be **auditable**: who approved, sent back or completed what, and when. |
| `reviews.self_summary`, `completed_at` | Separate timestamps for each workflow step let reports show *when* each stage happened. |
| `review_cycles.opened_at / closed_at` | Audit of the cycle itself. |
| Postgres `enum` types for every status | The database rejects an invalid status even if the app has a bug. |
| Partial unique index `review_cycles_one_open` | "Only one cycle open at a time" is enforced by the DB, not just the UI. |
| `UNIQUE(employee_id, cycle_id)` on reviews | Exactly one review per employee per cycle. |
| `CHECK (manager_id <> id)` | Nobody can be their own manager. Deeper loops (A→B→A) are blocked in the server action. |
| `reviews.manager_id` = snapshot of the reviewer | History stays correct when someone later changes manager. During an *open* cycle, reassigning a manager moves unfinished reviews to the new manager. |
| Ratings live in `goal_ratings`, not `goals` | A goal is the **plan**, a rating is the **outcome** (the manual's "things students get wrong"). |
| RLS on, no public policies | The anon key can read nothing. All access goes through server code that checks the user first. |
