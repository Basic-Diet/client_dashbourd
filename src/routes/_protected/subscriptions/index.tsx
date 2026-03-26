/* eslint-disable @typescript-eslint/no-explicit-any */
import { SectionCards } from "@/components/custom/section-cards";
import { getSubscriptionsSectionCards } from "@/constants/SectionCardsData";
import { createFileRoute } from "@tanstack/react-router";
import { subscriptionsSummaryQueryOptions } from "@/hooks/useSubscriptionsQuery";
import { Loader } from "@/components/global/loader";
import { useSuspenseQuery } from "@tanstack/react-query";
import { SubscriptionsTable } from "@/components/pages/subscriptions/subscriptions-table";
import type { SubscriptionSummaryResponse } from "@/types/subscriptionTypes";

export const Route = createFileRoute("/_protected/subscriptions/")({
  component: RouteComponent,
  loader: ({ context: { queryClient } }: any) =>
    queryClient.ensureQueryData(subscriptionsSummaryQueryOptions()),
  pendingComponent: () => (
    <Loader variant="full-screen" label="جاري تحميل الاشتراكات..." />
  ),
});

function RouteComponent() {
  const { data: summaryResponse } = useSuspenseQuery(
    subscriptionsSummaryQueryOptions()
  );
  const typedResponse = summaryResponse as SubscriptionSummaryResponse;

  const summary = typedResponse?.data?.summary;
  const cardsData = getSubscriptionsSectionCards(summary);

  return (
    <>
      <SectionCards cardsData={cardsData} />
      <SubscriptionsTable />
    </>
  );
}
