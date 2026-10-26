import Link from "next/link";
import { ON_CALL_ROLE, SHIFT_VOLUNTEER_ROLE } from "@/lib/volunteer-signup-copy";

export function VolunteerSignupLinks({ layout = "row" }: { layout?: "row" | "stack" }) {
  const className =
    layout === "stack"
      ? "flex flex-col gap-2"
      : "flex flex-wrap gap-2";

  return (
    <div className={className}>
      <Link
        href={SHIFT_VOLUNTEER_ROLE.signupPath}
        className="inline-flex items-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
      >
        {SHIFT_VOLUNTEER_ROLE.signupCta}
      </Link>
      <Link
        href={ON_CALL_ROLE.signupPath}
        className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-800 hover:bg-blue-100"
      >
        {ON_CALL_ROLE.signupCta}
      </Link>
    </div>
  );
}