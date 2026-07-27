import { describe, expect, it } from "vitest";

import createUserSchema from "../src/lib/validations/createUserSchema";

const baseValues = {
  fullName: "Test Customer",
  email: "",
  temporaryPassword: "",
  isActive: true,
};

describe("customer create Saudi phone contract", () => {
  it.each([
    ["512345678", "+966512345678"],
    ["0512345678", "+966512345678"],
    ["+966512345678", "+966512345678"],
    ["00966512345678", "+966512345678"],
  ])("normalizes %s to backend E.164 %s", (phoneE164, expected) => {
    const parsed = createUserSchema.parse({ ...baseValues, phoneE164 });
    expect(parsed.phoneE164).toBe(expected);
  });

  it.each(["", "412345678", "51234567", "5123456789"])(
    "rejects invalid Saudi subscriber number %s",
    (phoneE164) => {
      const parsed = createUserSchema.safeParse({ ...baseValues, phoneE164 });
      expect(parsed.success).toBe(false);
    }
  );
});
