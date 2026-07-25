// @vitest-environment jsdom

import assert from "node:assert/strict";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CreateDashboardStaffUserDialog,
  DashboardStaffUserStatusDialog,
  DashboardStaffUsersWorkspace,
  EditDashboardStaffUserDialog,
  ResetDashboardStaffPasswordDialog,
} from "../src/components/pages/dashboard-users/DashboardStaffUsersWorkspace";
import {
  buildCreateDashboardStaffUserPayload,
  buildUpdateDashboardStaffUserPatch,
  createDashboardStaffUserSchema,
  createDashboardStaffUserSchemaForRoles,
  DASHBOARD_STAFF_ROLE_LABELS,
  DASHBOARD_STAFF_ROLE_LABELS_EN,
  getAssignableDashboardStaffRoles,
  getDefaultDashboardStaffRole,
  resetDashboardStaffPasswordSchema,
} from "../src/components/pages/dashboard-users/dashboardStaffUsersModel";
import { canRoleAccessRoute } from "../src/constants/routes";
import type { User } from "../src/types/auth";
import { UserRoles } from "../src/types/auth";
import type { DashboardStaffUserDto } from "../src/types/dashboardAdminTypes";
import {
  dashboardStaffResetPasswordUrl,
  dashboardStaffUsersUrl,
} from "../src/utils/dashboardApiContract";
import {
  getDashboardStaffUserErrorMessage,
  isDashboardStaffForbiddenError,
  isDashboardStaffTokenRevokedError,
} from "../src/utils/fetchDashboardUsers";

const navigateMock = vi.fn();
const toastMock = vi.fn();
const authMock = vi.fn();
const staffQueryMock = vi.fn();
const createMutationMock = vi.fn();
const updateMutationMock = vi.fn();
const resetPasswordMutationMock = vi.fn();
const accessLossMock = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => authMock(),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("@/components/global/ToastMessage", () => ({
  ToastMessage: (...args: unknown[]) => toastMock(...args),
}));

vi.mock("@/hooks/useDashboardAdminQuery", () => ({
  dashboardStaffUserKeys: {
    all: ["dashboard-staff-users"],
  },
  handleDashboardStaffAccessLoss: (...args: unknown[]) =>
    accessLossMock(...args),
  useDashboardStaffUsersQuery: (...args: unknown[]) => staffQueryMock(...args),
  useCreateDashboardStaffUserMutation: () => createMutationMock(),
  useUpdateDashboardStaffUserMutation: () => updateMutationMock(),
  useResetDashboardStaffUserPasswordMutation: () =>
    resetPasswordMutationMock(),
}));

const staffUser: DashboardStaffUserDto = {
  id: "staff-1",
  email: "staff@example.com",
  role: "superadmin",
  isActive: true,
  lastLoginAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const superadmin: User = {
  id: "super-1",
  name: "Super",
  email: "super@example.com",
  role: UserRoles.SUPERADMIN,
  isActive: true,
  lastLoginAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const admin: User = {
  ...superadmin,
  id: "admin-1",
  email: "admin@example.com",
  role: UserRoles.ADMIN,
};

const makeMutation = (
  mutateAsync = vi.fn().mockResolvedValue({ status: true, data: staffUser }),
  overrides: Partial<{
    isPending: boolean;
    error: unknown;
    reset: () => void;
  }> = {}
) => ({
  mutateAsync,
  isPending: overrides.isPending ?? false,
  error: overrides.error ?? null,
  reset: overrides.reset ?? vi.fn(),
});

const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    ),
  };
};

const getSubmitButton = () =>
  document.querySelector<HTMLButtonElement>('button[type="submit"]')!;

const fillCreateForm = async (
  password = "StrongPass9!",
  email = "manager@example.com"
) => {
  const user = userEvent.setup();
  const emailInput = document.querySelector<HTMLInputElement>(
    'input[type="email"]'
  )!;
  const passwordInputs =
    document.querySelectorAll<HTMLInputElement>('input[type="password"]');

  await user.clear(emailInput);
  await user.type(emailInput, email);
  await user.type(passwordInputs[0], password);
  await user.type(passwordInputs[1], password);
  return user;
};

