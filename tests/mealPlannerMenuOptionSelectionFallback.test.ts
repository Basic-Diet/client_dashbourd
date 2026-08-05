import assert from "node:assert/strict";
import { it as test } from "vitest";

import { mergeMenuOptionsWithPicker } from "../src/components/pages/menu/meal-builder/mealPlannerOptionGroupFlow";

const menuOption = {
  id: "menu-option-1",
  key: "oats",
  name: { ar: "شوفان", en: "Oats" },
  groupId: "group-1",
  extraPriceHalala: 0,
  isActive: true,
  isAvailable: true,
  sortOrder: 1,
};

test("menu options remain visible but disabled when the authoritative picker omits them", () => {
  const rows = mergeMenuOptionsWithPicker([menuOption], [], []);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].optionId, "menu-option-1");
  assert.equal(rows[0].assignable, false);
  assert.equal(rows[0].eligible, false);
  assert.equal(rows[0].state, "not_in_authoritative_picker");
  assert.deepEqual(rows[0].reasonCodes, ["NO_AUTHORITATIVE_CANDIDATE"]);
});

test("menu options use a unique authoritative picker candidate matched by key", () => {
  const rows = mergeMenuOptionsWithPicker(
    [menuOption],
    [
      {
        id: "picker-relation-1",
        optionId: "authoritative-option-1",
        key: "oats",
        name: { ar: "شوفان", en: "Oats" },
        type: "option",
        assignable: true,
        eligible: true,
      },
    ],
    []
  );

  assert.equal(rows[0].optionId, "authoritative-option-1");
  assert.equal(rows[0].assignable, true);
});

test("ambiguous key matches are not treated as authoritative", () => {
  const rows = mergeMenuOptionsWithPicker(
    [menuOption],
    [
      { id: "one", optionId: "one", key: "oats", type: "option", assignable: true },
      { id: "two", optionId: "two", key: "oats", type: "option", assignable: true },
    ],
    []
  );

  assert.equal(rows[0].optionId, "menu-option-1");
  assert.equal(rows[0].assignable, false);
});
