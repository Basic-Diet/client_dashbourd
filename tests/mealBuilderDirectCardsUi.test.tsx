// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/lib/apis", () => ({
  default: apiMock,
}));

vi.mock("sonner", () => ({
  toast: toastMock,
}));

import { MealBuilderDirectCards } from "../src/components/pages/menu/meal-builder/MealBuilderDirectCards";
import type {
  MealBuilderSection,
  MealBuilderValidation,
} from "../src/types/mealBuilderTypes";

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  apiMock.get.mockReset();
  apiMock.post.mockReset();
  apiMock.patch.mockReset();
  apiMock.delete.mockReset();
  toastMock.success.mockReset();
  toastMock.error.mockReset();
  vi.restoreAllMocks();

  apiMock.get.mockResolvedValue({
    data: {
      status: true,
      data: {
        contractVersion: "dashboard_meal_builder_picker.v1",
        sectionKey: "products",
        candidateType: "product",
        candidates: [
          directCandidate("product-1", {
            selected: true,
            assigned: true,
            assignable: false,
            state: "selected",
          }),
          directCandidate("product-2"),
        ],
        meta: { page: 1, limit: 1000, total: 2, pages: 1 },
      },
    },
  });
});

function directSection(overrides: Partial<MealBuilderSection> = {}): MealBuilderSection {
  return {
    key: "chef_choices",
    sectionType: "product_list",
    sourceKind: "product_list",
    productContextId: null,
    sourceGroupId: null,
    sourceCategoryId: null,
    selectedOptionIds: [],
    selectedProductIds: ["product-1", "product-2"],
    includeMode: "selected",
    selectionType: "",
    titleOverride: { ar: "اختيارات الشيف", en: "Chef Choices" },
    sortOrder: 20,
    required: false,
    minSelections: 0,
    maxSelections: 1,
    multiSelect: false,
    visible: true,
    availableFor: ["subscription"],
    items: [
      {
        id: "product-1",
        productId: "product-1",
        type: "product",
        key: "grilled_chicken",
        label: "دجاج مشوي",
        name: { ar: "دجاج مشوي", en: "Grilled Chicken" },
      },
      {
        id: "product-2",
        productId: "product-2",
        type: "product",
        key: "salmon",
        label: "سلمون",
        name: { ar: "سلمون", en: "Salmon" },
      },
    ],
    ...overrides,
  };
}

function directCandidate(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    productId: id,
    type: "product",
    key: id,
    name: { ar: id, en: id },
    label: id,
    selected: false,
    assigned: false,
    assignable: true,
    required: false,
    eligible: true,
    linked: true,
    available: true,
    active: true,
    visible: true,
    published: true,
    subscriptionEnabled: true,
    relationExists: true,
    catalogItemAvailable: true,
    reasonCodes: [],
    warnings: [],
    errors: [],
    state: "eligible",
    ...overrides,
  };
}

function actionResponse(action = "created", sections = [directSection()]) {
  return {
    status: true,
    data: {
      contractVersion: "dashboard_meal_builder_card_action.v1",
      action,
      sectionKey: action === "deleted" ? null : "chef_choices",
      previousSectionKey: null,
      productId: null,
      section: sections[0] ?? null,
      draft: {
        id: "draft-1",
        status: "draft",
        isCurrent: true,
        contractVersion: "dashboard_meal_builder.v1",
        revisionHash: "hash",
        source: "dashboard",
        createdBySystem: false,
        bootstrapKey: "default",
        publishedAt: null,
        sections,
      },
      validation: {
        status: "ok",
        ready: true,
        errors: [],
        warnings: [],
        checks: [],
        summary: {},
      },
      summary: {
        sectionCount: sections.length,
        selectedProductCount: sections.reduce(
          (total, section) => total + section.selectedProductIds.length,
          0
        ),
        ready: true,
        errorCount: 0,
        warningCount: 0,
      },
    },
  };
}

