const BIDI_RE = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

function stripPhoneDecorations(phone: string): string {
  return phone.replace(BIDI_RE, "").trim();
}

/** Digits only; drops leading US country code when 11 digits. */
export function normalizePhoneDigits(phone: string): string {
  const digits = stripPhoneDecorations(phone).replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
}

/** US display: (612) 555-0100. Other shapes return trimmed input. */
export function formatPhoneDisplay(phone: string): string {
  const trimmed = stripPhoneDecorations(phone);
  if (!trimmed) return "";

  const national = normalizePhoneDigits(trimmed);
  if (national.length === 10) {
    return `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`;
  }

  return trimmed;
}

export function phoneTelHref(phone: string): string {
  const digits = stripPhoneDecorations(phone).replace(/\D/g, "");
  if (!digits) return "";
  return `tel:${digits}`;
}