const clickButtonContaining = async (text: string) => {
  const button = Array.from(document.querySelectorAll("button")).find((item) =>
    item.textContent?.includes(text)
  );
  if (!button) throw new Error(`Button not found: ${text}`);
  await userEvent.click(button);
};

const forbiddenError = {
  response: { status: 403, data: { code: "FORBIDDEN" } },
};

const getAddUserButton = () => {
  const button = document.querySelector<HTMLButtonElement>("section button");
  if (!button) throw new Error("Add user button not found");
  return button;
};

const openStaffAction = async (index: number) => {
  const actionButton = document.querySelector<HTMLButtonElement>("tbody button");
  if (!actionButton) throw new Error("Staff action button not found");
  await userEvent.click(actionButton);
  const items = await screen.findAllByRole("menuitem");
  await userEvent.click(items[index]);
};

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
  authMock.mockReturnValue({ user: superadmin });
  staffQueryMock.mockReturnValue({
    data: {
      status: true,
      data: [staffUser],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      assignableRoles: ["superadmin", "restaurant", "courier"],
    },
    isLoading: false,
    isError: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  });
  createMutationMock.mockReturnValue(makeMutation());
  updateMutationMock.mockReturnValue(makeMutation());
  resetPasswordMutationMock.mockReturnValue(makeMutation());
  accessLossMock.mockImplementation((queryClient: QueryClient) => {
    queryClient.removeQueries({ queryKey: ["dashboard-staff-users"] });
    queryClient.invalidateQueries({ queryKey: ["session"] });
  });
});

afterEach(() => {
  cleanup();
});

