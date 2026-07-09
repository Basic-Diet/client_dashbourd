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

type RawRecord = Record<string, unknown>;

type PrepLine = {
  id: string;
  name: string;
  quantity: number;
  detail?: string;
  badges: string[];
  notes?: string | null;
  kind: "meal" | "addon" | "item" | "summary";
};

type OrderDetails = {
  meals: PrepLine[];
  addons: PrepLine[];
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

function asRecord(value: unknown): RawRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as RawRecord)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function compactParts(parts: Array<string | null | undefined>) {
  return parts.filter((part): part is string => Boolean(part && part.trim()));
}

function uniqueParts(parts: Array<string | null | undefined>) {
  return Array.from(new Set(compactParts(parts)));
}

function localizedText(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number") return String(value);

  const record = asRecord(value);
  if (!record) return null;

  return (
    asString(record.ar) ||
    asString(record.en) ||
    asString(record.displayName) ||
    asString(record.name) ||
    localizedText(record.nameI18n) ||
    localizedText(record.name) ||
    asString(record.key) ||
    null
  );
}

function recordText(record: RawRecord | null, keys: string[]): string | null {
  if (!record) return null;
  for (const key of keys) {
    const direct = asString(record[key]);
    if (direct) return direct;
    const localized = localizedText(record[key]);
    if (localized) return localized;
  }
  return null;
}

function entityName(value: unknown) {
  return localizedText(value) || safeText(value, "");
}

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

function gramsText(entity: unknown, label: string) {
  const record = asRecord(entity);
  if (!record) return null;
  const name = entityName(record.displayName || record.name || record.nameI18n || entity);
  const grams = asNumber(record.grams);
  return compactParts([name, grams ? `${grams}g` : null]).join(" ") || label;
}

function legacyNameWithGrams(
  record: RawRecord,
  nameKeys: string[],
  gramsKeys: string[] = ["grams"]
) {
  const name = recordText(record, nameKeys);
  const grams = gramsKeys.map((key) => asNumber(record[key])).find(Boolean);
  return compactParts([name, grams ? `${grams}g` : null]).join(" ");
}

