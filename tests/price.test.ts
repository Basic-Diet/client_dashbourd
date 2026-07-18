import assert from "node:assert/strict";
import {
  halalaToRiyal,
  halalaToRiyalInput,
  isValidRiyalInput,
  normalizeRiyalInput,
  optionalRiyalToHalala,
  riyalToHalala,
} from "../src/utils/price";
import { test } from "vitest";

test("price.test", () => {
  assert.equal(riyalToHalala(15), 1500);
  assert.equal(riyalToHalala(19), 1900);
  assert.equal(riyalToHalala(5), 500);
  assert.equal(riyalToHalala("15.25"), 1525);
  assert.equal(riyalToHalala("1.005"), 101);
  assert.equal(riyalToHalala("١٩"), 1900);
  assert.equal(riyalToHalala("٥"), 500);
  assert.equal(riyalToHalala("١٢٫٥٠"), 1250);
  assert.equal(normalizeRiyalInput(" ١٢٫٥٠ "), "12.50");
  assert.equal(optionalRiyalToHalala(""), undefined);
  assert.equal(optionalRiyalToHalala(undefined), undefined);
  assert.equal(optionalRiyalToHalala("7.5"), 750);
  assert.equal(halalaToRiyal(1525), 15.25);
  assert.equal(halalaToRiyalInput(1500), "15");
  assert.equal(halalaToRiyalInput(1525), "15.25");
  assert.equal(isValidRiyalInput("0"), true);
  assert.equal(isValidRiyalInput("12.34"), true);
  assert.equal(isValidRiyalInput("-1"), false);
  assert.equal(isValidRiyalInput("invalid"), false);
});
