// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UseFormReturn } from "react-hook-form";
import type { CreateSubscriptionSchemaType } from "../src/lib/validations/createSubscriptionSchema";
import { CreateSubscriptionFormContent } from "../src/components/pages/subscriptions/create/CreateSubscriptionFormContent";

const apiPostMock = vi.fn();
const navigateMock = vi.fn();
const toastMock = vi.fn();

vi.mock("@/lib/apis", () => ({
  default: {
    post: (...args: unknown[]) => apiPostMock(...args),
    get: vi.fn(),
  },
}));

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-router")>(
    "@tanstack/react-router"
  );
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/components/global/ToastMessage", () => ({
  ToastMessage: (...args: unknown[]) => toastMock(...args),
}));

vi.mock("../src/components/pages/subscriptions/create/UserSelectionSection", () => ({
  UserSelectionSection: ({
    form,
  }: {
    form: UseFormReturn<CreateSubscriptionSchemaType>;
  }) => (
    <button
      type="button"
      onClick={() => form.setValue("userId", "user-1", { shouldValidate: true, shouldDirty: true })}
    >
      اختر العميل
    </button>
  ),
}));

vi.mock("../src/components/pages/subscriptions/create/PlanSelectionSection", () => ({
  PlanSelectionSection: ({
    form,
  }: {
    form: UseFormReturn<CreateSubscriptionSchemaType>;
  }) => (
    <div>
      <button
        type="button"
        onClick={() => {
          form.setValue("planId", "plan-1", { shouldValidate: true, shouldDirty: true });
          form.setValue("grams", 200, { shouldValidate: true, shouldDirty: true });
          form.setValue("mealsPerDay", 2, { shouldValidate: true, shouldDirty: true });
          form.setValue("startDate", "2026-07-20", {
            shouldValidate: true,
            shouldDirty: true,
          });
        }}
      >
        اختر الباقة
      </button>
      <button
        type="button"
        onClick={() => form.setValue("mealsPerDay", 3, { shouldValidate: true, shouldDirty: true })}
      >
        تغيير الوجبات
      </button>
    </div>
  ),
}));

vi.mock("../src/components/pages/subscriptions/create/PremiumMealsSection", () => ({
  PremiumMealsSection: ({
    form,
  }: {
    form: UseFormReturn<CreateSubscriptionSchemaType>;
  }) => (
    <div>
      <button
        type="button"
        onClick={() =>
          form.setValue("premiumItems", [{ premiumKey: "premium-chicken", qty: 2 }], {
            shouldValidate: true,
            shouldDirty: true,
          })
        }
      >
        إضافة وجبة مميزة
      </button>
      <button
        type="button"
        onClick={() =>
          form.setValue("premiumItems", [{ premiumKey: "premium-chicken", qty: 0 }], {
            shouldValidate: true,
            shouldDirty: true,
          })
        }
      >
        كمية مميزة غير صالحة
      </button>
    </div>
  ),
}));

vi.mock("../src/components/pages/subscriptions/create/AddonsSection", () => ({
  AddonsSection: ({
    form,
  }: {
    form: UseFormReturn<CreateSubscriptionSchemaType>;
  }) => (
    <div>
      <button
        type="button"
        onClick={() =>
          form.setValue("addons", [{ addonId: "addon-juice", qty: 3 }], {
            shouldValidate: true,
            shouldDirty: true,
          })
        }
      >
        إضافة اشتراك إضافي
      </button>
      <button
        type="button"
        onClick={() =>
          form.setValue("addons", [{ addonId: "addon-juice", qty: 0 }], {
            shouldValidate: true,
            shouldDirty: true,
          })
        }
      >
        كمية إضافة غير صالحة
      </button>
    </div>
  ),
}));

