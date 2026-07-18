// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MenuProduct } from "../src/types/menuTypes";
import type { MenuProductSchemaInput } from "../src/lib/validations/menuProductSchema";
import { getMenuProductFormValues } from "../src/utils/menuFormValues";

const navigate = vi.fn();
const invalidateQueries = vi.fn();

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-router")>(
    "@tanstack/react-router"
  );
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => config,
    useRouter: () => ({ navigate }),
  };
});

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query"
  );
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries }),
  };
});

vi.mock("@/hooks/useMenuQuery", () => ({
  useMenuCategoriesQuery: () => ({
    data: {
      data: {
        items: [
          {
            id: "category-1",
            key: "category-1",
            name: { ar: "تصنيف", en: "Category" },
            isActive: true,
            isAvailable: true,
            sortOrder: 0,
          },
        ],
      },
    },
  }),
  useMenuCategoryDetailQuery: () => ({ data: undefined }),
  useMenuProductDetailQuery: () => ({ data: undefined }),
}));

vi.mock("@/components/pages/menu/products/ProductCustomizationPanel", () => ({
  ProductCustomizationPanel: () => <div data-testid="customization-panel" />,
}));

vi.mock("@/components/global/ToastMessage", () => ({
  ToastMessage: vi.fn(),
}));

vi.mock("@/utils/fetchMenuProducts", () => ({
  fetchCreateMenuProduct: vi.fn(),
  fetchUpdateMenuProduct: vi.fn(),
  fetchUpdateMenuProductWeightPricing: vi.fn(),
}));

import { CreateMenuProductPage } from "../src/routes/_protected/menu/products/create";
import { UpdateMenuProductForm } from "../src/routes/_protected/menu/products/$productId/update";
import {
  fetchCreateMenuProduct,
  fetchUpdateMenuProduct,
  fetchUpdateMenuProductWeightPricing,
} from "../src/utils/fetchMenuProducts";

const createProductMock = vi.mocked(fetchCreateMenuProduct);
const updateProductMock = vi.mocked(fetchUpdateMenuProduct);
const updateWeightPricingMock = vi.mocked(fetchUpdateMenuProductWeightPricing);

const product = (overrides: Partial<MenuProduct> = {}): MenuProduct => ({
  id: "product-1",
  categoryId: "category-1",
  key: "product_1",
  itemType: "product",
  name: { ar: "منتج", en: "Product" },
  description: { ar: "", en: "" },
  imageUrl: "",
  pricingModel: "fixed",
  priceHalala: 1900,
  isActive: true,
  isAvailable: true,
  isVisible: true,
  isCustomizable: false,
  availableFor: ["one_time", "subscription"],
  ui: { cardSize: "small" },
  sortOrder: 0,
  ...overrides,
});

const weightPricing = {
  contractVersion: "weight_pricing.v1",
  strategy: "base_plus_steps",
  requiresWeightSelection: true,
  basePriceHalala: 1900,
  baseWeightGrams: 100,
  defaultWeightGrams: 100,
  minWeightGrams: 100,
  maxWeightGrams: 300,
  stepGrams: 50,
  stepPriceHalala: 500,
  choices: [
    { weightGrams: 100, priceHalala: 1900 },
    { weightGrams: 150, priceHalala: 2400 },
  ],
};

const modernFormValues = (
  overrides: Partial<MenuProductSchemaInput> = {}
): MenuProductSchemaInput => ({
  categoryId: "category-1",
  key: "",
  itemType: "product",
  name: { ar: "منتج", en: "Product" },
  description: { ar: "", en: "" },
  imageUrl: "",
  pricingModel: "per_100g",
  priceSar: 19,
  baseUnitGrams: 100,
  defaultWeightGrams: 100,
  minWeightGrams: 100,
  maxWeightGrams: 300,
  weightStepGrams: 50,
  weightStepPriceSar: 5,
  useWeightStepPricing: true,
  weightPricingFormMode: "new_modern",
  isActive: true,
  isAvailable: true,
  isVisible: true,
  isCustomizable: true,
  availableFor: ["one_time", "subscription"],
  ui: { cardSize: "small" },
  sortOrder: 0,
  ...overrides,
});

const modernProductFields = {
  pricingModel: "per_100g" as const,
  priceHalala: 1900,
  baseUnitGrams: 100,
  defaultWeightGrams: 100,
  minWeightGrams: 100,
  maxWeightGrams: 300,
  weightStepGrams: 50,
  weightStepPriceHalala: 500,
  weightPricing,
  isCustomizable: true,
};

