import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Logo } from "@/components/logo";
import { APP_NAME } from "@/lib/constants";
import { isClerkConfigured, missingEnv } from "@/lib/config";

const FEATURES = [
  {
    title: "Goals that add up",
    body: "Employees set weighted goals against the open cycle. Weightage must total 100, and managers approve or send back with a comment.",
    icon: "◎",
  },
  {
    title: "Side-by-side reviews",
    body: "Self-appraisal on the left, manager assessment on the right — goal by goal, with a weighted score and an overall rating.",
    icon: "⇄",
  },
  {
    title: "One record, fully auditable",
    body: "HR runs the cycle end to end, tracks completion live and exports ratings. Last year's review is one click away.",
    icon: "▤",
  },
];

const STEPS = ["Goals set", "Goals approved", "Self-appraisal", "Manager review", "Completed"];

export default async function LandingPage() {
  const configured = isClerkConfigured();
  const missing = missingEnv();
  const { userId } = configured ? await auth() : { userId: null };
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <Link href={userId ? "/dashboard" : "/sign-in"} className="btn btn-secondary">
          {userId ? "Open app" : "Sign in"}
        </Link>
      </header>

      {missing.length > 0 && (
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Setup incomplete — add these environment variables, then redeploy:</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {missing.map((name) => (
                <li key={name}>
                  <code className="rounded bg-white px-2 py-0.5 text-xs ring-1 ring-amber-200">{name}</code>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs">Vercel → Project → Settings → Environment Variables. {configured ? "" : "Sign-in is disabled until the Clerk keys are set."}</p>
          </div>
        </div>
      )}

      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-4 pt-12 pb-16 text-center sm:px-6 sm:pt-20">
          <p className="mb-4 inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-100">
            Performance Management System
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Run your appraisal cycle in one place — <span className="text-brand-600">not in email and Excel.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            {APP_NAME} lets HR run a review cycle end to end, employees set goals and self-appraise, and managers
            review and rate their team — with every record stored, searchable and auditable.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={userId ? "/dashboard" : "/sign-in"} className="btn btn-primary px-6 py-3 text-base">
              {userId ? "Go to dashboard" : "Sign in"}
            </Link>
          </div>

          <ol className="mx-auto mt-14 flex max-w-3xl flex-wrap items-center justify-center gap-2 text-xs font-medium text-slate-600 sm:text-sm">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-2">
                <span className="rounded-full bg-white px-3 py-1.5 shadow-sm ring-1 ring-slate-200">
                  <span className="mr-1.5 text-brand-600">{i + 1}</span>
                  {s}
                </span>
                {i < STEPS.length - 1 && <span className="text-slate-300" aria-hidden>→</span>}
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto grid max-w-6xl gap-5 px-4 pb-20 sm:px-6 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-xl text-brand-600" aria-hidden>
                {f.icon}
              </div>
              <h2 className="text-lg font-semibold text-slate-900">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        {APP_NAME} · Built with Next.js, Clerk, Supabase, Resend &amp; Vercel
      </footer>
    </div>
  );
}
