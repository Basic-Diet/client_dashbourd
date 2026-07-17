import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  PackageCheck,
  Store,
  Truck,
  User,
  Utensils,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildKitchenV2Presentation } from "@/lib/operationsKitchenV2Presentation";
import { buildOperationsOrderPresentation } from "@/lib/operationsOrderPresentation";
import type { UnifiedQueueItem } from "@/types/dashboardOpsTypes";
import { isOneTimeOrder, isPickupRequest } from "@/types/dashboardOpsTypes";
import { OperationsKitchenAddonGroups } from "./OperationsKitchenAddonGroups";
import { OperationsKitchenV2Card } from "./OperationsKitchenV2Card";
import { OperationsKitchenWarnings } from "./OperationsKitchenWarnings";
import { OperationsOrderItemSummary } from "./OperationsOrderItemSummary";
import { OperationsPricingSummary } from "./OperationsPricingSummary";
import { OperationsSelectionGroups } from "./OperationsSelectionGroups";

interface OperationsOrderDetailsDialogProps {
  item: UnifiedQueueItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DetailRow = {
  label: string;
  value: unknown;
  ltr?: boolean;
  important?: boolean;
};

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function text(value: unknown, fallback = ""): string {
  if (!hasValue(value)) return fallback;
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map((entry) => text(entry)).filter(Boolean).join("، ");
  return fallback;
}

function customerName(item: UnifiedQueueItem) {
  return item.customer?.name || item.customer?.phone || "عميل";
}

function sourceLabel(item: UnifiedQueueItem) {
  if (isPickupRequest(item)) return "استلام من الفرع";
  if (isOneTimeOrder(item)) return "طلب فردي";
  return "اشتراك يومي";
}

function modeLabel(mode: string) {
  return mode === "delivery" ? "توصيل" : "استلام";
}

function pickupInfo(item: UnifiedQueueItem) {
  const pickup = item.fulfillment?.pickup || item.pickup || {};
  const branch =
    typeof pickup.branchName === "string"
      ? pickup.branchName
      : pickup.branchName?.ar || pickup.branchName?.en || pickup.branchId || pickup.locationId || "-";
  return {
    branch,
    window: pickup.pickupWindow || item.fulfillment?.deliverySlot || "-",
    code: pickup.pickupCode,
    codeState: pickup.pickupCodeState,
  };
}

function deliveryInfo(item: UnifiedQueueItem) {
  const delivery = item.fulfillment?.delivery;
  return {
    address: delivery?.addressSummary || "-",
    window: delivery?.window || delivery?.deliveryWindow || item.fulfillment?.deliverySlot || "-",
    status: delivery?.status,
  };
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        {title}
      </div>
      {children}
    </section>
  );
}

function DetailGrid({ rows }: { rows: DetailRow[] }) {
  const visibleRows = rows.filter((row) => hasValue(row.value));

  if (!visibleRows.length) {
    return <p className="text-sm text-muted-foreground">لا توجد بيانات مهمة للعرض.</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {visibleRows.map((row) => (
        <div
          key={row.label}
          className={`min-w-0 rounded-xl px-3 py-2 ${
            row.important ? "border border-primary/20 bg-primary/5" : "bg-muted/35"
          }`}
        >
          <p className="text-xs font-medium text-muted-foreground">{row.label}</p>
          <p className="mt-1 break-words text-sm font-semibold" dir={row.ltr ? "ltr" : "rtl"}>
            {text(row.value)}
          </p>
        </div>
      ))}
    </div>
  );
}

function ActionsSummary({ item }: { item: UnifiedQueueItem }) {
  if (!item.allowedActions?.length) {
    return <p className="text-sm text-muted-foreground">لا توجد إجراءات متاحة حالياً.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {item.allowedActions.map((action) => (
        <Badge key={action.id} variant={action.disabled ? "outline" : "secondary"} className="rounded-md">
          {action.label}
          {action.disabled ? " - غير متاح" : ""}
        </Badge>
      ))}
    </div>
  );
}

