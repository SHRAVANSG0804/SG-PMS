import { requireEmployee, isManager } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/constants";
import { Nav, type NavItem } from "@/components/nav";
import { Toaster } from "@/components/toaster";

/**
 * Shell for every signed-in page. Runs on the server:
 *  - requireEmployee() redirects signed-out users and unknown accounts.
 *  - The navigation list is built from the employee's role, so an employee
 *    never even receives the admin links.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireEmployee();
  const manager = await isManager(me);

  const items: NavItem[] = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/goals", label: "My Goals" },
    { href: "/review", label: "My Review" },
    { href: "/history", label: "Past Reviews" },
  ];
  if (manager || me.role === "hr_admin") items.push({ href: "/team", label: "My Team" });
  if (me.role === "hr_admin") {
    items.push(
      { href: "/admin/employees", label: "Employees", section: "admin" },
      { href: "/admin/cycles", label: "Cycles", section: "admin" },
      { href: "/admin/report", label: "Completion Report", section: "admin" },
    );
  }

  return (
    <div className="min-h-screen">
      <Nav items={items} name={me.full_name} roleLabel={`${ROLE_LABEL[me.role]} · ${me.designation}`} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
      <Toaster />
    </div>
  );
}
