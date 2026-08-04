import type { SubscriptionPaymentBucket } from "@/features/accounting/accountingTypes";

declare module "@/features/accounting/accountingTypes" {
  interface SubscriptionPaymentDailyReportData {
    bySourceChannel?: SubscriptionPaymentBucket[] | null;
    byPaymentProvider?: SubscriptionPaymentBucket[] | null;
  }

  interface SubscriptionPaymentMonthlyReportData {
    bySourceChannel?: SubscriptionPaymentBucket[] | null;
    byPaymentProvider?: SubscriptionPaymentBucket[] | null;
  }
}

export {};
