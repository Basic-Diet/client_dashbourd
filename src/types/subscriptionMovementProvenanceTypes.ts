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
  actor: MealMovementActor;
  status: string;
  reference: {
    type: string;
    id: string | null;
  };
  mealItems: SubscriptionTrackingMealItem[];
  allocationKeys: string[];
  operations: MealMovementOperation[];
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
  difference: number;
  consumption: {
    delivery: number;
    branchPickup: number;
    dashboardManual: number;
    consumedWithoutPreparation: number;
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
