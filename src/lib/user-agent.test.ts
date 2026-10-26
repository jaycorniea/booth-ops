import { describe, expect, it } from "vitest";
import { formatParsedUserAgent, parseUserAgent } from "./user-agent";

describe("parseUserAgent", () => {
  it("returns dashes for empty input", () => {
    expect(parseUserAgent("")).toEqual({
      browser: "—",
      device: "—",
      platform: "—",
      browserVersion: null,
      isMobile: false,
    });
    expect(parseUserAgent(null)).toEqual({
      browser: "—",
      device: "—",
      platform: "—",
      browserVersion: null,
      isMobile: false,
    });
  });

  it("parses desktop Chrome on Mac", () => {
    const ua =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    expect(parseUserAgent(ua)).toEqual({
      browser: "Chrome",
      device: "Mac",
      platform: "Mac",
      browserVersion: "120.0",
      isMobile: false,
    });
    expect(formatParsedUserAgent(parseUserAgent(ua))).toBe("Chrome 120.0 · Mac");
  });

  it("parses iPhone Safari", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
    expect(parseUserAgent(ua)).toEqual({
      browser: "Safari",
      device: "iPhone",
      platform: "iPhone",
      browserVersion: "17.0",
      isMobile: true,
    });
  });

  it("parses Android Chrome", () => {
    const ua =
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
    expect(parseUserAgent(ua)).toEqual({
      browser: "Chrome",
      device: "Android",
      platform: "Android",
      browserVersion: "120.0",
      isMobile: true,
    });
  });

  it("parses Edge on Windows", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";
    expect(parseUserAgent(ua)).toEqual({
      browser: "Edge",
      device: "Windows",
      platform: "Windows",
      browserVersion: "120.0",
      isMobile: false,
    });
  });
});
