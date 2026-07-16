// @vitest-environment jsdom

import assert from "node:assert/strict";
import type { ReactElement, FormEvent } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, test, vi } from "vitest";

import { CreateSubscriptionFormContent } from "../src/components/pages/subscriptions/create/CreateSubscriptionFormContent";
import { useCreateSubscriptionMutation } from "../src/hooks/useSubscriptionsQuery";

const navigateMock = vi.hoisted(() => vi.fn());
const quoteMock = vi.hoisted(() => vi.fn());
const createMock = vi.hoisted(() => vi.fn());

const subscriptionPayload = vi.hoisted(() => ({
  userId: "customer-1",
  planId: "plan-1",
  grams: 150,
  mealsPerDay: 2,
  startDate: "2026-07-20",
  premiumItems: [],
  addons: [],
  delivery: {
    type: "pickup",
    zoneId: "",
    pickupLocationId: "pickup-1",
    address: {
      label: "",
      city: "",
      district: "",
      street: "",
      building: "",
    },
    slot: {
      type: "pickup",
      window: "10:00-12:00",
      slotId: "slot-1",
    },
  },
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("@/components/global/ToastMessage", () => ({
  ToastMessage: vi.fn(),
}));

vi.mock("@/hooks/useCreateSubscriptionForm", () => ({
  default: (userId: string) => ({
    handleSubmit:
      (onSubmit: (data: typeof subscriptionPayload) => Promise<void>) =>
      (event?: FormEvent<HTMLFormElement>) => {
        event?.preventDefault();
        return onSubmit({ ...subscriptionPayload, userId });
      },
  }),
}));

vi.mock("@/components/pages/subscriptions/create/UserSelectionSection", () => ({
  UserSelectionSection: () => <div data-testid="user-section" />,
}));

vi.mock("@/components/pages/subscriptions/create/PlanSelectionSection", () => ({
  PlanSelectionSection: () => <div data-testid="plan-section" />,
}));

vi.mock("@/components/pages/subscriptions/create/PremiumMealsSection", () => ({
  PremiumMealsSection: () => <div data-testid="premium-section" />,
}));

vi.mock("@/components/pages/subscriptions/create/AddonsSection", () => ({
  AddonsSection: () => <div data-testid="addons-section" />,
}));

vi.mock("@/components/pages/subscriptions/create/DeliverySection", () => ({
  DeliverySection: () => <div data-testid="delivery-section" />,
}));

vi.mock("@/utils/fetchSubscriptionsData", () => ({
  fetchSubscriptionsSummary: vi.fn(),
  fetchSubscriptionsList: vi.fn(),
  fetchSubscriptionDetails: vi.fn(),
  fetchSubscriptionAudit: vi.fn(),
  fetchSubscriptionLifecycle: vi.fn(),
  fetchSubscriptionAddonEntitlements: vi.fn(),
  fetchSubscriptionManualDeductions: vi.fn(),
  searchSubscriptionsByPhone: vi.fn(),
  manualDeductSubscription: vi.fn(),
  freezeSubscription: vi.fn(),
  unfreezeSubscription: vi.fn(),
  extendSubscription: vi.fn(),
  cancelSubscription: vi.fn(),
  fetchSubscriptionQuote: quoteMock,
  createSubscription: createMock,
}));

function renderWithClient(element: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

  render(
    <QueryClientProvider client={queryClient}>{element}</QueryClientProvider>
  );

  return { queryClient, invalidateSpy };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test("user-origin subscription quotes before create and returns to customer details", async () => {
  quoteMock.mockResolvedValue({ status: true });
  createMock.mockResolvedValue({
    data: { id: "subscription-1", displayId: "SUB-1" },
  });

  renderWithClient(<CreateSubscriptionFormContent userId="customer-1" />);

  fireEvent.submit(screen.getByRole("button", { name: /إنشاء الاشتراك/ }).closest("form")!);

  await waitFor(() => assert.equal(createMock.mock.calls.length, 1));
  assert.equal(quoteMock.mock.invocationCallOrder[0] < createMock.mock.invocationCallOrder[0], true);
  assert.deepEqual(navigateMock.mock.calls[0][0], {
    to: "/users/$userId",
    params: { userId: "customer-1" },
  });
  assert.equal(
    navigateMock.mock.calls.some(([arg]) => arg?.to === "/subscriptions/$subscriptionId"),
    false
  );
});

test("standalone admin subscription creation keeps subscription-detail navigation", async () => {
  quoteMock.mockResolvedValue({ status: true });
  createMock.mockResolvedValue({
    data: { id: "subscription-standalone", displayId: "SUB-2" },
  });

  renderWithClient(<CreateSubscriptionFormContent />);

  fireEvent.submit(screen.getByRole("button", { name: /إنشاء الاشتراك/ }).closest("form")!);

  await waitFor(() => assert.equal(createMock.mock.calls.length, 1));
  assert.deepEqual(navigateMock.mock.calls[0][0], {
    to: "/subscriptions/$subscriptionId",
    params: { subscriptionId: "subscription-standalone" },
  });
});

test("duplicate submit is blocked while quote/create is in flight", async () => {
  let resolveQuote!: () => void;
  quoteMock.mockReturnValue(new Promise<void>((resolve) => {
    resolveQuote = resolve;
  }));
  createMock.mockResolvedValue({ data: { id: "subscription-1" } });

  renderWithClient(<CreateSubscriptionFormContent userId="customer-1" />);
  const form = screen.getByRole("button", { name: /إنشاء الاشتراك/ }).closest("form")!;

  fireEvent.submit(form);
  fireEvent.submit(form);
  resolveQuote();

  await waitFor(() => assert.equal(createMock.mock.calls.length, 1));
  assert.equal(quoteMock.mock.calls.length, 1);
});

test("create subscription mutation invalidates required customer workflow queries", async () => {
  createMock.mockResolvedValue({ data: { id: "subscription-1" } });
  const { queryClient, invalidateSpy } = renderWithClient(<MutationProbe />);

  await waitFor(() => assert.equal(createMock.mock.calls.length, 1));

  const invalidatedKeys = invalidateSpy.mock.calls.map(([arg]) => arg.queryKey);
  assert.deepEqual(invalidatedKeys, [
    ["subscriptions-list"],
    ["subscriptions-summary"],
    ["subscriptions-search"],
    ["users"],
    ["user-details", "customer-1"],
    ["user-subscriptions", "customer-1"],
  ]);

  queryClient.clear();
});

function MutationProbe() {
  const mutation = useCreateSubscriptionMutation();

  if (!mutation.isPending && !mutation.isSuccess && !mutation.isError) {
    mutation.mutate({ userId: "customer-1" });
  }

  return null;
}
