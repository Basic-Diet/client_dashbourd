import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChefHat,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  Clock,
  Eye,
  Flame,
  MapPin,
  PackageCheck,
  PackageOpen,
  Phone,
  RotateCcw,
  Search,
  Store,
  Truck,
  Utensils,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { safeText } from "@/lib/operationsBoard";
import type { QueueAction, UnifiedQueueItem } from "@/types/dashboardOpsTypes";
import { isOneTimeOrder, isPickupRequest } from "@/types/dashboardOpsTypes";
import { OperationsOrderDetailsDialog } from "./OperationsOrderDetailsDialog";

interface OperationsQueueTableProps {
  items: UnifiedQueueItem[];
  isPending: boolean;
  onAction: (
    item: UnifiedQueueItem,
    action: string,
    actionLabel: string,
    isDangerous?: boolean
  ) => void;
  onFulfill?: (item: UnifiedQueueItem) => void;
}

type VisibleAction = QueueAction & {
  color: string;
  icon: string;
  requiresReason: boolean;
};

type PrepLine = {
  id: string;
  name: string;
  quantity: number;
  detail?: string;
  badges: string[];
  notes?: string | null;
  kind: "meal" | "addon" | "item" | "summary";
};

const PAGE_SIZE_OPTIONS = [9, 18, 36, 72];

const actionIcons: Record<string, ReactNode> = {
  start_preparation: <ChefHat className="ml-1.5 h-3.5 w-3.5" />,
  prepare: <ChefHat className="ml-1.5 h-3.5 w-3.5" />,
  ready_for_pickup: <PackageCheck className="ml-1.5 h-3.5 w-3.5" />,
  dispatch: <Truck className="ml-1.5 h-3.5 w-3.5" />,
  notify_arrival: <Bell className="ml-1.5 h-3.5 w-3.5" />,
  fulfill: <CheckCircle2 className="ml-1.5 h-3.5 w-3.5" />,
  cancel: <XCircle className="ml-1.5 h-3.5 w-3.5" />,
  no_show: <XCircle className="ml-1.5 h-3.5 w-3.5" />,
  reopen: <RotateCcw className="ml-1.5 h-3.5 w-3.5" />,
};

function getStatusClasses(status: string) {
  if (["fulfilled", "ready_for_pickup", "ready"].includes(status)) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (["in_preparation", "preparing"].includes(status)) {
    return "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300";
  }
  if (["out_for_delivery"].includes(status)) {
    return "border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300";
  }
  if (
    [
      "canceled",
      "cancelled",
      "delivery_canceled",
      "canceled_at_branch",
      "no_show",
    ].includes(status)
  ) {
    return "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300";
  }
  return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
}

function getActionVariant(color: string) {
  if (color === "red" || color === "danger") return "destructive";
  if (color === "gray") return "secondary";
  return "default";
}

function getSourceLabel(item: UnifiedQueueItem) {
  if (isPickupRequest(item)) return "طلب استلام اشتراك";
  if (isOneTimeOrder(item)) return "طلب فردي";
  return "اشتراك يومي";
}

function getModeLabel(mode: string) {
  return mode === "delivery" ? "توصيل" : "استلام";
}

function getDisplayName(value: unknown) {
  return safeText(value, "عنصر");
}

function getDisplayQuantity(entry: unknown) {
  if (!entry || typeof entry !== "object") return 1;
  const item = entry as { quantity?: number; qty?: number };
  return Number(item.quantity || item.qty || 1);
}

function compactParts(parts: Array<string | null | undefined>) {
  return parts.filter((part): part is string => Boolean(part && part.trim()));
}

function entityName(value: unknown) {
  return safeText(value, "");
}

function entityList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(entityName).filter(Boolean);
}

function gramsText(entity: unknown, label: string) {
  if (!entity || typeof entity !== "object") return null;
  const record = entity as { grams?: number | null; displayName?: string; name?: unknown };
  const name = entityName(record.displayName || record.name || entity);
  const grams = record.grams ? `${record.grams}g` : null;
  return compactParts([name, grams]).join(" ") || label;
}

