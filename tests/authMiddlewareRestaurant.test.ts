import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { authMiddleware } from "../src/lib/authMiddleware";
import { UserRoles } from "../src/types/auth";

vi.mock("@tanstack/react-router", () => ({
  redirect: (args: unknown) => ({ redirect: args }),
}));

const restaurantSession = {
  status: true,
  token: "token",
  user: {
    id: "restaurant-user",
    name: "Restaurant User",
    email: "restaurant@example.com",
    role: UserRoles.RESTAURANT,
    isActive: true,
    lastLoginAt: "",
    createdAt: "",
    updatedAt: "",
  },
};

test("restaurant auth middleware allows restaurant contract routes and blocks unrelated admin routes", () => {
  assert.doesNotThrow(() => authMiddleware(restaurantSession, "/operations"));
  assert.doesNotThrow(() => authMiddleware(restaurantSession, "/delivery"));
  assert.doesNotThrow(() => authMiddleware(restaurantSession, "/subscriptions"));
  assert.doesNotThrow(() => authMiddleware(restaurantSession, "/users/create"));
  assert.doesNotThrow(() => authMiddleware(restaurantSession, "/users/user-1"));
  assert.doesNotThrow(() =>
    authMiddleware(restaurantSession, "/users/user-1/create-subscription")
  );
  assert.doesNotThrow(() => authMiddleware(restaurantSession, "/addons/create"));
  assert.doesNotThrow(() =>
    authMiddleware(restaurantSession, "/menu/products/product-1/update")
  );

  for (const blockedPath of [
    "/dashboard-users",
    "/accounting",
    "/payments",
    "/settings",
  ]) {
    assert.throws(
      () => authMiddleware(restaurantSession, blockedPath),
      (error) => {
        assert.deepEqual(error, { redirect: { to: "/operations" } });
        return true;
      }
    );
  }
});

