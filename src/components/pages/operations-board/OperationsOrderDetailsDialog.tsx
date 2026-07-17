import type { ReactNode } from "react";
import {
  AlertTriangle,
  CalendarDays,
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
import { buildOperationsOrderPresentation } from "@/lib/operationsOrderPresentation";
import type { UnifiedQueueItem } from "@/types/dashboardOpsTypes";
import { isOneTimeOrder, isPickupRequest } from "@/types/dashboardOpsTypes";
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

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as RecordValue)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

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

  const record = asRecord(value);
  if (!record) return fallback;

  const name = asRecord(record.name);
  const display = asRecord(record.display);
  return text(
    record.displayName ||
      record.ar ||
      record.en ||
      name?.ar ||
      name?.en ||
      display?.ar ||
      display?.en ||
      record.label ||
      record.title ||
      record.key ||
      record.id,
    fallback
  );
}

function sourceLabel(item: UnifiedQueueItem) {
  if (isPickupRequest(item)) return "استلام من الفرع";
  if (isOneTimeOrder(item)) return "طلب فردي";
  return "اشتراك يومي";
}

function modeLabel(mode: string) {
  return mode === "delivery" ? "توصيل" : "استلام";
}

function getRawRecord(item: UnifiedQueueItem) {
  return asRecord(item.rawData);
}

function getOrderSummary(item: UnifiedQueueItem) {
  return asRecord(getRawRecord(item)?.orderSummary) || item.orderSummary;
}

function getKitchen(item: UnifiedQueueItem) {
  return asRecord(getRawRecord(item)?.kitchen) || item.kitchen;
}

function getFulfillment(item: UnifiedQueueItem) {
  return asRecord(getRawRecord(item)?.fulfillment) || item.fulfillment;
}

function getPayment(item: UnifiedQueueItem) {
  return asRecord(getRawRecord(item)?.payment) || item.payment || item.paymentValidity;
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
          <p
            className="mt-1 break-words text-sm font-semibold text-foreground"
            dir={row.ltr ? "ltr" : "rtl"}
          >
            {text(row.value)}
          </p>
        </div>
      ))}
    </div>
  );
}

function getMealTitle(meal: RecordValue, index: number) {
  const product = asRecord(meal.product);
  const display = asRecord(meal.display);
  return text(
    display?.titleAr ||
      meal.productName ||
      meal.name ||
      product?.displayName ||
      product?.name ||
      meal.mealTypeLabel ||
      meal.mealType,
    `وجبة ${index + 1}`
  );
}