describe("dashboard staff users workspace interactions", () => {
  it("non-Super Admin workspace does not enable the staff list query", () => {
    authMock.mockReturnValue({ user: admin });

    renderWithQueryClient(<DashboardStaffUsersWorkspace />);

    expect(staffQueryMock).toHaveBeenCalledWith(expect.any(Object), false);
  });

  it("Super Admin workspace enables the staff list query", () => {
    renderWithQueryClient(<DashboardStaffUsersWorkspace />);

    expect(staffQueryMock).toHaveBeenCalledWith(expect.any(Object), true);
  });

  it("create dialog rejects mismatched passwords", async () => {
    const mutateAsync = vi.fn();
    createMutationMock.mockReturnValue(makeMutation(mutateAsync));
    render(
      <CreateDashboardStaffUserDialog
        open
        onOpenChange={vi.fn()}
        assignableRoles={["superadmin"]}
        onAccessLoss={() => false}
      />
    );

    const user = await fillCreateForm("StrongPass9!");
    const passwordInputs =
      document.querySelectorAll<HTMLInputElement>('input[type="password"]');
    await user.clear(passwordInputs[1]);
    await user.type(passwordInputs[1], "Different9!");
    await user.click(getSubmitButton());

    await screen.findByText(/غير مطابق/);
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("create dialog rejects a known weak default password", async () => {
    const mutateAsync = vi.fn();
    createMutationMock.mockReturnValue(makeMutation(mutateAsync));
    render(
      <CreateDashboardStaffUserDialog
        open
        onOpenChange={vi.fn()}
        assignableRoles={["superadmin"]}
        onAccessLoss={() => false}
      />
    );

    const user = await fillCreateForm("Password@123");
    await user.click(getSubmitButton());

    expect((await screen.findAllByText(/شائعة أو افتراضية/)).length).toBeGreaterThan(1);
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("create sends exactly email/password/role/isActive", async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ status: true, data: staffUser });
    createMutationMock.mockReturnValue(makeMutation(mutateAsync));
    render(
      <CreateDashboardStaffUserDialog
        open
        onOpenChange={vi.fn()}
        assignableRoles={["superadmin"]}
        onAccessLoss={() => false}
      />
    );

    const user = await fillCreateForm();
    await user.click(getSubmitButton());

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    assert.deepEqual(Object.keys(mutateAsync.mock.calls[0][0]).sort(), [
      "email",
      "isActive",
      "password",
      "role",
    ]);
  });

  it("create duplicate-email backend error remains visible and dialog stays open", async () => {
    const mutateAsync = vi.fn().mockRejectedValue({
      response: { status: 409, data: { code: "DASHBOARD_USER_EXISTS" } },
    });
    createMutationMock.mockReturnValue(makeMutation(mutateAsync));
    render(
      <CreateDashboardStaffUserDialog
        open
        onOpenChange={vi.fn()}
        assignableRoles={["superadmin"]}
        onAccessLoss={() => false}
      />
    );

    const user = await fillCreateForm();
    await user.click(getSubmitButton());

    await screen.findByText(/بالفعل/);
    expect(document.querySelector('input[type="email"]')).toBeInTheDocument();
  });

  it("create dialog cannot close while pending", async () => {
    const onOpenChange = vi.fn();
    createMutationMock.mockReturnValue(makeMutation(vi.fn(), { isPending: true }));
    render(
      <CreateDashboardStaffUserDialog
        open
        onOpenChange={onOpenChange}
        assignableRoles={["superadmin"]}
        onAccessLoss={() => false}
      />
    );

    await userEvent.keyboard("{Escape}");
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("create rapid double-submit produces one mutation request", async () => {
    let resolveRequest: (value: unknown) => void = () => undefined;
    const mutateAsync = vi.fn(
      () => new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );
    createMutationMock.mockReturnValue(makeMutation(mutateAsync));
    render(
      <CreateDashboardStaffUserDialog
        open
        onOpenChange={vi.fn()}
        assignableRoles={["superadmin"]}
        onAccessLoss={() => false}
      />
    );

    const user = await fillCreateForm();
    const submit = getSubmitButton();
    await user.click(submit);
    await user.click(submit);

    expect(mutateAsync).toHaveBeenCalledTimes(1);
    resolveRequest({ status: true, data: staffUser });
  });

  it("edit sends only changed fields", async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ status: true, data: staffUser });
    updateMutationMock.mockReturnValue(makeMutation(mutateAsync));
    render(
      <EditDashboardStaffUserDialog
        user={staffUser}
        onOpenChange={vi.fn()}
        assignableRoles={["superadmin", "courier"]}
        onAccessLoss={() => false}
      />
    );

    const user = userEvent.setup();
    const emailInput = document.querySelector<HTMLInputElement>(
      'input[type="email"]'
    )!;
    await user.clear(emailInput);
    await user.type(emailInput, "new@example.com");
    await user.click(getSubmitButton());

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    assert.deepEqual(mutateAsync.mock.calls[0][0], {
      id: "staff-1",
      data: { email: "new@example.com" },
    });
  });

  it("edit with status change does not submit before confirmation", async () => {
    const mutateAsync = vi.fn();
    updateMutationMock.mockReturnValue(makeMutation(mutateAsync));
    render(
      <EditDashboardStaffUserDialog
        user={staffUser}
        onOpenChange={vi.fn()}
        assignableRoles={["superadmin"]}
        onAccessLoss={() => false}
      />
    );

    await userEvent.click(screen.getByRole("switch"));
    await userEvent.click(getSubmitButton());

    expect(mutateAsync).not.toHaveBeenCalled();
    expect(screen.getAllByText(/تعطيل/).length).toBeGreaterThan(0);
  });

  it("failed confirmed edit remains recoverable and open", async () => {
    const mutateAsync = vi.fn().mockRejectedValue({
      response: { status: 404, data: { code: "DASHBOARD_USER_NOT_FOUND" } },
    });
    updateMutationMock.mockReturnValue(makeMutation(mutateAsync));
    render(
      <EditDashboardStaffUserDialog
        user={staffUser}
        onOpenChange={vi.fn()}
        assignableRoles={["superadmin"]}
        onAccessLoss={() => false}
      />
    );

    await userEvent.click(screen.getByRole("switch"));
    await userEvent.click(getSubmitButton());
    await clickButtonContaining("تعطيل");

    expect((await screen.findAllByText(/لم يتم العثور/)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/تعطيل/).length).toBeGreaterThan(0);
  });

  it("standalone deactivation requires confirmation", () => {
    const mutateAsync = vi.fn();
    updateMutationMock.mockReturnValue(makeMutation(mutateAsync));
    render(
      <DashboardStaffUserStatusDialog
        user={staffUser}
        onOpenChange={vi.fn()}
        onAccessLoss={() => false}
      />
    );

    expect(mutateAsync).not.toHaveBeenCalled();
    expect(screen.getByText(/سيتم منعه/)).toBeInTheDocument();
  });

  it("status confirmation cannot close while pending", async () => {
    const onOpenChange = vi.fn();
    updateMutationMock.mockReturnValue(makeMutation(vi.fn(), { isPending: true }));
    render(
      <DashboardStaffUserStatusDialog
        user={staffUser}
        onOpenChange={onOpenChange}
        onAccessLoss={() => false}
      />
    );

    await userEvent.keyboard("{Escape}");
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("reset password uses only password in the mutation payload", async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ status: true, data: staffUser });
    resetPasswordMutationMock.mockReturnValue(makeMutation(mutateAsync));
    render(
      <ResetDashboardStaffPasswordDialog
        user={staffUser}
        onOpenChange={vi.fn()}
        onAccessLoss={() => false}
      />
    );

    const user = userEvent.setup();
    const inputs = document.querySelectorAll<HTMLInputElement>(
      'input[type="password"]'
    );
    await user.type(inputs[0], "StrongPass9!");
    await user.type(inputs[1], "StrongPass9!");
    await user.click(getSubmitButton());

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    assert.deepEqual(mutateAsync.mock.calls[0][0], {
      id: "staff-1",
      password: "StrongPass9!",
    });
  });

  it("reset password fields clear after success", async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ status: true, data: staffUser });
    resetPasswordMutationMock.mockReturnValue(makeMutation(mutateAsync));
    const onOpenChange = vi.fn();
    render(
      <ResetDashboardStaffPasswordDialog
        user={staffUser}
        onOpenChange={onOpenChange}
        onAccessLoss={() => false}
      />
    );

    const user = userEvent.setup();
    const inputs = document.querySelectorAll<HTMLInputElement>(
      'input[type="password"]'
    );
    await user.type(inputs[0], "StrongPass9!");
    await user.type(inputs[1], "StrongPass9!");
    await user.click(getSubmitButton());

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("reset password fields clear after cancellation", async () => {
    const onOpenChange = vi.fn();
    resetPasswordMutationMock.mockReturnValue(makeMutation());
    render(
      <ResetDashboardStaffPasswordDialog
        user={staffUser}
        onOpenChange={onOpenChange}
        onAccessLoss={() => false}
      />
    );

    await userEvent.click(
      Array.from(document.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("إلغاء")
      )!
    );

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("reset dialog cannot close while pending", async () => {
    const onOpenChange = vi.fn();
    resetPasswordMutationMock.mockReturnValue(makeMutation(vi.fn(), { isPending: true }));
    render(
      <ResetDashboardStaffPasswordDialog
        user={staffUser}
        onOpenChange={onOpenChange}
        onAccessLoss={() => false}
      />
    );

    await userEvent.keyboard("{Escape}");
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("a mutation 403 removes staff queries and invalidates session", async () => {
    const mutateAsync = vi.fn().mockRejectedValue({
      response: { status: 403, data: { code: "FORBIDDEN" } },
    });
    createMutationMock.mockReturnValue(makeMutation(mutateAsync));
    const { queryClient } = renderWithQueryClient(<DashboardStaffUsersWorkspace />);
    const removeSpy = vi.spyOn(queryClient, "removeQueries");
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await userEvent.click(screen.getByText(/إضافة مستخدم/));
    const user = await fillCreateForm();
    await user.click(getSubmitButton());

    await waitFor(() =>
      expect(removeSpy).toHaveBeenCalledWith({
        queryKey: ["dashboard-staff-users"],
      })
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["session"] });
  });

  it("create mutation 403 closes management UI and blocks resubmission", async () => {
    const mutateAsync = vi.fn().mockRejectedValue(forbiddenError);
    createMutationMock.mockReturnValue(makeMutation(mutateAsync));
    const { queryClient } = renderWithQueryClient(<DashboardStaffUsersWorkspace />);
    const removeSpy = vi.spyOn(queryClient, "removeQueries");
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const addButton = getAddUserButton();
    await userEvent.click(addButton);
    const user = await fillCreateForm();
    await user.click(getSubmitButton());

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(removeSpy).toHaveBeenCalledWith({
        queryKey: ["dashboard-staff-users"],
      })
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["session"] });
    expect(toastMock).toHaveBeenCalledTimes(1);
    expect(document.querySelector('input[type="password"]')).not.toBeInTheDocument();
    expect(getAddUserButton()).toBeDisabled();
    expect(screen.queryByText("staff@example.com")).not.toBeInTheDocument();

    await user.click(getAddUserButton());
    expect(document.querySelector('input[type="password"]')).not.toBeInTheDocument();
    expect(mutateAsync).toHaveBeenCalledTimes(1);
  });

  it("edit mutation 403 closes the edit workflow and blocks further staff actions", async () => {
    const mutateAsync = vi.fn().mockRejectedValue(forbiddenError);
    updateMutationMock.mockReturnValue(makeMutation(mutateAsync));
    renderWithQueryClient(<DashboardStaffUsersWorkspace />);

    await openStaffAction(0);
    const emailInput = document.querySelector<HTMLInputElement>(
      'input[type="email"]'
    )!;
    const user = userEvent.setup();
    await user.clear(emailInput);
    await user.type(emailInput, "blocked@example.com");
    await user.click(getSubmitButton());

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(document.querySelector('input[type="email"]')).not.toBeInTheDocument()
    );
    expect(getAddUserButton()).toBeDisabled();
    expect(screen.queryByText("staff@example.com")).not.toBeInTheDocument();
    await user.click(getAddUserButton());
    expect(mutateAsync).toHaveBeenCalledTimes(1);
  });

  it("status mutation 403 closes confirmation and blocks further staff actions", async () => {
    const mutateAsync = vi.fn().mockRejectedValue(forbiddenError);
    updateMutationMock.mockReturnValue(makeMutation(mutateAsync));
    renderWithQueryClient(<DashboardStaffUsersWorkspace />);

    await openStaffAction(2);
    const dialogButtons = screen.getByRole("dialog").querySelectorAll("button");
    await userEvent.click(dialogButtons[1]);

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
    expect(getAddUserButton()).toBeDisabled();
    expect(screen.queryByText("staff@example.com")).not.toBeInTheDocument();
    await userEvent.click(getAddUserButton());
    expect(mutateAsync).toHaveBeenCalledTimes(1);
  });

  it("reset password mutation 403 closes reset dialog and clears password fields", async () => {
    const mutateAsync = vi.fn().mockRejectedValue(forbiddenError);
    resetPasswordMutationMock.mockReturnValue(makeMutation(mutateAsync));
    renderWithQueryClient(<DashboardStaffUsersWorkspace />);

    await openStaffAction(1);
    const user = userEvent.setup();
    const inputs = document.querySelectorAll<HTMLInputElement>(
      'input[type="password"]'
    );
    await user.type(inputs[0], "StrongPass9!");
    await user.type(inputs[1], "StrongPass9!");
    await user.click(getSubmitButton());

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(document.querySelector('input[type="password"]')).not.toBeInTheDocument()
    );
    expect(getAddUserButton()).toBeDisabled();
    expect(screen.queryByText("staff@example.com")).not.toBeInTheDocument();
    await user.click(getAddUserButton());
    expect(mutateAsync).toHaveBeenCalledTimes(1);
  });

  it("reset password secrets are cleared when the parent removes the selected user", async () => {
    const mutateAsync = vi.fn();
    resetPasswordMutationMock.mockReturnValue(makeMutation(mutateAsync));
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <ResetDashboardStaffPasswordDialog
        user={staffUser}
        onOpenChange={onOpenChange}
        onAccessLoss={() => false}
        accessBlocked={false}
      />
    );

    const user = userEvent.setup();
    let inputs = document.querySelectorAll<HTMLInputElement>(
      'input[type="password"]'
    );
    await user.type(inputs[0], "StrongPass9!");
    await user.type(inputs[1], "StrongPass9!");
    expect(inputs[0]).toHaveValue("StrongPass9!");
    expect(inputs[1]).toHaveValue("StrongPass9!");

    rerender(
      <ResetDashboardStaffPasswordDialog
        user={null}
        onOpenChange={onOpenChange}
        onAccessLoss={() => false}
        accessBlocked
      />
    );

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
    expect(document.querySelector('input[type="password"]')).not.toBeInTheDocument();

    rerender(
      <ResetDashboardStaffPasswordDialog
        user={staffUser}
        onOpenChange={onOpenChange}
        onAccessLoss={() => false}
        accessBlocked={false}
      />
    );

    inputs = document.querySelectorAll<HTMLInputElement>('input[type="password"]');
    expect(inputs[0]).toHaveValue("");
    expect(inputs[1]).toHaveValue("");
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("a list 403 hides stale data and does not expose a retry loop", async () => {
    staffQueryMock.mockReturnValue({
      data: {
        status: true,
        data: [staffUser],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
        assignableRoles: ["superadmin"],
      },
      isLoading: false,
      isError: true,
      isFetching: false,
      error: { response: { status: 403, data: { code: "FORBIDDEN" } } },
      refetch: vi.fn(),
    });

    renderWithQueryClient(<DashboardStaffUsersWorkspace />);

    await waitFor(() =>
      expect(screen.queryByText("staff@example.com")).not.toBeInTheDocument()
    );
    expect(screen.queryByText(/إعادة المحاولة/)).not.toBeInTheDocument();
  });

  it("list 403 leaves no actionable staff-management controls", async () => {
    staffQueryMock.mockReturnValue({
      data: {
        status: true,
        data: [staffUser],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
        assignableRoles: ["superadmin"],
      },
      isLoading: false,
      isError: true,
      isFetching: false,
      error: forbiddenError,
      refetch: vi.fn(),
    });

    renderWithQueryClient(<DashboardStaffUsersWorkspace />);

    await waitFor(() => expect(getAddUserButton()).toBeDisabled());
    expect(screen.queryByText("staff@example.com")).not.toBeInTheDocument();
    expect(document.querySelector("tbody button")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("password values are not written to browser storage", async () => {
    createMutationMock.mockReturnValue(makeMutation());
    render(
      <CreateDashboardStaffUserDialog
        open
        onOpenChange={vi.fn()}
        assignableRoles={["superadmin"]}
        onAccessLoss={() => false}
      />
    );

    const user = await fillCreateForm();
    await user.click(getSubmitButton());

    expect(localStorage.getItem("password")).toBeNull();
    expect(sessionStorage.getItem("password")).toBeNull();
  });

  it("unsupported roles are absent from role controls and rejected at submit", async () => {
    const mutateAsync = vi.fn();
    createMutationMock.mockReturnValue(makeMutation(mutateAsync));
    render(
      <CreateDashboardStaffUserDialog
        open
        onOpenChange={vi.fn()}
        assignableRoles={["superadmin", "restaurant", "courier"]}
        onAccessLoss={() => false}
      />
    );

    expect(screen.queryByText("admin")).not.toBeInTheDocument();
    expect(screen.queryByText("المطبخ — قديم")).not.toBeInTheDocument();
    expect(screen.queryByText("الكاشير — قديم")).not.toBeInTheDocument();

    for (const role of ["admin", "kitchen", "cashier"]) {
      assert.equal(
        createDashboardStaffUserSchema.safeParse({
          email: "manager@example.com",
          password: "StrongPass9!",
          confirmPassword: "StrongPass9!",
          role,
          isActive: true,
        }).success,
        false
      );
    }
  });

  it("create role controls always expose only superadmin, restaurant, and courier", async () => {
    const mutateAsync = vi.fn().mockResolvedValue({ status: true, data: staffUser });
    createMutationMock.mockReturnValue(makeMutation(mutateAsync));
    render(
      <CreateDashboardStaffUserDialog
        open
        onOpenChange={vi.fn()}
        assignableRoles={getAssignableDashboardStaffRoles(["cashier"])}
        onAccessLoss={() => false}
      />
    );

    expect(screen.getAllByText(DASHBOARD_STAFF_ROLE_LABELS.superadmin).length).toBeGreaterThan(0);
    expect(screen.getAllByText(DASHBOARD_STAFF_ROLE_LABELS.restaurant).length).toBeGreaterThan(0);
    expect(screen.getAllByText(DASHBOARD_STAFF_ROLE_LABELS.courier).length).toBeGreaterThan(0);
    expect(screen.queryByText("الكاشير — قديم")).not.toBeInTheDocument();

    const user = await fillCreateForm();
    await user.click(getSubmitButton());

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync.mock.calls[0][0].role).toBe("restaurant");
    expect(
      createDashboardStaffUserSchemaForRoles(["courier"]).safeParse({
        email: "manager@example.com",
        password: "StrongPass9!",
        confirmPassword: "StrongPass9!",
        role: "superadmin",
        isActive: true,
      }).success
    ).toBe(false);
  });

  it("restaurant is the preferred operational staff role and legacy roles are filtered", () => {
    assert.equal(getDefaultDashboardStaffRole(["superadmin", "restaurant", "courier"]), "restaurant");
    assert.equal(DASHBOARD_STAFF_ROLE_LABELS_EN.restaurant, "Restaurant");
    assert.equal(DASHBOARD_STAFF_ROLE_LABELS_EN.superadmin, "Superadmin");
    assert.equal(DASHBOARD_STAFF_ROLE_LABELS_EN.courier, "Courier");
    assert.equal(
      createDashboardStaffUserSchemaForRoles(["restaurant"]).safeParse({
        email: "restaurant@example.com",
        password: "StrongPass9!",
        confirmPassword: "StrongPass9!",
        role: "restaurant",
        isActive: true,
      }).success,
      true
    );
    assert.deepEqual(getAssignableDashboardStaffRoles(["restaurant", "kitchen", "cashier"]), [
      "superadmin",
      "restaurant",
      "courier",
    ]);
  });
});

describe("dashboard staff users contract helpers", () => {
  it("keeps route and URL contract intact", () => {
    assert.equal(canRoleAccessRoute(UserRoles.SUPERADMIN, "/dashboard-users"), true);
    assert.equal(canRoleAccessRoute(UserRoles.ADMIN, "/dashboard-users"), false);
    assert.equal(
      dashboardStaffUsersUrl({
        q: "manager",
        role: "superadmin",
        status: "active",
        page: 1,
        limit: 20,
      }),
      "/api/dashboard/staff-users?q=manager&role=superadmin&status=active&page=1&limit=20"
    );
    assert.equal(
      dashboardStaffResetPasswordUrl("staff-1"),
      "/api/dashboard/staff-users/staff-1/reset-password"
    );
  });

  it("create and reset use the same password policy", () => {
    const weakCreate = createDashboardStaffUserSchema.safeParse({
      email: "manager@example.com",
      password: "Password@123",
      confirmPassword: "Password@123",
      role: "superadmin",
      isActive: true,
    });
    const weakReset = resetDashboardStaffPasswordSchema.safeParse({
      password: "Password@123",
      confirmPassword: "Password@123",
    });
    const strongReset = resetDashboardStaffPasswordSchema.safeParse({
      password: "BetterPass9!",
      confirmPassword: "BetterPass9!",
    });

    assert.equal(weakCreate.success, false);
    assert.equal(weakReset.success, false);
    assert.equal(strongReset.success, true);
  });

  it("helper payloads and error helpers remain narrow", () => {
    const payload = buildCreateDashboardStaffUserPayload({
      email: "manager@example.com",
      password: "StrongPass9!",
      confirmPassword: "StrongPass9!",
      role: "superadmin",
      isActive: true,
    });

    assert.deepEqual(Object.keys(payload).sort(), [
      "email",
      "isActive",
      "password",
      "role",
    ]);
    assert.deepEqual(getAssignableDashboardStaffRoles(["admin", "superadmin"]), [
      "superadmin",
      "restaurant",
      "courier",
    ]);
    assert.deepEqual(
      buildUpdateDashboardStaffUserPatch(staffUser, {
        email: "new@example.com",
        role: "superadmin",
        isActive: true,
      }),
      { email: "new@example.com" }
    );
    assert.equal(
      getDashboardStaffUserErrorMessage({
        response: { status: 409, data: { code: "DASHBOARD_USER_EXISTS" } },
      }),
      "يوجد مستخدم لوحة تحكم بهذا البريد الإلكتروني بالفعل."
    );
    assert.equal(
      isDashboardStaffForbiddenError({
        response: { status: 403, data: { code: "FORBIDDEN" } },
      }),
      true
    );
    assert.equal(
      isDashboardStaffTokenRevokedError({
        response: { status: 401, data: { code: "TOKEN_REVOKED" } },
      }),
      true
    );
  });
});
