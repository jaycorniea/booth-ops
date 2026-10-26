import { hasVolunteer, UNASSIGNED_SLOT_CLASS, UNASSIGNED_SLOT_TEXT_CLASS } from "@/lib/event-dates";
import { formatVolunteerDisplayName } from "@/lib/volunteer-display-name";
import { ContactEmail, ContactPhone } from "./ContactField";

export function VolunteerContact({
  name,
  phone,
  email,
  empty = "Open",
  variant = "default",
  allowContact = true,
  showContact = true,
}: {
  name?: string;
  phone?: string;
  email?: string;
  empty?: string;
  variant?: "default" | "prominent";
  allowContact?: boolean;
  showContact?: boolean;
}) {
  if (!hasVolunteer(name)) {
    if (variant === "prominent") {
      return <span className="text-blue-200 italic">{empty}</span>;
    }
    return (
      <div className={UNASSIGNED_SLOT_CLASS}>
        <span className={UNASSIGNED_SLOT_TEXT_CLASS}>{empty}</span>
      </div>
    );
  }

  const nameClass = variant === "prominent" ? "text-lg font-semibold text-white" : "font-medium text-slate-800";
  const linkClass =
    variant === "prominent"
      ? "block text-base text-blue-100 hover:text-white hover:underline"
      : "block text-xs text-blue-700 hover:underline";
  const staticClass =
    variant === "prominent" ? "block text-base text-blue-100" : "block text-xs text-slate-600";

  const displayName = formatVolunteerDisplayName(name ?? "");

  const missingPhoneLabel = variant === "prominent" ? "No phone" : "No phone on file";
  const missingEmailLabel = variant === "prominent" ? "No email" : "No email on file";

  return (
    <div className="space-y-1">
      <p className={nameClass}>{displayName}</p>
      <ContactPhone
        phone={phone ?? ""}
        className={allowContact ? linkClass : staticClass}
        allowContact={allowContact}
        showContact={showContact}
        emptyLabel={missingPhoneLabel}
      />
      <ContactEmail
        email={email ?? ""}
        className={allowContact ? linkClass : staticClass}
        allowContact={allowContact}
        showContact={showContact}
        emptyLabel={missingEmailLabel}
      />
    </div>
  );
}