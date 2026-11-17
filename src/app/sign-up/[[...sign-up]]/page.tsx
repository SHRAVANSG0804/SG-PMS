import { SignUp } from "@clerk/nextjs";
import { Logo } from "@/components/logo";

export const metadata = { title: "Sign up" };

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10">
      <Logo />
      <p className="max-w-sm text-center text-sm text-slate-500">
        Use the work e-mail address HR registered for you — that is how your account is linked to your employee record.
      </p>
      <SignUp fallbackRedirectUrl="/dashboard" signInUrl="/sign-in" />
    </main>
  );
}
