export interface ParsedUserAgent {
  browser: string;
  /** Platform / hardware family label (iPhone, Mac, Windows, …). */
  device: string;
  platform: string;
  browserVersion: string | null;
  isMobile: boolean;
}

const EMPTY_UA: ParsedUserAgent = {
  browser: "—",
  device: "—",
  platform: "—",
  browserVersion: null,
  isMobile: false,
};

function browserVersionFromUa(ua: string, browser: string): string | null {
  if (browser === "Edge") {
    const match = ua.match(/\bEdg\/(\d+(?:\.\d+)?)/i);
    return match?.[1] ?? null;
  }
  if (browser === "Firefox" || browser === "Firefox (iOS)") {
    const match = ua.match(/\b(?:Firefox|FxiOS)\/(\d+(?:\.\d+)?)/i);
    return match?.[1] ?? null;
  }
  if (browser === "Chrome" || browser === "Chrome (iOS)") {
    const match = ua.match(/\b(?:Chrome|CriOS)\/(\d+(?:\.\d+)?)/i);
    return match?.[1] ?? null;
  }
  if (browser === "Safari") {
    const match = ua.match(/\bVersion\/(\d+(?:\.\d+)?)/i);
    return match?.[1] ?? null;
  }
  return null;
}

/** Lightweight user-agent parsing for admin nav logs (not for security decisions). */
export function parseUserAgent(ua: string | null | undefined): ParsedUserAgent {
  if (!ua?.trim()) return { ...EMPTY_UA };

  const raw = ua.trim();
  const lower = raw.toLowerCase();

  let platform = "Desktop";
  if (lower.includes("iphone")) platform = "iPhone";
  else if (lower.includes("ipad")) platform = "iPad";
  else if (lower.includes("android")) platform = "Android";
  else if (lower.includes("mobile")) platform = "Mobile";
  else if (lower.includes("macintosh") || lower.includes("mac os x")) platform = "Mac";
  else if (lower.includes("windows")) platform = "Windows";
  else if (lower.includes("linux")) platform = "Linux";

  let browser = "Unknown";
  if (lower.includes("edg/")) browser = "Edge";
  else if (lower.includes("firefox/")) browser = "Firefox";
  else if (lower.includes("crios/")) browser = "Chrome (iOS)";
  else if (lower.includes("fxios/")) browser = "Firefox (iOS)";
  else if (lower.includes("chrome/") && !lower.includes("chromium")) browser = "Chrome";
  else if (lower.includes("safari/") && !lower.includes("chrome/") && !lower.includes("chromium"))
    browser = "Safari";

  const isMobile =
    platform === "iPhone" ||
    platform === "iPad" ||
    platform === "Android" ||
    platform === "Mobile" ||
    lower.includes("mobile");

  return {
    browser,
    device: platform,
    platform,
    browserVersion: browserVersionFromUa(raw, browser),
    isMobile,
  };
}

export function formatParsedUserAgent(ua: ParsedUserAgent): string {
  if (ua.browser === "—") return "—";
  const browserLabel = ua.browserVersion ? `${ua.browser} ${ua.browserVersion}` : ua.browser;
  const mobile = ua.isMobile ? " · Mobile" : "";
  return `${browserLabel} · ${ua.platform}${mobile}`;
}
