// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ManualDeductionPage from "../src/components/pages/manual-deduction/ManualDeductionPage";

const apiGetMock = vi.fn();
const apiPostMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock("@/lib/apis", () => ({
  default: {
    get: (...args: unknown[]) => apiGetMock(...args),
    post: (...args: unknown[]) => apiPostMock(...args),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

const searchResponse = {
  status: true,
  data: {
    customer: { id: "customer-1", name: "Ahmed Ali", phone: "0501234567" },
    subscription: {
      id: "sub-delivery",
      planName: "Delivery Plan",
      status: "active",
      fulfillmentMethod: "delivery",
      totalMeals: 20,
      consumedMeals: 4,
      remainingMeals: 16,
      remainingRegularMeals: 12,
      remainingPremiumMeals: 4,
      addonBalances: [
        {
          addonId: "addon-water",
          name: "Water",
          remainingQty: 5,
          totalQty: 5,
          consumedQty: 0,
        },
      ],
    },
    subscriptions: [
      {
        id: "sub-delivery",
        planName: "Delivery Plan",
        status: "active",
        fulfillmentMethod: "delivery",
        totalMeals: 20,
        consumedMeals: 4,
        remainingMeals: 16,
        remainingRegularMeals: 12,
        remainingPremiumMeals: 4,
        addonBalances: [
          {
            addonId: "addon-water",
            name: "Water",
            remainingQty: 5,
            totalQty: 5,
            consumedQty: 0,
          },
        ],
      },
      {
        id: "sub-pickup",
        planName: "Pickup Plan",
        status: "active",
        fulfillmentMethod: "pickup",
        totalMeals: 8,
        consumedMeals: 2,
        remainingMeals: 6,
        remainingRegularMeals: 6,
        remainingPremiumMeals: 0,
        addonBalances: [],
      },
    ],
    today: {
      businessDate: "2026-07-17",
      hasDeliveryDeductionToday: false,
      lastDeductionAt: null,
    },
  },
};

const emptyHistory = {
  status: true,
  data: {
    contractVersion: "dashboard_manual_deductions.v1",
    subscriptionId: "sub-delivery",
    count: 0,
    items: [],
  },
};

const successMutation = {
  status: true,
  data: {
    subscriptionId: "sub-delivery",
    deducted: {
      regularMeals: 1,
      premiumMeals: 0,
      total: 1,
      addons: [{ addonId: "addon-water", qty: 2 }],
    },
    remaining: {
      regularMeals: 11,
      premiumMeals: 4,
      totalMeals: 15,
      addons: [{ addonId: "addon-water", remainingQty: 3 }],
    },
    businessDate: "2026-07-17",
    fulfillmentMethod: "delivery",
  },
};

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <ManualDeductionPage />
    </QueryClientProvider>
  );
  return { ...view, queryClient };
};

const setupSearchMocks = () => {
  apiGetMock.mockImplementation((url: string) => {
    if (url.includes("/manual-deductions")) {
      return Promise.resolve({ status: 200, data: emptyHistory });
    }
    return Promise.resolve({ status: 200, data: searchResponse });
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  setupSearchMocks();
});

afterEach(() => {
  cleanup();
});

describe("manual deduction page", () => {
  it("re-submitting the same phone performs a new request", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("رقم الهاتف"), "0501234567");
    await user.click(screen.getByRole("button", { name: "بحث" }));
    await screen.findAllByText("Delivery Plan");

    await user.click(screen.getByRole("button", { name: "بحث" }));

    await waitFor(() =>
      expect(
        apiGetMock.mock.calls.filter(([url]) =>
          String(url).includes("/api/dashboard/subscriptions/search")
        )
      ).toHaveLength(2)
    );
  });

  it("requires confirmation before posting the mutation payload", async () => {
    apiPostMock.mockResolvedValueOnce({ status: 200, data: successMutation });
    renderPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("رقم الهاتف"), "0501234567");
    await user.click(screen.getByRole("button", { name: "بحث" }));
    await user.click((await screen.findAllByRole("button", { name: "اختيار" }))[0]);

    await user.clear(screen.getByLabelText("وجبات عادية"));
    await user.type(screen.getByLabelText("وجبات عادية"), "1");
    await user.clear(screen.getByLabelText("Water"));
    await user.type(screen.getByLabelText("Water"), "2");
    await user.type(screen.getByLabelText("ملاحظات"), "  needs receipt  ");
    await user.click(screen.getByRole("button", { name: "مراجعة الخصم" }));

    expect(apiPostMock).not.toHaveBeenCalled();
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "تنفيذ الخصم" }));

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(1));
    expect(apiPostMock).toHaveBeenCalledWith(
      "/api/dashboard/subscriptions/sub-delivery/manual-deduction",
      {
        regularMeals: 1,
        premiumMeals: 0,
        addons: [{ addonId: "addon-water", qty: 2 }],
        reason: "cashier_walk_in",
        notes: "needs receipt",
      }
    );
  });

  it("rapid double confirmation produces one POST and success disables only that delivery subscription", async () => {
    let resolvePost: (value: unknown) => void = () => undefined;
    apiPostMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePost = resolve;
        })
    );
    renderPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("رقم الهاتف"), "0501234567");
    await user.click(screen.getByRole("button", { name: "بحث" }));
    await user.click((await screen.findAllByRole("button", { name: "اختيار" }))[0]);
    await user.clear(screen.getByLabelText("وجبات عادية"));
    await user.type(screen.getByLabelText("وجبات عادية"), "1");
    await user.click(screen.getByRole("button", { name: "مراجعة الخصم" }));

    const confirm = await screen.findByRole("button", { name: "تنفيذ الخصم" });
    await user.click(confirm);
    await user.click(confirm);
    expect(apiPostMock).toHaveBeenCalledTimes(1);

    resolvePost({ status: 200, data: successMutation });

    await screen.findByText("تم تنفيذ الخصم");
    expect(screen.getByText("المتبقي الكلي")).toBeInTheDocument();
    expect(screen.getAllByText("غير متاح").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "اختيار" }).length).toBeGreaterThan(0);
  });

  it("backend rejection preserves entered values and blocks only the affected delivery subscription", async () => {
    apiPostMock.mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          error: {
            code: "DELIVERY_ALREADY_DEDUCTED_TODAY",
            message: "already deducted",
          },
        },
      },
    });
    renderPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("رقم الهاتف"), "0501234567");
    await user.click(screen.getByRole("button", { name: "بحث" }));
    await user.click((await screen.findAllByRole("button", { name: "اختيار" }))[0]);
    await user.clear(screen.getByLabelText("وجبات عادية"));
    await user.type(screen.getByLabelText("وجبات عادية"), "3");
    await user.click(screen.getByRole("button", { name: "مراجعة الخصم" }));
    await user.click(await screen.findByRole("button", { name: "تنفيذ الخصم" }));

    await screen.findAllByText(/توصيل/);
    expect(screen.getByLabelText("وجبات عادية")).toHaveValue(3);

    await user.click(screen.getByRole("button", { name: "رجوع" }));
    expect(screen.getAllByText("غير متاح").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "اختيار" }).length).toBeGreaterThan(0);
  });

  it("renders history loading, empty, error, and populated states safely", async () => {
    apiGetMock.mockImplementation((url: string) => {
      if (url.includes("/manual-deductions")) {
        return Promise.resolve({
          status: 200,
          data: {
            ...emptyHistory,
            data: {
              ...emptyHistory.data,
              count: 1,
              items: [
                {
                  id: "hist-1",
                  subscriptionId: "sub-delivery",
                  customerId: "customer-1",
                  businessDate: "2026-07-17",
                  deducted: {
                    regularMeals: 1,
                    premiumMeals: 0,
                    total: 1,
                    addons: [{ addonId: "addon-water", qty: 1, remainingAfter: 4 }],
                  },
                  before: {
                    remainingRegularMeals: 12,
                    remainingPremiumMeals: 4,
                    remainingMeals: 16,
                  },
                  after: {
                    remainingRegularMeals: 11,
                    remainingPremiumMeals: 4,
                    remainingMeals: 15,
                  },
                  fulfillmentMethod: "delivery",
                  actor: { id: "staff-1", role: "cashier" },
                  reason: "cashier_walk_in",
                  notes: "done",
                  createdAt: "2026-07-17T10:00:00.000Z",
                },
              ],
            },
          },
        });
      }
      return Promise.resolve({ status: 200, data: searchResponse });
    });

    renderPage();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("رقم الهاتف"), "0501234567");
    await user.click(screen.getByRole("button", { name: "بحث" }));
    await user.click((await screen.findAllByRole("button", { name: "اختيار" }))[0]);

    expect(await screen.findByText("cashier")).toBeInTheDocument();
    expect(screen.getByText(/Water: 1/)).toBeInTheDocument();

    cleanup();
    apiGetMock.mockImplementation((url: string) => {
      if (url.includes("/manual-deductions")) {
        return Promise.reject({
          response: { status: 500, data: { error: { code: "SERVER_ERROR" } } },
        });
      }
      return Promise.resolve({ status: 200, data: searchResponse });
    });
    renderPage();
    await user.type(screen.getByLabelText("رقم الهاتف"), "0501234567");
    await user.click(screen.getByRole("button", { name: "بحث" }));
    await user.click((await screen.findAllByRole("button", { name: "اختيار" }))[0]);
    expect(await screen.findByText("حدث خطأ أثناء تنفيذ الخصم اليدوي.")).toBeInTheDocument();
  });
});
