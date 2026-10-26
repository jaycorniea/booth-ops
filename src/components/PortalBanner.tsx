import type { PortalBannerTone, PortalQueryMessage } from "@/lib/portal-query-feedback";
import { resolvePortalQueryMessage } from "@/lib/portal-query-feedback";
import type { ReactNode } from "react";

const TONE_CLASS: Record<PortalBannerTone, string> = {
  error: "border-red-200 bg-red-50 text-red-900",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  success: "border-green-200 bg-green-50 text-green-900",
  info: "border-blue-200 bg-blue-50 text-blue-900",
};

export function PortalBanner({
  tone,
  children,
  className = "",
}: {
  tone: PortalBannerTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm ${TONE_CLASS[tone]} ${className}`.trim()}
    >
      {children}
    </div>
  );
}

export function PortalQueryBanner({
  code,
  messages,
  fallback,
  className,
}: {
  code?: string;
  messages: Record<string, PortalQueryMessage>;
  fallback?: PortalQueryMessage;
  className?: string;
}) {
  const resolved = resolvePortalQueryMessage(code, messages, fallback);
  if (!resolved) return null;
  return (
    <PortalBanner tone={resolved.tone} className={className}>
      {resolved.message}
    </PortalBanner>
  );
}
