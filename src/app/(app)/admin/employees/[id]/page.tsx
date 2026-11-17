import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getAllEmployees } from "@/lib/data";
import { Badge, Card, PageHeader } from "@/components/ui";
import { EmployeeForm } from "../employee-form";
import { updateEmployee } from "../actions";

export const metadata = { title: "Edit employee" };

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("hr_admin");
  const { id } = await params;
  const all = await getAllEmployees();
  const employee = all.find((e) => e.id === id);
  if (!employee) notFound();
  // Cannot report to yourself or to someone inactive.
  const managers = all.filter((e) => e.is_active && e.id !== id);

  return (
    <>
      <PageHeader
        title={`Edit ${employee.full_name}`}
        description={
          <span className="flex items-center gap-2">
            Account: {employee.clerk_user_id ? <Badge tone="green">Linked to sign-in</Badge> : <Badge>Not signed in yet</Badge>}
          </span>
        }
      />
      <Card className="p-5 sm:p-6">
        <EmployeeForm action={updateEmployee.bind(null, id)} employee={employee} managers={managers} />
      </Card>
    </>
  );
}
