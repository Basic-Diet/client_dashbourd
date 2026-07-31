import { useQuery } from "@tanstack/react-query";
import { fetchSubscriptionTracking } from "@/utils/fetchSubscriptionTracking";
import { manualDeductionDisplayLabel } from "@/utils/subscriptionMovementLabels";
import type { SubscriptionTrackingResponse } from "@/types/subscriptionTrackingTypes";
import type { SubscriptionTrackingDataWithProvenance } from "@/types/subscriptionMovementProvenanceTypes";

export const subscriptionTrackingQueryKey = (subscriptionId: string) =>
  ["subscription-tracking", subscriptionId] as const;

function normalizeManualDeductionLabels(
  response: SubscriptionTrackingResponse
): SubscriptionTrackingResponse {
  const tracking = response.data as SubscriptionTrackingDataWithProvenance;
  const movements = tracking.provenance?.movements;

  if (!movements?.length) return response;

  let changed = false;
  const normalizedMovements = movements.map((movement) => {
    if (movement.sourceCode !== "dashboard_manual_deduction") return movement;

    const deductedMeals =
      movement.deductionDetails?.totalMeals ?? movement.quantity;
    const sourceLabel = manualDeductionDisplayLabel(deductedMeals);
    const completionLabel = "تم الخصم يدويًا";

    if (
      movement.sourceLabel === sourceLabel &&
      movement.completion.label === completionLabel
    ) {
      return movement;
    }

    changed = true;
    return {
      ...movement,
      sourceLabel,
      completion: {
        ...movement.completion,
        label: completionLabel,
      },
    };
  });

  if (!changed) return response;

  const normalizedTracking: SubscriptionTrackingDataWithProvenance = {
    ...tracking,
    provenance: {
      ...tracking.provenance!,
      movements: normalizedMovements,
    },
  };

  return {
    ...response,
    data: normalizedTracking,
  };
}

export function useSubscriptionTrackingQuery(subscriptionId: string) {
  return useQuery({
    queryKey: subscriptionTrackingQueryKey(subscriptionId),
    queryFn: () => fetchSubscriptionTracking(subscriptionId),
    select: normalizeManualDeductionLabels,
    enabled: Boolean(subscriptionId),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}
