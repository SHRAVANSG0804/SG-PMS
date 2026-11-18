/**
 * Which services are configured? Lets the app build and show a helpful
 * "setup incomplete" page instead of crashing when keys are missing
 * (e.g. the first Vercel deploy, before environment variables are added).
 * Only variable NAMES are ever shown — never values.
 */
export const REQUIRED_ENV = [
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "RESEND_API_KEY",
  "NEXT_PUBLIC_APP_URL",
] as const;

export function isClerkConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}

export function missingEnv(): string[] {
  return REQUIRED_ENV.filter((name) => !process.env[name]);
}
