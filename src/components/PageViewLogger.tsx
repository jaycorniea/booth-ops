"use client";

import { recordPageViewAction } from "@/lib/actions";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** One page_view event per client navigation (dedupes RSC re-renders). */
export function PageViewLogger() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === last.current) return;
    last.current = pathname;
    void recordPageViewAction(pathname);
  }, [pathname]);

  return null;
}