-- =============================================================================
--  PMS — Performance Management System : database schema
--  Run this whole file once in Supabase → SQL Editor → New query → Run.
--  It is idempotent-safe to read, but it is written for a FRESH project.
-- =============================================================================
--
--  Design notes (see docs/data-model.md for the full diagram):
--   * ONE employees table. A manager is just an employee whose id appears in
--     somebody else's manager_id (self-reference).
--   * Goals belong to a cycle, so next year's goals never mix with this year's.
--   * Goals are the PLAN, goal_ratings are the OUTCOME — kept in separate tables.
--   * reviews has one row per employee per cycle; its status IS the workflow.
--   * Row Level Security is ON for every table with NO permissive policies.
--     The browser never talks to the database: all reads/writes happen in
--     server code using the service-role key, after an authorisation check.
--     Even if someone steals the public anon key they can read nothing.
-- =============================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Enumerated types: the database itself refuses an invalid status.
-- ---------------------------------------------------------------------------
create type employee_role as enum ('employee', 'manager', 'hr_admin');
create type cycle_status  as enum ('draft', 'open', 'closed');
create type goal_status   as enum ('draft', 'submitted', 'approved', 'sent_back');
create type review_status as enum ('not_started', 'self_submitted', 'manager_reviewed', 'completed');

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- employees
-- ---------------------------------------------------------------------------
create table employees (
  id               uuid primary key default gen_random_uuid(),
  clerk_user_id    text unique,                       -- filled on first sign-in
  full_name        text not null check (length(trim(full_name)) between 2 and 120),
  -- Always stored lower-case so sign-in linking is an exact match.
  email            text not null unique
                   check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  designation      text not null,
  department       text not null,
  date_of_joining  date not null,
  -- FK: manager_id → employees.id. Self-reference: a manager is an employee.
  -- ON DELETE SET NULL: removing a manager never deletes their reports.
  manager_id       uuid references employees(id) on delete set null,
  role             employee_role not null default 'employee',
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint employees_not_own_manager check (manager_id is null or manager_id <> id)
);
create index employees_manager_idx on employees (manager_id);
create trigger employees_updated_at before update on employees
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- review_cycles
-- ---------------------------------------------------------------------------
create table review_cycles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (length(trim(name)) between 3 and 80),
  start_date  date not null,
  end_date    date not null,
  status      cycle_status not null default 'draft',
  -- FK: created_by → employees.id (the HR admin who created the cycle).
  created_by  uuid references employees(id) on delete set null,
  opened_at   timestamptz,
  closed_at   timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint review_cycles_dates check (end_date > start_date)
);
-- Business rule enforced by the database: only ONE cycle may be open at a time.
create unique index review_cycles_one_open on review_cycles (status) where status = 'open';
create trigger review_cycles_updated_at before update on review_cycles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- goals  (the PLAN)
-- ---------------------------------------------------------------------------
create table goals (
  id               uuid primary key default gen_random_uuid(),
  -- FK: employee_id → employees.id (whose goal this is).
  employee_id      uuid not null references employees(id) on delete cascade,
  -- FK: cycle_id → review_cycles.id (which appraisal period it belongs to).
  cycle_id         uuid not null references review_cycles(id) on delete cascade,
  title            text not null check (length(trim(title)) between 3 and 150),
  description      text not null default '',
  weightage        integer not null check (weightage between 1 and 100),
  target_date      date not null,
  status           goal_status not null default 'draft',
  manager_comment  text,                               -- reason when sent back
  submitted_at     timestamptz,
  approved_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index goals_employee_cycle_idx on goals (employee_id, cycle_id);
create trigger goals_updated_at before update on goals
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- reviews  (one row per employee per cycle — this row IS the workflow)
-- ---------------------------------------------------------------------------
create table reviews (
  id                      uuid primary key default gen_random_uuid(),
  -- FK: employee_id → employees.id (the person being appraised).
  employee_id             uuid not null references employees(id) on delete cascade,
  -- FK: manager_id → employees.id. A SNAPSHOT of who reviews this cycle, so a
  -- later change of manager does not rewrite history.
  manager_id              uuid references employees(id) on delete set null,
  -- FK: cycle_id → review_cycles.id.
  cycle_id                uuid not null references review_cycles(id) on delete cascade,
  status                  review_status not null default 'not_started',
  self_summary            text,
  overall_self_rating     smallint check (overall_self_rating between 1 and 5),
  overall_manager_rating  smallint check (overall_manager_rating between 1 and 5),
  manager_summary         text,
  submitted_at            timestamptz,   -- self-appraisal submitted
  reviewed_at             timestamptz,   -- manager submitted their review
  completed_at            timestamptz,   -- finalised and released to employee
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint reviews_one_per_cycle unique (employee_id, cycle_id)
);
create index reviews_manager_idx on reviews (manager_id, cycle_id);
create index reviews_cycle_status_idx on reviews (cycle_id, status);
create trigger reviews_updated_at before update on reviews
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- goal_ratings  (the OUTCOME — line items behind a review)
-- ---------------------------------------------------------------------------
create table goal_ratings (
  id               uuid primary key default gen_random_uuid(),
  -- FK: review_id → reviews.id (which review this line belongs to).
  review_id        uuid not null references reviews(id) on delete cascade,
  -- FK: goal_id → goals.id (which goal is being rated).
  goal_id          uuid not null references goals(id) on delete cascade,
  self_comment     text,
  self_rating      smallint check (self_rating between 1 and 5),
  manager_comment  text,
  manager_rating   smallint check (manager_rating between 1 and 5),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint goal_ratings_one_per_goal unique (review_id, goal_id)
);
create trigger goal_ratings_updated_at before update on goal_ratings
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- audit_log  (the problem statement asks for an AUDITABLE record)
-- ---------------------------------------------------------------------------
create table audit_log (
  id           bigint generated always as identity primary key,
  -- FK: actor_id → employees.id (who did it).
  actor_id     uuid references employees(id) on delete set null,
  action       text not null,          -- e.g. 'goal.approved'
  entity_type  text not null,          -- e.g. 'goal'
  entity_id    uuid,
  details      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index audit_log_entity_idx on audit_log (entity_type, entity_id);
create index audit_log_created_idx on audit_log (created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security: ON everywhere, no policies for anon/authenticated.
-- => The public anon key can read/write NOTHING. Only server code holding the
--    service-role key (which bypasses RLS) can touch data, and that code checks
--    who the signed-in user is before every query.
-- ---------------------------------------------------------------------------
alter table employees      enable row level security;
alter table review_cycles  enable row level security;
alter table goals          enable row level security;
alter table reviews        enable row level security;
alter table goal_ratings   enable row level security;
alter table audit_log      enable row level security;

revoke all on employees, review_cycles, goals, reviews, goal_ratings, audit_log from anon, authenticated;
