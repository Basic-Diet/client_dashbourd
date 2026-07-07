import {
  Bell,
  CheckCircle2,
  ChefHat,
  Clock,
  Eye,
  Flame,
  PackageCheck,
  PackageOpen,
  Phone,
  RotateCcw,
  Search,
  Store,
  Truck,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DataTableViewOptions } from "@/components/ui/data-table-view-options";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getOperationsOrderTypeLabel, safeText } from "@/lib/operationsBoard";
import type { QueueAction, UnifiedQueueItem } from "@/types/dashboardOpsTypes";
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
  return getOperationsOrderTypeLabel(item);
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

function getMealDetail(
  meal: NonNullable<UnifiedQueueItem["kitchen"]>["meals"][number],
  index: number
) {
  const title = safeText(
    meal.display?.titleAr ||
      meal.sandwich?.displayName ||
      meal.product?.displayName ||
      meal.protein?.displayName,
    `وجبة ${index + 1}`
  );
  const detailParts = compactParts([
    meal.display?.preparationTextAr,
    meal.display?.subtitleAr,
    meal.mealTypeLabel?.ar,
    meal.protein?.grams ? `${meal.protein.grams}g بروتين` : null,
    meal.premium?.isPremium ? meal.premium.labelAr || "Premium" : null,
    meal.notes || undefined,
  ]);

  return {
    id: String(meal.slotKey || meal.slotIndex || `meal-${index}`),
    name: title,
    quantity: Number(meal.quantity || 1),
    detail: detailParts.join(" | "),
  };
}

function getAddonDetail(
  addon: NonNullable<UnifiedQueueItem["kitchen"]>["addons"][number],
  index: number
) {
  return {
    id: String(addon.key || addon.displayName || `addon-${index}`),
    name: safeText(addon.display?.titleAr || addon.displayName, "إضافة"),
    quantity: Number(addon.quantity || 1),
    detail: "إضافة",
  };
}

function getItemNames(item: UnifiedQueueItem) {
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
        ]).join(" | "),
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
  ]);
  const titleParts = compactParts([
    item.orderSummary?.display?.titleAr,
    mealCount != null ? `${mealCount} وجبات` : null,
    addonCount ? `${addonCount} إضافات` : null,
    itemCount && !mealCount ? `${itemCount} عناصر` : null,
  ]);
  const warningParts = compactParts([
    item.notes || item.context?.notes,
    item.orderSummary?.allergies
      ? `حساسية: ${item.orderSummary.allergies}`
      : null,
  ]);

  return {
    title:
      titleParts.join(" | ") ||
      item.orderSummary?.display?.subtitleAr ||
      "تحضير طلب",
    subtitle: planParts.join(" | "),
    warnings: warningParts.join(" | "),
  };
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
  return safeText(action.reasonLabel || action.reason, "");
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

const columnHelper = createColumnHelper<UnifiedQueueItem>();

