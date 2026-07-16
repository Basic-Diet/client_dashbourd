// @vitest-environment jsdom

import assert from "node:assert/strict";
import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, test, vi } from "vitest";

import { RouteComponent as CreateCustomerRoute } from "../src/routes/_protected/users/create";
import { UserDetailsPageContent } from "../src/routes/_protected/users/$userId/index";
import { UserRoles } from "../src/types/auth";

const authState = vi.hoisted(() => ({
  role: "cashier",
}));

const customer = vi.hoisted(() => ({
  id: "customer-1",
  appUserId: "app-customer-1",
  fullName: "Customer One",
  phone: "+966500000001",
  phoneE164: "+966500000001",
  email: "customer@example.com",
  role: "client",
  isActive: true,
  accountStatus: "active",
  forcePasswordChange: false,
  fcmTokens: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  subscriptionsCount: 1,
  activeSubscriptionsCount: 1,
  canResetPassword: true,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { role: authState.role } }),
}));

vi.mock("@/components/pages/users/create-user-form", () => ({
  CreateUserForm: () => <form aria-label="create-customer-form" />,
}));

vi.mock("@/components/pages/users/reset-password-dialog", () => ({
  ResetPasswordDialog: () => null,
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({
    ...(options as object),
    useParams: () => ({ userId: "customer-1" }),
  }),
  lazyRouteComponent: (component: unknown) => component,
  Link: ({ to, children }: { to: string; children: ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useSuspenseQuery: () => ({ data: { data: customer } }),
  };
});

afterEach(() => {
  cleanup();
  authState.role = UserRoles.CASHIER;
});

test("cashier can render create-customer route form", () => {
  render(<CreateCustomerRoute />);

  assert(screen.getByRole("form", { name: "create-customer-form" }));
  assert.equal(screen.queryByText(/ليس لديك صلاحية/), null);
});

test.each([UserRoles.KITCHEN, UserRoles.COURIER])(
  "%s sees forbidden create-customer route state",
  (role) => {
    authState.role = role;
    render(<CreateCustomerRoute />);

    assert(screen.getByText(/ليس لديك صلاحية/));
    assert.equal(screen.queryByRole("form", { name: "create-customer-form" }), null);
  }
);

test("cashier customer details show lifecycle actions", () => {
  render(<UserDetailsPageContent userId="customer-1" />);

  assert(screen.getAllByText("Customer One").length > 0);
  assert(screen.getByRole("link", { name: /إنشاء اشتراك/ }));
  assert(screen.getByRole("button", { name: /إعادة تعيين كلمة المرور/ }));
});

test.each([UserRoles.KITCHEN, UserRoles.COURIER])(
  "%s customer details hide lifecycle actions when rendered directly",
  (role) => {
    authState.role = role;
    render(<UserDetailsPageContent userId="customer-1" />);

    assert(screen.getAllByText("Customer One").length > 0);
    assert.equal(screen.queryByRole("link", { name: /إنشاء اشتراك/ }), null);
    assert.equal(
      screen.queryByRole("button", { name: /إعادة تعيين كلمة المرور/ }),
      null
    );
  }
);
