import { describe, expect, it } from "vitest";

import {
  isCompleteSaudiPhone,
  normalizeSaudiPhoneForSubmit,
  sanitizeSaudiPhoneInput,
} from "../src/utils/saudiPhoneInput";

describe("Saudi customer phone input", () => {
  it("allows the default +966 value to be edited or deleted", () => {
    expect(sanitizeSaudiPhoneInput("+966")).toBe("+966");
    expect(sanitizeSaudiPhoneInput("+96")).toBe("+96");
    expect(sanitizeSaudiPhoneInput("")).toBe("");
  });

  it("lets the operator continue typing normally after +966", () => {
    expect(sanitizeSaudiPhoneInput("+9662")).toBe("+9662");
    expect(sanitizeSaudiPhoneInput("+966231867987")).toBe("+966231867987");
    expect(sanitizeSaudiPhoneInput("+966566796659")).toBe("+966566796659");
  });

  it("accepts any subscriber prefix when at least 9 digits follow +966", () => {
    expect(isCompleteSaudiPhone("+966231867987")).toBe(true);
    expect(isCompleteSaudiPhone("+966566796659")).toBe(true);
    expect(isCompleteSaudiPhone("+96612345678")).toBe(false);
  });

  it("normalizes common international and local submit formats", () => {
    expect(normalizeSaudiPhoneForSubmit("00966566796659")).toBe(
      "+966566796659"
    );
    expect(normalizeSaudiPhoneForSubmit("966566796659")).toBe(
      "+966566796659"
    );
    expect(normalizeSaudiPhoneForSubmit("0566796659")).toBe(
      "+966566796659"
    );
  });

  it("removes non-phone characters while keeping a single leading plus", () => {
    expect(sanitizeSaudiPhoneInput("+966 231-867-987")).toBe(
      "+966231867987"
    );
  });
});