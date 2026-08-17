import { describe, expect, it } from "vitest";
import {
  formatMealCount,
  manualDeductionDisplayLabel,
  manualDeductionQuantity,
} from "@/utils/subscriptionMovementLabels";

describe("subscription movement labels", () => {
  it("shows a clear manual deduction label with the deducted count", () => {
    expect(manualDeductionDisplayLabel(3)).toBe("تم الخصم يدويًا — 3 وجبات");
  });

  it("uses readable Arabic meal wording", () => {
    expect(formatMealCount(1)).toBe("وجبة واحدة");
    expect(formatMealCount(2)).toBe("وجبتان");
    expect(formatMealCount(3)).toBe("3 وجبات");
    expect(formatMealCount(90)).toBe("90 وجبة");
  });

  it("normalizes invalid and fractional quantities safely", () => {
    expect(manualDeductionDisplayLabel(Number.NaN)).toBe("تم الخصم يدويًا — 0 وجبة");
    expect(manualDeductionDisplayLabel(3.9)).toBe("تم الخصم يدويًا — 3 وجبات");
  });

  it("recovers the correct total from old manual deduction shapes", () => {
    expect(manualDeductionQuantity({
      quantity: 0,
      deductionDetails: {
        regularMeals: 3,
        premiumMeals: 0,
        totalMeals: 0,
        addons: [],
        before: {
          remainingRegularMeals: 90,
          remainingPremiumMeals: 0,
          remainingMeals: 90,
        },
        after: {
          remainingRegularMeals: 87,
          remainingPremiumMeals: 0,
          remainingMeals: 87,
        },
        reasonCode: "cashier_walk_in",
        reasonLabel: "صرف مباشر للعميل من الفرع",
        notes: "",
        businessDate: "2026-07-31",
        fulfillmentContext: {
          code: "pickup",
          label: "استلام من الفرع",
        },
      },
    })).toBe(3);
  });
});
