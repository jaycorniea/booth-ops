import { PORTAL_VERSION } from "@/lib/version";

export function VersionBadge() {
  return (
    <p
      className="pointer-events-none fixed bottom-2 left-2 z-40 select-none rounded-md bg-white/90 px-1.5 py-0.5 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200/80 no-print"
      aria-label={`Portal version ${PORTAL_VERSION}`}
    >
      v{PORTAL_VERSION}
    </p>
  );
}