vi.mock("../src/components/pages/subscriptions/create/DeliverySection", () => ({
  DeliverySection: ({
    form,
  }: {
    form: UseFormReturn<CreateSubscriptionSchemaType>;
  }) => (
    <div>
      <button
        type="button"
        onClick={() =>
          form.setValue(
            "delivery",
            {
              type: "pickup",
              zoneId: "",
              pickupLocationId: "pickup-1",
              address: {
                label: "",
                line1: "",
                line2: "",
                city: "",
                district: "",
                phone: "",
                notes: "",
              },
              slot: { type: "pickup", window: "", slotId: "" },
            },
            { shouldValidate: true, shouldDirty: true }
          )
        }
      >
        استلام من الفرع
      </button>
      <button
        type="button"
        onClick={() =>
          form.setValue(
            "delivery",
            {
              type: "delivery",
              zoneId: "zone-1",
              pickupLocationId: "",
              address: {
                label: "Home",
                line1: "Street 1",
                line2: "",
                city: "Riyadh",
                district: "Al Malqa",
                phone: "",
                notes: "",
              },
              slot: { type: "delivery", window: "18:00-20:00", slotId: "slot-1" },
            },
            { shouldValidate: true, shouldDirty: true }
          )
        }
      >
        توصيل بعنوان
      </button>
    </div>
  ),
}));

const quoteResponse = {
  status: true,
  data: {
    plan: { id: "plan-1", name: "Plan A" },
    selectedOptions: { grams: 200, mealsPerDay: 2 },
    delivery: { type: "pickup" },
    premiumItems: [{ premiumKey: "premium-chicken", name: "Chicken", qty: 2 }],
    addonPlans: [{ addonId: "addon-juice", name: "Juice", quantityPerDay: 3 }],
    pricing: {
      subscriptionPriceHalala: 10000,
      premiumTotalHalala: 2000,
      addonsTotalHalala: 3000,
      deliveryFeeHalala: 0,
      discountHalala: 500,
      vatPercentage: 15,
      vatHalala: 1500,
      totalHalala: 16000,
      currency: "SAR",
      lineItems: [
        { key: "subscription", label: "اشتراك", amountHalala: 10000, currency: "SAR" },
        { key: "discount", label: "خصم", amountHalala: -500, currency: "SAR" },
        { key: "vat", label: "ضريبة", amountHalala: 1500, currency: "SAR" },
      ],
    },
    selectionSections: [
      { key: "subscription_meals", title: "وجبات الاشتراك", items: [{ label: "وجبات", value: 2 }] },
      { key: "premium_meals", title: "الوجبات المميزة", items: [{ label: "Chicken", qty: 2 }] },
      { key: "addon_subscriptions", title: "إضافات الاشتراك", items: [{ label: "Juice", qty: 3 }] },
    ],
    lineItems: [
      { key: "subscription", label: "اشتراك", amountHalala: 10000, currency: "SAR" },
      { key: "discount", label: "خصم", amountHalala: -500, currency: "SAR" },
      { key: "vat", label: "ضريبة", amountHalala: 1500, currency: "SAR" },
      { key: "total", label: "الإجمالي", amountHalala: 16000, currency: "SAR" },
    ],
    totalHalala: 16000,
  },
};

const createResponse = {
  status: true,
  data: {
    id: "sub-1",
    displayId: "SUB-001",
    status: "active",
  },
};

function renderPage(userId?: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  const view = render(
    <QueryClientProvider client={queryClient}>
      <CreateSubscriptionFormContent userId={userId} />
    </QueryClientProvider>
  );
  return { ...view, queryClient, invalidateSpy };
}

async function fillValidPickup(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "اختر العميل" }));
  await user.click(screen.getByRole("button", { name: "اختر الباقة" }));
  await user.click(screen.getByRole("button", { name: "استلام من الفرع" }));
}

