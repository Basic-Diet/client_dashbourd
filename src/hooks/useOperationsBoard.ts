import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/apis";
import {
  buildOperationsActionPayload,
  getCourierItems,
  getEndpointForAction,
  getPickupItems,
  getPreparationItems,
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

export function useOperationsBoard(params: UseOperationsBoardParams = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
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
      const pickupItems = getPickupItems(items);
      const courierItems = getCourierItems(items);

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
      reason?: string;
      notes?: string;
      pickupCode?: string;
    }) => {
      const actionDef = item.allowedActions?.find(
        (entry) => entry.id === action
      );
      const endpoint = actionDef?.endpoint || getEndpointForAction(action);
      const method = (actionDef?.method || "POST").toLowerCase();
      const payload = buildOperationsActionPayload(
        item,
        action,
        reason,
        notes,
        pickupCode
      );
      const { data } = await api.request<DashboardOpsActionResponse>({
        url: endpoint,
        method,
        data: payload,
      });
      return data;
    },
    onSuccess: (_data, variables) => {
      toast.success(`تم تنفيذ ${variables.action} بنجاح`);
      queryClient.invalidateQueries({ queryKey: ["operations-board", "queue"] });
    },
    onError: (error: unknown) => {
      const err = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "حدث خطأ غير متوقع"
      );
      queryClient.invalidateQueries({ queryKey: ["operations-board", "queue"] });
    },
  });

  const requestAction = (
    item: UnifiedQueueItem,
    action: string,
    _actionLabel: string,
    _isDangerous?: boolean,
    reason?: string,
    notes?: string,
    pickupCode?: string
  ) => {
    actionMutation.mutate({ item, action, reason, notes, pickupCode });
  };

  return {
    screenLabel,
    visibleScreens,
    itemsByScreen,
    allItems,
    isLoading: visibleScreens.length > 0 && queueQuery.isLoading,
    isPending: actionMutation.isPending,
    requestAction,
  };
}

export type { OperationsScreen as Screen } from "@/lib/operationsBoard";
export { OPERATIONS_SCREENS as SCREENS, getScreensForRole };
