import assert from "node:assert/strict";
import { test } from "vitest";
import { canRoleAccessRoute } from "../src/constants/routes";
import { getScreensForRole } from "../src/lib/operationsBoard";
import { UserRoles } from "../src/types/auth";

test("courier role can open operations while remaining scoped to courier queue", () => {
  assert.equal(canRoleAccessRoute(UserRoles.COURIER, "/delivery"), true);
  assert.equal(canRoleAccessRoute(UserRoles.COURIER, "/operations"), true);
  assert.equal(canRoleAccessRoute(UserRoles.COURIER, "/operations/"), true);
  assert.deepEqual(getScreensForRole(UserRoles.COURIER).screens, ["courier"]);
});
