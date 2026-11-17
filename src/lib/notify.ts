import "server-only";
import { emailSelfAppraisalSubmitted } from "./email";
import { getAllEmployees, getCycle } from "./data";
import type { Review } from "./types";

/**
 * Tell the reviewer that a self-appraisal is ready. The reviewer is the
 * review's manager snapshot; if there is none, every active HR Admin.
 * Returns how many e-mails were accepted by Resend. Never throws.
 */
export async function notifyReviewerOfSelfAppraisal(review: Review): Promise<{ sent: number; attempted: number }> {
  try {
    const [all, cycle] = await Promise.all([getAllEmployees(), getCycle(review.cycle_id)]);
    const employee = all.find((e) => e.id === review.employee_id);
    if (!employee || !cycle) return { sent: 0, attempted: 0 };

    const reviewers = review.manager_id
      ? all.filter((e) => e.id === review.manager_id && e.is_active)
      : all.filter((e) => e.role === "hr_admin" && e.is_active && e.id !== employee.id);

    const results = await Promise.all(
      reviewers.map((r) =>
        emailSelfAppraisalSubmitted({
          managerEmail: r.email,
          managerName: r.full_name,
          employeeName: employee.full_name,
          cycleName: cycle.name,
          employeeId: employee.id,
        }),
      ),
    );
    return { sent: results.filter((r) => r.ok).length, attempted: results.length };
  } catch (err) {
    console.error("[notify] could not notify reviewer:", err);
    return { sent: 0, attempted: 0 };
  }
}
