import { getBoothConfig, type BoothConfig, type CaptainSplitBlock, type ShiftTemplate } from "./booth-config";

export const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export type EventSettings = {
  year: number;
  openDate: string;
  closeDate: string;
  setupStartDate: string;
  setupEndDate: string;
  captainToolsOpenDate: string;
  /** Empty string = every event day is a single full-day captain. */
  splitCaptainDate: string;
  boothName: string;
  boothLocation: string;
  boothHours: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  timezone: string;
  officialSlotsPerShift: number;
  shiftTemplates: ShiftTemplate[];
  captainSplit: {
    am: CaptainSplitBlock;
    pm: CaptainSplitBlock;
  };
};

export type EventSettingsFieldError = {
  field: keyof EventSettings | "form";
  message: string;
};

export type EventSettingsDerived = {
  eventDates: string[];
  dayCount: number;
  eveDate: string;
};

export function eventSettingsFromConfig(config: BoothConfig = getBoothConfig()): EventSettings {
  return {
    year: Number(config.event.openDate.slice(0, 4)),
    openDate: config.event.openDate,
    closeDate: config.event.closeDate,
    setupStartDate: config.event.setupStartDate,
    setupEndDate: config.event.setupEndDate,
    captainToolsOpenDate: config.lifecycle.captainToolsOpenDate,
    splitCaptainDate: config.captains.splitDays[0] ?? "",
    boothName: config.event.boothName,
    boothLocation: config.event.location,
    boothHours: config.event.hoursLabel,
    contactName: config.org.contactName,
    contactPhone: config.org.contactPhone,
    contactEmail: config.org.contactEmail,
    timezone: config.org.timezone,
    officialSlotsPerShift: config.shifts.officialSlotsPerShift,
    shiftTemplates: config.shifts.templates.map((t) => ({ ...t })),
    captainSplit: {
      am: { ...config.captains.split.am, shiftNums: [...config.captains.split.am.shiftNums] },
      pm: { ...config.captains.split.pm, shiftNums: [...config.captains.split.pm.shiftNums] },
    },
  };
}

export const DEFAULT_EVENT_SETTINGS: EventSettings = eventSettingsFromConfig();

let activeEventSettings: EventSettings = eventSettingsFromConfig();

export function getActiveEventSettings(): EventSettings {
  return activeEventSettings;
}

export function setActiveEventSettings(next: EventSettings): void {
  activeEventSettings = {
    ...next,
    shiftTemplates: next.shiftTemplates.map((t) => ({ ...t })),
    captainSplit: {
      am: { ...next.captainSplit.am, shiftNums: [...next.captainSplit.am.shiftNums] },
      pm: { ...next.captainSplit.pm, shiftNums: [...next.captainSplit.pm.shiftNums] },
    },
  };
}

export function resetActiveEventSettings(): void {
  activeEventSettings = eventSettingsFromConfig();
}

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const parsed = parseIsoNoon(value);
  return parsed !== null && toIsoDate(parsed) === value;
}

