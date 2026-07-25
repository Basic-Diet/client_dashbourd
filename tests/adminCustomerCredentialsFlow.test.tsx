// @vitest-environment jsdom

import assert from "node:assert/strict";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CreateUserForm } from "../src/components/pages/users/create-user-form";
import { ResetPasswordDialog } from "../src/components/pages/users/reset-password-dialog";
import {
  type CredentialsDialogData,
  TemporaryCredentialsDialog,
} from "../src/components/pages/users/temporary-credentials-dialog";
import { formatCustomerDateTime } from "../src/components/pages/users/user-auth-utils";
import type { User } from "../src/types/userTypes";

const navigateMock = vi.fn();
const blockerMock = vi.fn();
const toastMock = vi.fn();
const createMutationMock = vi.fn();
const resetPasswordMutationMock = vi.fn();
let clipboardWriteMock: ReturnType<typeof vi.fn>;

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
  useBlocker: (...args: unknown[]) => blockerMock(...args),
}));

vi.mock("@/components/global/ToastMessage", () => ({
  ToastMessage: (...args: unknown[]) => toastMock(...args),
}));

vi.mock("@/hooks/useUsersQuery", () => ({
  useCreateAdminCustomerMutation: () => createMutationMock(),
  useResetAdminCustomerPasswordMutation: () => resetPasswordMutationMock(),
}));

const fakeCredentials: CredentialsDialogData = {
  title: "تم إنشاء المستخدم",
  customerName: "عميل تجربة",
  phoneE164: "+966512345678",
  temporaryPassword: "Temp-Pass-12345!",
  expiresAt: "2026-01-01T09:00:00.000Z",
  isActive: true,
};

const fakeUser: User = {
  id: "user-1",
  appUserId: "app-user-1",
  coreUserId: "core-user-1",
  fullName: "عميل تجربة",
  phone: "+966512345678",
  phoneE164: "+966512345678",
  email: "customer@example.test",
  role: "user",
  isActive: true,
  forcePasswordChange: true,
  fcmTokens: [],
  subscriptionsCount: 0,
  activeSubscriptionsCount: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function makeCreateMutation() {
  return {
    mutate: vi.fn(),
    isPending: false,
    reset: vi.fn(),
  };
}

function makeResetMutation() {
  return {
    mutate: vi.fn(),
    isPending: false,
    reset: vi.fn(),
  };
}

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    ),
  };
}

function getSubmitButton() {
  const button = document.querySelector<HTMLButtonElement>(
    'button[type="submit"]'
  );
  if (!button) throw new Error("Submit button not found");
  return button;
}

async function fillCustomerForm({
  name = "عميل تجربة",
  phone = "+966512345678",
  email = "customer@example.test",
}: {
  name?: string;
  phone?: string;
  email?: string;
} = {}) {
  const user = userEvent.setup();
  await user.clear(document.querySelector<HTMLInputElement>("#fullName")!);
  await user.type(document.querySelector<HTMLInputElement>("#fullName")!, name);
  await user.clear(document.querySelector<HTMLInputElement>("#phoneE164")!);
  await user.type(document.querySelector<HTMLInputElement>("#phoneE164")!, phone);
  await user.clear(document.querySelector<HTMLInputElement>("#email")!);
  if (email) {
    await user.type(document.querySelector<HTMLInputElement>("#email")!, email);
  }
  return user;
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  document.cookie = "";
  vi.clearAllMocks();
  clipboardWriteMock = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: clipboardWriteMock },
  });
  Object.defineProperty(window, "print", {
    configurable: true,
    value: vi.fn(),
  });
  createMutationMock.mockReturnValue(makeCreateMutation());
  resetPasswordMutationMock.mockReturnValue(makeResetMutation());
});

afterEach(() => {
  cleanup();
});

