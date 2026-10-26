import { UNASSIGNED_SLOT_CLASS, UNASSIGNED_SLOT_TEXT_CLASS } from "@/lib/event-dates";
import { formatPhoneDisplay, phoneTelHref } from "@/lib/phone-format";

export function MissingContactLabel({ label }: { label: string }) {
  return (
    <div className={UNASSIGNED_SLOT_CLASS}>
      <span className={UNASSIGNED_SLOT_TEXT_CLASS}>{label}</span>
    </div>
  );
}

export function ContactPhone({
  phone,
  className,
  allowContact = true,
  showContact = true,
  emptyLabel,
}: {
  phone: string;
  className?: string;
  allowContact?: boolean;
  showContact?: boolean;
  emptyLabel?: string;
}) {
  if (!showContact) return null;
  if (!phone.trim()) {
    return emptyLabel ? <MissingContactLabel label={emptyLabel} /> : null;
  }
  if (!allowContact) {
    return <span className={className}>{formatPhoneDisplay(phone)}</span>;
  }
  return (
    <a href={phoneTelHref(phone)} className={className}>
      {formatPhoneDisplay(phone)}
    </a>
  );
}

export function ContactEmail({
  email,
  className,
  allowContact = true,
  showContact = true,
  emptyLabel,
}: {
  email: string;
  className?: string;
  allowContact?: boolean;
  showContact?: boolean;
  emptyLabel?: string;
}) {
  if (!showContact) return null;
  if (!email.trim()) {
    return emptyLabel ? <MissingContactLabel label={emptyLabel} /> : null;
  }
  if (!allowContact) {
    return <span className={`${className ?? ""} break-all`}>{email}</span>;
  }
  return (
    <a href={`mailto:${email}`} className={`${className ?? ""} break-all`}>
      {email}
    </a>
  );
}