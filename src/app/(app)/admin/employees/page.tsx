import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getAllEmployees } from "@/lib/data";
import { ROLE_LABEL } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { Alert, Avatar, Badge, Card, EmptyState, PageHeader } from "@/components/ui";

export const metadata = { title: "Employees" };

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<{ q?: string; saved?: string; show?: string }> }) {
  await requireRole("hr_admin");
  const { q = "", saved, show } = await searchParams;
  const all = await getAllEmployees();
  const byId = new Map(all.map((e) => [e.id, e]));
  const reportCount = new Map<string, number>();
  all.forEach((e) => e.manager_id && e.is_active && reportCount.set(e.manager_id, (reportCount.get(e.manager_id) ?? 0) + 1));

  const term = q.trim().toLowerCase();
  const rows = all
    .filter((e) => show === "all" || e.is_active)
    .filter((e) => !term || [e.full_name, e.email, e.department, e.designation].some((v) => v.toLowerCase().includes(term)));

  return (
    <>
      <PageHeader
        title="Employees"
        description={`${all.filter((e) => e.is_active).length} active employees. Add people here before they sign in.`}
        action={<Link href="/admin/employees/new" className="btn btn-primary">+ Add employee</Link>}
      />
      {saved && (
        <div className="mb-4">
          <Alert tone="green">Saved {saved}.</Alert>
        </div>
      )}

      <Card>
        <form className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4" role="search">
          <input name="q" defaultValue={q} placeholder="Search name, e-mail, department…" className="input max-w-xs" aria-label="Search employees" />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="show" value="all" defaultChecked={show === "all"} className="h-4 w-4 rounded border-slate-300" />
            Include inactive
          </label>
          <button className="btn btn-secondary">Filter</button>
        </form>

        {rows.length === 0 ? (
          <EmptyState
            title={all.length === 0 ? "No employees yet" : "No matches"}
            description={all.length === 0 ? "Add your first employee to start building the reporting hierarchy." : "Try a different search term."}
            action={all.length === 0 ? <Link href="/admin/employees/new" className="btn btn-primary">Add employee</Link> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="table-th">Name</th>
                  <th className="table-th">Designation</th>
                  <th className="table-th">Department</th>
                  <th className="table-th">Manager</th>
                  <th className="table-th">Role</th>
                  <th className="table-th">Joined</th>
                  <th className="table-th">Status</th>
                  <th className="table-th"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <Avatar name={e.full_name} size="sm" />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">{e.full_name}</p>
                          <p className="truncate text-xs text-slate-500">{e.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-td">{e.designation}</td>
                    <td className="table-td">{e.department}</td>
                    <td className="table-td">
                      {e.manager_id ? byId.get(e.manager_id)?.full_name ?? "—" : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="table-td">
                      <Badge tone={e.role === "hr_admin" ? "violet" : e.role === "manager" ? "blue" : "gray"}>{ROLE_LABEL[e.role]}</Badge>
                      {reportCount.get(e.id) ? <span className="ml-2 text-xs text-slate-500">{reportCount.get(e.id)} reports</span> : null}
                    </td>
                    <td className="table-td whitespace-nowrap">{formatDate(e.date_of_joining)}</td>
                    <td className="table-td">
                      {!e.is_active ? <Badge tone="red">Inactive</Badge> : e.clerk_user_id ? <Badge tone="green">Active</Badge> : <Badge tone="amber">Invited</Badge>}
                    </td>
                    <td className="table-td text-right">
                      <Link href={`/admin/employees/${e.id}`} className="btn btn-ghost btn-sm">Edit</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
