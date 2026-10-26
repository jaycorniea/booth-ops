import { VersionBadge } from "@/components/VersionBadge";
import { assertAuthEnv } from "@/lib/auth";
import type { Metadata } from "next";
import "./globals.css";

assertAuthEnv();

export const metadata: Metadata = {
  title: "Booth Ops",
  description: "Volunteer booth operations portal",
  robots: "noindex, nofollow",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { getEventSettings } = await import("@/lib/db");
  await getEventSettings();
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        {children}
        <VersionBadge />
      </body>
    </html>
  );
}
