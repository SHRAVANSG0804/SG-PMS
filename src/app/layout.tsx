import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { isClerkConfigured } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${APP_NAME} · Performance Management`, template: `%s · ${APP_NAME}` },
  description: APP_TAGLINE,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4f46e5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const page = (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
  // Without Clerk keys we still render (landing page shows what is missing)
  // instead of failing the whole build.
  if (!isClerkConfigured()) return page;
  return <ClerkProvider appearance={{ variables: { colorPrimary: "#4f46e5" } }}>{page}</ClerkProvider>;
}
