import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentEmployee } from "@/lib/auth";
import { getReviewById } from "@/lib/data";
import { notifyReviewerOfSelfAppraisal } from "@/lib/notify";

/**
 * POST /api/notify-manager  { reviewId }
 *
 * Re-sends the "self-appraisal submitted" e-mail to the employee's manager.
 * (The first e-mail is sent automatically by the submit action.)
 *
 * Why a SERVER route and not a browser call to Resend: the browser would need
 * RESEND_API_KEY, and anything shipped to the browser is public. Here the key
 * stays in the server's environment and the caller only ever sees ok/failed.
 */
const body = z.object({ reviewId: z.string().uuid() });

export async function POST(req: Request) {
  const me = await getCurrentEmployee();
  if (!me || !me.is_active) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "reviewId is required" }, { status: 400 });

  const review = await getReviewById(parsed.data.reviewId);
  // Only the employee who owns the review may trigger this. Same 404 for
  // "does not exist" and "not yours" so ids cannot be probed.
  if (!review || review.employee_id !== me.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (review.status === "not_started") return NextResponse.json({ error: "Submit your self-appraisal first" }, { status: 409 });

  const result = await notifyReviewerOfSelfAppraisal(review);
  if (result.sent === 0) {
    return NextResponse.json({ ok: false, error: "The e-mail could not be sent. Your self-appraisal is saved." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, sent: result.sent });
}
