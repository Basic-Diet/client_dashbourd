export interface SubscriptionTrackingMealComponent {
  id: string | null;
  name: string;
  grams?: number | null;
}

export interface SubscriptionTrackingMealItem {
  id: string;
  slotIndex: number;
  slotKey: string;
  name: string;
  type: string;
  typeLabel: string;
  quantity: number;
  isPremium: boolean;
  premiumKey?: string | null;
  protein?: SubscriptionTrackingMealComponent | null;
  carbs: SubscriptionTrackingMealComponent[];
}

export interface SubscriptionTrackingAddonItem {
  id: string;
  name: string;
  quantity: number;
  category?: string;
}

export interface SubscriptionTrackingDay {
  date: string;
  isToday: boolean;
  isPast: boolean;
  status: string;
  dayStatus: string;
  statusLabel: string;
  source: string;
  sourceLabel: string;
  calendar?: {
    dayOfMonth?: number;
    monthYearLabels?: { ar?: string; en?: string };
    fullDateLabels?: { ar?: string; en?: string };
    weekday?: { labels?: { ar?: string; en?: string } };
  } | null;
  fulfillmentMode: string;
  selectedMeals: number;
  requiredMeals: number;
  receivedMeals: number;
  reservedMeals: number;
  forfeitedMeals: number;
  releasedMeals: number;
  balanceSource: string;
  mealItems: SubscriptionTrackingMealItem[];
  addonItems: SubscriptionTrackingAddonItem[];
  notes?: string | null;
  timestamps: {
    createdAt?: string | null;
    updatedAt?: string | null;
    fulfilledAt?: string | null;
    canceledAt?: string | null;
    settledAt?: string | null;
  };
}

export interface SubscriptionTrackingSummary {
  totalMeals: number;
  consumedMeals: number;
  receivedMeals: number;
  remainingMeals: number;
  availableMeals: number;
  reservedMeals: number;
  forfeitedMeals: number;
  unconsumedMeals: number;
  progressPercent: number;
  timelineDays: number;
  deliveredDays: number;
  plannedMeals: number;
  timelineReceivedMeals: number;
  unattributedConsumedMeals: number;
  reconciliation: {
    status: "balanced" | "difference";
    authoritativeSource: string;
    consumedMeals: number;
    attributedToTimeline: number;
    difference: number;
  };
}

export interface SubscriptionTrackingData {
  contractVersion: string;
  readOnly: true;
  businessDate: string;
  generatedAt: string;
  summary: SubscriptionTrackingSummary;
  validity?: {
    startDate?: string;
    endDate?: string;
    validityEndDate?: string;
    compensationDays?: number;
    timelineExtraDays?: number;
    freezeCompensationDays?: number;
    skipCompensationDays?: number;
  } | null;
  months?: unknown[];
  days: SubscriptionTrackingDay[];
}

export interface SubscriptionTrackingResponse {
  status: boolean;
  data: SubscriptionTrackingData;
}
