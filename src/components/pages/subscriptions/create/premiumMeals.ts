export interface BuilderPremiumMeal {
  id: string;
  configId?: string | null;
  sourceId?: string | null;
  premiumKey: string;
  sourceModel?: string;
  sourceType?: string;
  kind?: string;
  selectionType?: string;
  name: { ar?: string; en?: string } | string;
  imageUrl?: string;
  extraFeeHalala?: number;
  priceHalala?: number;
  currency?: string;
  isActive?: boolean;
  availableForSubscription?: boolean;
  health?: string;
  issueCode?: string | null;
  legacy?: boolean;
}

export function isSelectablePremiumMeal(meal: BuilderPremiumMeal): boolean {
  return (
    typeof meal.premiumKey === "string" &&
    meal.premiumKey.trim().length > 0 &&
    meal.isActive !== false &&
    meal.availableForSubscription !== false &&
    (!meal.health || meal.health === "ready")
  );
}
