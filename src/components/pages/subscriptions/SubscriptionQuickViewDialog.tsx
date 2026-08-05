import type { Subscription } from "@/types/subscriptionTypes";
import { SubscriptionTrackingExperienceV7 } from "./SubscriptionTrackingExperienceV7";

export function SubscriptionQuickViewDialog({
  subscription,
  open,
  onOpenChange,
}: {
  subscription: Subscription | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <SubscriptionTrackingExperienceV7
      key={`${subscription?._id ?? "none"}:${open ? "open" : "closed"}`}
      subscription={subscription}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}
