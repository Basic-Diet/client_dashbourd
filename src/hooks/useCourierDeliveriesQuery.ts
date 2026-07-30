import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  DashboardOpsActionRequest,
  QueueAction,
} from "@/types/dashboardOpsTypes";
import {
  executeCourierDeliveryAction,
  fetchCourierDeliveryList,
} from "@/utils/fetchCourierDeliveries";

export const courierDeliveryKeys = {
  all: ["courier-deliveries"] as const,
  list: (date: string) => ["courier-deliveries", "list", date] as const,
};

export const useCourierDeliveryListQuery = (date: string) =>
  useQuery({
    queryKey: courierDeliveryKeys.list(date),
    queryFn: () => fetchCourierDeliveryList(date),
    enabled: /^\d{4}-\d{2}-\d{2}$/.test(date),
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
    staleTime: 15_000,
  });

export const useCourierDeliveryActionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      action,
      payload,
      actionDef,
    }: {
      action: string;
      payload: DashboardOpsActionRequest;
      actionDef?: QueueAction;
      itemId: string;
    }) => executeCourierDeliveryAction({ action, payload, actionDef }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: courierDeliveryKeys.all,
        refetchType: "active",
      });
      await queryClient.invalidateQueries({
        queryKey: ["accounting-daily-report"],
        refetchType: "active",
      });
      toast.success("تم تحديث حالة التوصيل وعرض أحدث بيانات الخادم.");
    },
    onError: (
      error: Error & {
        response?: {
          data?: { message?: string; error?: string; code?: string };
        };
      }
    ) => {
      const backendMessage =
        error?.response?.data?.message || error?.response?.data?.error;
      toast.error(backendMessage || "تعذر تحديث حالة التوصيل. حاول مرة أخرى.");
    },
  });
};
