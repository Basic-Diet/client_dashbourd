import type { SubscriptionMealMovement } from "@/types/subscriptionMovementProvenanceTypes";

function safeCount(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

export function formatMealCount(quantity: number): string {
  const count = safeCount(quantity);

  if (count === 1) return "وجبة واحدة";
  if (count === 2) return "وجبتان";
  if (count >= 3 && count <= 10) return `${count} وجبات`;
  return `${count} وجبة`;
}

export function manualDeductionQuantity(
  movement: Pick<SubscriptionMealMovement, "quantity" | "deductionDetails">
): number {
  const regularMeals = safeCount(movement.deductionDetails?.regularMeals);
  const premiumMeals = safeCount(movement.deductionDetails?.premiumMeals);
  const detailedTotal = safeCount(movement.deductionDetails?.totalMeals);
  const movementTotal = safeCount(movement.quantity);

  // Historical logs may contain the regular/premium split without a total field,
  // while older movement rows may only contain quantity. Taking the strongest
  // available value prevents a valid manual deduction from being displayed as 0.
  return Math.max(detailedTotal, regularMeals + premiumMeals, movementTotal);
}

export function manualDeductionDisplayLabel(quantity: number): string {
  return `تم الخصم يدويًا — ${formatMealCount(quantity)}`;
}
