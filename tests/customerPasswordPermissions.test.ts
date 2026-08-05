import { describe, expect, it } from "vitest";

import { canManageCustomerPasswords } from "../src/lib/rolePermissions";

describe("customer password permissions", () => {
  it("allows restaurant accounts to reset app customer passwords", () => {
    expect(canManageCustomerPasswords("restaurant")).toBe(true);
  });

  it("keeps legacy kitchen, cashier, and courier accounts blocked", () => {
    expect(canManageCustomerPasswords("kitchen")).toBe(false);
    expect(canManageCustomerPasswords("cashier")).toBe(false);
    expect(canManageCustomerPasswords("courier")).toBe(false);
  });
});