describe("temporary customer credentials dialog", () => {
  it("renders non-empty fake customer credentials with isolated LTR values", () => {
    render(
      <TemporaryCredentialsDialog
        credentials={fakeCredentials}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText("عميل تجربة")).toBeInTheDocument();
    expect(screen.getByText("+966512345678")).toBeInTheDocument();
    expect(screen.getByText("Temp-Pass-12345!")).toBeInTheDocument();
    expect(screen.getByText(/بتوقيت الرياض/)).toBeInTheDocument();

    const phone = screen.getByTestId("credential-phone");
    const password = screen.getByTestId("credential-password");
    expect(phone).toHaveAttribute("dir", "ltr");
    expect(password).toHaveAttribute("dir", "ltr");
    expect(password).toHaveClass("font-mono");
  });

  it("exposes every copy, print, and done action", () => {
    render(
      <TemporaryCredentialsDialog
        credentials={fakeCredentials}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "نسخ رقم الجوال" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "نسخ كلمة المرور المؤقتة" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "نسخ بيانات الدخول المؤقتة" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "طباعة بيانات الدخول المؤقتة" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "تم حفظ بيانات الدخول" })).toBeInTheDocument();
  });

  it("copies phone, password, and the complete login bundle exactly", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: clipboardWriteMock },
    });
    render(
      <TemporaryCredentialsDialog
        credentials={fakeCredentials}
        onClose={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "نسخ رقم الجوال" }));
    expect(clipboardWriteMock).toHaveBeenLastCalledWith("+966512345678");

    await user.click(
      screen.getByRole("button", { name: "نسخ كلمة المرور المؤقتة" })
    );
    expect(clipboardWriteMock).toHaveBeenLastCalledWith("Temp-Pass-12345!");

    await user.click(
      screen.getByRole("button", { name: "نسخ بيانات الدخول المؤقتة" })
    );
    const bundle = String(clipboardWriteMock.mock.calls.at(-1)?.[0]);
    expect(bundle).toContain("عميل تجربة");
    expect(bundle).toContain("+966512345678");
    expect(bundle).toContain("Temp-Pass-12345!");
    expect(bundle).toContain("بتوقيت الرياض");
  });

  it("shows a failure toast when clipboard permission is unavailable", async () => {
    clipboardWriteMock.mockRejectedValueOnce(new Error("denied"));
    render(
      <TemporaryCredentialsDialog
        credentials={fakeCredentials}
        onClose={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "نسخ رقم الجوال" }));

    expect(toastMock).toHaveBeenCalledWith(
      "تعذر النسخ تلقائياً. حدد البيانات وانسخها يدوياً.",
      "error"
    );
  });

  it("does not close from Escape but closes once from Done", async () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <TemporaryCredentialsDialog
        credentials={fakeCredentials}
        onClose={onClose}
      />
    );

    await userEvent.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole("button", { name: "تم حفظ بيانات الدخول" })
    );
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(<TemporaryCredentialsDialog credentials={null} onClose={onClose} />);
    expect(screen.queryByText("Temp-Pass-12345!")).not.toBeInTheDocument();
  });

  it("formats expiry deterministically for Riyadh Gregorian time", () => {
    expect(formatCustomerDateTime("2026-01-01T09:00:00.000Z")).toContain(
      "بتوقيت الرياض"
    );
    expect(formatCustomerDateTime("not-a-date")).toBe("—");
  });
});

