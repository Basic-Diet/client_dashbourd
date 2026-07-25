// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OperationsQueueTable } from "../src/components/pages/operations-board/OperationsQueueTable";
import { buildKitchenV2Presentation } from "../src/lib/operationsKitchenV2Presentation";
import { normalizeOperationsQueueItem } from "../src/lib/operationsBoard";
import type { UnifiedQueueItem } from "../src/types/dashboardOpsTypes";

afterEach(() => {
  cleanup();
});

function representativePickup(): UnifiedQueueItem {
  return normalizeOperationsQueueItem({
    id: "6a621e0e183c4f40ca576372",
    source: "subscription_pickup_request",
    entityType: "subscription_pickup_request",
    entityId: "6a621e0e183c4f40ca576372",
    reference: "PICK-576372",
    status: "in_preparation",
    statusLabel: "قيد التحضير",
    mode: "pickup",
    ui: {
      label: "قيد التحضير",
      badge: "warning",
      icon: "chef-hat",
    },
    customer: {
      id: "6a621c77183c4f40ca575f78",
      name: "teaty",
      phone: "+966511111111",
    },
    fulfillment: {
      mode: "pickup",
      method: "pickup",
      type: "pickup_request",
      pickupLocationId: "main",
      pickup: {
        pickupRequestId: "6a621e0e183c4f40ca576372",
        branchId: "main",
        locationId: "main",
        branchName: "Main Branch",
        pickupWindow: null,
        pickupCodeState: "not_issued",
      },
    },
    kitchen: {
      version: "v2",
      purpose: "meal_preparation",
      financialDataIncluded: false,
      mealCount: 1,
      cards: [
        {
          cardId: "slot_1",
          slotIndex: 1,
          slotKey: "slot_1",
          type: "standard_meal",
          title: "rosemary_chicken + دجاج روزماري + رز أبيض",
          titleI18n: {
            ar: "rosemary_chicken + دجاج روزماري + رز أبيض",
            en: "rosemary_chicken + Rosemary Chicken + White Rice",
          },
          badge: "وجبة",
          quantity: 1,
          notes: null,
          imageUrl: null,
          lines: [
            "البروتين المطلوب: rosemary_chicken - 100 جم",
            "الكارب: رز أبيض - 150 جم",
          ],
          sections: [],
          components: {
            product: {
              id: "6a62197579ee075a57f70114",
              key: "rosemary_chicken",
              name: "rosemary_chicken + دجاج روزماري + رز أبيض",
              nameI18n: {
                ar: "rosemary_chicken + دجاج روزماري + رز أبيض",
                en: "rosemary_chicken + Rosemary Chicken + White Rice",
              },
              quantity: 1,
            },
            protein: {
              id: "6a62197579ee075a57f70114",
              key: "rosemary_chicken",
              name: "rosemary_chicken",
              nameI18n: {
                ar: "rosemary_chicken",
                en: "rosemary_chicken",
              },
              grams: 100,
              quantity: 1,
            },
            carbs: [
              {
                id: "6a62198179ee075a57f7013e",
                key: "white_rice",
                name: "رز أبيض",
                nameI18n: {
                  ar: "رز أبيض",
                  en: "White Rice",
                },
                grams: 150,
                quantity: 1,
              },
              {
                id: "carb-2",
                key: "sweet_potato",
                nameI18n: { ar: "بطاطا حلوة", en: "Sweet Potato" },
                grams: 80,
                quantity: 1,
              },
            ],
            salad: null,
          },
          warnings: [],
        },
      ],
      addonGroups: [
        {
          label: "الإضافات",
          labelI18n: { ar: "الإضافات", en: "Add-ons" },
          items: [
            {
              productId: "addon-juice",
              nameI18n: { ar: "اشتراك العصير والمشروبات" },
              quantity: 1,
            },
          ],
        },
        {
          label: "الإضافات",
          labelI18n: { ar: "الإضافات", en: "Add-ons" },
          items: [
            {
              productId: "addon-snack",
              nameI18n: { ar: "اشتراك السناك" },
              quantity: 1,
            },
          ],
        },
        {
          label: "الإضافات",
          labelI18n: { ar: "الإضافات", en: "Add-ons" },
          items: [
            {
              productId: "addon-snack-duplicate",
              nameI18n: { ar: "اشتراك السناك" },
              quantity: 2,
            },
          ],
        },
      ],
      warnings: [],
    },
    allowedActions: [
      {
        id: "ready_for_pickup",
        label: "جاهز للاستلام",
        color: "green",
        icon: "shopping-bag",
        endpoint: "/api/dashboard/ops/actions/ready_for_pickup",
        method: "POST",
        requiresReason: false,
      },
      {
        id: "cancel",
        label: "إلغاء",
        color: "red",
        icon: "x-circle",
        endpoint: "/api/dashboard/ops/actions/cancel",
        method: "POST",
        requiresReason: true,
      },
    ],
    timestamps: {
      createdAt: "2026-07-23T13:58:38.654Z",
      updatedAt: "2026-07-23T13:58:38.699Z",
      preparedAt: "2026-07-23T13:58:38.653Z",
    },
    subscriptionId: "6a621da9183c4f40ca576081",
    paymentStatus: "reserved",
    pickup: {
      branchId: "main",
      branchName: "Main Branch",
      pickupWindow: null,
      pickupCodeState: "not_issued",
    },
  });
}

