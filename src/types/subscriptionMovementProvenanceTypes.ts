import type {
  SubscriptionTrackingData,
  SubscriptionTrackingMealItem,
} from "@/types/subscriptionTrackingTypes";

export type MealMovementConfidence = "exact" | "derived" | "unknown";
export type MealMovementBalanceEffect = "reserved" | "consumed" | "forfeited";

export interface MealMovementActor {
  id: string | null;
  role: string | null;
  email: string | null;
}

export interface MealMovementOperation {
  action: string;
  label: string;
  actor: MealMovementActor;
  at: string | null;
  fromStatus?: string | null;
  toStatus?: string | null;
  note?: string | null;
  evidence: string;
}

export interface ManualDeductionBalanceSnapshot {
  remainingRegularMeals: number | null;
  remainingPremiumMeals: number | null;
  remainingMeals: number | null;
}

export interface ManualDeductionMovementDetails {
  regularMeals: number;
  premiumMeals: number;
  totalMeals: number;
  addons: Array<{
    addonId: string | null;
    qty: number;
    remainingBefore: number | null;
    remainingAfter: number | null;
  }>;
  before: ManualDeductionBalanceSnapshot;
  after: ManualDeductionBalanceSnapshot;
  reasonCode: string;
  reasonLabel: string;
  notes: string;
  businessDate: string | null;
  fulfillmentContext: {
    code: string;
    label: string;
  };
}

export interface SubscriptionMealMovement {
  id: string;
  type: "reservation" | "consumption" | "manual_deduction" | "forfeiture";
  balanceEffect: MealMovementBalanceEffect;
  quantity: number;
  date: string | null;
  occurredAt: string | null;
  sourceCode: string;
  sourceLabel: string;
  selection: {
    code: "mobile_app" | "dashboard" | "unknown" | "not_applicable" | string;
    label: string;
    role: string | null;
  };
  completion: {
    code: string;
    label: string;
  };
  fulfillmentMode: string | null;
  fulfillmentContext?: {
    code: string;
    label: string;
  } | null;
  actor: MealMovementActor;
  status: string;
  reference: {
    type: string;
    id: string | null;
  };
  mealItems: SubscriptionTrackingMealItem[];
  allocationKeys: string[];
  operations: MealMovementOperation[];
  deductionDetails?: ManualDeductionMovementDetails | null;
  reasonCode?: string | null;
  reasonLabel?: string | null;
  reason?: string | null;
  notes?: string | null;
  evidence: string[];
  confidence: MealMovementConfidence;
}

export interface SubscriptionMealMovementCoverage {
  status: "complete" | "partial";
  balanceConsumedMeals: number;
  representedMeals: number;
  attributedMeals: number;
  exactMeals: number;
  derivedMeals: number;
  unknownMeals: number;
  reservationMeals: number;
  forfeitureMeals?: number;
  difference: number;
  consumption: {
    delivery: number;
    branchPickup: number;
    dashboardManual: number;
    consumedWithoutPreparation: number;
    noShow?: number;
    canceled?: number;
    other: number;
    unknown: number;
  };
  selection: {
    mobileApp: number;
    dashboard: number;
    unknown: number;
    notApplicable: number;
  };
}

export interface SubscriptionMealMovementProvenance {
  contractVersion: string;
  readOnly: true;
  coverage: SubscriptionMealMovementCoverage;
  movements: SubscriptionMealMovement[];
}

export interface SubscriptionTrackingDataWithProvenance extends SubscriptionTrackingData {
  provenance?: SubscriptionMealMovementProvenance;
}