describe("customer create credentials flow", () => {
  it("sends exactly the backend create payload and omits blank email", async () => {
    const mutation = makeCreateMutation();
    createMutationMock.mockReturnValue(mutation);
    renderWithQueryClient(<CreateUserForm />);

    const user = await fillCustomerForm({ email: "" });
    await user.click(getSubmitButton());

    await waitFor(() => expect(mutation.mutate).toHaveBeenCalledTimes(1));
    const [payload] = mutation.mutate.mock.calls[0];
    assert.deepEqual(payload, {
      fullName: "عميل تجربة",
      phone: "+966512345678",
      email: undefined,
      temporaryPassword: undefined,
      isActive: true,
    });
  });

  it("sends an optional temporary password only when provided", async () => {
    const mutation = makeCreateMutation();
    createMutationMock.mockReturnValue(mutation);
    renderWithQueryClient(<CreateUserForm />);

    const user = await fillCustomerForm();
    await user.type(
      document.querySelector<HTMLInputElement>("#temporaryPassword")!,
      "Customer@12345"
    );
    await user.click(getSubmitButton());

    await waitFor(() => expect(mutation.mutate).toHaveBeenCalledTimes(1));
    expect(mutation.mutate.mock.calls[0][0]).toMatchObject({
      phone: "+966512345678",
      temporaryPassword: "Customer@12345",
    });
    expect(mutation.mutate.mock.calls[0][0]).not.toHaveProperty("phoneE164");
  });

  it("rapid double-submit produces one create mutation", async () => {
    const mutation = makeCreateMutation();
    createMutationMock.mockReturnValue(mutation);
    renderWithQueryClient(<CreateUserForm />);

    const user = await fillCustomerForm();
    await user.click(getSubmitButton());
    await user.click(getSubmitButton());

    expect(mutation.mutate).toHaveBeenCalledTimes(1);
  });

  it("HTTP 409 keeps the form visible and shows duplicate feedback", async () => {
    const mutation = makeCreateMutation();
    mutation.mutate.mockImplementation((_payload, options) => {
      options.onError({ response: { status: 409 } });
      options.onSettled();
    });
    createMutationMock.mockReturnValue(mutation);
    renderWithQueryClient(<CreateUserForm />);

    const user = await fillCustomerForm();
    await user.click(getSubmitButton());

    expect(document.querySelector("#fullName")).toBeInTheDocument();
    expect(toastMock.mock.calls[0]?.[0]).toContain("نفس رقم الجوال");
    expect(screen.queryByText("Temp-Pass-12345!")).not.toBeInTheDocument();
  });

  it("malformed success does not retry and shows the warning", async () => {
    const mutation = makeCreateMutation();
    mutation.mutate.mockImplementation((_payload, options) => {
      options.onSuccess({
        user: fakeUser,
        temporaryCredentials: {
          temporaryPassword: "",
          expiresAt: "",
          mustChangePassword: true,
        },
      });
      options.onSettled();
    });
    createMutationMock.mockReturnValue(mutation);
    renderWithQueryClient(<CreateUserForm />);

    const user = await fillCustomerForm();
    await user.click(getSubmitButton());

    expect(mutation.mutate).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "تعذر عرض بيانات الدخول المؤقتة"
    );
  });

  it("successful inactive creation warns that login is blocked until activation", async () => {
    const mutation = makeCreateMutation();
    mutation.mutate.mockImplementation((_payload, options) => {
      options.onSuccess({
        user: { ...fakeUser, isActive: false },
        temporaryCredentials: {
          temporaryPassword: fakeCredentials.temporaryPassword,
          expiresAt: fakeCredentials.expiresAt,
          mustChangePassword: true,
        },
      });
      options.onSettled();
    });
    createMutationMock.mockReturnValue(mutation);
    renderWithQueryClient(<CreateUserForm />);

    const user = await fillCustomerForm();
    await user.click(getSubmitButton());

    expect(screen.getByText(fakeCredentials.temporaryPassword)).toBeInTheDocument();
    expect(screen.getByText(/حتى يتم تفعيل الحساب/)).toBeInTheDocument();
  });

  it("successful create invalidates users and navigates only after Done", async () => {
    const mutation = makeCreateMutation();
    mutation.mutate.mockImplementation((_payload, options) => {
      options.onSuccess({
        user: fakeUser,
        temporaryCredentials: {
          temporaryPassword: fakeCredentials.temporaryPassword,
          expiresAt: fakeCredentials.expiresAt,
          mustChangePassword: true,
        },
      });
      options.onSettled();
    });
    createMutationMock.mockReturnValue(mutation);
    const { queryClient } = renderWithQueryClient(<CreateUserForm />);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const user = await fillCustomerForm();
    await user.click(getSubmitButton());
    expect(navigateMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "تم حفظ بيانات الدخول" }));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["users"] });
    expect(navigateMock).toHaveBeenCalledWith({ to: "/users" });
  });
});

describe("reset password credentials flow", () => {
  it("uses the corrected shared dialog and displays sessions-revoked warning", async () => {
    const mutation = makeResetMutation();
    mutation.mutate.mockImplementation((_payload, options) => {
      options.onSuccess({
        userId: fakeUser.id,
        phoneE164: fakeUser.phoneE164,
        temporaryPassword: "Reset-Pass-12345!",
        temporaryPasswordExpiresAt: fakeCredentials.expiresAt,
        sessionsRevoked: true,
      });
      options.onSettled();
    });
    const onOpenChange = vi.fn();
    resetPasswordMutationMock.mockReturnValue(mutation);
    renderWithQueryClient(
      <ResetPasswordDialog user={fakeUser} open onOpenChange={onOpenChange} />
    );

    const confirmButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("تأكيد")
    );
    if (!confirmButton) throw new Error("Reset confirm button not found");
    await userEvent.click(confirmButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.getByText("Reset-Pass-12345!")).toBeInTheDocument();
    expect(screen.getByText(/إلغاء الجلسات السابقة/)).toBeInTheDocument();
  });

  it("does not persist temporary secrets to browser storage or query cache", () => {
    const { queryClient } = renderWithQueryClient(
      <TemporaryCredentialsDialog
        credentials={fakeCredentials}
        onClose={vi.fn()}
      />
    );

    expect(localStorage.getItem("temporaryPassword")).toBeNull();
    expect(sessionStorage.getItem("temporaryPassword")).toBeNull();
    expect(document.cookie).not.toContain(fakeCredentials.temporaryPassword);
    expect(JSON.stringify(queryClient.getQueryCache().findAll())).not.toContain(
      fakeCredentials.temporaryPassword
    );
  });
});
