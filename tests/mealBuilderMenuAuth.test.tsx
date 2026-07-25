// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigateMock = vi.hoisted(() => vi.fn());
const useAuthMock = vi.hoisted(() => vi.fn());
const routeSearch = vi.hoisted(() => ({ tab: "meal-builder" }));
const mealBuilderMountMock = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-router")>(
    "@tanstack/react-router"
  );
  return {
    ...actual,
    createFileRoute: () => (config: Record<string, unknown>) => ({
      ...config,
      fullPath: "/menu",
      useSearch: () => routeSearch,
    }),
    useBlocker: () => ({ status: "idle", reset: vi.fn(), proceed: vi.fn() }),
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/hooks/useAuth", () => ({
  useAuth: useAuthMock,
}));

vi.mock("@/components/pages/menu/meal-builder/MealBuilderSimplePage", () => ({
  MealBuilderSimplePage: () => {
    mealBuilderMountMock();
    return <div data-testid="meal-builder-page" />;
  },
}));

vi.mock("@/components/pages/menu/audit/MenuAuditLogTab", () => ({
  MenuAuditLogTab: () => <div />,
}));
vi.mock("@/components/pages/menu/categories/MenuCategoriesTab", () => ({
  MenuCategoriesTab: () => <div data-testid="catalog-tab" />,
}));
vi.mock("@/components/pages/menu/MenuPublishDialog", () => ({
  MenuPublishDialog: () => <div />,
}));
vi.mock("@/components/pages/menu/MenuValidationDialog", () => ({
  MenuValidationDialog: () => <div />,
}));
vi.mock("@/components/pages/menu/option-groups/MenuOptionGroupsTab", () => ({
  MenuOptionGroupsTab: () => <div />,
}));
vi.mock("@/components/pages/menu/options/MenuOptionsTab", () => ({
  MenuOptionsTab: () => <div />,
}));
vi.mock("@/components/pages/menu/products/MenuProductsTab", () => ({
  MenuProductsTab: () => <div />,
}));
vi.mock("@/components/pages/menu/public-preview/PublicMenuPreviewTab", () => ({
  PublicMenuPreviewTab: () => <div />,
}));
vi.mock("@/components/pages/menu/versions/MenuVersionsTab", () => ({
  MenuVersionsTab: () => <div />,
}));

import { MenuPage } from "../src/routes/_protected/menu";
import { UserRoles } from "../src/types/auth";

beforeEach(() => {
  navigateMock.mockReset();
  useAuthMock.mockReset();
  mealBuilderMountMock.mockReset();
  routeSearch.tab = "meal-builder";
});

afterEach(() => cleanup());

describe("menu Meal Builder auth gate", () => {
  it("does not redirect or mount Meal Builder while auth is loading", async () => {
    useAuthMock.mockReturnValue({ user: null, isLoading: true });

    render(<MenuPage />);

    expect(await screen.findByLabelText("تحميل صلاحية منشئ الوجبات")).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
    expect(mealBuilderMountMock).not.toHaveBeenCalled();
  });

  it("keeps admin hard refresh on Meal Builder after auth resolves", async () => {
    useAuthMock.mockReturnValue({
      user: { role: UserRoles.ADMIN },
      isLoading: false,
    });

    render(<MenuPage />);

    expect(await screen.findByTestId("meal-builder-page")).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("keeps superadmin hard refresh on Meal Builder after auth resolves", async () => {
    useAuthMock.mockReturnValue({
      user: { role: UserRoles.SUPERADMIN },
      isLoading: false,
    });

    render(<MenuPage />);

    expect(await screen.findByTestId("meal-builder-page")).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("keeps restaurant hard refresh on Meal Builder after auth resolves", async () => {
    useAuthMock.mockReturnValue({
      user: { role: UserRoles.RESTAURANT },
      isLoading: false,
    });

    render(<MenuPage />);

    expect(await screen.findByTestId("meal-builder-page")).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("redirects unauthorized users after auth resolves without mounting Meal Builder", async () => {
    useAuthMock.mockReturnValue({
      user: { role: UserRoles.CASHIER },
      isLoading: false,
    });

    render(<MenuPage />);

    await waitFor(() => expect(navigateMock).toHaveBeenCalledTimes(1));
    expect(mealBuilderMountMock).not.toHaveBeenCalled();
    expect(navigateMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({ replace: true })
    );
  });

  it("preserves other menu tabs for unauthorized users", async () => {
    routeSearch.tab = "catalog";
    useAuthMock.mockReturnValue({
      user: { role: UserRoles.CASHIER },
      isLoading: false,
    });

    render(<MenuPage />);

    expect(await screen.findByTestId("catalog-tab")).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
    expect(mealBuilderMountMock).not.toHaveBeenCalled();
  });
});
