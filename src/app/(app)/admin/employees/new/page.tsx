import { requireRole } from "@/lib/auth";
import { getAllEmployees } from "@/lib/data";
import { Card, PageHeader } from "@/components/ui";
import { EmployeeForm } from "../employee-form";
import { createEmployee } from "../actions";

export const metadata = { title: "Add employee" };

export default async function NewEmployeePage() {
  await requireRole("hr_admin");
  const managers = (await getAllEmployees()).filter((e) => e.is_active);
  return (
    <>
      <PageHeader title="Add employee" description="Create the employee record first — the person can then sign up with the same e-mail." />
      <Card className="p-5 sm:p-6">
        <EmployeeForm action={createEmployee} managers={managers} />
      </Card>
    </>
  );
}