function expectModernFinalRestorePayload(payload: Record<string, unknown>) {
  expect(payload).toEqual(
    expect.objectContaining({
      pricingModel: "per_100g",
      isActive: true,
      isVisible: true,
      isAvailable: true,
    })
  );
  expect(payload).not.toHaveProperty("priceHalala");
  expect(payload).not.toHaveProperty("baseUnitGrams");
  expect(payload).not.toHaveProperty("defaultWeightGrams");
  expect(payload).not.toHaveProperty("minWeightGrams");
  expect(payload).not.toHaveProperty("maxWeightGrams");
  expect(payload).not.toHaveProperty("weightStepGrams");
  expect(payload).not.toHaveProperty("weightStepPriceHalala");
  expect(payload).not.toHaveProperty("isCustomizable");
}

beforeEach(() => {
  navigate.mockReset();
  invalidateQueries.mockReset();
  createProductMock.mockReset();
  updateProductMock.mockReset();
  updateWeightPricingMock.mockReset();
});

afterEach(() => cleanup());

describe("menu product page flows", () => {
  it("new modern create cannot disable modern pricing", () => {
    render(<CreateMenuProductPage initialValues={modernFormValues()} />);

    expect(screen.getByText("إعداد تسعير الوزن")).toBeInTheDocument();
    expect(screen.queryByText("ترحيل للتسعير الحديث")).not.toBeInTheDocument();
  });

  it("legacy edit stays ordinary and does not enter modern success", async () => {
    updateProductMock.mockResolvedValue({
      status: true,
      data: product({
        id: "legacy-product",
        pricingModel: "per_100g",
        weightStepPriceHalala: null,
      }),
    });

    render(
      <UpdateMenuProductForm
        product={product({
          id: "legacy-product",
          pricingModel: "per_100g",
          weightStepPriceHalala: null,
          weightPricing: null,
          baseUnitGrams: 100,
          defaultWeightGrams: 100,
          minWeightGrams: 100,
          maxWeightGrams: 300,
          weightStepGrams: 50,
        })}
        productId="legacy-product"
      />
    );

    expect(screen.getByText("منتج وزني قديم")).toBeInTheDocument();
    expect(screen.queryByText("معاينة أسعار الوزن")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /حفظ/ }));

    await waitFor(() => expect(updateProductMock).toHaveBeenCalledTimes(1));
    expect(updateWeightPricingMock).not.toHaveBeenCalled();
    expect(
      screen.queryByText(/تم حفظ تسعير الوزن بنجاح/)
    ).not.toBeInTheDocument();
  });

  it("existing modern edit cannot disable modern pricing", () => {
    render(
      <UpdateMenuProductForm
        product={product({
          pricingModel: "per_100g",
          weightStepPriceHalala: 500,
          weightPricing,
          isCustomizable: true,
        })}
        productId="product-1"
      />
    );

    expect(screen.getByText("إعداد تسعير الوزن")).toBeInTheDocument();
    expect(screen.queryByText("ترحيل للتسعير الحديث")).not.toBeInTheDocument();
  });

  it("fixed-to-weight edit cannot disable modern pricing", () => {
    const fixedProduct = product({ pricingModel: "fixed", isCustomizable: false });

    render(
      <UpdateMenuProductForm
        product={fixedProduct}
        productId="product-1"
        initialValues={{
          ...getMenuProductFormValues(fixedProduct),
          pricingModel: "per_100g",
          useWeightStepPricing: true,
          weightPricingFormMode: "fixed_to_modern",
          baseUnitGrams: 100,
          defaultWeightGrams: 100,
          minWeightGrams: 100,
          maxWeightGrams: 300,
          weightStepGrams: 50,
          weightStepPriceSar: 5,
        }}
      />
    );

    expect(screen.getByText("إعداد تسعير الوزن")).toBeInTheDocument();
    expect(screen.queryByText("ترحيل للتسعير الحديث")).not.toBeInTheDocument();
  });

  it("existing legacy edit can explicitly migrate", () => {
    const legacyProduct = product({
      pricingModel: "per_100g",
      weightStepPriceHalala: null,
      weightPricing: null,
      baseUnitGrams: 100,
      defaultWeightGrams: 100,
      minWeightGrams: 100,
      maxWeightGrams: 300,
      weightStepGrams: 50,
    });

    render(
      <UpdateMenuProductForm
        product={legacyProduct}
        productId="legacy-product"
        initialValues={{
          ...getMenuProductFormValues(legacyProduct),
          useWeightStepPricing: true,
          weightPricingFormMode: "legacy_migration",
          weightStepPriceSar: 5,
        }}
      />
    );

    expect(screen.getByText("إعداد تسعير الوزن")).toBeInTheDocument();
    expect(screen.getByText("ترحيل للتسعير الحديث")).toBeInTheDocument();
  });

  it("legacy migration adopts canonical modern state and locks repeated saves", async () => {
    const legacyProduct = product({
      id: "legacy-product",
      pricingModel: "per_100g",
      weightStepPriceHalala: null,
      weightPricing: null,
      baseUnitGrams: 100,
      defaultWeightGrams: 100,
      minWeightGrams: 100,
      maxWeightGrams: 300,
      weightStepGrams: 50,
    });
    const canonicalModernProduct = product({
      id: "legacy-product",
      ...modernProductFields,
    });

    updateProductMock
      .mockResolvedValueOnce({
        status: true,
        data: product({
          id: "legacy-product",
          pricingModel: "per_100g",
          isVisible: false,
          isAvailable: false,
        }),
      })
      .mockResolvedValueOnce({
        status: true,
        data: canonicalModernProduct,
      });
    updateWeightPricingMock.mockResolvedValue({
      status: true,
      data: {
        contractVersion: "dashboard_weight_pricing.v1",
        product: canonicalModernProduct,
        weightPricing,
      },
    });

    render(
      <UpdateMenuProductForm
        product={legacyProduct}
        productId="legacy-product"
        initialValues={{
          ...getMenuProductFormValues(legacyProduct),
          useWeightStepPricing: true,
          weightPricingFormMode: "legacy_migration",
          weightStepPriceSar: 5,
        }}
      />
    );

    expect(screen.getByText("ترحيل للتسعير الحديث")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /حفظ/ }));

    await screen.findByText(/تم حفظ تسعير الوزن بنجاح/);
    expect(screen.queryByText("ترحيل للتسعير الحديث")).not.toBeInTheDocument();
    expect(screen.queryByText("منتج وزني قديم")).not.toBeInTheDocument();
    expect(screen.getByText("إعداد تسعير الوزن")).toBeInTheDocument();
    expect(screen.getByText("100 جم")).toBeInTheDocument();

    const submit = screen.getByRole("button", { name: /حفظ التعديلات/ });
    expect(submit).toBeDisabled();
    await userEvent.click(submit);
    expect(updateProductMock).toHaveBeenCalledTimes(2);
    expect(updateWeightPricingMock).toHaveBeenCalledTimes(1);
  });

  it("modern create success displays backend choices and blocks duplicate submit", async () => {
    createProductMock.mockResolvedValue({
      status: true,
      data: product({ id: "created-product", pricingModel: "per_100g" }),
    });
    updateWeightPricingMock.mockResolvedValue({
      status: true,
      data: {
        contractVersion: "dashboard_weight_pricing.v1",
        product: product({
          id: "created-product",
          ...modernProductFields,
        }),
        weightPricing,
      },
    });
    updateProductMock.mockResolvedValue({
      status: true,
      data: product({
        id: "created-product",
        pricingModel: "per_100g",
        isCustomizable: true,
      }),
    });

    render(<CreateMenuProductPage initialValues={modernFormValues()} />);

    await userEvent.click(screen.getByRole("button", { name: /إضافة المنتج/ }));

    await waitFor(() => expect(createProductMock).toHaveBeenCalledTimes(1));
    await screen.findByText("100 جم");
    expect(screen.getByText("150 جم")).toBeInTheDocument();

    const submit = screen.getByRole("button", { name: /إضافة المنتج/ });
    expect(submit).toBeDisabled();
    await userEvent.click(submit);
    expect(createProductMock).toHaveBeenCalledTimes(1);
  });

  it("keeps create final restore retryable across repeated failures", async () => {
    createProductMock.mockResolvedValue({
      status: true,
      data: product({ id: "created-product", pricingModel: "per_100g" }),
    });
    updateWeightPricingMock.mockResolvedValue({
      status: true,
      data: {
        contractVersion: "dashboard_weight_pricing.v1",
        product: product({
          id: "created-product",
          pricingModel: "per_100g",
          weightStepPriceHalala: 500,
          weightPricing,
        }),
        weightPricing,
      },
    });
    updateProductMock
      .mockRejectedValueOnce(new Error("restore failed"))
      .mockRejectedValueOnce(new Error("restore failed again"))
      .mockResolvedValueOnce({
        status: true,
        data: product({ id: "created-product", pricingModel: "per_100g" }),
      });

    render(<CreateMenuProductPage initialValues={modernFormValues()} />);
    await userEvent.click(screen.getByRole("button", { name: /إضافة المنتج/ }));

    expect(await screen.findAllByText(/فشل إظهار المنتج/)).toHaveLength(1);
    expectModernFinalRestorePayload(updateProductMock.mock.calls[0][1]);
    expect(screen.getByText("100 جم")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /إكمال إظهار المنتج/ }));

    await waitFor(() => expect(updateProductMock).toHaveBeenCalledTimes(2));
    expectModernFinalRestorePayload(updateProductMock.mock.calls[1][1]);
    expect(screen.getByRole("button", { name: /إكمال إظهار المنتج/ })).toBeEnabled();
    expect(screen.getByText("100 جم")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /إكمال إظهار المنتج/ }));

    await waitFor(() => expect(updateProductMock).toHaveBeenCalledTimes(3));
    expectModernFinalRestorePayload(updateProductMock.mock.calls[2][1]);
    expect(createProductMock).toHaveBeenCalledTimes(1);
    expect(updateWeightPricingMock).toHaveBeenCalledTimes(1);
  });

  it("keeps edit final restore retryable across repeated failures", async () => {
    const fixedProduct = product({
      id: "fixed-product",
      pricingModel: "fixed",
      isCustomizable: false,
    });
    const stagedProduct = product({
      id: "fixed-product",
      pricingModel: "per_100g",
      isVisible: false,
      isAvailable: false,
    });
    const canonicalModernProduct = product({
      id: "fixed-product",
      ...modernProductFields,
    });

    updateProductMock
      .mockResolvedValueOnce({ status: true, data: stagedProduct })
      .mockRejectedValueOnce(new Error("restore failed"))
      .mockRejectedValueOnce(new Error("restore failed again"))
      .mockResolvedValueOnce({ status: true, data: canonicalModernProduct });
    updateWeightPricingMock.mockResolvedValue({
      status: true,
      data: {
        contractVersion: "dashboard_weight_pricing.v1",
        product: canonicalModernProduct,
        weightPricing,
      },
    });

    render(
      <UpdateMenuProductForm
        product={fixedProduct}
        productId="fixed-product"
        initialValues={{
          ...getMenuProductFormValues(fixedProduct),
          pricingModel: "per_100g",
          useWeightStepPricing: true,
          weightPricingFormMode: "fixed_to_modern",
          baseUnitGrams: 100,
          defaultWeightGrams: 100,
          minWeightGrams: 100,
          maxWeightGrams: 300,
          weightStepGrams: 50,
          weightStepPriceSar: 5,
        }}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: /حفظ/ }));

    expect(await screen.findAllByText(/فشل إظهار المنتج/)).toHaveLength(2);
    expect(updateProductMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({ isVisible: false, isAvailable: false })
    );
    expectModernFinalRestorePayload(updateProductMock.mock.calls[1][1]);
    expect(screen.getByText("100 جم")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /إكمال إظهار المنتج/ }));

    await waitFor(() => expect(updateProductMock).toHaveBeenCalledTimes(3));
    expectModernFinalRestorePayload(updateProductMock.mock.calls[2][1]);
    expect(screen.getByRole("button", { name: /إكمال إظهار المنتج/ })).toBeEnabled();
    expect(screen.getByText("100 جم")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /إكمال إظهار المنتج/ }));

    await waitFor(() => expect(updateProductMock).toHaveBeenCalledTimes(4));
    expectModernFinalRestorePayload(updateProductMock.mock.calls[3][1]);
    expect(createProductMock).not.toHaveBeenCalled();
    expect(updateWeightPricingMock).toHaveBeenCalledTimes(1);
  });

  it("keeps fixed-to-modern pricing failure retry on the modern path", async () => {
    const fixedProduct = product({
      id: "fixed-product",
      pricingModel: "fixed",
      isCustomizable: false,
      isVisible: true,
      isAvailable: true,
    });
    const stagedProduct = product({
      id: "fixed-product",
      pricingModel: "per_100g",
      isVisible: false,
      isAvailable: false,
    });
    const canonicalModernProduct = product({
      id: "fixed-product",
      ...modernProductFields,
    });

    updateProductMock
      .mockResolvedValueOnce({ status: true, data: stagedProduct })
      .mockResolvedValueOnce({ status: true, data: stagedProduct })
      .mockResolvedValueOnce({ status: true, data: canonicalModernProduct });
    updateWeightPricingMock
      .mockRejectedValueOnce(new Error("pricing failed"))
      .mockResolvedValueOnce({
        status: true,
        data: {
          contractVersion: "dashboard_weight_pricing.v1",
          product: stagedProduct,
          weightPricing,
        },
      });

    render(
      <UpdateMenuProductForm
        product={fixedProduct}
        productId="fixed-product"
        initialValues={{
          ...getMenuProductFormValues(fixedProduct),
          pricingModel: "per_100g",
          useWeightStepPricing: true,
          weightPricingFormMode: "fixed_to_modern",
          baseUnitGrams: 100,
          defaultWeightGrams: 100,
          minWeightGrams: 100,
          maxWeightGrams: 300,
          weightStepGrams: 50,
          weightStepPriceSar: 5,
        }}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: /حفظ/ }));

    await screen.findByText(/فشل تسعير الوزن/);
    expect(updateProductMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({ isVisible: false, isAvailable: false })
    );
    expect(updateWeightPricingMock).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: /إكمال تسعير الوزن/ }));

    await waitFor(() => expect(updateWeightPricingMock).toHaveBeenCalledTimes(2));
    await screen.findByText(/تم حفظ تسعير الوزن بنجاح/);
    expect(updateProductMock).toHaveBeenCalledTimes(3);
    expect(updateProductMock.mock.calls[1][1]).toEqual(
      expect.objectContaining({ isVisible: false, isAvailable: false })
    );
    expectModernFinalRestorePayload(updateProductMock.mock.calls[2][1]);
    expect(createProductMock).not.toHaveBeenCalled();
  });

  it("keeps legacy migration pricing failure retry on the modern path", async () => {
    const legacyProduct = product({
      id: "legacy-product",
      pricingModel: "per_100g",
      weightStepPriceHalala: null,
      weightPricing: null,
      baseUnitGrams: 100,
      defaultWeightGrams: 100,
      minWeightGrams: 100,
      maxWeightGrams: 300,
      weightStepGrams: 50,
      isVisible: true,
      isAvailable: true,
    });
    const stagedProduct = product({
      id: "legacy-product",
      pricingModel: "per_100g",
      isVisible: false,
      isAvailable: false,
      weightPricing: null,
      weightStepPriceHalala: null,
    });
    const canonicalModernProduct = product({
      id: "legacy-product",
      ...modernProductFields,
    });

    updateProductMock
      .mockResolvedValueOnce({ status: true, data: stagedProduct })
      .mockResolvedValueOnce({ status: true, data: stagedProduct })
      .mockResolvedValueOnce({ status: true, data: canonicalModernProduct });
    updateWeightPricingMock
      .mockRejectedValueOnce(new Error("pricing failed"))
      .mockResolvedValueOnce({
        status: true,
        data: {
          contractVersion: "dashboard_weight_pricing.v1",
          product: stagedProduct,
          weightPricing,
        },
      });

    render(
      <UpdateMenuProductForm
        product={legacyProduct}
        productId="legacy-product"
        initialValues={{
          ...getMenuProductFormValues(legacyProduct),
          useWeightStepPricing: true,
          weightPricingFormMode: "legacy_migration",
          weightStepPriceSar: 5,
        }}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: /حفظ/ }));

    await screen.findByText(/فشل تسعير الوزن/);
    expect(updateProductMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({ isVisible: false, isAvailable: false })
    );
    expect(updateWeightPricingMock).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: /إكمال تسعير الوزن/ }));

    await waitFor(() => expect(updateWeightPricingMock).toHaveBeenCalledTimes(2));
    await screen.findByText(/تم حفظ تسعير الوزن بنجاح/);
    expect(updateProductMock).toHaveBeenCalledTimes(3);
    expect(updateProductMock.mock.calls[1][1]).toEqual(
      expect.objectContaining({ isVisible: false, isAvailable: false })
    );
    expectModernFinalRestorePayload(updateProductMock.mock.calls[2][1]);
    expect(createProductMock).not.toHaveBeenCalled();
  });
});