function legacyCollectionDetail(
  value: unknown,
  label: string,
  nameKeys: string[] = ["nameI18n", "name", "displayName"],
  gramsKeys: string[] = ["grams"]
) {
  const items = asArray(value)
    .map((entry) => {
      const record = asRecord(entry);
      return record ? legacyNameWithGrams(record, nameKeys, gramsKeys) : entityName(entry);
    })
    .filter(Boolean);

  return items.length ? `${label}: ${items.join(" + ")}` : null;
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
  const carbs = asArray(meal.carbs)
    .map((carb) => gramsText(carb, "كارب"))
    .filter(Boolean)
    .join(" + ");
  const sauces = asArray(meal.sauce).map(entityName).filter(Boolean).join(" + ");
  const sides = asArray(meal.sides).map(entityName).filter(Boolean).join(" + ");
  const options = asArray(meal.options).map(entityName).filter(Boolean).join(" + ");
  const detailParts = uniqueParts([
    meal.display?.preparationTextAr,
    meal.display?.subtitleAr,
    meal.mealTypeLabel?.ar,
    meal.protein ? `بروتين: ${gramsText(meal.protein, "بروتين")}` : null,
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
    badges: uniqueParts([
      `وجبة ${index + 1}`,
      meal.mealTypeLabel?.ar,
      meal.premium?.isPremium ? meal.premium.labelAr || "Premium" : null,
      ...(meal.display?.badgesAr || []),
    ]),
    notes: meal.notes,
    kind: "meal",
  };
}

function getLegacyMealDetail(slot: unknown, index: number): PrepLine {
  const record = asRecord(slot) || {};
  const title =
    recordText(record, [
      "productNameI18n",
      "productName",
      "sandwichNameI18n",
      "sandwichName",
      "mealNameI18n",
      "mealName",
    ]) ||
    legacyNameWithGrams(record, ["proteinNameI18n", "proteinName"], ["proteinGrams"]) ||
    `وجبة ${index + 1}`;

  const protein = legacyNameWithGrams(
    record,
    ["proteinNameI18n", "proteinName"],
    ["proteinGrams"]
  );
  const selectionType = recordText(record, ["selectionTypeI18n", "selectionType"]);
  const saladRecord = asRecord(record.salad);
  const salad = saladRecord
    ? legacyNameWithGrams(saladRecord, ["nameI18n", "name", "displayName"], ["grams"])
    : entityName(record.salad);

  const detailParts = uniqueParts([
    selectionType,
    protein ? `بروتين: ${protein}` : null,
    legacyCollectionDetail(record.carbSelections, "كارب"),
    salad ? `سلطة: ${salad}` : null,
    legacyCollectionDetail(record.sauce, "صوص"),
    legacyCollectionDetail(record.selectedOptions, "اختيارات"),
    legacyCollectionDetail(record.sides, "جانبي"),
  ]);

  return {
    id: String(record.slotKey || record.slotIndex || `legacy-meal-${index}`),
    name: title,
    quantity: Number(record.quantity || 1),
    detail: detailParts.join(" • "),
    badges: uniqueParts([
      `وجبة ${record.slotIndex || index + 1}`,
      selectionType,
      record.isPremium ? "Premium" : null,
    ]),
    notes: asString(record.notes),
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

function getLegacyAddonDetail(addon: unknown, index: number): PrepLine {
  const record = asRecord(addon) || {};
  const name =
    recordText(record, ["nameI18n", "name", "displayName", "titleAr"]) || "إضافة";

  return {
    id: String(record.key || name || `legacy-addon-${index}`),
    name,
    quantity: Number(record.quantity || 1),
    detail: "إضافة مع الطلب",
    badges: ["إضافة"],
    kind: "addon",
  };
}

function mergeAddonLines(lines: PrepLine[]): PrepLine[] {
  const byKey = new Map<string, PrepLine>();

  lines.forEach((line) => {
    const key = `${line.name}__${line.detail || ""}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...line });
      return;
    }

    existing.quantity += line.quantity;
    existing.badges = uniqueParts([...existing.badges, ...line.badges]);
  });

  return Array.from(byKey.values());
}

function getOrderDetails(item: UnifiedQueueItem): OrderDetails {
  const kitchenDetails = asRecord(item.kitchenDetails);
  const legacyMealSlots = asArray(kitchenDetails?.mealSlots);
  const legacyAddons = asArray(kitchenDetails?.addons);

  const meals =
    item.kitchen?.meals?.length || item.kitchen?.addons?.length
      ? [...(item.kitchen.meals || []).map(getMealDetail)]
      : legacyMealSlots.map(getLegacyMealDetail);

  const addons =
    item.kitchen?.meals?.length || item.kitchen?.addons?.length
      ? (item.kitchen.addons || []).map(getAddonDetail)
      : mergeAddonLines(legacyAddons.map(getLegacyAddonDetail));

  if (!meals.length && Array.isArray(item.items) && item.items.length) {
    return {
      meals: item.items.map((entry, index) => ({
        id: String(entry.id || getDisplayName(entry.name) || index),
        name: getDisplayName(entry.name),
        quantity: getDisplayQuantity(entry),
        detail: entry.notes,
        badges: ["طلب فردي"],
        notes: entry.notes,
        kind: "item",
      })),
      addons,
    };
  }

  return { meals, addons };
}

function getContextNumber(item: UnifiedQueueItem, key: string) {
  const context = asRecord(item.context);
  return asNumber(context?.[key]);
}

function getRawNumber(item: UnifiedQueueItem, key: string) {
  const raw = asRecord(item.rawData);
  return asNumber(raw?.[key]);
}

function getSelectionModeLabel(item: UnifiedQueueItem) {
  const kitchenDetails = asRecord(item.kitchenDetails);
  const mode =
    item.selectionMode ||
    asString(kitchenDetails?.selectionMode) ||
    asString(asRecord(item.rawData)?.selectionMode);

  switch (mode) {
    case "customer_selected":
      return "اختيارات العميل";
    case "quantity_only":
      return "عدد فقط — لم يحدد الوجبات";
    case "none":
      return "لا توجد اختيارات محددة";
    default:
      return mode ? safeText(mode, "") : null;
  }
}

function getOrderStats(item: UnifiedQueueItem, details: OrderDetails) {
  const requiredMealCount =
    item.context?.requiredMealCount ??
    getContextNumber(item, "requiredMealCount") ??
    item.context?.mealCount ??
    getRawNumber(item, "mealCount") ??
    details.meals.reduce((total, line) => total + line.quantity, 0);

  const specifiedMealCount =
    getContextNumber(item, "specifiedMealCount") ??
    details.meals.reduce((total, line) => total + line.quantity, 0);

  const unspecifiedMealCount =
    getContextNumber(item, "unspecifiedMealCount") ??
    Math.max(requiredMealCount - specifiedMealCount, 0);

  const addonCount = details.addons.reduce((total, line) => total + line.quantity, 0);

  return {
    requiredMealCount,
    specifiedMealCount,
    unspecifiedMealCount,
    addonCount,
  };
}

function getFallbackMealLines(item: UnifiedQueueItem, details: OrderDetails): PrepLine[] {
  if (details.meals.length) return details.meals;

  const stats = getOrderStats(item, details);
  if (stats.requiredMealCount > 0) {
    return [
      {
        id: "required-meals",
        name: `${stats.requiredMealCount} وجبات مطلوبة`,
        quantity: stats.requiredMealCount,
        detail:
          stats.unspecifiedMealCount > 0
            ? "العميل لم يحدد تفاصيل الوجبات بعد — جهّز حسب تعليمات الاشتراك عند التحديث."
            : compactParts([
                item.plan?.name || undefined,
                item.plan?.proteinGrams ? `${item.plan.proteinGrams}g بروتين` : null,
                item.plan?.portionSize,
              ]).join(" • "),
        badges: ["غير محدد"],
        kind: "summary",
      },
    ];
  }

  return [];
}

function getPreparationSummary(item: UnifiedQueueItem, details: OrderDetails) {
  const stats = getOrderStats(item, details);
  const planParts = compactParts([
    item.plan?.name || undefined,
    item.plan?.proteinGrams ? `${item.plan.proteinGrams}g بروتين` : null,
    item.plan?.portionSize,
    item.plan?.selectedMealsPerDay
      ? `${item.plan.selectedMealsPerDay} وجبات/يوم`
      : null,
    item.plan?.remainingMeals != null
      ? `متبقي ${item.plan.remainingMeals} وجبة`
      : null,
  ]);

  const titleParts = compactParts([
    stats.requiredMealCount ? `${stats.requiredMealCount} وجبات` : null,
    stats.addonCount ? `${stats.addonCount} إضافات` : "بدون إضافات",
    stats.unspecifiedMealCount ? `${stats.unspecifiedMealCount} غير محددة` : null,
  ]);

  const warningParts = compactParts([
    item.notes || item.context?.notes,
    item.orderSummary?.notes,
    item.orderSummary?.allergies
      ? `حساسية: ${item.orderSummary.allergies}`
      : null,
  ]);

  return {
    title: titleParts.join(" • ") || "تحضير طلب",
    subtitle: planParts.join(" • "),
    warnings: Array.from(new Set(warningParts)).join(" • "),
    selectionMode: getSelectionModeLabel(item),
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

  (item.allowedActions || []).forEach((action) =>
    appendUniqueAction(result, action, seenIds, seenLabels)
  );
  (item.actions?.disabled || []).forEach((action) =>
    appendUniqueAction(result, action, seenIds, seenLabels)
  );

  return result;
}

function searchableText(item: UnifiedQueueItem) {
  const details = getOrderDetails(item);
  const prep = [...details.meals, ...details.addons]
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
    getSelectionModeLabel(item),
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
    <div
      className={
        line.kind === "addon"
          ? "rounded-xl border border-purple-500/20 bg-purple-500/5 p-3 shadow-sm"
          : "rounded-xl border border-border/70 bg-background/70 p-3 shadow-sm"
      }
    >
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
          {Array.from(new Set(line.badges)).slice(0, 5).map((badge) => (
            <Badge key={badge} variant="secondary" className="rounded-md text-[10px]">
              {badge}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function OrderSection({
  title,
  count,
  emptyText,
  lines,
}: {
  title: string;
  count: number;
  emptyText: string;
  lines: PrepLine[];
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold">{title}</p>
        <Badge variant="outline" className="rounded-md">
          {count}
        </Badge>
      </div>
      {lines.length ? (
        <div className="grid gap-2">
          {lines.map((line) => (
            <PreparationLineCard key={`${line.kind}-${line.id}-${line.name}`} line={line} />
          ))}
        </div>
      ) : (
        <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {emptyText}
        </p>
      )}
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
  const orderDetails = getOrderDetails(item);
  const mealLines = getFallbackMealLines(item, orderDetails);
  const stats = getOrderStats(item, orderDetails);
  const summary = getPreparationSummary(item, orderDetails);
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
            {item.ui?.label || item.statusLabel || item.status}
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
          {summary.selectionMode ? (
            <p className="mt-2 inline-flex rounded-md bg-background/80 px-2 py-1 text-[11px] font-semibold text-muted-foreground">
              {summary.selectionMode}
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

        <OrderSection
          title="الطلب الأساسي"
          count={stats.requiredMealCount || mealLines.length}
          emptyText="لا توجد تفاصيل وجبات واضحة في الـ response الحالي."
          lines={mealLines}
        />

        <OrderSection
          title="الإضافات"
          count={stats.addonCount}
          emptyText="لا توجد إضافات على هذا الطلب."
          lines={orderDetails.addons}
        />
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
            الكروت تعرض الطلب الأساسي والإضافات والحالة بدون إظهار IDs أو بيانات تقنية.
          </p>
        </div>
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="بحث بالعميل، الوجبة، الإضافة، الهاتف أو الحالة..."
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
