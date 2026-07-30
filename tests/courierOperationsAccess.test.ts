import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "vitest";
import { canRoleAccessRoute } from "../src/constants/routes";
import { getScreensForRole } from "../src/lib/operationsBoard";
import { UserRoles } from "../src/types/auth";

const projectRoot = path.resolve(import.meta.dirname, "..");

function readProjectFile(relativePath: string) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

test("courier role can open operations while remaining scoped to courier queue", () => {
  assert.equal(canRoleAccessRoute(UserRoles.COURIER, "/delivery"), true);
  assert.equal(canRoleAccessRoute(UserRoles.COURIER, "/operations"), true);
  assert.equal(canRoleAccessRoute(UserRoles.COURIER, "/operations/"), true);
  assert.deepEqual(getScreensForRole(UserRoles.COURIER).screens, ["courier"]);
});

test("delivery route exposes the complete tracking and preparation workspace", () => {
  const deliveryRoute = readProjectFile("src/routes/_protected/delivery/index.tsx");
  const preparationBoard = readProjectFile(
    "src/components/pages/delivery/DeliveryOperationsBoard.tsx"
  );

  assert.match(deliveryRoute, /value="tracking"/);
  assert.match(deliveryRoute, /value="preparation"/);
  assert.match(deliveryRoute, /<DeliveryOperationsBoard\s*\/>/);
  assert.match(deliveryRoute, /متابعة التوصيل/);
  assert.match(deliveryRoute, /تحضير طلبات التوصيل/);

  assert.match(preparationBoard, /useOperationsBoard\(\{ date, q: debouncedSearch \}\)/);
  assert.match(preparationBoard, /visibleScreens\.includes\("courier"\)/);
  assert.match(preparationBoard, /<OperationsCourierBoard/);
  assert.match(preparationBoard, /pendingActions=\{pendingActions\}/);
  assert.match(preparationBoard, /onAction=\{handleRequestAction\}/);
  assert.match(preparationBoard, /<ReasonActionDialog/);
});