function renderCards({
  sections = [directSection()],
  validation = null,
  onActionApplied = vi.fn(),
}: {
  sections?: MealBuilderSection[];
  validation?: MealBuilderValidation | null;
  onActionApplied?: Parameters<typeof MealBuilderDirectCards>[0]["onActionApplied"];
} = {}) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={client}>
      <MealBuilderDirectCards
        sections={sections}
        validation={validation}
        parentPending={false}
        onBeforeAction={vi.fn(async () => undefined)}
        onActionApplied={onActionApplied}
        onBusyChange={vi.fn()}
      />
    </QueryClientProvider>
  );
}

describe("MealBuilderDirectCards", () => {
  it("prevents a rapid create double-submit before React pending state rerenders", async () => {
    const user = userEvent.setup();
    const onActionApplied = vi.fn();
    let resolvePost!: (value: unknown) => void;
    apiMock.post.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePost = resolve;
      })
    );

    renderCards({ sections: [], onActionApplied });

    await user.click(screen.getByRole("button", { name: "إضافة بطاقة جديدة" }));
    await user.type(screen.getByLabelText("الاسم الإنجليزي"), "Chef Choices");
    await waitFor(() => expect(apiMock.get).toHaveBeenCalled());
    await user.click(screen.getByRole("checkbox", { name: "اختيار product-2" }));

    const createButton = screen.getByRole("button", { name: "إنشاء البطاقة" });
    await Promise.all([user.click(createButton), user.click(createButton)]);

    await waitFor(() => expect(apiMock.post).toHaveBeenCalledTimes(1));
    resolvePost({ data: actionResponse("created") });
    await waitFor(() => expect(onActionApplied).toHaveBeenCalledTimes(1));
  });

  it("uses a styled discard confirmation when Escape closes a dirty dialog", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm");
    renderCards({ sections: [] });

    await user.click(screen.getByRole("button", { name: "إضافة بطاقة جديدة" }));
    await user.type(screen.getByLabelText("الاسم العربي"), "اختيارات الشيف");
    await user.keyboard("{Escape}");

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(
      screen.getByRole("alertdialog", {
        name: "تجاهل التغييرات غير المحفوظة؟",
      })
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "متابعة التعديل" }));
    expect(screen.getByRole("button", { name: "إنشاء البطاقة" })).toBeInTheDocument();
  });

  it("routes removal of the last product through the delete-card confirmation", async () => {
    const user = userEvent.setup();
    const onActionApplied = vi.fn();
    const oneProduct = directSection({
      selectedProductIds: ["product-1"],
      items: [directSection().items?.[0] as NonNullable<MealBuilderSection["items"]>[number]],
    });
    apiMock.delete.mockResolvedValueOnce({
      data: actionResponse("deleted", []),
    });

    renderCards({ sections: [oneProduct], onActionApplied });

    await user.click(screen.getByRole("button", { name: "إدارة المنتجات" }));
    await user.click(screen.getByRole("button", { name: "إزالة دجاج مشوي" }));

    expect(
      screen.getByRole("alertdialog", { name: "حذف بطاقة المنتجات؟" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("alertdialog", { name: "إزالة المنتج من البطاقة؟" })
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "حذف البطاقة" }));
    await waitFor(() => expect(apiMock.delete).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onActionApplied).toHaveBeenCalledTimes(1));
  });

  it("prefers localized known-code copy over an English backend message", () => {
    const validation: MealBuilderValidation = {
      status: "error",
      ready: false,
      errors: [
        {
          level: "error",
          code: "PRODUCT_UNAVAILABLE",
          message: "Product is unavailable",
          sectionType: "product_list",
        },
      ],
      warnings: [],
      checks: [],
    };

    renderCards({ validation });

    expect(screen.getByText("يوجد منتج غير متاح")).toBeInTheDocument();
    expect(screen.queryByText("Product is unavailable")).not.toBeInTheDocument();
  });
});
