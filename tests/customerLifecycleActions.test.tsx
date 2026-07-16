// @vitest-environment jsdom

import assert from "node:assert/strict";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, test, vi } from "vitest";

import { UserActionsCell } from "../src/components/pages/users/user-actions-cell";
import { UsersTable } from "../src/components/pages/users/users-table";
import { UserRoles } from "../src/types/auth";
import type { User } from "../src/types/userTypes";

const authState = vi.hoisted(() => ({
  role: "cashier",
}));

const activeUser: User = {
  id: "customer-1",
  appUserId: "app-customer-1",
  fullName: "Customer One",
  phone: "+966500000001",
  phoneE164: "+966500000001",
  email: "customer@example.com",
  role: "client",
  isActive: true,
  forcePasswordChange: false,
  fcmTokens: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  subscriptionsCount: 0,
  activeSubscriptionsCount: 0,
  canResetPassword: true,
};

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { role: authState.role } }),
}));

vi.mock("@/hooks/useUsersQuery", () => ({
  useFilteredUsersCatalogQuery: () => ({
    data: { data: [activeUser] },
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useUsersListQuery: () => ({
    data: { data: [activeUser], meta: { total: 1, totalPages: 1 } },
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useUpdateUserMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@/components/global/ToastMessage", () => ({
  ToastMessage: vi.fn(),
}));

vi.mock("@/components/pages/users/reset-password-dialog", () => ({
  ResetPasswordDialog: () => null,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

afterEach(() => {
  cleanup();
  authState.role = UserRoles.CASHIER;
});

function renderUsersTable() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <UsersTable />
    </QueryClientProvider>
  );
}

test("cashier sees customer lifecycle actions in users table menu", async () => {
  render(<UserActionsCell user={activeUser} />);

  await userEvent.click(screen.getByRole("button", { name: /إجراءات/ }));

  assert.equal(screen.getAllByRole("link").length, 2);
  const menuItems = await screen.findAllByRole("menuitem");
  assert.equal(menuItems.length, 2);
  assert.equal(screen.getByRole("link", { name: /عرض/ }).getAttribute("href"), "/users/$userId");
  assert.equal(
    screen.getByRole("link", { name: /إنشاء اشتراك/ }).getAttribute("href"),
    "/users/$userId/create-subscription"
  );
});

test.each([UserRoles.KITCHEN, UserRoles.COURIER])(
  "%s only sees view in direct user action render",
  async (role) => {
    authState.role = role;
    render(<UserActionsCell user={activeUser} />);

    await userEvent.click(screen.getByRole("button", { name: /إجراءات/ }));

    assert.equal(screen.getAllByRole("link").length, 1);
    assert(screen.getByRole("link", { name: /عرض/ }));
    assert.equal(screen.queryByRole("link", { name: /إنشاء اشتراك/ }), null);
    assert.equal(screen.queryAllByRole("menuitem").length, 0);
  }
);

test("cashier sees add customer and lifecycle actions in users table", async () => {
  renderUsersTable();

  assert(screen.getByRole("link", { name: /إضافة مستخدم جديد/ }));

  const customerRow = screen.getByRole("row", { name: /Customer One/ });
  await userEvent.click(within(customerRow).getByRole("button", { name: /إجراءات/ }));

  assert(screen.getByRole("link", { name: /عرض/ }));
  assert(screen.getByRole("link", { name: /إنشاء اشتراك/ }));
  assert(screen.getByRole("menuitem", { name: /إعادة تعيين كلمة المرور/ }));
  assert(screen.getByRole("menuitem", { name: /تعطيل الحساب/ }));
});

test.each([UserRoles.KITCHEN, UserRoles.COURIER])(
  "%s users table hides customer lifecycle management actions",
  async (role) => {
    authState.role = role;
    renderUsersTable();

    assert.equal(screen.queryByRole("link", { name: /إضافة مستخدم جديد/ }), null);

    const customerRow = screen.getByRole("row", { name: /Customer One/ });
    await userEvent.click(within(customerRow).getByRole("button", { name: /إجراءات/ }));

    assert(screen.getByRole("link", { name: /عرض/ }));
    assert.equal(screen.queryByRole("link", { name: /إنشاء اشتراك/ }), null);
    assert.equal(screen.queryByRole("menuitem", { name: /إعادة تعيين كلمة المرور/ }), null);
    assert.equal(screen.queryByRole("menuitem", { name: /تعطيل الحساب/ }), null);
  }
);