beforeEach(() => {
  apiPostMock.mockReset();
  navigateMock.mockReset();
  toastMock.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("subscription creation page", () => {
  it("renders without quote or create requests", () => {
    renderPage();

    expect(screen.getByRole("button", { name: "مراجعة السعر" })).toBeInTheDocument();
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it("review sends exactly one quote request and does not create", async () => {
    let resolveQuote: (value: unknown) => void = () => undefined;
    apiPostMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveQuote = resolve;
        })
    );
    renderPage();
    const user = userEvent.setup();

    await fillValidPickup(user);
    const review = screen.getByRole("button", { name: "مراجعة السعر" });
    await user.click(review);
    await user.click(review);
    expect(apiPostMock).toHaveBeenCalledTimes(1);
    resolveQuote({ data: quoteResponse });
    await screen.findByText("مراجعة السعر والدفع النقدي");
    expect(apiPostMock).toHaveBeenCalledTimes(1);
    expect(apiPostMock).toHaveBeenCalledWith(
      "/api/dashboard/subscriptions/quote",
      expect.objectContaining({
        userId: "user-1",
        planId: "plan-1",
        delivery: { type: "pickup", pickupLocationId: "pickup-1" },
      }),
      { suppressGlobalForbiddenToast: true }
    );
    expect(apiPostMock).not.toHaveBeenCalledWith(
      "/api/dashboard/subscriptions",
      expect.anything(),
      expect.anything()
    );
  });

  it("renders quote sections, line items, VAT, discount, and total from backend", async () => {
    apiPostMock.mockResolvedValueOnce({ data: quoteResponse });
    renderPage();
    const user = userEvent.setup();

    await fillValidPickup(user);
    await user.click(screen.getByRole("button", { name: "إضافة وجبة مميزة" }));
    await user.click(screen.getByRole("button", { name: "إضافة اشتراك إضافي" }));
    await user.click(screen.getByRole("button", { name: "مراجعة السعر" }));

    expect(await screen.findByText("وجبات الاشتراك")).toBeInTheDocument();
    expect(screen.getByText("الوجبات المميزة")).toBeInTheDocument();
    expect(screen.getByText("إضافات الاشتراك")).toBeInTheDocument();
    expect(screen.getByText("خصم")).toBeInTheDocument();
    expect(screen.getByText(/ضريبة القيمة المضافة/)).toBeInTheDocument();
    expect(screen.getAllByText("160 SAR").length).toBeGreaterThanOrEqual(1);
  });

  it("requires cash confirmation before create", async () => {
    apiPostMock.mockResolvedValueOnce({ data: quoteResponse });
    renderPage();
    const user = userEvent.setup();

    await fillValidPickup(user);
    await user.click(screen.getByRole("button", { name: "مراجعة السعر" }));

    const createButton = await screen.findByRole("button", {
      name: "تأكيد الدفع وإنشاء الاشتراك",
    });
    expect(createButton).toBeDisabled();

    await user.click(screen.getByText("أؤكد أنه تم استلام المبلغ النقدي كاملاً"));
    expect(createButton).toBeEnabled();
  });

  it("create sends one cash-paid payload from the quoted snapshot and navigates", async () => {
    let resolveCreate: (value: unknown) => void = () => undefined;
    apiPostMock
      .mockResolvedValueOnce({ data: quoteResponse })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveCreate = resolve;
          })
      );
    const { invalidateSpy } = renderPage();
    const user = userEvent.setup();

    await fillValidPickup(user);
    await user.click(screen.getByRole("button", { name: "إضافة وجبة مميزة" }));
    await user.click(screen.getByRole("button", { name: "إضافة اشتراك إضافي" }));
    await user.click(screen.getByRole("button", { name: "مراجعة السعر" }));
    await screen.findByText("مراجعة السعر والدفع النقدي");
    await user.click(screen.getByText("أؤكد أنه تم استلام المبلغ النقدي كاملاً"));
    const create = screen.getByRole("button", { name: "تأكيد الدفع وإنشاء الاشتراك" });
    await user.click(create);
    await user.click(create);
    await user.keyboard("{Enter}");

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(2));
    expect(apiPostMock.mock.calls[1][0]).toBe("/api/dashboard/subscriptions");
    expect(apiPostMock.mock.calls[1][1]).toMatchObject({
      userId: "user-1",
      premiumItems: [{ premiumKey: "premium-chicken", qty: 2 }],
      addons: [{ addonId: "addon-juice", qty: 3 }],
      payment: {
        method: "cash",
        status: "paid",
        collectedAmountHalala: 16000,
      },
      source: "dashboard_cashier",
    });
    resolveCreate({ data: createResponse });
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith({
        to: "/subscriptions/$subscriptionId",
        params: { subscriptionId: "sub-1" },
      })
    );
    expect(toastMock).toHaveBeenCalledWith("تم إنشاء الاشتراك بنجاح (SUB-001)", "success");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["subscriptions-list"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["subscriptions-summary"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["users"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["user-details", "user-1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["user-subscriptions", "user-1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["payments-list"] });
  });

  it("marks quote stale after a quote-driving field changes and requires re-quote", async () => {
    apiPostMock
      .mockResolvedValueOnce({ data: quoteResponse })
      .mockResolvedValueOnce({ data: { ...quoteResponse, data: { ...quoteResponse.data, totalHalala: 17000, pricing: { ...quoteResponse.data.pricing, totalHalala: 17000 } } } });
    renderPage();
    const user = userEvent.setup();

    await fillValidPickup(user);
    await user.click(screen.getByRole("button", { name: "مراجعة السعر" }));
    await screen.findByText("مراجعة السعر والدفع النقدي");
    await user.click(screen.getByText("أؤكد أنه تم استلام المبلغ النقدي كاملاً"));
    await user.click(screen.getByRole("button", { name: "تغيير الوجبات" }));

    expect(await screen.findByText("تم تعديل بيانات الاشتراك. راجع السعر مرة أخرى.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "تأكيد الدفع وإنشاء الاشتراك" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "مراجعة السعر" }));
    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(2));
    expect(apiPostMock.mock.calls[1][1]).toMatchObject({ mealsPerDay: 3 });
  });

  it("quote failure preserves form values", async () => {
    apiPostMock.mockRejectedValueOnce({
      response: { status: 422, data: { messageAr: "كود الخصم غير صالح" } },
    });
    renderPage();
    const user = userEvent.setup();

    await fillValidPickup(user);
    await user.type(screen.getByLabelText("كود الخصم"), "BAD");
    await user.click(screen.getByRole("button", { name: "مراجعة السعر" }));

    expect(await screen.findByText("كود الخصم غير صالح")).toBeInTheDocument();
    expect(screen.getByLabelText("كود الخصم")).toHaveValue("BAD");
  });

  it("create failure preserves quote and amount mismatch forces re-quote", async () => {
    apiPostMock
      .mockResolvedValueOnce({ data: quoteResponse })
      .mockRejectedValueOnce({
        response: {
          status: 400,
          data: { messageAr: "المبلغ المحصل لا يطابق إجمالي عرض السعر" },
        },
      });
    renderPage();
    const user = userEvent.setup();

    await fillValidPickup(user);
    await user.click(screen.getByRole("button", { name: "مراجعة السعر" }));
    await screen.findByText("مراجعة السعر والدفع النقدي");
    await user.click(screen.getByText("أؤكد أنه تم استلام المبلغ النقدي كاملاً"));
    await user.click(screen.getByRole("button", { name: "تأكيد الدفع وإنشاء الاشتراك" }));

    expect(await screen.findByText("المبلغ المحصل لا يطابق إجمالي عرض السعر")).toBeInTheDocument();
    expect(screen.getByText("مراجعة السعر والدفع النقدي")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "تأكيد الدفع وإنشاء الاشتراك" })).toBeDisabled();
  });

  it("rejects invalid premium and add-on quantities before quote", async () => {
    renderPage();
    const user = userEvent.setup();

    await fillValidPickup(user);
    await user.click(screen.getByRole("button", { name: "كمية مميزة غير صالحة" }));
    await user.click(screen.getByRole("button", { name: "كمية إضافة غير صالحة" }));
    await user.click(screen.getByRole("button", { name: "مراجعة السعر" }));

    await waitFor(() => expect(apiPostMock).not.toHaveBeenCalled());
  });

  it("builds delivery quote without pickup fields", async () => {
    apiPostMock.mockResolvedValueOnce({ data: quoteResponse });
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "اختر العميل" }));
    await user.click(screen.getByRole("button", { name: "اختر الباقة" }));
    await user.click(screen.getByRole("button", { name: "توصيل بعنوان" }));
    await user.click(screen.getByRole("button", { name: "مراجعة السعر" }));

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(1));
    const payload = apiPostMock.mock.calls[0][1] as Record<string, unknown>;
    expect(payload).toMatchObject({
      delivery: {
        type: "delivery",
        zoneId: "zone-1",
        window: "18:00-20:00",
        address: {
          label: "Home",
          line1: "Street 1",
          city: "Riyadh",
          district: "Al Malqa",
        },
      },
    });
    expect(JSON.stringify(payload)).not.toContain("pickupLocationId");
  });
});