function renderOperations(items = [representativePickup()], onAction = vi.fn()) {
  render(
    <OperationsQueueTable
      items={items}
      isPending={false}
      pendingActions={{}}
      onAction={onAction}
    />
  );
  return onAction;
}

describe("subscription pickup operations card", () => {
  it("renders the representative pickup response as an Arabic-first operational card", async () => {
    const item = representativePickup();
    const presentation = buildKitchenV2Presentation(item);

    expect(presentation.cards[0].title).toBe("دجاج روزماري + رز أبيض");
    expect(presentation.addonGroups).toHaveLength(1);
    expect(presentation.addonGroups[0].items).toEqual([
      expect.objectContaining({ name: "اشتراك العصير والمشروبات", quantity: 1 }),
      expect.objectContaining({ name: "اشتراك السناك", quantity: 3 }),
    ]);

    renderOperations([item]);
    const text = document.body.textContent || "";

    expect(screen.getByText("PICK-576372")).toBeInTheDocument();
    expect(screen.getAllByText("قيد التحضير").length).toBeGreaterThan(0);
    expect(text).not.toContain("in_preparation");
    expect(screen.getByText("teaty")).toBeInTheDocument();
    expect(screen.getByText("+966511111111")).toBeInTheDocument();
    expect(screen.getAllByText("Main Branch")).toHaveLength(1);
    expect(screen.getByText("غير محدد")).toBeInTheDocument();
    expect(screen.getByText("لم يصدر بعد")).toBeInTheDocument();
    expect(screen.getByText("دجاج روزماري + رز أبيض")).toBeInTheDocument();
    expect(screen.queryByText("slot_1")).not.toBeInTheDocument();
    expect(text).not.toContain("subscription_pickup_request");
    expect(text).not.toContain("6a621da9183c4f40ca576081");
    expect(text).not.toContain("addon-juice");
    expect(screen.queryByText("prepare")).not.toBeInTheDocument();
    expect(screen.queryByText("fulfill")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /عرض التفاصيل الكاملة/ }));
    const dialog = screen.getByRole("dialog");

    expect(within(dialog).getAllByText(/100/).length).toBeGreaterThan(0);
    expect(within(dialog).getAllByText(/150/).length).toBeGreaterThan(0);
    expect(within(dialog).getByText(/بطاطا حلوة/)).toBeInTheDocument();
  });

  it("uses the backend pickup code as the card identifier when it is issued", () => {
    const base = representativePickup();
    const item = normalizeOperationsQueueItem({
      ...(base.rawData as Record<string, unknown>),
      reference: "PICK-22F979",
      fulfillment: {
        mode: "pickup",
        pickup: {
          branchId: "main",
          branchName: "Main Branch",
          pickupWindow: null,
          pickupCode: "875614",
          pickupCodeState: "issued",
        },
      },
    });

    renderOperations([item]);

    const cardIdentifier = document.querySelector("article p[dir='ltr']");
    expect(cardIdentifier?.textContent).toBe("875614");
    expect(screen.getByText("PICK-22F979")).toBeInTheDocument();
  });

  it("renders only backend allowed actions and blocks duplicate pending clicks", async () => {
    const onAction = vi.fn();
    const item = representativePickup();
    const user = userEvent.setup();
    const { rerender } = render(
      <OperationsQueueTable
        items={[item]}
        isPending={false}
        pendingActions={{}}
        onAction={onAction}
      />
    );

    await user.click(screen.getByRole("button", { name: "جاهز للاستلام" }));
    rerender(
      <OperationsQueueTable
        items={[item]}
        isPending={false}
        pendingActions={{
          [item.id]: { actionId: "ready_for_pickup", label: "جاهز للاستلام" },
        }}
        onAction={onAction}
      />
    );
    await user.click(screen.getByRole("button", { name: /جار جاهز للاستلام/ }));

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "إلغاء" })).toBeDisabled();
  });
});
