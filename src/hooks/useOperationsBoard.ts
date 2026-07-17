import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/lib/apiErrors";
import api from "@/lib/apis";
import {
  buildOperationsActionPayload,
  getCourierItems,
  getInvalidActionReason,
  getPickupItems,
  getScreensForRole,
  OPERATIONS_SCREENS,
  type OperationsScreen,
} from "@/lib/operationsBoard";
import type {
  DashboardOpsActionResponse,
  UnifiedQueueItem,
} from "@/types/dashboardOpsTypes";
import {
  fetchDashboardOpsList,
  fetchDashboardOpsSearch,
} from "@/utils/fetchDashboardOpsData";

export type PendingOperationsActions = Record<
  string,
  { actionId: string; label: string }
>;

interface UseOperationsBoardParams {
  date?: string;
  q?: string;
}

const itemTimestamp = (item: UnifiedQueueItem) => {
  const raw =
    item.timestamps?.updatedAt ||
    item.timestamps?.createdAt ||
    item.context.date ||
    "";
  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : 0;
};

const newestFirst = (items: UnifiedQueueItem[]) =>
  [...items].sort((a, b) => itemTimestamp(b) - itemTimestamp(a));

const PREPARATION_ACTIONS = new Set([
  "prepare",
  "start_preparation",
  "ready_for_pickup",
  "ready_for_delivery",
]);

const ACTIVE_PREPARATION_STATUSES = new Set([
  "preparing",
  "in_preparation",
]);

function hasPreparationAction(item: UnifiedQueueItem): boolean {
  const actionIds = (item.allowedActions || []).map((action) => action.id);

  return actionIds.some((id) => Boolean(id && PREPARATION_ACTIONS.has(id)));
}

function hasKitchenWorkload(item: UnifiedQueueItem): boolean {
  if (item.kitchen?.version !== "v2") return false;
  return Boolean(
    item.kitchen.mealCount > 0 ||
      item.kitchen.cards.length > 0 ||
      item.kitchen.addonGroups.length > 0
  );
}

function isPreparationQueueItem(item: UnifiedQueueItem): boolean {
  if (hasPreparationAction(item)) return true;
  if (!hasKitchenWorkload(item)) return false;

  return ACTIVE_PREPARATION_STATUSES.has(item.status);
}

function getPreparationItems(items: UnifiedQueueItem[] = []): UnifiedQueueItem[] {
  return items.filter(isPreparationQueueItem);
}

function excludeItems(
  items: UnifiedQueueItem[],
  excludedItems: UnifiedQueueItem[]
): UnifiedQueueItem[] {
  const excludedIds = new Set(excludedItems.map((item) => item.id));
  return items.filter((item) => !excludedIds.has(item.id));
}

export function useOperationsBoard(params: UseOperationsBoardParams = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const pendingActionsRef = useRef<PendingOperationsActions>({});
  const [pendingActions, setPendingActions] = useState<PendingOperationsActions>({});
  const role = user?.role;
  const { label: screenLabel, screens: visibleScreens } =
    getScreensForRole(role);

  const queueQuery = useQuery({
    queryKey: [
      "operations-board",
      "queue",
      visibleScreens,
      params.date,
      params.q,
    ],
    queryFn: async () => {
      const search = params.q?.trim() || "";
      const response =
        search.length >= 3
          ? await fetchDashboardOpsSearch(search)
          : await fetchDashboardOpsList(params.date || "");
      const items = response.data?.items ?? [];
      const kitchenItems = getPreparationItems(items);
      const pickupItems = excludeItems(getPickupItems(items), kitchenItems);
      const courierItems = excludeItems(getCourierItems(items), kitchenItems);

      return [
        { screen: "kitchen" as const, items: newestFirst(kitchenItems) },
        { screen: "pickup" as const, items: newestFirst(pickupItems) },
        { screen: "courier" as const, items: newestFirst(courierItems) },
      ].filter((result) => visibleScreens.includes(result.screen));
    },
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
    placeholderData: (prev) => prev,
    enabled: visibleScreens.length > 0,
  });

  const emptyItemsByScreen: Record<OperationsScreen, UnifiedQueueItem[]> = {
    kitchen: [],
    pickup: [],
    courier: [],
  };

  const itemsByScreen =
    queueQuery.data?.reduce(
      (acc, result) => {
        acc[result.screen] = Array.isArray(result.items) ? result.items : [];
        return acc;
      },
      { ...emptyItemsByScreen }
    ) ?? { ...emptyItemsByScreen };

  const allItems = Object.values(itemsByScreen).flat();

  const actionMutation = useMutation({
    mutationFn: async ({
      item,
      action,
      reason,
      notes,
      pickupCode,
    }: {
      item: UnifiedQueueItem;
      action: string;
      orderId: string;
      actionLabel?: string;
      reason?: string;
      notes?: string;
      pickupCode?: string;
    }) => {
      const actionDef = item.allowedActions?.find(
        (entry) => entry.id === action
      );
      if (!actionDef) {
        throw new Error("هذا الإجراء غير موجود ضمن الصلاحيات المرسلة من الخادم.");
      }
      const invalidReason =
        actionDef.disabledReason || getInvalidActionReason(actionDef);
      if (actionDef.disabled || invalidReason) {
        throw new Error(invalidReason || "هذا الإجراء غير متاح حالياً.");
      }
      const method = actionDef.method.toLowerCase();
      const payload = buildOperationsActionPayload(
        item,
        action,
        reason,
        notes,
        pickupCode
      );
      const { data } = await api.request<DashboardOpsActionResponse>({
        url: actionDef.endpoint,
        method,
        data: payload,
      });
      return data;
    },
    onSuccess: async (_data, variables) => {
      toast.success(`تم تنفيذ ${variables.actionLabel || variables.action} بنجاح`);
      await queryClient.refetchQueries({
        queryKey: ["operations-board", "queue"],
        type: "active",
      });
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error) || "تعذر تنفيذ الإجراء");
    },
    onSettled: (_data, _error, variables) => {
      if (!variables) return;
      const next = { ...pendingActionsRef.current };
      delete next[variables.orderId];
      pendingActionsRef.current = next;
      setPendingActions(next);
    },
  });

  const requestAction = (
    item: UnifiedQueueItem,
    action: string,
    actionLabel?: string,
    _isDangerous?: boolean,
    reason?: string,
    notes?: string,
    pickupCode?: string
  ) => {
    const orderId = item.id;
    if (pendingActionsRef.current[orderId]) return;

    const next = {
      ...pendingActionsRef.current,
      [orderId]: { actionId: action, label: actionLabel || action },
    };
    pendingActionsRef.current = next;
    setPendingActions(next);
    actionMutation.mutate({
      item,
      action,
      orderId,
      actionLabel,
      reason,
      notes,
      pickupCode,
    });
  };

  return {
    role,
    screenLabel,
    visibleScreens,
    allItems,
    itemsByScreen,
    isLoading: queueQuery.isLoading,
    isPending: Object.keys(pendingActions).length > 0,
    pendingActions,
    requestAction,
    queueQuery,
    actionMutation,
    screens: OPERATIONS_SCREENS,
  };
}
