import type { DashboardStatusResponse, JsonObject, JsonValue } from "@/types/dashboardAdminTypes";

export type SubscriptionPaymentReportMode = "daily" | "monthly";

export type SubscriptionPaymentFulfillmentMethod = "all" | "pickup" | "delivery";

export interface SubscriptionPaymentDailyParams {
  date?: string;
  fulfillmentMethod?: SubscriptionPaymentFulfillmentMethod;
  includeDetails?: boolean | string;
}

export interface SubscriptionPaymentMonthlyParams {
  month?: string;
  fulfillmentMethod?: SubscriptionPaymentFulfillmentMethod;
  includeDetails?: boolean | string;
}

export interface SubscriptionPaymentReportFilters {
  date?: string | null;
  month?: string | null;
  fulfillmentMethod?: SubscriptionPaymentFulfillmentMethod | string | null;
  fulfillmentMethodLabelAr?: string | null;
  includeDetails?: boolean | null;
}

export interface SubscriptionPaymentDashboardCard {
  key?: string | null;
  titleAr?: string | null;
  labelAr?: string | null;
  value?: string | number | null;
  valueAr?: string | null;
  valueHalala?: number | null;
  valueSar?: number | null;
  valueFormattedAr?: string | null;
  amountHalala?: number | null;
  amountSar?: number | null;
  amountFormattedAr?: string | null;
  count?: number | null;
  countLabelAr?: string | null;
  descriptionAr?: string | null;
  subtitleAr?: string | null;
  tone?: string | null;
  icon?: string | null;
}

export interface SubscriptionPaymentWarning {
  code?: string | null;
  messageAr?: string | null;
  message?: string | null;
  severity?: "info" | "warning" | "error" | string | null;
}

export interface SubscriptionPaymentReconciliation {
  status?: string | null;
  statusLabelAr?: string | null;
  isBalanced?: boolean | null;
  differenceHalala?: number | null;
  differenceFormattedAr?: string | null;
  expectedHalala?: number | null;
  expectedFormattedAr?: string | null;
  actualHalala?: number | null;
  actualFormattedAr?: string | null;
  noteAr?: string | null;
}

export interface SubscriptionPaymentBucket {
  key?: string | null;
  labelAr?: string | null;
  count?: number | null;
  customersCount?: number | null;
  uniqueCustomersCount?: number | null;
  totalHalala?: number | null;
  totalSar?: number | null;
  totalFormattedAr?: string | null;
  netBeforeVatHalala?: number | null;
  netBeforeVatFormattedAr?: string | null;
  vatHalala?: number | null;
  vatFormattedAr?: string | null;
}

export interface SubscriptionPaymentCollector {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  roleLabelAr?: string | null;
}

export interface SubscriptionPricingSnapshot {
  storedTotalFormattedAr?: string | null;
  storedTotalHalala?: number | null;
  basePlanHalala?: number | null;
  basePlanFormattedAr?: string | null;
  discountHalala?: number | null;
  discountFormattedAr?: string | null;
  deliveryFeeHalala?: number | null;
  deliveryFeeFormattedAr?: string | null;
  vatHalala?: number | null;
  vatFormattedAr?: string | null;
  [key: string]: JsonValue | undefined;
}

