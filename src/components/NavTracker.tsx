"use client";

import { recordNavigationAction } from "@/lib/actions";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

type PendingNav = {
  method: "link" | "button" | "history";
  label?: string;
  href?: string;
};

let pendingNav: PendingNav | null = null;

/** One navigation event per client route change; captures link clicks vs typed URLs. */
export function NavTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);
  const hasLogged = useRef(false);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target) return;

      const submitBtn = target.closest("button[type='submit'], input[type='submit']");
      if (submitBtn) {
        pendingNav = {
          method: "button",
          label: submitBtn.textContent?.trim().slice(0, 80) || "Submit",
        };
        return;
      }

      const anchor = target.closest("a[href]");
      if (!anchor) return;
      if (anchor.getAttribute("target") === "_blank") return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }
      pendingNav = {
        method: "link",
        label: anchor.textContent?.trim().slice(0, 80) || undefined,
        href,
      };
    };

    const onPopState = () => {
      pendingNav = { method: "history" };
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  useEffect(() => {
    if (!pathname || pathname === lastPath.current) return;
    const from = lastPath.current;
    lastPath.current = pathname;

    let method: PendingNav["method"] | "entry" | "typed_url" = "typed_url";
    let label: string | undefined;
    let href: string | undefined;

    if (pendingNav) {
      method = pendingNav.method;
      label = pendingNav.label;
      href = pendingNav.href;
      pendingNav = null;
    } else if (!hasLogged.current) {
      method = "entry";
      hasLogged.current = true;
    }

    const referrer =
      typeof document !== "undefined" && document.referrer ? document.referrer.slice(0, 500) : undefined;

    void recordNavigationAction({
      path: pathname,
      method,
      label,
      from,
      href,
      referrer,
    });
  }, [pathname]);

  return null;
}