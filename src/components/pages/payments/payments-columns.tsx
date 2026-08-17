import type { ColumnDef } from "@tanstack/react-table";
import type { Payment } from "@/types/paymentTypes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, EyeIcon } from "lucide-react";

const statusLabels: Record<string, { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }> = {
  paid: { label: "مدفوع", variant: "default" },
  completed: { label: "مكتمل", variant: "default" },
  pending: { label: "معلق", variant: "outline" },
  failed: { label: "فاشل", variant: "destructive" },
  refunded: { label: "مسترد", variant: "secondary" },
};

const methodLabels: Record<string, string> = {
  credit_card: "بطاقة ائتمان",
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  wallet: "المحفظة",
  moyasar: "ميسر",
  electronic_gateway: "بوابة دفع إلكتروني",
  cash: "كاش",
};

const paymentMethodLabel = (payment: Payment) => {
  const explicitLabel = payment.paymentMethodLabel;
  if (typeof explicitLabel === "string" && explicitLabel.trim()) {
    return explicitLabel.trim();
  }
  if (explicitLabel && typeof explicitLabel === "object") {
    const localized = explicitLabel.ar?.trim() || explicitLabel.en?.trim();
    if (localized) return localized;
  }
  return methodLabels[payment.method] || payment.method;
};

const typeLabels: Record<string, string> = {
  subscription_activation: "تفعيل اشتراك",
  addon_purchase: "شراء إضافات",
  delivery_fee: "رسوم توصيل",
  custom: "أخرى",
};

export const paymentsColumns: ColumnDef<Payment>[] = [
  {
    id: "index",
    header: "#",
    cell: ({ row }) => (
      <span className="font-medium text-muted-foreground">{row.index + 1}</span>
    ),
    enableHiding: false,
    size: 50,
  },
  {
    accessorKey: "reference",
    header: "المرجع",
    cell: ({ row }) => (
      <span className="font-mono text-sm font-semibold">
        {row.original.reference}
      </span>
    ),
  },
  {
    accessorKey: "customerName",
    header: "العميل",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.customerName}</span>
    ),
  },
  {
    accessorKey: "amount",
    header: "المبلغ",
    cell: ({ row }) => (
      <span className="font-bold tabular-nums">
        {row.original.amount.toLocaleString("ar-SA", {
          style: "currency",
          currency: "SAR",
        })}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "الحالة",
    cell: ({ row }) => {
      const status = row.original.status;
      const config = statusLabels[status] || { label: status, variant: "outline" as const };
      return <Badge variant={config.variant}>{config.label}</Badge>;
    },
  },
  {
    accessorKey: "method",
    header: "طريقة الدفع",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <CreditCard className="size-4 text-muted-foreground" />
        <span className="text-muted-foreground">
          {paymentMethodLabel(row.original)}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "type",
    header: "النوع",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {typeLabels[row.original.type] || row.original.type}
      </span>
    ),
  },
  {
    accessorKey: "date",
    header: "التاريخ",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {new Date(row.original.date).toLocaleDateString("ar-EG", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </span>
    ),
  },
  {
    id: "actions",
    header: "الإجراءات",
    cell: () => (
      <Button variant="ghost" size="sm">
        <EyeIcon className="ml-1 size-4" />
        عرض
      </Button>
    ),
    enableHiding: false,
  },
];