export interface SubscriptionPaymentReportItem {
  movementId?: string | null;
  movementType?: "collection" | "refund" | string | null;
  movementTypeLabelAr?: string | null;
  paymentId?: string | null;
  paymentReference?: string | null;
  subscriptionId?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  planId?: string | null;
  planNameAr?: string | null;
  paymentType?: string | null;
  paymentTypeLabelAr?: string | null;
  paymentMethod?: "cash" | "card" | "bank_transfer" | "unknown" | string | null;
  paymentMethodLabelAr?: string | null;
  legacyPaymentMethod?: string | null;
  legacyPaymentMethodLabelAr?: string | null;
  paymentMethodClassificationSource?: string | null;
  paymentMethodClassificationSourceAr?: string | null;
  provider?: string | null;
  providerLabelAr?: string | null;
  sourceChannel?: "app" | "dashboard" | "unknown" | string | null;
  sourceChannelLabelAr?: string | null;
  paymentProvider?: "moyasar" | "manual_gateway" | "none" | "unknown" | string | null;
  paymentProviderLabelAr?: string | null;
  status?: string | null;
  statusLabelAr?: string | null;
  amountHalala?: number | null;
  amountSar?: number | null;
  amountFormattedAr?: string | null;
  grossCollectionHalala?: number | null;
  grossCollectionFormattedAr?: string | null;
  refundsHalala?: number | null;
  refundsFormattedAr?: string | null;
  netMovementHalala?: number | null;
  netMovementFormattedAr?: string | null;
  vatIncluded?: boolean | null;
  vatPercentage?: number | null;
  vatHalala?: number | null;
  vatSar?: number | null;
  vatFormattedAr?: string | null;
  refundVatHalala?: number | null;
  refundVatFormattedAr?: string | null;
  netBeforeVatHalala?: number | null;
  netBeforeVatSar?: number | null;
  netBeforeVatFormattedAr?: string | null;
  vatCalculationSource?: string | null;
  vatCalculationSourceAr?: string | null;
  fulfillmentMethod?: "pickup" | "delivery" | string | null;
  fulfillmentMethodLabelAr?: string | null;
  subscriptionStatus?: string | null;
  subscriptionStatusLabelAr?: string | null;
  subscriptionStartDate?: string | null;
  subscriptionEndDate?: string | null;
  selectedGrams?: number | null;
  selectedMealsPerDay?: number | null;
  totalMeals?: number | null;
  pickupLocationId?: string | null;
  deliveryZoneName?: string | null;
  gatewayUsed?: boolean | null;
  gatewayUsedLabelAr?: string | null;
  recordingMode?: string | null;
  recordingModeLabelAr?: string | null;
  source?: string | null;
  providerInvoiceId?: string | null;
  providerPaymentId?: string | null;
  collectedBy?: SubscriptionPaymentCollector | null;
  businessDate?: string | null;
  businessDateLabelAr?: string | null;
  paidAt?: string | null;
  paidAtLabelAr?: string | null;
  refundId?: string | null;
  providerRefundId?: string | null;
  refundStatus?: string | null;
  refundStatusLabelAr?: string | null;
  refundedAt?: string | null;
  refundedAtLabelAr?: string | null;
  countedInTotals?: boolean | null;
  createdAt?: string | null;
  createdAtLabelAr?: string | null;
  accountingTreatmentAr?: string | null;
  needsReview?: boolean | null;
  reviewReasonsAr?: string[] | null;
  subscriptionPricing?: SubscriptionPricingSnapshot | null;
  payment?: JsonObject | null;
  metadata?: JsonObject | null;
}

export interface SubscriptionPaymentSummary {
  totalPaymentsCount?: number | null;
  uniqueCustomersCount?: number | null;
  totalHalala?: number | null;
  totalSar?: number | null;
  totalFormattedAr?: string | null;
  grossCollectionHalala?: number | null;
  grossCollectionFormattedAr?: string | null;
  cashCount?: number | null;
  cashCustomersCount?: number | null;
  cashTotalHalala?: number | null;
  cashTotalFormattedAr?: string | null;
  visaCount?: number | null;
  visaCustomersCount?: number | null;
  visaTotalHalala?: number | null;
  visaTotalFormattedAr?: string | null;
  unknownCount?: number | null;
  unknownTotalHalala?: number | null;
  unknownTotalFormattedAr?: string | null;
  netBeforeVatHalala?: number | null;
  netBeforeVatFormattedAr?: string | null;
  vatHalala?: number | null;
  vatFormattedAr?: string | null;
  refundsHalala?: number | null;
  refundsFormattedAr?: string | null;
  refundsTrackingStatus?: string | null;
  refundsTrackingStatusAr?: string | null;
  refundsTrackingNoteAr?: string | null;
  refundsCount?: number | null;
  netCollectionHalala?: number | null;
  netCollectionFormattedAr?: string | null;
  salesBeforeVatHalala?: number | null;
  salesBeforeVatFormattedAr?: string | null;
  refundBeforeVatHalala?: number | null;
  refundBeforeVatFormattedAr?: string | null;
  salesVatHalala?: number | null;
  salesVatFormattedAr?: string | null;
  refundVatHalala?: number | null;
  refundVatFormattedAr?: string | null;
  netVatHalala?: number | null;
  netVatFormattedAr?: string | null;
  cardCount?: number | null;
  cardCustomersCount?: number | null;
  cardTotalHalala?: number | null;
  cardTotalFormattedAr?: string | null;
  moyasarCount?: number | null;
  moyasarCustomersCount?: number | null;
  moyasarTotalHalala?: number | null;
  moyasarTotalFormattedAr?: string | null;
  reviewItemsCount?: number | null;
  cancelledSubscriptionsCount?: number | null;
}