function ActionButtons({
  item,
  isPending,
  onAction,
  onFulfill,
  onDetails,
  className = "",
}: {
  item: UnifiedQueueItem;
  isPending: boolean;
  onAction: OperationsQueueTableProps["onAction"];
  onFulfill?: OperationsQueueTableProps["onFulfill"];
  onDetails: (item: UnifiedQueueItem) => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <Button
        variant="outline"
        size="sm"
        className="h-9 px-3 text-xs font-semibold sm:h-8"
        onClick={() => onDetails(item)}
      >
        <Eye className="ml-1.5 h-3.5 w-3.5" />
        تفاصيل
      </Button>
      {getVisibleActions(item).map((action) => {
        const disabled = isActionDisabled(item, action.id, isPending);
        return (
          <Button
            key={action.id}
            variant={getActionVariant(action.color)}
            size="sm"
            className="h-9 px-3 text-xs font-semibold sm:h-8"
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
      }) || null}
    </div>
  );
}

function OperationsMobileCard({
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
  const itemNames = getItemNames(item);
  const time =
    item.context?.window ||
    item.delivery?.window ||
    item.delivery?.deliveryWindow;
  const preparationSummary = getPreparationSummary(item);

  return (
    <article className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/10 bg-primary/10 text-sm font-bold text-primary uppercase">
            {item.customer?.name?.charAt(0) || "?"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">
              {item.customer?.name || "—"}
            </p>
            <p
              className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"
              dir="ltr"
            >
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
      {item.dataQuality?.isComplete === false ? (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-800">
          بيانات غير مكتملة
        </div>
      ) : null}

      <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
        <div className="grid grid-cols-2 gap-2">
          <Badge
            variant="secondary"
            className="min-h-8 justify-center rounded-lg"
          >
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
            {item.mode === "delivery" ? (
              <Truck className="h-3 w-3" />
            ) : (
              <Store className="h-3 w-3" />
            )}
            {getModeLabel(item.mode)}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg bg-muted/40 px-3 py-2">
          <Clock className="h-3.5 w-3.5" />
          <span>{time || "لا يوجد وقت محدد"}</span>
        </div>

        <div className="rounded-lg bg-muted/40 px-3 py-2">
          <p className="flex items-center gap-1.5 font-semibold text-foreground">
            <Flame className="h-3.5 w-3.5" />
            {preparationSummary.title}
          </p>
          {preparationSummary.subtitle ? (
            <p className="mt-1">{preparationSummary.subtitle}</p>
          ) : null}
          {preparationSummary.warnings ? (
            <p className="mt-1 font-semibold text-amber-700">
              {preparationSummary.warnings}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        {itemNames.length ? (
          <>
            {itemNames.slice(0, 3).map((entry) => (
              <div
                key={entry.id}
                className="rounded-md border border-secondary bg-secondary/50 px-2 py-1.5 text-[11px] font-medium"
              >
                <div>
                  {entry.name} ×{entry.quantity}
                </div>
                {entry.detail ? (
                  <div className="mt-0.5 text-muted-foreground">
                    {entry.detail}
                  </div>
                ) : null}
              </div>
            ))}
            {itemNames.length > 3 ? (
              <span className="rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                +{itemNames.length - 3}
              </span>
            ) : null}
          </>
        ) : (
          <span className="text-xs text-muted-foreground">
            لا توجد عناصر مختصرة
          </span>
        )}
      </div>

      <ActionButtons
        item={item}
        isPending={isPending}
        onAction={onAction}
        onFulfill={onFulfill}
        onDetails={onDetails}
        className="mt-4 [&>button]:flex-1 [&>button]:justify-center"
      />
    </article>
  );
}

export function OperationsQueueTable({
  items = [],
  isPending,
  onAction,
  onFulfill,
}: OperationsQueueTableProps) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useState({});
  const [detailsItem, setDetailsItem] = useState<UnifiedQueueItem | null>(null);

  const columns = [
    columnHelper.display({
      id: "customer",
      header: "العميل",
      enableHiding: true,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/10 bg-primary/10 text-sm font-bold text-primary uppercase">
              {item.customer?.name?.charAt(0) || "?"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {item.customer?.name || "—"}
              </p>
              <p
                className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"
                dir="ltr"
              >
                <Phone className="h-3 w-3" />
                {item.customer?.phone || "—"}
              </p>
            </div>
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "type",
      header: "نوع الطلب",
      enableHiding: true,
      cell: ({ row }) => (
        <Badge variant="secondary" className="rounded-md">
          {getSourceLabel(row.original)}
        </Badge>
      ),
    }),
    columnHelper.display({
      id: "mode",
      header: "المسار",
      enableHiding: true,
      cell: ({ row }) => {
        const mode = row.original.mode;
        return (
          <Badge
            variant="outline"
            className={
              mode === "delivery"
                ? "gap-1 border-sky-500/20 bg-sky-500/10 text-sky-700"
                : "gap-1 border-purple-500/20 bg-purple-500/10 text-purple-700"
            }
          >
            {mode === "delivery" ? (
              <Truck className="h-3 w-3" />
            ) : (
              <Store className="h-3 w-3" />
            )}
            {getModeLabel(mode)}
          </Badge>
        );
      },
    }),
    columnHelper.display({
      id: "time",
      header: "الوقت",
      enableHiding: true,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <span className="inline-flex items-center gap-1.5 text-sm whitespace-nowrap text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {item.context?.window || item.delivery?.deliveryWindow || "—"}
          </span>
        );
      },
    }),
    columnHelper.display({
      id: "items",
      header: "ما يجب تحضيره",
      enableHiding: true,
      cell: ({ row }) => {
        const item = row.original;
        const itemNames = getItemNames(item);
        const preparationSummary = getPreparationSummary(item);
        if (!itemNames.length) {
          return (
            <div className="max-w-md text-sm">
              <p className="font-semibold">{preparationSummary.title}</p>
              {preparationSummary.subtitle ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {preparationSummary.subtitle}
                </p>
              ) : null}
              {preparationSummary.warnings ? (
                <p className="mt-1 text-xs font-semibold text-amber-700">
                  {preparationSummary.warnings}
                </p>
              ) : null}
            </div>
          );
        }
        return (
          <div className="max-w-md space-y-2">
            <div>
              <p className="text-sm font-semibold">
                {preparationSummary.title}
              </p>
              {preparationSummary.subtitle ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {preparationSummary.subtitle}
                </p>
              ) : null}
              {preparationSummary.warnings ? (
                <p className="mt-0.5 text-xs font-semibold text-amber-700">
                  {preparationSummary.warnings}
                </p>
              ) : null}
            </div>
            <div className="grid gap-1.5">
              {itemNames.slice(0, 3).map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-md border border-secondary bg-secondary/50 px-2 py-1.5 text-[11px] font-medium"
                >
                  <div>
                    {entry.name} x{entry.quantity}
                  </div>
                  {entry.detail ? (
                    <div className="mt-0.5 text-muted-foreground">
                      {entry.detail}
                    </div>
                  ) : null}
                </div>
              ))}
              {itemNames.length > 3 ? (
                <span className="text-xs text-muted-foreground">
                  +{itemNames.length - 3}
                </span>
              ) : null}
            </div>
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "status",
      header: "الحالة",
      enableHiding: true,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex flex-wrap gap-1.5">
            <Badge
              variant="outline"
              className={`rounded-md ${getStatusClasses(item.status)}`}
            >
              {item.statusLabel || item.ui?.label || item.status}
            </Badge>
            {item.dataQuality?.isComplete === false ? (
              <Badge
                variant="outline"
                className="rounded-md border-amber-500/30 bg-amber-500/10 text-amber-800"
              >
                بيانات غير مكتملة
              </Badge>
            ) : null}
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "التفاصيل والإجراءات",
      enableHiding: true,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs font-semibold"
              onClick={() => setDetailsItem(item)}
            >
              <Eye className="ml-1.5 h-3.5 w-3.5" />
              تفاصيل
            </Button>
            {getVisibleActions(item).map((action) => {
              const disabled = isActionDisabled(item, action.id, isPending);
              return (
                <Button
                  key={action.id}
                  variant={getActionVariant(action.color)}
                  size="sm"
                  className="h-8 px-3 text-xs font-semibold"
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
            }) || null}
          </div>
        );
      },
    }),
  ];

  const table = useReactTable({
    data: items,
    columns,
    state: {
      globalFilter,
      columnVisibility,
    },
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
        pageIndex: 0,
      },
    },
  });

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

      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="بحث في الطلبات..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pr-9"
          />
        </div>
        <div className="hidden md:block">
          <DataTableViewOptions table={table} />
        </div>
      </div>

      <div className="grid gap-3 md:hidden">
        {table.getRowModel().rows.map((row) => (
          <OperationsMobileCard
            key={row.original.id}
            item={row.original}
            isPending={isPending}
            onAction={onAction}
            onFulfill={onFulfill}
            onDetails={setDetailsItem}
          />
        ))}
      </div>

      {/* Table */}
      <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm md:block">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-b border-border/50 bg-muted/40 hover:bg-muted/40"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-right font-semibold"
                    style={{
                      width:
                        header.column.id === "customer"
                          ? 220
                          : header.column.id === "items"
                            ? 280
                            : header.column.id === "actions"
                              ? 240
                              : undefined,
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="border-b-border/40 transition-colors hover:bg-muted/30"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <DataTablePagination table={table} itemsLabel="طلب" />
    </div>
  );
}

export default OperationsQueueTable;
