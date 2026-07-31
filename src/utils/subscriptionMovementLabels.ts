export function formatMealCount(quantity: number): string {
  const count = Math.max(0, Math.floor(Number(quantity) || 0));
  const noun = count === 1 ? "وجبة" : count === 2 ? "وجبتان" : "وجبات";
  return `${count} ${noun}`;
}

export function manualDeductionDisplayLabel(quantity: number): string {
  return `تم الخصم يدويًا — ${formatMealCount(quantity)}`;
}