function KitchenDetails({ item }: { item: UnifiedQueueItem }) {
  const kitchen = buildKitchenV2Presentation(item);

  if (!kitchen.supported) {
    return (
      <div className="flex gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-900 dark:text-amber-300">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{kitchen.unsupportedMessage}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DetailGrid
        rows={[
          { label: "عدد الوجبات", value: kitchen.mealCount, important: true },
          { label: "عدد الكروت", value: kitchen.cardCount },
          { label: "الإضافات", value: kitchen.addonItemCount },
        ]}
      />
      {kitchen.cards.map((card) => (
        <OperationsKitchenV2Card key={card.key} card={card} />
      ))}
      <OperationsKitchenAddonGroups groups={kitchen.addonGroups} />
      <OperationsKitchenWarnings warnings={kitchen.warningMessages} />
    </div>
  );
}

function OrderItemDetails({ item }: { item: UnifiedQueueItem }) {
  if (!isOneTimeOrder(item)) return null;
  const presentation = buildOperationsOrderPresentation(item);

  return (
    <Section title="تفاصيل عناصر الطلب" icon={<PackageCheck className="h-4 w-4" />}>
      <div className="space-y-4">
        {presentation.items.map((orderItem) => (
          <div key={orderItem.key} className="space-y-3">
            <OperationsOrderItemSummary item={orderItem} showPaidSelections={false} />
            <OperationsSelectionGroups groups={orderItem.selectionGroups} />
          </div>
        ))}
        {!presentation.items.length ? (
          <p className="rounded-xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
            لا توجد أصناف واضحة في الطلب الحالي.
          </p>
        ) : null}
        <OperationsPricingSummary pricing={presentation.pricing} />
      </div>
    </Section>
  );
}

export function OperationsOrderDetailsDialog({
  item,
  open,
  onOpenChange,
}: OperationsOrderDetailsDialogProps) {
  if (!item) return null;

  const orderPresentation = buildOperationsOrderPresentation(item);
  const pickup = pickupInfo(item);
  const delivery = deliveryInfo(item);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="grid max-h-[92dvh] w-[calc(100%-1rem)] max-w-5xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-2xl p-0 sm:max-w-5xl"
      >
        <div className="border-b bg-muted/30 px-5 py-4 sm:px-6">
          <DialogHeader className="gap-2 pl-10 text-right">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-md">
                {sourceLabel(item)}
              </Badge>
              <Badge variant="outline" className="rounded-md">
                {modeLabel(item.mode)}
              </Badge>
              <Badge className="rounded-md">{item.statusLabel || item.status}</Badge>
            </div>
            <DialogTitle className="text-xl font-bold">تفاصيل العملية</DialogTitle>
            <DialogDescription className="text-right break-words">
              بيانات التحضير تأتي من Kitchen v2، وتفاصيل عناصر الطلب منفصلة للتسعير فقط.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="custom-scrollbar min-h-0 overflow-y-auto px-5 py-4 sm:px-6">
          <div className="grid gap-4 xl:grid-cols-2">
            <Section title="العميل وهوية العملية" icon={<User className="h-4 w-4" />}>
              <DetailGrid
                rows={[
                  { label: "الاسم", value: customerName(item), important: true },
                  { label: "الهاتف", value: item.customer?.phone, ltr: true, important: true },
                  { label: "المرجع", value: item.reference, ltr: true },
                  { label: "رقم الطلب", value: item.orderNumber, ltr: true },
                  { label: "الحالة", value: item.statusLabel || item.status },
                  { label: "المصدر", value: sourceLabel(item) },
                ]}
              />
            </Section>

            <Section
              title={item.mode === "delivery" ? "التوصيل" : "الاستلام"}
              icon={item.mode === "delivery" ? <Truck className="h-4 w-4" /> : <Store className="h-4 w-4" />}
            >
              <DetailGrid
                rows={
                  item.mode === "delivery" && item.source === "subscription"
                    ? [
                        { label: "العنوان", value: delivery.address, important: true },
                        { label: "النافذة", value: delivery.window, important: true },
                        { label: "حالة التوصيل", value: delivery.status },
                      ]
                    : [
                        { label: "الفرع", value: pickup.branch, important: true },
                        { label: "نافذة الاستلام", value: pickup.window, important: true },
                        { label: "كود الاستلام", value: pickup.code, ltr: true },
                        { label: "حالة الكود", value: pickup.codeState },
                      ]
                }
              />
            </Section>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <Section title="كروت المطبخ" icon={<Utensils className="h-4 w-4" />}>
              <KitchenDetails item={item} />
            </Section>

            <div className="space-y-4">
              <Section title="التحذيرات" icon={<AlertTriangle className="h-4 w-4" />}>
                <DetailGrid
                  rows={[
                    { label: "ملاحظات", value: item.orderSummary?.notes || item.fulfillment?.notes },
                    { label: "حساسية", value: item.orderSummary?.allergies || item.fulfillment?.allergies },
                  ]}
                />
              </Section>

              <Section title="الحالة والإجراءات" icon={<CheckCircle2 className="h-4 w-4" />}>
                <DetailGrid rows={[{ label: "الحالة الحالية", value: item.statusLabel || item.status }]} />
                <div className="mt-3">
                  <ActionsSummary item={item} />
                </div>
              </Section>

              {isOneTimeOrder(item) ? (
                <Section title="الدفع والتسعير" icon={<CreditCard className="h-4 w-4" />}>
                  <DetailGrid
                    rows={[
                      { label: "حالة الدفع", value: orderPresentation.paymentLabel, important: true },
                      { label: "الإجمالي", value: orderPresentation.totalLabel, important: true },
                    ]}
                  />
                </Section>
              ) : null}
            </div>
          </div>

          <div className="mt-4">
            <OrderItemDetails item={item} />
          </div>

          <div className="mt-4 rounded-2xl border bg-muted/20 p-4 text-xs leading-6 text-muted-foreground">
            <div className="mb-2 flex items-center gap-2 font-bold text-foreground">
              <PackageCheck className="h-4 w-4 text-primary" />
              ملاحظة تشغيلية
            </div>
            كروت المطبخ من item.kitchen.cards فقط، والإضافات من item.kitchen.addonGroups فقط.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