function MealCard({ meal, index }: { meal: unknown; index: number }) {
  const record = asRecord(meal) || {};
  const protein = asRecord(record.protein);
  const premium = asRecord(record.premium);
  const carbs = asArray(record.carbs || record.carbSelections);
  const sauces = asArray(record.sauce || record.sauces);
  const sides = asArray(record.sides);
  const options = asArray(record.options || record.selectedOptions);
  const display = asRecord(record.display);

  return (
    <div className="rounded-xl border border-border/60 bg-card/70 p-3">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{getMealTitle(record, index)}</p>
          {display?.subtitleAr || record.selectionType || record.mealType ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {text(display?.subtitleAr || record.selectionType || record.mealType)}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="rounded-md">
            ×{text(record.quantity || 1)}
          </Badge>
          {premium?.isPremium || record.isPremium ? (
            <Badge className="rounded-md bg-amber-500 text-white">
              {text(premium?.labelAr, "Premium")}
            </Badge>
          ) : null}
        </div>
      </div>

      {display?.preparationTextAr ? (
        <p className="mb-3 rounded-lg bg-primary/5 px-3 py-2 text-sm font-medium text-primary">
          {text(display.preparationTextAr)}
        </p>
      ) : null}

      <DetailGrid
        rows={[
          { label: "البروتين", value: protein?.displayName || protein?.name || record.proteinName },
          { label: "جرامات البروتين", value: protein?.grams || record.proteinGrams },
          { label: "الكارب", value: carbs.map((entry) => text(entry)).filter(Boolean).join("، ") },
          { label: "السلطة", value: record.salad || record.customSalad },
          { label: "الصوص", value: sauces.map((entry) => text(entry)).filter(Boolean).join("، ") },
          { label: "الجوانب", value: sides.map((entry) => text(entry)).filter(Boolean).join("، ") },
          { label: "الاختيارات", value: options.map((entry) => text(entry)).filter(Boolean).join("، ") },
          { label: "ملاحظات", value: record.notes },
        ]}
      />
    </div>
  );
}

function KitchenSection({ item }: { item: UnifiedQueueItem }) {
  const kitchen = getKitchen(item);
  const meals = asArray(asRecord(kitchen)?.meals).length
    ? asArray(asRecord(kitchen)?.meals)
    : item.kitchenDetails?.mealSlots?.length
      ? item.kitchenDetails.mealSlots
      : item.materializedMeals?.length
        ? item.materializedMeals
        : item.mealSlots || [];
  const addons = asArray(asRecord(kitchen)?.addons).length
    ? asArray(asRecord(kitchen)?.addons)
    : item.kitchenDetails?.addons?.length
      ? item.kitchenDetails.addons
      : item.addonSelections || [];

  return (
    <div className="space-y-4">
      {meals.length ? (
        <div className="space-y-3">
          {meals.map((meal, index) => (
            <MealCard key={index} meal={meal} index={index} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
          لا توجد تفاصيل وجبات محددة. اتبع ملاحظات الطلب أو اختيار الشيف إن وجدت.
        </div>
      )}

      {addons.length ? (
        <div className="rounded-xl border bg-muted/20 p-3">
          <p className="mb-2 text-xs font-bold text-muted-foreground">الإضافات</p>
          <div className="flex flex-wrap gap-2">
            {addons.map((addon, index) => (
              <Badge key={index} variant="secondary" className="rounded-md">
                {text(addon, `إضافة ${index + 1}`)}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PaymentNotice({ item }: { item: UnifiedQueueItem }) {
  const payment = getPayment(item);
  const record = asRecord(payment);
  const hasWarning =
    record?.pendingUnpaid ||
    record?.superseded ||
    record?.revisionMismatch ||
    item.paymentValidity?.pendingUnpaid ||
    item.paymentValidity?.superseded ||
    item.paymentValidity?.revisionMismatch;

  if (!hasWarning && !record?.paymentRequired && !item.paymentValidity?.paymentRequired) {
    return null;
  }

  return (
    <Section title="الدفع" icon={<CreditCard className="h-4 w-4" />}>
      {hasWarning ? (
        <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
          يوجد مانع دفع أو مراجعة. تحقق قبل تنفيذ الإجراء.
        </div>
      ) : null}
      <DetailGrid
        rows={[
          { label: "حالة الدفع", value: record?.paymentStatus || item.paymentStatus || item.paymentValidity?.paymentStatus },
          { label: "الدفع مطلوب", value: record?.paymentRequired ?? item.paymentValidity?.paymentRequired },
          { label: "سبب المنع", value: record?.reason || item.paymentValidity?.reason },
        ]}
      />
    </Section>
  );
}

function DataQualitySection({ item }: { item: UnifiedQueueItem }) {
  const warnings = item.dataQuality?.warnings || [];
  if (!warnings.length && item.dataQuality?.isComplete !== false) return null;

  return (
    <Section title="تنبيهات مهمة" icon={<AlertTriangle className="h-4 w-4" />}>
      <div className="space-y-2">
        {warnings.length ? (
          warnings.map((warning, index) => (
            <div key={`${warning.code}-${index}`} className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-300">
              {warning.messageAr || warning.messageEn || warning.code}
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">بعض بيانات الطلب غير مكتملة.</p>
        )}
      </div>
    </Section>
  );
}

function ActionsSummary({ item }: { item: UnifiedQueueItem }) {
  if (!item.allowedActions?.length) {
    return <p className="text-sm text-muted-foreground">لا توجد إجراءات متاحة حالياً.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {item.allowedActions.map((action) => (
        <Badge key={action.id} variant="outline" className="rounded-md">
          {action.label}
        </Badge>
      ))}
    </div>
  );
}

function OneTimeOrderDetailsContent({ item }: { item: UnifiedQueueItem }) {
  const presentation = buildOperationsOrderPresentation(item);

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="العميل والطلب" icon={<User className="h-4 w-4" />}>
          <DetailGrid
            rows={[
              { label: "الاسم", value: presentation.customerName, important: true },
              { label: "الهاتف", value: presentation.customerPhone, ltr: true, important: true },
              { label: "المرجع", value: presentation.reference, ltr: true },
              { label: "الحالة", value: presentation.statusLabel },
              { label: "نوع الطلب", value: presentation.sourceLabel },
              { label: "طريقة الاستلام", value: presentation.modeLabel },
            ]}
          />
        </Section>

        <Section title="الدفع والتسعير" icon={<CreditCard className="h-4 w-4" />}>
          <DetailGrid
            rows={[
              { label: "حالة الدفع", value: presentation.paymentLabel, important: true },
              { label: "الإجمالي", value: presentation.totalLabel, important: true },
            ]}
          />
          <div className="mt-3">
            <OperationsPricingSummary pricing={presentation.pricing} />
          </div>
        </Section>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <Section
            title={item.mode === "delivery" ? "التوصيل" : "الاستلام"}
            icon={item.mode === "delivery" ? <Truck className="h-4 w-4" /> : <Store className="h-4 w-4" />}
          >
            <DetailGrid
              rows={[
                {
                  label: item.mode === "delivery" ? "العنوان" : "الفرع",
                  value: presentation.fulfillment.destination,
                  important: true,
                },
                { label: "النافذة", value: presentation.fulfillment.window, important: true },
              ]}
            />
          </Section>

          <Section title="ملاحظات وحساسية" icon={<AlertTriangle className="h-4 w-4" />}>
            <DetailGrid
              rows={[
                { label: "ملاحظات", value: presentation.fulfillment.notes },
                { label: "حساسية", value: presentation.fulfillment.allergies },
              ]}
            />
          </Section>

          <Section title="الحالة والإجراءات" icon={<CheckCircle2 className="h-4 w-4" />}>
            <DetailGrid rows={[{ label: "الحالة الحالية", value: presentation.statusLabel }]} />
            <div className="mt-3">
              <ActionsSummary item={item} />
            </div>
          </Section>
        </div>

        <Section title="الأصناف ومكونات التحضير" icon={<Utensils className="h-4 w-4" />}>
          <div className="space-y-4">
            {presentation.items.map((orderItem) => (
              <div key={orderItem.key} className="space-y-3">
                <OperationsOrderItemSummary item={orderItem} />
                <OperationsSelectionGroups groups={orderItem.selectionGroups} />
              </div>
            ))}
            {!presentation.items.length ? (
              <p className="rounded-xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
                لا توجد أصناف واضحة في الطلب الحالي.
              </p>
            ) : null}
          </div>
        </Section>
      </div>
    </>
  );
}

export function OperationsOrderDetailsDialog({
  item,
  open,
  onOpenChange,
}: OperationsOrderDetailsDialogProps) {
  if (!item) return null;

  const orderSummary = getOrderSummary(item);
  const fulfillment = getFulfillment(item);
  const delivery = asRecord(asRecord(fulfillment)?.delivery);
  const pickup = asRecord(asRecord(fulfillment)?.pickup);
  const address = item.context.addressSummary || item.delivery?.addressSummary;
  const window = item.context.window || delivery?.window || item.delivery?.window || item.delivery?.deliveryWindow;
  const notes = asRecord(orderSummary)?.notes || item.notes || item.context.notes;
  const allergies = asRecord(orderSummary)?.allergies;
  const oneTimePresentation = isOneTimeOrder(item)
    ? buildOperationsOrderPresentation(item)
    : null;

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
                {oneTimePresentation?.sourceLabel || sourceLabel(item)}
              </Badge>
              <Badge variant="outline" className="rounded-md">
                {oneTimePresentation?.modeLabel || modeLabel(item.mode)}
              </Badge>
              <Badge className="rounded-md">
                {oneTimePresentation?.statusLabel || item.statusLabel || item.status}
              </Badge>
            </div>
            <DialogTitle className="text-xl font-bold">تفاصيل الطلب</DialogTitle>
            <DialogDescription className="text-right break-words">
              عرض مختصر للبيانات المهمة للتجهيز والتوصيل فقط.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="custom-scrollbar min-h-0 overflow-y-auto px-5 py-4 sm:px-6">
          {isOneTimeOrder(item) ? (
            <OneTimeOrderDetailsContent item={item} />
          ) : (
            <>
          <div className="grid gap-4 xl:grid-cols-2">
            <Section title="العميل" icon={<User className="h-4 w-4" />}>
              <DetailGrid
                rows={[
                  { label: "الاسم", value: item.customer?.name, important: true },
                  { label: "الهاتف", value: item.customer?.phone, ltr: true, important: true },
                  { label: "المرجع", value: item.reference || item.orderNumber, ltr: true },
                  { label: "عدد الوجبات", value: asRecord(orderSummary)?.mealCount ?? item.context?.mealCount },
                  { label: "ملاحظات", value: notes },
                  { label: "حساسية", value: allergies },
                ]}
              />
            </Section>

            <Section title="الموعد والمسار" icon={<CalendarDays className="h-4 w-4" />}>
              <DetailGrid
                rows={[
                  { label: "التاريخ", value: item.context?.date || item.delivery?.date, important: true },
                  { label: "الوقت", value: window, important: true },
                  { label: "نوع التنفيذ", value: item.fulfillmentType || asRecord(fulfillment)?.type },
                  { label: "الخطة", value: item.plan?.name || item.plan?.key },
                  { label: "المتبقي", value: item.plan?.remainingMeals ?? item.pickup?.remainingMeals },
                ]}
              />
            </Section>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <Section title="تجهيز المطبخ" icon={<Utensils className="h-4 w-4" />}>
              <KitchenSection item={item} />
            </Section>

            <div className="space-y-4">
              <Section
                title={item.mode === "delivery" ? "التوصيل" : "الاستلام"}
                icon={item.mode === "delivery" ? <Truck className="h-4 w-4" /> : <Store className="h-4 w-4" />}
              >
                <DetailGrid
                  rows={[
                    { label: "العنوان", value: item.mode === "delivery" ? address : null, important: true },
                    { label: "ملاحظات العنوان", value: item.mode === "delivery" ? item.context?.addressNotes : null },
                    { label: "الفرع", value: pickup?.branchId || item.pickup?.branchId || item.context?.branch },
                    { label: "كود الاستلام", value: item.context?.pickupCode || item.pickup?.pickupCode, ltr: true },
                    { label: "حالة التوصيل", value: delivery?.status || item.delivery?.status },
                  ]}
                />
              </Section>

              <Section title="الإجراءات المتاحة" icon={<CheckCircle2 className="h-4 w-4" />}>
                <ActionsSummary item={item} />
              </Section>

              <PaymentNotice item={item} />
              <DataQualitySection item={item} />
            </div>
          </div>

          <div className="mt-4 rounded-2xl border bg-muted/20 p-4 text-xs leading-6 text-muted-foreground">
            <div className="mb-2 flex items-center gap-2 font-bold text-foreground">
              <PackageCheck className="h-4 w-4 text-primary" />
              ملاحظة تشغيلية
            </div>
            يتم إخفاء الحقول الفارغة والبيانات الخام تلقائياً. الإجراءات نفسها تظل من الباكند فقط حسب allowedActions.
          </div>
            </>
          )}

          <div className="h-2" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