function getMealDetail(
  meal: NonNullable<UnifiedQueueItem["kitchen"]>["meals"][number],
  index: number
): PrepLine {
  const title = safeText(
    meal.display?.titleAr ||
      meal.sandwich?.displayName ||
      meal.product?.displayName ||
      meal.protein?.displayName,
    `وجبة ${index + 1}`
  );
  const carbs = entityList(meal.carbs).join(" + ");
  const sauces = entityList(meal.sauce).join(" + ");
  const sides = entityList(meal.sides).join(" + ");
  const options = entityList(meal.options).join(" + ");
  const detailParts = compactParts([
    meal.display?.preparationTextAr,
    meal.display?.subtitleAr,
    meal.mealTypeLabel?.ar,
    meal.protein ? gramsText(meal.protein, "بروتين") : null,
    carbs ? `كارب: ${carbs}` : null,
    meal.salad ? `سلطة: ${entityName(meal.salad)}` : null,
    sauces ? `صوص: ${sauces}` : null,
    sides ? `جانبي: ${sides}` : null,
    options ? `اختيارات: ${options}` : null,
  ]);

  return {
    id: String(meal.slotKey || meal.slotIndex || `meal-${index}`),
    name: title,
    quantity: Number(meal.quantity || 1),
    detail: detailParts.join(" • "),
    badges: compactParts([
      meal.mealTypeLabel?.ar,
      meal.premium?.isPremium ? meal.premium.labelAr || "Premium" : null,
      ...(meal.display?.badgesAr || []),
    ]),
    notes: meal.notes,
    kind: "meal",
  };
}

function getAddonDetail(
  addon: NonNullable<UnifiedQueueItem["kitchen"]>["addons"][number],
  index: number
): PrepLine {
  return {
    id: String(addon.key || addon.displayName || `addon-${index}`),
    name: safeText(addon.display?.titleAr || addon.displayName, "إضافة"),
    quantity: Number(addon.quantity || 1),
    detail: "إضافة مع الطلب",
    badges: ["إضافة"],
    kind: "addon",
  };
}

function getPreparationLines(item: UnifiedQueueItem): PrepLine[] {
  if (item.kitchen?.meals?.length || item.kitchen?.addons?.length) {
    return [
      ...(item.kitchen.meals || []).map(getMealDetail),
      ...(item.kitchen.addons || []).map(getAddonDetail),
    ];
  }

  if (Array.isArray(item.items) && item.items.length) {
    return item.items.map((entry, index) => ({
      id: String(entry.id || getDisplayName(entry.name) || index),
      name: getDisplayName(entry.name),
      quantity: getDisplayQuantity(entry),
      detail: entry.notes,
      badges: [],
      notes: entry.notes,
      kind: "item",
    }));
  }

  if (item.context?.mealCount) {
    return [
      {
        id: "meal-count",
        name: "وجبات محجوزة",
        quantity: item.context.mealCount,
        detail: compactParts([
          item.plan?.name || undefined,
          item.plan?.proteinGrams ? `${item.plan.proteinGrams}g بروتين` : null,
          item.plan?.portionSize,
        ]).join(" • "),
        badges: ["اشتراك"],
        kind: "summary",
      },
    ];
  }

  return [];
}

function getPreparationSummary(item: UnifiedQueueItem) {
  const mealCount =
    item.orderSummary?.mealCount ??
    item.context?.mealCount ??
    item.pickup?.mealCount;
  const addonCount = item.orderSummary?.addonCount;
  const itemCount = item.orderSummary?.itemCount;
  const planParts = compactParts([
    item.plan?.name || undefined,
    item.plan?.proteinGrams ? `${item.plan.proteinGrams}g بروتين` : null,
    item.plan?.portionSize,
    item.plan?.selectedMealsPerDay
      ? `${item.plan.selectedMealsPerDay} وجبات/يوم`
      : null,
  ]);
  const titleParts = compactParts([
    item.orderSummary?.display?.titleAr,
    mealCount != null ? `${mealCount} وجبات` : null,
    addonCount ? `${addonCount} إضافات` : null,
    itemCount && !mealCount ? `${itemCount} عناصر` : null,
  ]);
  const warningParts = compactParts([
    item.notes || item.context?.notes,
    item.orderSummary?.notes,
    item.orderSummary?.allergies
      ? `حساسية: ${item.orderSummary.allergies}`
      : null,
  ]);

  return {
    title:
      titleParts.join(" • ") ||
      item.orderSummary?.display?.subtitleAr ||
      "تحضير طلب",
    subtitle: planParts.join(" • "),
    warnings: Array.from(new Set(warningParts)).join(" • "),
  };
}

function getFulfillmentText(item: UnifiedQueueItem) {
  const time =
    item.context?.window ||
    item.delivery?.window ||
    item.delivery?.deliveryWindow;
  const location =
    item.mode === "delivery"
      ? item.context?.addressSummary || item.delivery?.addressSummary
      : item.context?.branch || item.pickup?.branchId || item.pickup?.locationId;

  return {
    time: time || "لا يوجد وقت محدد",
    location: location ? safeText(location, "") : "لا يوجد مكان محدد",
    notes:
      item.context?.addressNotes ||
      item.context?.notes ||
      item.notes ||
      item.orderSummary?.notes ||
      null,
  };
}

