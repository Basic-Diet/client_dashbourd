import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  subscriptionDetailsQueryOptions,
  useUnfreezeSubscriptionMutation,
} from "@/hooks/useSubscriptionsQuery";
import { Loader } from "@/components/global/loader";
import { useSuspenseQuery } from "@tanstack/react-query";

import { SubscriptionHeader } from "@/components/pages/subscriptions/details/subscription-header";
import {
  CustomerInfoCard,
  SubscriptionContractCard,
  DeliveryInfoCard,
  TechnicalDetailsAccordion,
  PremiumMealsCard,
  AddonsCard,
} from "@/components/pages/subscriptions/details/subscription-details-cards";

import { FreezeModal } from "@/components/pages/subscriptions/details/modals/freeze-modal";
import { ExtendModal } from "@/components/pages/subscriptions/details/modals/extend-modal";
import { CancelModal } from "@/components/pages/subscriptions/details/modals/cancel-modal";
import { ToastMessage } from "@/components/global/ToastMessage";

export const Route = createFileRoute(
  "/_protected/subscriptions/$subscriptionId/"
)({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      subscriptionDetailsQueryOptions(params.subscriptionId)
    ),
  pendingComponent: () => (
    <Loader variant="full-screen" label="جاري تحميل تفاصيل الاشتراك..." />
  ),
  component: SubscriptionDetailsPage,
});

function SubscriptionDetailsPage() {
  const { subscriptionId } = Route.useParams();
  const { data: response } = useSuspenseQuery(
    subscriptionDetailsQueryOptions(subscriptionId)
  );

  const subscription = response.data;
  const { mutateAsync: unfreezeSubscription } =
    useUnfreezeSubscriptionMutation();

  const [isFreezeModalOpen, setIsFreezeModalOpen] = useState(false);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const handleUnfreeze = async () => {
    try {
      await unfreezeSubscription(subscription._id);
      ToastMessage("تم إلغاء التجميد بنجاح", "success");
    } catch (error) {
      console.error(error);
      ToastMessage("حدث خطأ أثناء إلغاء تجميد الاشتراك", "error");
    }
  };

  return (
    <div className="flex-1 space-y-6 px-2 pt-4">
      <SubscriptionHeader
        subscription={subscription}
        onFreeze={() => setIsFreezeModalOpen(true)}
        onExtend={() => setIsExtendModalOpen(true)}
        onCancel={() => setIsCancelModalOpen(true)}
        onUnfreeze={handleUnfreeze}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-6">
          <CustomerInfoCard subscription={subscription} />
          <DeliveryInfoCard subscription={subscription} />
          <TechnicalDetailsAccordion subscription={subscription} />
        </div>
        <div className="flex flex-col gap-6">
          <SubscriptionContractCard subscription={subscription} />
          <PremiumMealsCard subscription={subscription} />
          <AddonsCard subscription={subscription} />
        </div>
      </div>

      <FreezeModal
        subscriptionId={subscription._id}
        isOpen={isFreezeModalOpen}
        onClose={() => setIsFreezeModalOpen(false)}
      />
      <ExtendModal
        subscriptionId={subscription._id}
        isOpen={isExtendModalOpen}
        onClose={() => setIsExtendModalOpen(false)}
      />
      <CancelModal
        subscriptionId={subscription._id}
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
      />
    </div>
  );
}
