-- =============================================================================
--  Seed data — run AFTER schema.sql.
--
--  !! IMPORTANT !!  Replace the e-mail addresses below with addresses YOU can
--  sign in with through Clerk (Gmail "+" aliases work well, e.g.
--  you+hr@gmail.com, you+manager@gmail.com, you+emp@gmail.com).
--  On first sign-in the app links the Clerk account to the row whose e-mail
--  matches, and reads the role from that row.
-- =============================================================================

-- HR Admin (no manager)
insert into employees (full_name, email, designation, department, date_of_joining, role)
values ('Asha Rao', 'hr.admin@example.com', 'HR Business Partner', 'Human Resources', '2021-04-01', 'hr_admin');

-- Engineering manager reporting to nobody (top of the demo tree)
insert into employees (full_name, email, designation, department, date_of_joining, role)
values ('Vikram Mehta', 'manager@example.com', 'Engineering Manager', 'Engineering', '2020-07-15', 'manager');

-- Two engineers reporting to Vikram (manager_id resolved by e-mail, never typed by hand)
insert into employees (full_name, email, designation, department, date_of_joining, role, manager_id)
select 'Neha Sharma', 'employee@example.com', 'Software Engineer', 'Engineering', '2023-01-09', 'employee', id
from employees where lower(email) = 'manager@example.com';

insert into employees (full_name, email, designation, department, date_of_joining, role, manager_id)
select 'Rahul Iyer', 'employee2@example.com', 'QA Engineer', 'Engineering', '2022-08-22', 'employee', id
from employees where lower(email) = 'manager@example.com';

-- A draft cycle ready for HR to open during the demo
insert into review_cycles (name, start_date, end_date, status, created_by)
select 'FY 2026–27 Annual', '2026-04-01', '2027-03-31', 'draft', id
from employees where lower(email) = 'hr.admin@example.com';
