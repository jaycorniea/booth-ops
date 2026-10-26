"use client";

import { addVolunteerProfileToOnCallAction } from "@/lib/actions";
import type { VolunteerProfile } from "@/lib/volunteer-profiles";
import type { VolunteerProfileEditLink } from "@/lib/volunteer-profiles";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

function OnCallAddButton({ profile }: { profile: VolunteerProfile }) {
  return (
    <form action={addVolunteerProfileToOnCallAction}>
      <input type="hidden" name="name" value={profile.name} />
      <input type="hidden" name="phone" value={profile.phone} />
      <input type="hidden" name="email" value={profile.email} />
      {profile.interestedId != null && (
        <input type="hidden" name="interested_id" value={profile.interestedId} />
      )}
      <button type="submit" className="text-blue-700 underline">
        + On-call
      </button>
    </form>
  );
}

export function VolunteerProfileEditMenu({
  editLinks,
  profile,
  write,
}: {
  editLinks: VolunteerProfileEditLink[];
  profile: VolunteerProfile;
  write: boolean;
}) {
  const onCallMember = profile.roles.includes("on-call");
  const showAddOnCall = write && !onCallMember;
  const itemCount = editLinks.length + (onCallMember ? 1 : 0) + (showAddOnCall ? 1 : 0);

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

  if (itemCount === 0) {
    return <span className="text-slate-400">—</span>;
  }

  if (itemCount === 1) {
    if (editLinks.length === 1) {
      const link = editLinks[0];
      return (
        <Link href={link.href} className="text-blue-700 underline">
          {link.label}
        </Link>
      );
    }
    if (onCallMember) {
      return (
        <Link href="/on-call" className="text-blue-700 underline">
          On-call
        </Link>
      );
    }
    return <OnCallAddButton profile={profile} />;
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
          {onCallMember ? (
            <Link
              href="/on-call"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-2.5 py-1 text-xs text-blue-700 hover:bg-slate-50"
            >
              On-call pool
            </Link>
          ) : null}
          {showAddOnCall ? (
            <div className="border-t border-slate-100 px-2.5 py-1">
              <OnCallAddButton profile={profile} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
