import { redirect } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getCurrentEmployee } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { Card } from "@/components/ui";

export const metadata = { title: "Account not set up" };

export default async function NotRegisteredPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const me = await getCurrentEmployee();
  if (me?.is_active) redirect("/dashboard");

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "your e-mail address";
  const deactivated = me && !me.is_active;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <Logo />
      <Card className="w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-xl text-amber-600" aria-hidden>!</div>
        <h1 className="text-xl font-bold text-slate-900">
          {deactivated ? "Your account has been deactivated" : "Your account is not yet set up"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {deactivated ? (
            "Your employee record is inactive. Please contact HR if you think this is a mistake."
          ) : (
            <>
              You are signed in as <strong className="break-all">{email}</strong>, but no employee record uses that address.
              Please contact HR.
            </>
          )}
        </p>
        <div className="mt-6">
          <SignOutButton redirectUrl="/">
            <button className="btn btn-secondary">Sign out</button>
          </SignOutButton>
        </div>
      </Card>
    </main>
  );
}
