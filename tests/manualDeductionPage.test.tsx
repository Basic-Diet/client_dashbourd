// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

const phoneLabel = "رقم الهاتف";
const regularLabel = "وجبات عادية";
const notesLabel = "ملاحظات";
const searchButton = "بحث";
const selectButton = "اختيار";
const reviewButton = "مراجعة الخصم";
const confirmButton = "تنفيذ الخصم";
const cancelButton = "إلغاء";
const backButton = "رجوع";
const receiptTitle = "تم تنفيذ الخصم";
const mutationFallback =
  "تعذر تنفيذ الخصم اليدوي. حاول مرة أخرى.";
const searchFallback =
  "تعذر البحث عن العميل. حاول مرة أخرى.";
const refreshWarning =
  "تم تنفيذ الخصم، لكن تعذر تحديث بيانات الاشتراك تلقائياً. يمكنك إعادة البحث لتحديث الرصيد.";
const historyFallback =
  "تعذر تحميل سجل الخصومات. حاول مرة أخرى.";

const addonWater = {
  addonId: "addon-water",
  addonPlanId: "plan-water",
  name: "Water",
  category: "drink",
  purchasedDailyQty: 1,
  includedTotalQty: 5,
  remainingQty: 5,
  totalQty: 5,
  purchasedQty: 5,
  consumedQty: 0,
  reservedQty: 0,
};

const deliverySubscription = {
  id: "sub-delivery",
  planName: "Delivery Plan",
  status: "active",
  fulfillmentMethod: "delivery",
  totalMeals: 20,
  consumedMeals: 4,
  remainingMeals: 16,
  remainingRegularMeals: 12,
  remainingPremiumMeals: 4,
  addonBalances: [addonWater],
};

const pickupSubscription = {
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
};

const makeSearchResponse = (overrides = {}) => ({
  status: true,
  data: {
    customer: { id: "customer-1", name: "Ahmed Ali", phone: "0501234567" },
    subscription: deliverySubscription,
    subscriptions: [deliverySubscription, pickupSubscription],
    today: {
      businessDate: "2026-07-17",
      hasDeliveryDeductionToday: false,
      lastDeductionAt: null,
    },
    ...overrides,
  },
});

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

const pickupSuccessMutation = {
  status: true,
  data: {
    subscriptionId: "sub-pickup",
    deducted: { regularMeals: 1, premiumMeals: 0, total: 1, addons: [] },
    remaining: {
      regularMeals: 5,
      premiumMeals: 0,
      totalMeals: 5,
      addons: [],
    },
    businessDate: "2026-07-17",
    fulfillmentMethod: "pickup",
  },
};

const searchCalls = () =>
  apiGetMock.mock.calls.filter(([url]) =>
    String(url).includes("/api/dashboard/subscriptions/search")
  );

const historyCalls = () =>
  apiGetMock.mock.calls.filter(([url]) => String(url).includes("/manual-deductions"));

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  const view = render(
    <QueryClientProvider client={queryClient}>
      <ManualDeductionPage />
    </QueryClientProvider>
  );
  return { ...view, queryClient, invalidateSpy };
};

const setupSearchMocks = () => {
  apiGetMock.mockImplementation((url: string) => {
    if (url.includes("/manual-deductions")) {
      return Promise.resolve({ status: 200, data: emptyHistory });
    }
    return Promise.resolve({ status: 200, data: makeSearchResponse() });
  });
};

const searchForCustomer = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText(phoneLabel), "0501234567");
  await user.click(screen.getByRole("button", { name: searchButton }));
};

const selectSubscription = async (
  user: ReturnType<typeof userEvent.setup>,
  planName = "Delivery Plan"
) => {
  const planElement = (await screen.findAllByText(planName))[0];
  const actionScope = planElement.closest("tr") ?? planElement.closest(".rounded-lg");
  if (!actionScope) throw new Error(`Could not find action scope for ${planName}`);
  await user.click(within(actionScope as HTMLElement).getByRole("button", { name: selectButton }));
};

