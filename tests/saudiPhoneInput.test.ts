import { describe, expect, it } from "vitest";

import {
  isCompleteSaudiMobile,
  normalizeSaudiPhoneInput,
} from "../src/utils/saudiPhoneInput";

describe("Saudi customer phone input", () => {
  it("keeps the +966 prefix when the field is cleared or partially deleted", () => {
    expect(normalizeSaudiPhoneInput("")).toBe("+966");
    expect(normalizeSaudiPhoneInput("+96")).toBe("+966");
    expect(normalizeSaudiPhoneInput("+9")).toBe("+966");
  });

  it("accepts the required full E.164 example", () => {
    expect(normalizeSaudiPhoneInput("+966566796659")).toBe(
      "+966566796659"
    );
    expect(isCompleteSaudiMobile("+966566796659")).toBe(true);
  });

  it("normalizes local and international paste formats", () => {
    expect(normalizeSaudiPhoneInput("566796659")).toBe("+966566796659");
    expect(normalizeSaudiPhoneInput("0566796659")).toBe("+966566796659");
    expect(normalizeSaudiPhoneInput("00966566796659")).toBe(
      "+966566796659"
    );
  });

  it("removes duplicated prefixes and limits the subscriber part to 9 digits", () => {
    expect(normalizeSaudiPhoneInput("+966+96656679665999")).toBe(
      "+966566796659"
    );
  });

  it("ignores an invalid first subscriber digit instead of leaving a permanently invalid value", () => {
    expect(normalizeSaudiPhoneInput("+9662")).toBe("+966");
    expect(normalizeSaudiPhoneInput("231867987")).toBe("+966");
    expect(normalizeSaudiPhoneInput("+966231867987")).toBe("+966");
  });

  it("rejects incomplete numbers and numbers that do not start with 5", () => {
    expect(isCompleteSaudiMobile("+966")).toBe(false);
    expect(isCompleteSaudiMobile("+966111111111")).toBe(false);
    expect(isCompleteSaudiMobile("+96656679665")).toBe(false);
  });
});