function getPaymentWarning(item: UnifiedQueueItem) {
  const payment = item.payment || item.paymentValidity;
  if (!payment) return null;

  if (payment.pendingUnpaid) return "الدفع معلق — لا تعتمد التحضير قبل مراجعة الدفع";
  if (payment.revisionMismatch) return "يوجد اختلاف في مراجعة الدفع";
  if (payment.superseded) return "الدفع مرتبط بإصدار أقدم من الطلب";
  if (payment.paymentRequired && payment.paymentApplied === false) {
    return "مطلوب تأكيد الدفع قبل الإجراء";
  }
  return payment.reason || null;
}

function isActionDisabled(
  item: UnifiedQueueItem,
  actionId: string,
  isPending: boolean
) {
  if (isPending) return true;

  if (item.actions?.disabled?.some((action) => action.id === actionId)) {
    return true;
  }

  switch (actionId) {
    case "prepare":
    case "start_preparation":
      return item.actions?.canPrepare === false;
    case "ready_for_pickup":
      return item.actions?.canReadyForPickup === false;
    case "fulfill":
      return item.actions?.canFulfill === false;
    case "cancel":
      return item.actions?.canCancel === false;
    case "no_show":
      return item.actions?.canNoShow === false;
    case "reopen":
      return item.actions?.canReopen === false;
    default:
      return false;
  }
}

function disabledReason(action: QueueAction) {
  return safeText(action.reasonLabel || action.reason || action.disabledReason, "");
}

function normalizeAction(action: QueueAction): VisibleAction | null {
  const id = safeText(action.id, "").trim();
  if (!id) return null;

  return {
    id,
    label: safeText(action.label, id),
    color: action.color || "gray",
    icon: action.icon || "",
    endpoint: action.endpoint,
    method: action.method,
    reason: action.reason,
    reasonLabel: action.reasonLabel,
    requiresReason: Boolean(action.requiresReason),
  };
}

function actionLabelKey(action: VisibleAction) {
  return safeText(action.label, action.id).trim().toLowerCase();
}

function appendUniqueAction(
  target: VisibleAction[],
  action: QueueAction,
  seenIds: Set<string>,
  seenLabels: Set<string>
) {
  const normalized = normalizeAction(action);
  if (!normalized) return;

  const labelKey = actionLabelKey(normalized);
  if (seenIds.has(normalized.id) || (labelKey && seenLabels.has(labelKey))) {
    return;
  }

  seenIds.add(normalized.id);
  if (labelKey) seenLabels.add(labelKey);
  target.push(normalized);
}

function getVisibleActions(item: UnifiedQueueItem) {
  const result: VisibleAction[] = [];
  const seenIds = new Set<string>();
  const seenLabels = new Set<string>();

  item.allowedActions.forEach((action) =>
    appendUniqueAction(result, action, seenIds, seenLabels)
  );
  (item.actions?.disabled || []).forEach((action) =>
    appendUniqueAction(result, action, seenIds, seenLabels)
  );

  return result;
}

function searchableText(item: UnifiedQueueItem) {
  const prep = getPreparationLines(item)
    .flatMap((line) => [line.name, line.detail, line.notes, ...line.badges])
    .join(" ");
  return [
    item.customer?.name,
    item.customer?.phone,
    item.reference,
    item.statusLabel,
    item.ui?.label,
    item.context?.window,
    item.context?.addressSummary,
    item.context?.branch,
    item.plan?.name,
    item.orderSummary?.display?.titleAr,
    item.orderSummary?.display?.subtitleAr,
    prep,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function ActionButtons({
  item,
  isPending,
  onAction,
  onFulfill,
  onDetails,
}: {
  item: UnifiedQueueItem;
  isPending: boolean;
  onAction: OperationsQueueTableProps["onAction"];
  onFulfill?: OperationsQueueTableProps["onFulfill"];
  onDetails: (item: UnifiedQueueItem) => void;
}) {
  return (
    <div className="grid gap-2 sm:flex sm:flex-wrap">
      {getVisibleActions(item).map((action) => {
        const disabled = isActionDisabled(item, action.id, isPending);
        return (
          <Button
            key={action.id}
            variant={getActionVariant(action.color)}
            size="sm"
            className="min-h-9 justify-center px-3 text-xs font-semibold"
            disabled={disabled}
            title={disabled ? disabledReason(action) : undefined}
            onClick={() => {
              if (disabled) return;
              if (
                action.id === "fulfill" &&
                item.mode === "pickup" &&
                onFulfill
              ) {
                onFulfill(item);
                return;
              }

              onAction(
                item,
                action.id,
                action.label,
                action.color === "red" || action.color === "danger"
              );
            }}
          >
            {actionIcons[action.id]}
            {action.label}
          </Button>
        );
      })}
      <Button
        variant="outline"
        size="sm"
        className="min-h-9 justify-center px-3 text-xs font-semibold"
        onClick={() => onDetails(item)}
      >
        <Eye className="ml-1.5 h-3.5 w-3.5" />
        تفاصيل كاملة
      </Button>
    </div>
  );
}

function InfoPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex min-h-9 items-center gap-1.5 rounded-lg bg-muted/45 px-3 py-2 text-xs font-medium text-muted-foreground">
      {icon}
      <span className="line-clamp-2">{label}</span>
    </div>
  );
}