const enterRegularDeduction = async (
  user: ReturnType<typeof userEvent.setup>,
  value: string
) => {
  const input = screen.getByLabelText(regularLabel);
  await user.clear(input);
  fireEvent.change(input, { target: { value } });
};

const openConfirmation = async (
  user: ReturnType<typeof userEvent.setup>,
  regularMeals = "1"
) => {
  await enterRegularDeduction(user, regularMeals);
  await user.click(screen.getByRole("button", { name: reviewButton }));
  expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
};

beforeEach(() => {
  vi.clearAllMocks();
  setupSearchMocks();
});

afterEach(() => {
  cleanup();
});

describe("manual deduction page", () => {
  it("shows CUSTOMER_NOT_FOUND as a visible no-result state", async () => {
    apiGetMock
      .mockResolvedValueOnce({
        status: 404,
        data: { error: { code: "CUSTOMER_NOT_FOUND", message: "not found" } },
      })
      .mockResolvedValue({ status: 200, data: emptyHistory });
    renderPage();
    const user = userEvent.setup();

    await searchForCustomer(user);

    expect(await screen.findByText(/لم يتم العثور/)).toBeInTheDocument();
  });

  it("shows SUBSCRIPTION_NOT_FOUND as a visible no-result state", async () => {
    apiGetMock
      .mockResolvedValueOnce({
        status: 404,
        data: { error: { code: "SUBSCRIPTION_NOT_FOUND", message: "none" } },
      })
      .mockResolvedValue({ status: 200, data: emptyHistory });
    renderPage();
    const user = userEvent.setup();

    await searchForCustomer(user);

    expect(await screen.findByText(/لا يوجد اشتراك نشط/)).toBeInTheDocument();
  });

  it("shows an unexpected initial search failure when no cached data exists", async () => {
    apiGetMock.mockRejectedValueOnce({
      response: { status: 500, data: { error: { code: "SERVER_ERROR" } } },
    });
    renderPage();
    const user = userEvent.setup();

    await searchForCustomer(user);

    expect(await screen.findByText(searchFallback)).toBeInTheDocument();
  });

  it("same-phone retry works after an initial search failure", async () => {
    apiGetMock
      .mockRejectedValueOnce({
        response: { status: 500, data: { error: { code: "SERVER_ERROR" } } },
      })
      .mockResolvedValueOnce({ status: 200, data: makeSearchResponse() })
      .mockResolvedValue({ status: 200, data: emptyHistory });
    renderPage();
    const user = userEvent.setup();

    await searchForCustomer(user);
    expect(await screen.findByText(searchFallback)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: searchButton }));

    expect(await screen.findAllByText("Delivery Plan")).toHaveLength(2);
    expect(searchCalls()).toHaveLength(2);
  });

  it("same-phone retry works after CUSTOMER_NOT_FOUND", async () => {
    apiGetMock
      .mockResolvedValueOnce({
        status: 404,
        data: { error: { code: "CUSTOMER_NOT_FOUND", message: "not found" } },
      })
      .mockResolvedValueOnce({ status: 200, data: makeSearchResponse() })
      .mockResolvedValue({ status: 200, data: emptyHistory });
    renderPage();
    const user = userEvent.setup();

    await searchForCustomer(user);
    expect(await screen.findByText(/لم يتم العثور/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: searchButton }));

    expect(await screen.findAllByText("Delivery Plan")).toHaveLength(2);
    expect(searchCalls()).toHaveLength(2);
  });

  it("same-phone retry works after SUBSCRIPTION_NOT_FOUND", async () => {
    apiGetMock
      .mockResolvedValueOnce({
        status: 404,
        data: { error: { code: "SUBSCRIPTION_NOT_FOUND", message: "none" } },
      })
      .mockResolvedValueOnce({ status: 200, data: makeSearchResponse() })
      .mockResolvedValue({ status: 200, data: emptyHistory });
    renderPage();
    const user = userEvent.setup();

    await searchForCustomer(user);
    expect(await screen.findByText(/لا يوجد اشتراك نشط/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: searchButton }));

    expect(await screen.findAllByText("Delivery Plan")).toHaveLength(2);
    expect(searchCalls()).toHaveLength(2);
  });

  it("rejects zero total deduction locally without posting", async () => {
    renderPage();
    const user = userEvent.setup();

    await searchForCustomer(user);
    await selectSubscription(user);
    await user.click(screen.getByRole("button", { name: reviewButton }));

    expect(await screen.findByText(/كمية واحدة/)).toBeInTheDocument();
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it("rejects negative regular meals locally without posting", async () => {
    renderPage();
    const user = userEvent.setup();

    await searchForCustomer(user);
    await selectSubscription(user);
    await enterRegularDeduction(user, "-1");
    await user.click(screen.getByRole("button", { name: reviewButton }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it("rejects decimal regular meals locally without posting", async () => {
    renderPage();
    const user = userEvent.setup();

    await searchForCustomer(user);
    await selectSubscription(user);
    await enterRegularDeduction(user, "1.5");
    await user.click(screen.getByRole("button", { name: reviewButton }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it("rejects negative add-on quantity locally without posting", async () => {
    renderPage();
    const user = userEvent.setup();

    await searchForCustomer(user);
    await selectSubscription(user);
    const addonInput = screen.getByLabelText("Water");
    await user.clear(addonInput);
    fireEvent.change(addonInput, { target: { value: "-1" } });
    await user.click(screen.getByRole("button", { name: reviewButton }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it("rejects decimal add-on quantity locally without posting", async () => {
    renderPage();
    const user = userEvent.setup();

    await searchForCustomer(user);
    await selectSubscription(user);
    await user.clear(screen.getByLabelText("Water"));
    await user.type(screen.getByLabelText("Water"), "1.5");
    await user.click(screen.getByRole("button", { name: reviewButton }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it("requires confirmation, displays total meals, and posts the exact payload", async () => {
    apiPostMock.mockResolvedValueOnce({ data: successMutation });
    renderPage();
    const user = userEvent.setup();

    await searchForCustomer(user);
    await selectSubscription(user);
    await enterRegularDeduction(user, "1");
    await user.clear(screen.getByLabelText("Water"));
    await user.type(screen.getByLabelText("Water"), "2");
    await user.type(screen.getByLabelText(notesLabel), "  needs receipt  ");
    await user.click(screen.getByRole("button", { name: reviewButton }));

    expect(apiPostMock).not.toHaveBeenCalled();
    expect(
      await screen.findByText((_, element) =>
        element?.tagName.toLowerCase() === "p" &&
        element.textContent?.includes("إجمالي الوجبات: 1")
      )
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: confirmButton }));

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(1));
    expect(apiPostMock).toHaveBeenCalledWith(
      "/api/dashboard/subscriptions/sub-delivery/manual-deduction",
      {
        regularMeals: 1,
        premiumMeals: 0,
        addons: [{ addonId: "addon-water", qty: 2 }],
        reason: "cashier_walk_in",
        notes: "needs receipt",
      },
      { suppressGlobalForbiddenToast: true }
    );
  });

  it("locks search, selection, form, and confirmation controls during a pending POST", async () => {
    let resolvePost: (value: unknown) => void = () => undefined;
    apiPostMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePost = resolve;
        })
    );
    renderPage();
    const user = userEvent.setup();

    await searchForCustomer(user);
    await selectSubscription(user);
    await openConfirmation(user);

    const confirm = screen.getByRole("button", { name: confirmButton });
    await user.click(confirm);
    await user.click(confirm);
    await user.keyboard("{Enter}");

    expect(apiPostMock).toHaveBeenCalledTimes(1);
    const allButtons = Array.from(document.querySelectorAll("button"));
    expect(screen.getByLabelText(phoneLabel)).toBeDisabled();
    expect(allButtons.find((button) => button.textContent?.includes(searchButton))).toBeDisabled();
    allButtons
      .filter((button) => button.textContent?.trim() === selectButton)
      .forEach((button) => {
        expect(button).toBeDisabled();
      });
    expect(allButtons.find((button) => button.textContent?.trim() === cancelButton)).toBeDisabled();
    expect(screen.getByRole("button", { name: backButton })).toBeDisabled();
    expect(screen.getByRole("button", { name: /جاري التنفيذ/ })).toBeDisabled();

    resolvePost({ data: successMutation });
    expect(await screen.findByText(receiptTitle)).toBeInTheDocument();
  });

  it("keeps success receipt and shows a non-destructive warning when background refresh fails", async () => {
    apiPostMock.mockResolvedValueOnce({ data: successMutation });
    apiGetMock.mockImplementation((url: string) => {
      const requestUrl = String(url);
      if (requestUrl.includes("/manual-deductions")) {
        return Promise.resolve({ status: 200, data: emptyHistory });
      }
      if (searchCalls().length > 1) {
        return Promise.reject({
          response: { status: 500, data: { error: { code: "SERVER_ERROR" } } },
        });
      }
      return Promise.resolve({ status: 200, data: makeSearchResponse() });
    });
    renderPage();
    const user = userEvent.setup();

    await searchForCustomer(user);
    await selectSubscription(user);
    await openConfirmation(user);
    await user.click(screen.getByRole("button", { name: confirmButton }));

    expect(await screen.findByText(receiptTitle)).toBeInTheDocument();
    await waitFor(() => expect(searchCalls()).toHaveLength(2));
    expect(await screen.findByText(refreshWarning)).toBeInTheDocument();
    expect(apiPostMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(mutationFallback)).not.toBeInTheDocument();
    expect(screen.queryByText(searchFallback)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(regularLabel)).not.toBeInTheDocument();
  });

  it("correctable backend rejection keeps the form and entered values available", async () => {
    apiPostMock.mockRejectedValueOnce({
      response: {
        status: 409,
        data: { error: { code: "INSUFFICIENT_REGULAR_MEALS" } },
      },
    });
    renderPage();
    const user = userEvent.setup();

    await searchForCustomer(user);
    await selectSubscription(user);
    await openConfirmation(user, "3");
    await user.click(screen.getByRole("button", { name: confirmButton }));

    expect(await screen.findByText(/العادية/)).toBeInTheDocument();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByLabelText(regularLabel)).toHaveValue(3);
    expect(apiPostMock).toHaveBeenCalledTimes(1);
  });

  it("delivery duplicate rejection becomes terminal and blocks only the affected delivery subscription", async () => {
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

    await searchForCustomer(user);
    await selectSubscription(user);
    await openConfirmation(user, "3");
    await user.click(screen.getByRole("button", { name: confirmButton }));

    await waitFor(() => expect(screen.queryByLabelText(regularLabel)).not.toBeInTheDocument());
    expect(screen.getAllByText("غير متاح").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: selectButton }).length).toBeGreaterThan(0);
    await user.keyboard("{Enter}");
    expect(apiPostMock).toHaveBeenCalledTimes(1);
  });

  it("successful delivery blocks only that delivery subscription", async () => {
    apiPostMock.mockResolvedValueOnce({ data: successMutation });
    renderPage();
    const user = userEvent.setup();

    await searchForCustomer(user);
    await selectSubscription(user);
    await openConfirmation(user);
    await user.click(screen.getByRole("button", { name: confirmButton }));

    expect(await screen.findByText(receiptTitle)).toBeInTheDocument();
    expect(screen.getAllByText("غير متاح").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: selectButton }).length).toBeGreaterThan(0);
  });

  it("successful pickup remains selectable for another intentional deduction", async () => {
    apiPostMock.mockResolvedValueOnce({ data: pickupSuccessMutation });
    renderPage();
    const user = userEvent.setup();

    await searchForCustomer(user);
    await selectSubscription(user, "Pickup Plan");
    await openConfirmation(user);
    await user.click(screen.getByRole("button", { name: confirmButton }));

    expect(await screen.findByText(receiptTitle)).toBeInTheDocument();
    expect(screen.getByText("المتبقي الكلي").nextElementSibling).toHaveTextContent("5");
    expect(screen.queryAllByText("غير متاح")).toHaveLength(0);
    expect(screen.getAllByRole("button", { name: selectButton }).length).toBeGreaterThanOrEqual(2);
  });

  it("invalidates every required query key after a successful mutation", async () => {
    apiPostMock.mockResolvedValueOnce({ data: successMutation });
    const { invalidateSpy } = renderPage();
    const user = userEvent.setup();

    await searchForCustomer(user);
    await selectSubscription(user);
    await openConfirmation(user);
    await user.click(screen.getByRole("button", { name: confirmButton }));
    await screen.findByText(receiptTitle);

    const invalidatedKeys = invalidateSpy.mock.calls.map(([options]) =>
      JSON.stringify(options.queryKey)
    );
    expect(invalidatedKeys).toEqual(
      expect.arrayContaining([
        JSON.stringify(["subscription-details", "sub-delivery"]),
        JSON.stringify(["subscriptions-list"]),
        JSON.stringify(["subscriptions-summary"]),
        JSON.stringify(["subscriptions-search"]),
        JSON.stringify(["subscription-manual-deductions", "sub-delivery"]),
      ])
    );
  });

  it("renders history loading state", async () => {
    apiGetMock.mockImplementation((url: string) => {
      if (url.includes("/manual-deductions")) {
        return new Promise(() => undefined);
      }
      return Promise.resolve({ status: 200, data: makeSearchResponse() });
    });
    const { container } = renderPage();
    const user = userEvent.setup();

    await searchForCustomer(user);
    await selectSubscription(user);

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders history empty state", async () => {
    renderPage();
    const user = userEvent.setup();

    await searchForCustomer(user);
    await selectSubscription(user);

    expect(
      await screen.findByText(/لا توجد خصومات يدوية/)
    ).toBeInTheDocument();
  });

  it("renders history error state and retries", async () => {
    apiGetMock.mockImplementation((url: string) => {
      if (url.includes("/manual-deductions")) {
        return historyCalls().length === 1
          ? Promise.reject({
              response: { status: 500, data: { error: { code: "SERVER_ERROR" } } },
            })
          : Promise.resolve({ status: 200, data: emptyHistory });
      }
      return Promise.resolve({ status: 200, data: makeSearchResponse() });
    });
    renderPage();
    const user = userEvent.setup();

    await searchForCustomer(user);
    await selectSubscription(user);
    expect(await screen.findByText(historyFallback)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /إعادة المحاولة/ }));

    expect(
      await screen.findByText(/لا توجد خصومات يدوية/)
    ).toBeInTheDocument();
  });

  it("renders populated history with null fulfillment as unavailable", async () => {
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
                  fulfillmentMethod: null,
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
      return Promise.resolve({ status: 200, data: makeSearchResponse() });
    });
    renderPage();
    const user = userEvent.setup();

    await searchForCustomer(user);
    await selectSubscription(user);

    expect(await screen.findByText("cashier")).toBeInTheDocument();
    expect(screen.getByText(/Water: 1/)).toBeInTheDocument();
    expect(screen.getByText("غير متاح")).toBeInTheDocument();
  });

  it("history GET includes suppressGlobalForbiddenToast", async () => {
    renderPage();
    const user = userEvent.setup();

    await searchForCustomer(user);
    await selectSubscription(user);
    await waitFor(() => expect(historyCalls().length).toBeGreaterThan(0));

    expect(historyCalls()[0]).toEqual([
      "/api/dashboard/subscriptions/sub-delivery/manual-deductions",
      { suppressGlobalForbiddenToast: true },
    ]);
  });
});
