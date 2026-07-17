import {
  CheckCircle2,
  ChefHat,
  Clock,
  Eye,
  MapPin,
  PackageOpen,
  Phone,
  Search,
  Store,
  Truck,
  XCircle,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import type { PendingOperationsActions } from "@/hooks/useOperationsBoard";
import { buildKitchenV2Presentation } from "@/lib/operationsKitchenV2Presentation";
import { buildOperationsOrderPresentation } from "@/lib/operationsOrderPresentation";
import type { QueueAction, UnifiedQueueItem } from "@/types/dashboardOpsTypes";
import { isOneTimeOrder, isPickupRequest } from "@/types/dashboardOpsTypes";
import { OperationsKitchenV2Summary } from "./OperationsKitchenV2Summary";
import { OperationsOrderDetailsDialog } from "./OperationsOrderDetailsDialog";

interface OperationsQueueTableProps {
  items: UnifiedQueueItem[];
  isPending: boolean;
  pendingActions?: PendingOperationsActions;
  onAction: (
    item: UnifiedQueueItem,
    action: string,
    actionLabel: string,
    isDangerous?: boolean
  ) => void;
  onFulfill?: (item: UnifiedQueueItem) => void;
}

type ButtonVariant = ComponentProps<typeof Button>["variant"];

type VisibleAction = QueueAction & {
  color: string;
  icon: string;
  requiresReason: boolean;
};

const actionIcons: Record<string, ReactNode> = {
  prepare: <ChefHat className="ml-1.5 h-3.5 w-3.5" />,
  start_preparation: <ChefHat className="ml-1.5 h-3.5 w-3.5" />,
  ready_for_pickup: <CheckCircle2 className="ml-1.5 h-3.5 w-3.5" />,
  dispatch: <Truck className="ml-1.5 h-3.5 w-3.5" />,
  fulfill: <CheckCircle2 className="ml-1.5 h-3.5 w-3.5" />,
  cancel: <XCircle className="ml-1.5 h-3.5 w-3.5" />,
};

const badgeClasses: Record<string, string> = {
  green: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  blue: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  yellow: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  orange: "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  red: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
  gray: "border-muted bg-muted/40 text-muted-foreground",
};

function getStatusClasses(item: UnifiedQueueItem) {
  const badge = item.ui?.badge || item.ui?.color || "";
  if (badgeClasses[badge]) return badgeClasses[badge];
  if (["fulfilled", "ready_for_pickup"].includes(item.status)) return badgeClasses.green;
  if (["in_preparation", "preparing"].includes(item.status)) return badgeClasses.blue;
  if (["canceled", "cancelled", "no_show"].includes(item.status)) return badgeClasses.red;
  return badgeClasses.yellow;
}

function getActionVariant(color: string): ButtonVariant {
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

function getCustomerName(item: UnifiedQueueItem) {
  return item.customer?.name || item.customer?.phone || "عميل";
}

function getPickupInfo(item: UnifiedQueueItem) {
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

function getDeliveryInfo(item: UnifiedQueueItem) {
  const delivery = item.fulfillment?.delivery;
  return {
    address: delivery?.addressSummary || "-",
    window: delivery?.window || delivery?.deliveryWindow || item.fulfillment?.deliverySlot || "-",
  };
}

function normalizeAction(action: QueueAction): VisibleAction | null {
  if (!action.id) return null;
  return {
    ...action,
    label: action.label || action.id,
    color: action.color || "gray",
    icon: action.icon || "",
    requiresReason: Boolean(action.requiresReason),
  };
}

function getVisibleActions(item: UnifiedQueueItem) {
  return (item.allowedActions || [])
    .map(normalizeAction)
    .filter((action): action is VisibleAction => action !== null);
}

function isActionDisabled(
  item: UnifiedQueueItem,
  action: VisibleAction,
  pendingActions?: PendingOperationsActions
) {
  return Boolean(pendingActions?.[item.id] || action.disabled);
}

function searchableText(item: UnifiedQueueItem) {
  const kitchen = buildKitchenV2Presentation(item);
  const order = buildOperationsOrderPresentation(item);
  const pickup = getPickupInfo(item);
  const delivery = getDeliveryInfo(item);

  return [
    getCustomerName(item),
    item.customer?.phone,
    item.reference,
    item.orderNumber,
    item.status,
    item.statusLabel,
    pickup.branch,
    pickup.window,
    delivery.address,
    delivery.window,
    kitchen.searchText,
    order.searchText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function ActionButtons({
  item,
  pendingActions,
  onAction,
  onFulfill,
  onDetails,
}: {
  item: UnifiedQueueItem;
  pendingActions?: PendingOperationsActions;
  onAction: OperationsQueueTableProps["onAction"];
  onFulfill?: OperationsQueueTableProps["onFulfill"];
  onDetails: (item: UnifiedQueueItem) => void;
}) {
  const actions = getVisibleActions(item);
  const pending = pendingActions?.[item.id];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => {
        const disabled = isActionDisabled(item, action, pendingActions);
        const label =
          pending?.actionId === action.id ? `جار ${pending.label}...` : action.label;
        const handleClick = () => {
          if (disabled) return;
          if (action.id === "fulfill" && onFulfill) {
            onFulfill(item);
            return;
          }
          onAction(item, action.id, action.label, action.color === "red");
        };

        return (
          <Button
            key={action.id}
            size="sm"
            variant={getActionVariant(action.color)}
            disabled={disabled}
            title={action.disabledReason || undefined}
            onClick={handleClick}
          >
            {actionIcons[action.id] ?? null}
            {label}
          </Button>
        );
      })}
      <Button size="sm" variant="outline" onClick={() => onDetails(item)}>
        <Eye className="ml-1.5 h-3.5 w-3.5" />
        عرض التفاصيل الكاملة
      </Button>
      {!actions.length ? (
        <p className="w-full text-xs text-muted-foreground">
          لا توجد إجراءات متاحة من النظام الآن
        </p>
      ) : null}
    </div>
  );
}

function FulfillmentSummary({ item }: { item: UnifiedQueueItem }) {
  if (item.mode === "delivery" && item.source === "subscription") {
    const delivery = getDeliveryInfo(item);
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        <InfoPill icon={<Truck className="h-3.5 w-3.5" />} label={delivery.address} />
        <InfoPill icon={<Clock className="h-3.5 w-3.5" />} label={delivery.window} />
      </div>
    );
  }

  const pickup = getPickupInfo(item);
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <InfoPill icon={<Store className="h-3.5 w-3.5" />} label={pickup.branch} />
      <InfoPill icon={<Clock className="h-3.5 w-3.5" />} label={pickup.window} />
      {pickup.code ? (
        <InfoPill icon={<MapPin className="h-3.5 w-3.5" />} label={pickup.code} />
      ) : null}
      {pickup.codeState ? (
        <InfoPill icon={<MapPin className="h-3.5 w-3.5" />} label={pickup.codeState} />
      ) : null}
    </div>
  );
}

function InfoPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/45 px-3 py-2 text-xs font-semibold text-muted-foreground">
      {icon}
      <span className="truncate">{label}</span>
    </div>
  );
}

function OperationsQueueCard({
  item,
  pendingActions,
  onAction,
  onFulfill,
  onDetails,
}: {
  item: UnifiedQueueItem;
  pendingActions?: PendingOperationsActions;
  onAction: OperationsQueueTableProps["onAction"];
  onFulfill?: OperationsQueueTableProps["onFulfill"];
  onDetails: (item: UnifiedQueueItem) => void;
}) {
  const kitchen = buildKitchenV2Presentation(item);
  const order = buildOperationsOrderPresentation(item);
  const customerName = getCustomerName(item);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="border-b bg-muted/15 p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/10 bg-primary/10 text-sm font-bold text-primary uppercase">
              {customerName.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="break-words text-base font-bold">{customerName}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground" dir="ltr">
                <Phone className="h-3 w-3" />
                {item.customer?.phone || "-"}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={`shrink-0 rounded-md ${getStatusClasses(item)}`}
          >
            {item.statusLabel || item.status}
          </Badge>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="secondary" className="rounded-lg px-2.5 py-1">
            {getSourceLabel(item)}
          </Badge>
          <Badge variant="outline" className="rounded-lg px-2.5 py-1" dir="ltr">
            {item.reference}
          </Badge>
          {item.orderNumber ? (
            <Badge variant="outline" className="rounded-lg px-2.5 py-1" dir="ltr">
              {item.orderNumber}
            </Badge>
          ) : null}
          <Badge variant="outline" className="rounded-lg px-2.5 py-1">
            {getModeLabel(item.mode)}
          </Badge>
          {isOneTimeOrder(item) ? (
            <Badge variant="outline" className="rounded-lg px-2.5 py-1" dir="ltr">
              {order.totalLabel}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3.5">
        <FulfillmentSummary item={item} />
        <OperationsKitchenV2Summary presentation={kitchen} compact />
      </div>

      <div className="border-t bg-muted/15 p-3.5">
        <ActionButtons
          item={item}
          pendingActions={pendingActions}
          onAction={onAction}
          onFulfill={onFulfill}
          onDetails={onDetails}
        />
      </div>
    </article>
  );
}

export function OperationsQueueTable({
  items = [],
  pendingActions,
  onAction,
  onFulfill,
}: OperationsQueueTableProps) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [detailsItem, setDetailsItem] = useState<UnifiedQueueItem | null>(null);

  const filteredItems = useMemo(() => {
    const query = globalFilter.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => searchableText(item).includes(query));
  }, [globalFilter, items]);

  if (!items.length) {
    return (
      <EmptyState
        icon={PackageOpen}
        title="لا توجد طلبات"
        description="لا توجد طلبات مطابقة في هذا المسار حالياً."
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
            عرض مختصر من حقول Kitchen v2 وبيانات العميل والتنفيذ والإجراءات من الباكند.
          </p>
        </div>
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="بحث بالعميل، الهاتف، المرجع، الكارت، القسم أو الإضافة..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="h-10 pr-9"
          />
        </div>
      </div>

      {filteredItems.length ? (
        <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          {filteredItems.map((item) => (
            <OperationsQueueCard
              key={item.id}
              item={item}
              pendingActions={pendingActions}
              onAction={onAction}
              onFulfill={onFulfill}
              onDetails={setDetailsItem}
            />
          ))}
        </div>
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