function PreparationLineCard({ line }: { line: PrepLine }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/70 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">
            {line.name} <span className="text-primary">×{line.quantity}</span>
          </p>
          {line.detail ? (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {line.detail}
            </p>
          ) : null}
          {line.notes ? (
            <p className="mt-1 text-xs font-semibold text-amber-700">
              ملاحظة: {line.notes}
            </p>
          ) : null}
        </div>
        <Utensils className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      </div>
      {line.badges.length ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {Array.from(new Set(line.badges)).slice(0, 4).map((badge) => (
            <Badge key={badge} variant="secondary" className="rounded-md text-[10px]">
              {badge}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function OperationsQueueCard({
  item,
  isPending,
  onAction,
  onFulfill,
  onDetails,
}: {
  item: UnifiedQueueItem;
  isPending: boolean;
  onAction: OperationsQueueTableProps["onAction"];
  onFulfill?: OperationsQueueTableProps["onFulfill"];
  onDetails: (item: UnifiedQueueItem) => void;
}) {
  const preparationLines = getPreparationLines(item);
  const summary = getPreparationSummary(item);
  const fulfillment = getFulfillmentText(item);
  const paymentWarning = getPaymentWarning(item);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="border-b bg-muted/20 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/10 bg-primary/10 text-sm font-bold text-primary uppercase">
              {item.customer?.name?.charAt(0) || "?"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-bold">
                {item.customer?.name || "عميل غير محدد"}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground" dir="ltr">
                <Phone className="h-3 w-3" />
                {item.customer?.phone || "—"}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={`shrink-0 rounded-md ${getStatusClasses(item.status)}`}
          >
            {item.statusLabel || item.ui?.label || item.status}
          </Badge>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Badge variant="secondary" className="min-h-8 justify-center rounded-lg">
            {getSourceLabel(item)}
          </Badge>
          <Badge
            variant="outline"
            className={
              item.mode === "delivery"
                ? "min-h-8 justify-center gap-1 rounded-lg border-sky-500/20 bg-sky-500/10 text-sky-700"
                : "min-h-8 justify-center gap-1 rounded-lg border-purple-500/20 bg-purple-500/10 text-purple-700"
            }
          >
            {item.mode === "delivery" ? <Truck className="h-3 w-3" /> : <Store className="h-3 w-3" />}
            {getModeLabel(item.mode)}
          </Badge>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="rounded-xl border border-primary/10 bg-primary/5 p-3">
          <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            <Flame className="h-4 w-4 text-primary" />
            {summary.title}
          </p>
          {summary.subtitle ? (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {summary.subtitle}
            </p>
          ) : null}
          {summary.warnings ? (
            <p className="mt-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 py-1.5 text-xs font-semibold text-amber-800">
              {summary.warnings}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <InfoPill icon={<Clock className="h-3.5 w-3.5" />} label={fulfillment.time} />
          <InfoPill icon={<MapPin className="h-3.5 w-3.5" />} label={fulfillment.location} />
        </div>

        {fulfillment.notes ? (
          <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-800">
            ملاحظات: {fulfillment.notes}
          </div>
        ) : null}

        {paymentWarning ? (
          <div className="flex gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-800 dark:text-red-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{paymentWarning}</span>
          </div>
        ) : null}

        {item.dataQuality?.isComplete === false ? (
          <div className="flex gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-800">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>بيانات غير مكتملة — راجع التفاصيل قبل الإجراء.</span>
          </div>
        ) : null}

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold">ما يجب تحضيره</p>
            <Badge variant="outline" className="rounded-md">
              {preparationLines.length || 0} عناصر
            </Badge>
          </div>
          {preparationLines.length ? (
            <div className="grid gap-2">
              {preparationLines.map((line) => (
                <PreparationLineCard key={`${line.kind}-${line.id}`} line={line} />
              ))}
            </div>
          ) : (
            <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              لا توجد عناصر مختصرة من الـ response الحالي.
            </p>
          )}
        </div>
      </div>

      <div className="border-t bg-muted/20 p-4">
        <ActionButtons
          item={item}
          isPending={isPending}
          onAction={onAction}
          onFulfill={onFulfill}
          onDetails={onDetails}
        />
      </div>
    </article>
  );
}

function CardsPagination({
  pageIndex,
  pageCount,
  pageSize,
  totalItems,
  onPageIndexChange,
  onPageSizeChange,
}: {
  pageIndex: number;
  pageCount: number;
  pageSize: number;
  totalItems: number;
  onPageIndexChange: (value: number) => void;
  onPageSizeChange: (value: number) => void;
}) {
  const canPrevious = pageIndex > 0;
  const canNext = pageIndex < pageCount - 1;

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <div className="text-sm text-muted-foreground">
        إجمالي الطلبات ({totalItems})
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label htmlFor="operations-cards-page-size" className="text-sm font-medium">
            الكروت في الصفحة
          </Label>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => {
              onPageSizeChange(Number(value));
              onPageIndexChange(0);
            }}
          >
            <SelectTrigger size="sm" className="w-20" id="operations-cards-page-size">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              <SelectGroup>
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={`${option}`}>
                    {option}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm font-medium">
          صفحة {pageIndex + 1} من {pageCount || 1}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="hidden size-8 sm:flex"
            onClick={() => onPageIndexChange(0)}
            disabled={!canPrevious}
          >
            <span className="sr-only">الصفحة الأولى</span>
            <ChevronsRightIcon className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => onPageIndexChange(Math.max(pageIndex - 1, 0))}
            disabled={!canPrevious}
          >
            <span className="sr-only">الصفحة السابقة</span>
            <ChevronRightIcon className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => onPageIndexChange(Math.min(pageIndex + 1, pageCount - 1))}
            disabled={!canNext}
          >
            <span className="sr-only">الصفحة التالية</span>
            <ChevronLeftIcon className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="hidden size-8 sm:flex"
            onClick={() => onPageIndexChange(pageCount - 1)}
            disabled={!canNext}
          >
            <span className="sr-only">الصفحة الأخيرة</span>
            <ChevronsLeftIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function OperationsQueueTable({
  items = [],
  isPending,
  onAction,
  onFulfill,
}: OperationsQueueTableProps) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [pageSize, setPageSize] = useState(9);
  const [pageIndex, setPageIndex] = useState(0);
  const [detailsItem, setDetailsItem] = useState<UnifiedQueueItem | null>(null);

  const filteredItems = useMemo(() => {
    const query = globalFilter.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => searchableText(item).includes(query));
  }, [globalFilter, items]);

  const pageCount = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const pagedItems = filteredItems.slice(
    safePageIndex * pageSize,
    safePageIndex * pageSize + pageSize
  );

  if (!items.length) {
    return (
      <EmptyState
        icon={PackageOpen}
        title="لا توجد طلبات"
        description="لا توجد طلبات مطابقة في هذا المسار حاليا."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <OperationsOrderDetailsDialog
        item={detailsItem}
        open={Boolean(detailsItem)}
        onOpenChange={(open) => {
          if (!open) setDetailsItem(null);
        }}
      />

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div>
          <p className="text-sm font-bold">طلبات العمليات</p>
          <p className="text-xs text-muted-foreground">
            عرض كروت مختصر يركز على ما يحتاجه المطبخ أو الفرع أو الكوريير فقط.
          </p>
        </div>
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="بحث داخل الكروت بالعميل، الوجبة، الهاتف أو الحالة..."
            value={globalFilter}
            onChange={(e) => {
              setGlobalFilter(e.target.value);
              setPageIndex(0);
            }}
            className="h-10 pr-9"
          />
        </div>
      </div>

      {filteredItems.length ? (
        <>
          <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
            {pagedItems.map((item) => (
              <OperationsQueueCard
                key={item.id}
                item={item}
                isPending={isPending}
                onAction={onAction}
                onFulfill={onFulfill}
                onDetails={setDetailsItem}
              />
            ))}
          </div>
          <CardsPagination
            pageIndex={safePageIndex}
            pageCount={pageCount}
            pageSize={pageSize}
            totalItems={filteredItems.length}
            onPageIndexChange={setPageIndex}
            onPageSizeChange={setPageSize}
          />
        </>
      ) : (
        <EmptyState
          icon={PackageOpen}
          title="لا توجد نتائج"
          description="لا توجد كروت مطابقة للبحث الحالي."
        />
      )}
    </div>
  );
}
