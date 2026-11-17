import "server-only";
import { Resend } from "resend";
import { APP_NAME } from "./constants";
import { appUrl } from "./utils";

/**
 * Transactional e-mail via Resend.
 *
 * WHY SERVER ONLY: RESEND_API_KEY is a secret. Code in the browser is visible
 * to anyone (DevTools → Sources), so a key used there is a key given away.
 * This file imports "server-only", so the build fails if a client component
 * tries to import it.
 *
 * E-mail is a SIDE EFFECT, not a dependency: sendEmail() never throws. If it
 * fails we log and return { ok: false } — the self-appraisal (or whatever
 * triggered it) is already saved and stays saved.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  heading: string;
  body: string[];
  ctaLabel?: string;
  ctaPath?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY not set — skipping e-mail:", opts.subject);
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }
  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || `${APP_NAME} <onboarding@resend.dev>`,
      to: opts.to,
      subject: opts.subject,
      html: renderTemplate(opts),
    });
    if (error) {
      console.error("[email] Resend rejected the message:", error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] unexpected failure:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function renderTemplate(opts: { heading: string; body: string[]; ctaLabel?: string; ctaPath?: string }): string {
  const paragraphs = opts.body
    .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155">${escapeHtml(p)}</p>`)
    .join("");
  const cta =
    opts.ctaLabel && opts.ctaPath
      ? `<p style="margin:24px 0 8px"><a href="${appUrl(opts.ctaPath)}" style="background:#4338ca;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;font-size:14px;display:inline-block">${escapeHtml(opts.ctaLabel)}</a></p>
         <p style="margin:0;font-size:12px;color:#94a3b8">Or open: ${appUrl(opts.ctaPath)}</p>`
      : "";
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0">
      <tr><td style="padding:20px 28px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#4338ca;font-size:16px">${APP_NAME}</td></tr>
      <tr><td style="padding:28px">
        <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a">${escapeHtml(opts.heading)}</h1>
        ${paragraphs}${cta}
      </td></tr>
      <tr><td style="padding:16px 28px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8">You are receiving this because you take part in a performance review cycle.</td></tr>
    </table>
  </td></tr></table></body></html>`;
}

// ---------------------------------------------------------------------------
// The four notifications the workflow sends.
// ---------------------------------------------------------------------------

export function emailSelfAppraisalSubmitted(p: { managerEmail: string; managerName: string; employeeName: string; cycleName: string; employeeId: string }) {
  return sendEmail({
    to: p.managerEmail,
    subject: `${p.employeeName} submitted their self-appraisal (${p.cycleName})`,
    heading: "A self-appraisal is ready for your review",
    body: [
      `Hi ${p.managerName},`,
      `${p.employeeName} has submitted their self-appraisal for the ${p.cycleName} cycle.`,
      "Open their review to see their comments and self-ratings side by side with your own assessment.",
    ],
    ctaLabel: "Review now",
    ctaPath: `/team/${p.employeeId}`,
  });
}

export function emailGoalsSubmitted(p: { managerEmail: string; managerName: string; employeeName: string; cycleName: string; employeeId: string; count: number }) {
  return sendEmail({
    to: p.managerEmail,
    subject: `${p.employeeName} submitted ${p.count} goal${p.count === 1 ? "" : "s"} for approval`,
    heading: "Goals are waiting for your approval",
    body: [`Hi ${p.managerName},`, `${p.employeeName} has submitted goals for the ${p.cycleName} cycle. Please approve them or send them back with a comment.`],
    ctaLabel: "Review goals",
    ctaPath: `/team/${p.employeeId}`,
  });
}

export function emailGoalSentBack(p: { employeeEmail: string; employeeName: string; goalTitle: string; comment: string }) {
  return sendEmail({
    to: p.employeeEmail,
    subject: `Your goal "${p.goalTitle}" was sent back`,
    heading: "Your manager asked for changes to a goal",
    body: [`Hi ${p.employeeName},`, `Goal: ${p.goalTitle}`, `Manager's comment: ${p.comment}`, "Edit the goal and submit it again."],
    ctaLabel: "Open my goals",
    ctaPath: "/goals",
  });
}

export function emailReviewCompleted(p: { employeeEmail: string; employeeName: string; cycleName: string }) {
  return sendEmail({
    to: p.employeeEmail,
    subject: `Your ${p.cycleName} review is complete`,
    heading: "Your performance review is complete",
    body: [`Hi ${p.employeeName},`, `Your manager has completed your review for the ${p.cycleName} cycle. You can now see their ratings and comments.`],
    ctaLabel: "View my review",
    ctaPath: "/review",
  });
}
