import exampleJson from "../../config/booth.example.json";

export type LiveAnchor = {
  relativeTo: "eveOfOpen" | "openDate" | "closeDate";
  localTime: string;
};

export type ShiftTemplate = {
  num: number;
  start: string;
  end: string;
};

export type CaptainSplitBlock = {
  label: string;
  shiftNums: number[];
  timeRange: string;
};

export type BoothConfig = {
  org: {
    name: string;
    timezone: string;
    locale: string;
    productName: string;
    contactName: string;
    contactPhone: string;
    contactEmail: string;
  };
  event: {
    name: string;
    boothName: string;
    location: string;
    hoursLabel: string;
    openDate: string;
    closeDate: string;
    setupStartDate: string;
    setupEndDate: string;
  };
  lifecycle: {
    captainToolsOpenDate: string;
    liveStart: LiveAnchor;
    liveEnd: LiveAnchor;
  };
  shifts: {
    templates: ShiftTemplate[];
    officialSlotsPerShift: number;
  };
  captains: {
    defaultMode: "fullDay" | "split";
    splitDays: string[];
    split: {
      am: CaptainSplitBlock;
      pm: CaptainSplitBlock;
    };
  };
  labels: {
    admin: string;
    captain: string;
    volunteer: string;
    viewer: string;
  };
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

function fail(message: string): never {
  throw new Error(`Invalid booth config: ${message}`);
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string") fail(`${field} must be a string`);
  return value;
}

function optionalString(value: unknown, field: string): string {
  if (value == null) return "";
  if (typeof value !== "string") fail(`${field} must be a string`);
  return value;
}

function requireIsoDate(value: unknown, field: string): string {
  const text = requireString(value, field);
  if (!ISO_DATE_RE.test(text)) fail(`${field} must be YYYY-MM-DD`);
  return text;
}

function optionalIsoDate(value: unknown, field: string): string {
  const text = optionalString(value, field);
  if (text && !ISO_DATE_RE.test(text)) fail(`${field} must be YYYY-MM-DD or empty`);
  return text;
}

function requireTime(value: unknown, field: string): string {
  const text = requireString(value, field);
  if (!TIME_RE.test(text)) fail(`${field} must be HH:MM`);
  return text;
}

function requireAnchor(value: unknown, field: string): LiveAnchor {
  if (!value || typeof value !== "object") fail(`${field} must be an object`);
  const row = value as Record<string, unknown>;
  const relativeTo = requireString(row.relativeTo, `${field}.relativeTo`);
  if (relativeTo !== "eveOfOpen" && relativeTo !== "openDate" && relativeTo !== "closeDate") {
    fail(`${field}.relativeTo must be eveOfOpen, openDate, or closeDate`);
  }
  return { relativeTo, localTime: requireTime(row.localTime, `${field}.localTime`) };
}

function requireSplitBlock(value: unknown, field: string): CaptainSplitBlock {
  if (!value || typeof value !== "object") fail(`${field} must be an object`);
  const row = value as Record<string, unknown>;
  const shiftNums = row.shiftNums;
  if (!Array.isArray(shiftNums) || shiftNums.some((n) => !Number.isInteger(n) || (n as number) < 1)) {
    fail(`${field}.shiftNums must be positive integers`);
  }
  return {
    label: requireString(row.label, `${field}.label`),
    shiftNums: shiftNums as number[],
    timeRange: requireString(row.timeRange, `${field}.timeRange`),
  };
}

export function parseBoothConfig(raw: unknown): BoothConfig {
  if (!raw || typeof raw !== "object") fail("root must be an object");
  const root = raw as Record<string, unknown>;
  const org = root.org as Record<string, unknown> | undefined;
  const event = root.event as Record<string, unknown> | undefined;
  const lifecycle = root.lifecycle as Record<string, unknown> | undefined;
  const shifts = root.shifts as Record<string, unknown> | undefined;
  const captains = root.captains as Record<string, unknown> | undefined;
  const labels = root.labels as Record<string, unknown> | undefined;
  if (!org || !event || !lifecycle || !shifts || !captains || !labels) {
    fail("org, event, lifecycle, shifts, captains, and labels are required");
  }

  const templatesRaw = shifts.templates;
  if (!Array.isArray(templatesRaw) || templatesRaw.length < 1) {
    fail("shifts.templates must have at least one shift");
  }
  const templates = templatesRaw.map((item, index) => {
    if (!item || typeof item !== "object") fail(`shifts.templates[${index}] must be an object`);
    const row = item as Record<string, unknown>;
    const num = row.num;
    if (!Number.isInteger(num) || (num as number) < 1) fail(`shifts.templates[${index}].num must be a positive integer`);
    return {
      num: num as number,
      start: requireTime(row.start, `shifts.templates[${index}].start`),
      end: requireTime(row.end, `shifts.templates[${index}].end`),
    };
  });

  const officialSlotsPerShift = shifts.officialSlotsPerShift;
  if (!Number.isInteger(officialSlotsPerShift) || (officialSlotsPerShift as number) < 1) {
    fail("shifts.officialSlotsPerShift must be an integer >= 1");
  }

  const defaultMode = requireString(captains.defaultMode, "captains.defaultMode");
  if (defaultMode !== "fullDay" && defaultMode !== "split") {
    fail("captains.defaultMode must be fullDay or split");
  }
  const splitDaysRaw = captains.splitDays;
  if (!Array.isArray(splitDaysRaw) || splitDaysRaw.some((d) => typeof d !== "string")) {
    fail("captains.splitDays must be an array of ISO dates");
  }
  const split = captains.split as Record<string, unknown> | undefined;
  if (!split) fail("captains.split is required");

  const timezone = requireString(org.timezone, "org.timezone");
  if (!timezone.includes("/")) fail("org.timezone must be an IANA time zone");

  return {
    org: {
      name: requireString(org.name, "org.name"),
      timezone,
      locale: requireString(org.locale, "org.locale"),
      productName: requireString(org.productName, "org.productName"),
      contactName: requireString(org.contactName, "org.contactName"),
      contactPhone: requireString(org.contactPhone, "org.contactPhone"),
      contactEmail: requireString(org.contactEmail, "org.contactEmail"),
    },
    event: {
      name: requireString(event.name, "event.name"),
      boothName: requireString(event.boothName, "event.boothName"),
      location: requireString(event.location, "event.location"),
      hoursLabel: requireString(event.hoursLabel, "event.hoursLabel"),
      openDate: requireIsoDate(event.openDate, "event.openDate"),
      closeDate: requireIsoDate(event.closeDate, "event.closeDate"),
      setupStartDate: optionalIsoDate(event.setupStartDate, "event.setupStartDate"),
      setupEndDate: optionalIsoDate(event.setupEndDate, "event.setupEndDate"),
    },
    lifecycle: {
      captainToolsOpenDate: requireIsoDate(
        lifecycle.captainToolsOpenDate,
        "lifecycle.captainToolsOpenDate"
      ),
      liveStart: requireAnchor(lifecycle.liveStart, "lifecycle.liveStart"),
      liveEnd: requireAnchor(lifecycle.liveEnd, "lifecycle.liveEnd"),
    },
    shifts: {
      templates,
      officialSlotsPerShift: officialSlotsPerShift as number,
    },
    captains: {
      defaultMode,
      splitDays: splitDaysRaw as string[],
      split: {
        am: requireSplitBlock(split.am, "captains.split.am"),
        pm: requireSplitBlock(split.pm, "captains.split.pm"),
      },
    },
    labels: {
      admin: requireString(labels.admin, "labels.admin"),
      captain: requireString(labels.captain, "labels.captain"),
      volunteer: requireString(labels.volunteer, "labels.volunteer"),
      viewer: requireString(labels.viewer, "labels.viewer"),
    },
  };
}

let cached: BoothConfig | null = null;

export function loadBoothConfig(force = false): BoothConfig {
  if (cached && !force) return cached;
  cached = parseBoothConfig(exampleJson);
  return cached;
}

export function getBoothConfig(): BoothConfig {
  return loadBoothConfig();
}