export function parseIsoNoon(iso: string): Date | null {
  const match = ISO_DATE_RE.exec(iso.trim());
  if (!match) return null;
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addIsoDays(iso: string, days: number): string {
  const date = parseIsoNoon(iso);
  if (!date) return iso;
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

export function listEventDates(settings: EventSettings = getActiveEventSettings()): string[] {
  const start = parseIsoNoon(settings.openDate);
  const end = parseIsoNoon(settings.closeDate);
  if (!start || !end || start > end) return [];
  const dates: string[] = [];
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    dates.push(toIsoDate(cursor));
  }
  return dates;
}

export function deriveEventSettings(
  settings: EventSettings = getActiveEventSettings()
): EventSettingsDerived {
  const eventDates = listEventDates(settings);
  return {
    eventDates,
    dayCount: eventDates.length,
    eveDate: addIsoDays(settings.openDate, -1),
  };
}

export function parseEventSettingsInput(
  input: Record<string, string>
): { ok: true; settings: EventSettings } | { ok: false; errors: EventSettingsFieldError[] } {
  const errors: EventSettingsFieldError[] = [];
  const current = getActiveEventSettings();
  const year = Number(String(input.year ?? "").trim());
  const openDate = String(input.openDate ?? "").trim();
  const closeDate = String(input.closeDate ?? "").trim();
  const setupStartDate = String(input.setupStartDate ?? "").trim();
  const setupEndDate = String(input.setupEndDate ?? "").trim();
  const captainToolsOpenDate = String(input.captainToolsOpenDate ?? "").trim();
  const splitCaptainDate = String(input.splitCaptainDate ?? "").trim();
  const boothName = String(input.boothName ?? "").trim();
  const boothLocation = String(input.boothLocation ?? "").trim();
  const boothHours = String(input.boothHours ?? "").trim();
  const contactName = String(input.contactName ?? "").trim();
  const contactPhone = String(input.contactPhone ?? "").trim();
  const contactEmail = String(input.contactEmail ?? "").trim();
  const timezone = String(input.timezone ?? current.timezone).trim();

  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    errors.push({ field: "year", message: "Enter a four-digit year." });
  }
  for (const [field, value, label] of [
    ["openDate", openDate, "Event start"],
    ["closeDate", closeDate, "Event end"],
    ["captainToolsOpenDate", captainToolsOpenDate, "Captain tools open"],
  ] as const) {
    if (!isIsoDate(value)) {
      errors.push({ field, message: `${label} must be a valid date.` });
    }
  }
  if (setupStartDate && !isIsoDate(setupStartDate)) {
    errors.push({ field: "setupStartDate", message: "Setup start must be a valid date or blank." });
  }
  if (setupEndDate && !isIsoDate(setupEndDate)) {
    errors.push({ field: "setupEndDate", message: "Setup end must be a valid date or blank." });
  }
  if (splitCaptainDate && !isIsoDate(splitCaptainDate)) {
    errors.push({ field: "splitCaptainDate", message: "Split captain day must be a valid date or blank." });
  }
  if (!boothName) errors.push({ field: "boothName", message: "Booth name is required." });
  if (!boothLocation) errors.push({ field: "boothLocation", message: "Booth location is required." });
  if (!boothHours) errors.push({ field: "boothHours", message: "Booth hours are required." });
  if (!contactName) errors.push({ field: "contactName", message: "Coordinator name is required." });
  if (!contactPhone) errors.push({ field: "contactPhone", message: "Coordinator phone is required." });
  if (!contactEmail || !contactEmail.includes("@")) {
    errors.push({ field: "contactEmail", message: "Enter a valid coordinator email." });
  }
  if (!timezone.includes("/")) {
    errors.push({ field: "timezone", message: "Timezone must be an IANA name." });
  }

  if (isIsoDate(openDate) && Number.isInteger(year) && year !== Number(openDate.slice(0, 4))) {
    errors.push({ field: "year", message: "Year must match the event start date." });
  }
  if (isIsoDate(openDate) && isIsoDate(closeDate) && closeDate < openDate) {
    errors.push({ field: "closeDate", message: "Event end must be on or after the start date." });
  }
  if (isIsoDate(setupStartDate) && isIsoDate(setupEndDate) && setupEndDate < setupStartDate) {
    errors.push({ field: "setupEndDate", message: "Setup end must be on or after setup start." });
  }
  if (isIsoDate(setupStartDate) && isIsoDate(openDate) && setupStartDate >= openDate) {
    errors.push({ field: "setupStartDate", message: "Setup must finish before opening day." });
  }
  if (isIsoDate(setupEndDate) && isIsoDate(openDate) && setupEndDate >= openDate) {
    errors.push({ field: "setupEndDate", message: "Setup must finish before opening day." });
  }
  if (isIsoDate(captainToolsOpenDate) && isIsoDate(openDate) && captainToolsOpenDate > openDate) {
    errors.push({ field: "captainToolsOpenDate", message: "Captain tools must open on or before opening day." });
  }
  if (splitCaptainDate && isIsoDate(splitCaptainDate) && isIsoDate(openDate) && isIsoDate(closeDate)) {
    if (splitCaptainDate < openDate || splitCaptainDate > closeDate) {
      errors.push({ field: "splitCaptainDate", message: "Split captain day must fall on an event day." });
    }
  }
  if (isIsoDate(openDate) && isIsoDate(closeDate)) {
    const dayCount = listEventDates({
      ...current,
      openDate,
      closeDate,
    }).length;
    if (dayCount > 21) {
      errors.push({ field: "closeDate", message: "Event season can be at most 21 days." });
    }
  }

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    settings: {
      ...current,
      year,
      openDate,
      closeDate,
      setupStartDate,
      setupEndDate,
      captainToolsOpenDate,
      splitCaptainDate,
      boothName,
      boothLocation,
      boothHours,
      contactName,
      contactPhone,
      contactEmail,
      timezone,
    },
  };
}

export function formatEventDateLong(iso: string, locale = getBoothConfig().org.locale): string {
  const date = parseIsoNoon(iso);
  if (!date) return iso;
  return date.toLocaleDateString(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function boothWhenWhereLines(settings: EventSettings = getActiveEventSettings()): string[] {
  const derived = deriveEventSettings(settings);
  const eventName = getBoothConfig().event.name;
  return [
    `${eventName}: ${formatEventDateLong(settings.openDate)} through ${formatEventDateLong(settings.closeDate)} (${derived.dayCount} days).`,
    `Booth: ${settings.boothLocation} — ${settings.boothName}.`,
    `Booth hours: ${settings.boothHours} each event day.`,
  ];
}
