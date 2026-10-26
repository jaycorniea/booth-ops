import { describe, expect, it } from "vitest";
import { formatPhoneDisplay, normalizePhoneDigits, phoneTelHref } from "./phone-format";

describe("phone-format", () => {
  it("normalizes US numbers with country code", () => {
    expect(normalizePhoneDigits("+1 (612) 555-0100")).toBe("6125550100");
    expect(normalizePhoneDigits("16125550100")).toBe("6125550100");
  });

  it("formats 10-digit US numbers", () => {
    expect(formatPhoneDisplay("6125550100")).toBe("(612) 555-0100");
    expect(formatPhoneDisplay("612-555-1036")).toBe("(612) 555-1036");
    expect(formatPhoneDisplay("+1 612 555 0100")).toBe("(612) 555-0100");
  });

  it("strips bidi marks from pasted numbers", () => {
    expect(formatPhoneDisplay("\u202D(612) 555-0100\u202C")).toBe("(612) 555-0100");
  });

  it("returns trimmed input when not a US 10-digit number", () => {
    expect(formatPhoneDisplay("ext. 42")).toBe("ext. 42");
    expect(formatPhoneDisplay("")).toBe("");
  });

  it("builds tel links from digits", () => {
    expect(phoneTelHref("(612) 555-0100")).toBe("tel:6125550100");
    expect(phoneTelHref("")).toBe("");
  });
});
