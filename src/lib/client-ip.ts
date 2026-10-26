import { headers } from "next/headers";

/** Client IP from Vercel/proxy headers (first hop in x-forwarded-for). */
export async function getClientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const real = h.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  if (process.env.NODE_ENV === "development") {
    return "127.0.0.1";
  }
  return null;
}