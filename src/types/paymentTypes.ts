export interface Payment {
  id: string;
  reference: string;
  customerName: string;
  amount: number;
  subtotalHalala?: number;
  discountHalala?: number;
  vatHalala?: number;
  totalHalala?: number;
  status: "pending" | "paid" | "completed" | "failed" | "refunded";
  method:
    | "credit_card"
    | "apple_pay"
    | "google_pay"
    | "wallet"
    | "moyasar"
    | "electronic_gateway"
    | "cash";
  paymentMethod?: string;
  paymentChannel?: string;
  paymentMethodLabel?: string | { ar?: string; en?: string };
  provider?: string;
  type:
    | "subscription_activation"
    | "addon_purchase"
    | "delivery_fee"
    | "one_time_order"
    | "custom";
  date: string;
  subscriptionId?: string;
  orderId?: string;
  invoiceId?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentDetails extends Payment {
  user?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  subscription?: {
    id: string;
    planName: string;
    startDate: string;
    endDate: string;
  };
  breakdown?: {
    subtotal: number;
    discount: number;
    vat: number;
    total: number;
  };
}

export interface PaymentsResponse {
  data: Payment[];
  meta: {
    currentPage: number;
    lastPage: number;
    total: number;
  };
}
