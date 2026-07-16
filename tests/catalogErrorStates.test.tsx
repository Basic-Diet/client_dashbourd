// @vitest-environment jsdom

import assert from "node:assert/strict";
import type { ReactElement } from "react";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, type UseFormReturn } from "react-hook-form";
import { afterEach, test, vi } from "vitest";

import { AddonsSection } from "../src/components/pages/subscriptions/create/AddonsSection";
import { DeliverySection } from "../src/components/pages/subscriptions/create/DeliverySection";
import { PlanSelectionSection } from "../src/components/pages/subscriptions/create/PlanSelectionSection";
import { PremiumMealsSection } from "../src/components/pages/subscriptions/create/PremiumMealsSection";
import type { CreateSubscriptionSchemaType } from "../src/lib/validations/createSubscriptionSchema";

const packageRefetch = vi.hoisted(() => vi.fn());
const addonsRefetch = vi.hoisted(() => vi.fn());
const deliveryRefetch = vi.hoisted(() => vi.fn());
const premiumRefetch = vi.hoisted(() => vi.fn());

const queryState = vi.hoisted(() => ({
  packages: {
    data: undefined,
    isLoading: false,
    isError: true,
    error: new Error("packages failed"),
    refetch: packageRefetch,
  },
  addons: {
    data: undefined,
    isLoading: false,
    isError: true,
    error: new Error("addons failed"),
    refetch: addonsRefetch,
  },
  delivery: {
    data: undefined,
    isLoading: false,
    isError: true,
    error: new Error("delivery failed"),
    refetch: deliveryRefetch,
  },
  premium: {
    data: undefined,
    isLoading: false,
    isError: true,
    error: new Error("premium failed"),
    refetch: premiumRefetch,
  },
}));

vi.mock("@/hooks/usePackagesQuery", () => ({
  usePackagesQuery: () => queryState.packages,
}));

vi.mock("@/hooks/useAddonsQuery", () => ({
  useAddonsQuery: () => queryState.addons,
}));

vi.mock("@/hooks/useDeliveryOptionsQuery", () => ({
  useDeliveryOptionsQuery: () => queryState.delivery,
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: () => queryState.premium,
  };
});

function renderSection(
  renderChild: (form: UseFormReturn<CreateSubscriptionSchemaType>) => ReactElement
) {
  function Harness() {
    const form = useForm<CreateSubscriptionSchemaType>({
      defaultValues: {
        userId: "customer-1",
        planId: "",
        grams: 0,
        mealsPerDay: 0,
        startDate: "",
        premiumItems: [],
        addons: [],
        delivery: {
          type: "delivery",
          zoneId: "",
          pickupLocationId: "",
          address: {
            label: "",
            city: "",
            district: "",
            street: "",
            building: "",
          },
          slot: {
            type: "delivery",
            window: "",
            slotId: "",
          },
        },
      },
    });

    return (
      <>
        {renderChild(form)}
        <output data-testid="plan-error">
          {form.formState.errors.planId?.message}
        </output>
        <output data-testid="delivery-error">
          {form.formState.errors.delivery?.type?.message}
        </output>
      </>
    );
  }

  return render(<Harness />);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test("package failure shows Arabic error, retry, and blocks submission through form error", async () => {
  renderSection((form) => <PlanSelectionSection form={form} />);

  const alert = screen.getByRole("alert");
  assert(alert);
  assert(within(alert).getByText(/تعذر تحميل الباقات/));
  await waitFor(() =>
    assert.match(screen.getByTestId("plan-error").textContent || "", /تعذر تحميل الباقات/)
  );

  await userEvent.click(screen.getByRole("button", { name: /إعادة المحاولة/ }));
  assert.equal(packageRefetch.mock.calls.length, 1);
});

test("delivery failure shows Arabic error, retry, and blocks submission through form error", async () => {
  renderSection((form) => <DeliverySection form={form} />);

  assert(screen.getByRole("alert"));
  assert(screen.getByText(/تعذر تحميل بيانات التوصيل والاستلام/));
  await waitFor(() =>
    assert.match(screen.getByTestId("delivery-error").textContent || "", /تعذر تحميل إعدادات التوصيل/)
  );

  await userEvent.click(screen.getByRole("button", { name: /إعادة المحاولة/ }));
  assert.equal(deliveryRefetch.mock.calls.length, 1);
});

test("add-on failure is shown as an error instead of an empty catalog", async () => {
  renderSection((form) => <AddonsSection form={form} />);

  assert(screen.getByRole("alert"));
  assert(screen.getByText(/تعذر تحميل الإضافات/));
  assert.equal(screen.queryByText(/لا توجد إضافات متاحة/), null);

  await userEvent.click(screen.getByRole("button", { name: /إعادة المحاولة/ }));
  assert.equal(addonsRefetch.mock.calls.length, 1);
});

test("premium-meal failure is shown as an error", async () => {
  renderSection((form) => <PremiumMealsSection form={form} />);

  assert(screen.getByRole("alert"));
  assert(screen.getByText(/تعذر تحميل الوجبات المميزة/));

  await userEvent.click(screen.getByRole("button", { name: /إعادة المحاولة/ }));
  assert.equal(premiumRefetch.mock.calls.length, 1);
});
