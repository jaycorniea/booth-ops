import { describe, expect, it } from "vitest";
import { parseDayCaptainFormData } from "./day-captain-form";

describe("parseDayCaptainFormData", () => {
  it("reads captain fields including district", () => {
    const form = new FormData();
    form.set("name", "Alex Rivera");
    form.set("phone", "(612) 555-0100");
    form.set("email", "alex@example.com");
    form.set("district", "1");

    expect(parseDayCaptainFormData(form)).toEqual({
      name: "Alex Rivera",
      phone: "(612) 555-0100",
      email: "alex@example.com",
      district: "1",
    });
  });

  it("defaults district to empty string", () => {
    const form = new FormData();
    form.set("name", "Jamie");
    expect(parseDayCaptainFormData(form).district).toBe("");
  });
});