export interface SubscriptionPaymentDailyBreakdownItem {
  businessDate?: string | null;
  businessDateLabelAr?: string | null;
  paymentsCount?: number | null;
  totalPaymentsCount?: number | null;
  totalHalala?: number | null;
  totalFormattedAr?: string | null;
  grossCollectionHalala?: number | null;
  grossCollectionFormattedAr?: string | null;
  refundsHalala?: number | null;
  refundsFormattedAr?: string | null;
  netCollectionHalala?: number | null;
  netCollectionFormattedAr?: string | null;
  cashTotalHalala?: number | null;
  cashTotalFormattedAr?: string | null;
  visaTotalHalala?: number | null;
  visaTotalFormattedAr?: string | null;
  moyasarTotalHalala?: number | null;
  moyasarTotalFormattedAr?: string | null;
}

export interface SubscriptionPaymentMonthlyStatistics {
  daysWithPayments?: number | null;
  averageDailyHalala?: number | null;
  averageDailyFormattedAr?: string | null;
  highestDay?: SubscriptionPaymentDailyBreakdownItem | null;
  lowestDay?: SubscriptionPaymentDailyBreakdownItem | null;
}

export interface SubscriptionPaymentAccountingPolicy {
  basis?: string | null;
  basisDescription?: string | null;
  vatTreatment?: string | null;
  cancellationTreatment?: string | null;
  paymentMethodTreatment?: string | null;
  refundTreatment?: string | null;
}

interface SubscriptionPaymentReportBase {
  reportTypeLabelAr?: string | null;
  titleAr?: string | null;
  locale?: string | null;
  timezone?: string | null;
  timezoneLabelAr?: string | null;
  currency?: string | null;
  currencyLabelAr?: string | null;
  moneyUnit?: string | null;
  moneyUnitLabelAr?: string | null;
  filters?: SubscriptionPaymentReportFilters | null;
  period?: string | null;
  summary?: SubscriptionPaymentSummary | null;
  dashboardCards?: SubscriptionPaymentDashboardCard[] | null;
  byPaymentMethod?: SubscriptionPaymentBucket[] | null;
  byFulfillmentMethod?: SubscriptionPaymentBucket[] | null;
  bySubscriptionStatus?: SubscriptionPaymentBucket[] | null;
  byPaymentType?: SubscriptionPaymentBucket[] | null;
  bySourceChannel?: SubscriptionPaymentBucket[] | null;
  byPaymentProvider?: SubscriptionPaymentBucket[] | null;
  reconciliation?: SubscriptionPaymentReconciliation | null;
  warnings?: SubscriptionPaymentWarning[] | null;
  items?: SubscriptionPaymentReportItem[] | null;
  accountingPolicyAr?: SubscriptionPaymentAccountingPolicy | null;
  generatedAt?: string | null;
  generatedAtLabelAr?: string | null;
}

export interface SubscriptionPaymentDailyReportData
  extends SubscriptionPaymentReportBase {
  reportType: "daily";
  businessDate?: string | null;
  businessDateLabelAr?: string | null;
}

export interface SubscriptionPaymentMonthlyReportData
  extends SubscriptionPaymentReportBase {
  reportType: "monthly";
  businessMonth?: string | null;
  businessMonthLabelAr?: string | null;
  statistics?: SubscriptionPaymentMonthlyStatistics | null;
  dailyBreakdown?: SubscriptionPaymentDailyBreakdownItem[] | null;
}

export type SubscriptionPaymentReportData =
  | SubscriptionPaymentDailyReportData
  | SubscriptionPaymentMonthlyReportData;

export type SubscriptionPaymentDailyReportResponse =
  DashboardStatusResponse<SubscriptionPaymentDailyReportData>;

export type SubscriptionPaymentMonthlyReportResponse =
  DashboardStatusResponse<SubscriptionPaymentMonthlyReportData>;
