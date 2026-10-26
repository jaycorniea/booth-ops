"use client";

import type { VolunteerProfileEditLink } from "@/lib/volunteer-profiles";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function VolunteerProfileEditMenu({
  editLinks,
}: {
  editLinks: VolunteerProfileEditLink[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (editLinks.length === 0) {
    return <span className="text-slate-400">—</span>;
  }

  if (editLinks.length === 1) {
    const link = editLinks[0];
    return (
      <Link href={link.href} className="text-blue-700 underline">
        {link.label}
      </Link>
    );
  }

  return (
    <div ref={rootRef} className="relative inline-block text-left">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="text-blue-700 underline"
      >
        Edit
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 min-w-[9rem] rounded border border-slate-200 bg-white py-1 shadow-lg"
        >
          {editLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-2.5 py-1 text-xs text-blue-700 hover:bg-slate-50"
            >
              {link.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
