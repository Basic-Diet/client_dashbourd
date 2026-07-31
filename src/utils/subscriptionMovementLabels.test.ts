import { describe, expect, it } from "vitest";
import {
  formatMealCount,
  manualDeductionDisplayLabel,
} from "@/utils/subscriptionMovementLabels";

describe("subscription movement labels", () => {
  it("shows a clear manual deduction label with the deducted count", () => {
    expect(manualDeductionDisplayLabel(3)).toBe("تم الخصم يدويًا — 3 وجبات");
  });

  it("uses correct Arabic meal wording for one and two meals", () => {
    expect(formatMealCount(1)).toBe("1 وجبة");
    expect(formatMealCount(2)).toBe("2 وجبتان");
  });

  it("normalizes invalid and fractional quantities safely", () => {
    expect(manualDeductionDisplayLabel(Number.NaN)).toBe("تم الخصم يدويًا — 0 وجبات");
    expect(manualDeductionDisplayLabel(3.9)).toBe("تم الخصم يدويًا — 3 وجبات");
  });
});
