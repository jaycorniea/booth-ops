import { phoneTelHref } from "@/lib/phone-format";

const ICON_CLASS = "h-3.5 w-3.5";

function PersonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
      <path
        fillRule="evenodd"
        d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
      <path
        fillRule="evenodd"
        d="M2 3.5A1.5 1.5 0 013.5 2h2.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 010 2.122l-1.44 1.44a12.042 12.042 0 005.303 5.303l1.44-1.44a1.5 1.5 0 012.122 0l2.12 2.122a1.5 1.5 0 01.44 1.06V16.5a1.5 1.5 0 01-1.5 1.5H15A12 12 0 012 3.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
    </svg>
  );
}

export type SpreadsheetFieldKind = "name" | "phone" | "email";

function FieldIcon({ kind }: { kind: SpreadsheetFieldKind }) {
  if (kind === "name") return <PersonIcon className={ICON_CLASS} />;
  if (kind === "phone") return <PhoneIcon className={ICON_CLASS} />;
  return <MailIcon className={ICON_CLASS} />;
}

/** Leading field icon — phone/email stay tappable contact links when a value is present. */
export function SpreadsheetFieldLead({
  kind,
  value,
  slotLabel,
  allowContact,
}: {
  kind: SpreadsheetFieldKind;
  value: string;
  slotLabel: string;
  allowContact?: boolean;
}) {
  const trimmed = value.trim();
  const href =
    kind === "phone" && trimmed
      ? phoneTelHref(trimmed)
      : kind === "email" && trimmed
        ? `mailto:${trimmed}`
        : undefined;
  const canLink = Boolean(allowContact && href);

  if (canLink && href) {
    const label = kind === "phone" ? `Call ${slotLabel}` : `Email ${slotLabel}`;
    return (
      <a
        href={href}
        className="shrink-0 rounded p-0.5 text-blue-700 hover:bg-blue-50"
        aria-label={label}
      >
        <FieldIcon kind={kind} />
      </a>
    );
  }

  return (
    <span className="shrink-0 rounded p-0.5 text-blue-700" aria-hidden="true">
      <FieldIcon kind={kind} />
    </span>
  );
}

export function SpreadsheetContactLink({
  kind,
  value,
  slotLabel,
}: {
  kind: "phone" | "email";
  value: string;
  slotLabel: string;
}) {
  return (
    <SpreadsheetFieldLead kind={kind} value={value} slotLabel={slotLabel} allowContact />
  );
}
