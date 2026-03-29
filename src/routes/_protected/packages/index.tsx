import { SectionCards } from "@/components/custom/section-cards";
import { getPackagesSectionCards } from "@/constants/SectionCardsData";
import { createFileRoute } from "@tanstack/react-router";
import { packagesQueryOptions } from "@/hooks/usePackagesQuery";
import { Loader } from "@/components/global/loader";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PackagesTable } from "@/components/pages/packages/packages-table";
import type { PackagesResponse } from "@/types/packageTypes";

export const Route = createFileRoute("/_protected/packages/")({
  component: RouteComponent,
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(packagesQueryOptions()),
  pendingComponent: () => (
    <Loader variant="full-screen" label="جاري تحميل الباقات..." />
  ),
});

function RouteComponent() {
  const { data: packagesResponse } = useSuspenseQuery(packagesQueryOptions());
  const typedResponse = packagesResponse as PackagesResponse;

  const packages = typedResponse?.data || [];
  const summary = typedResponse?.summary;
  const cardsData = getPackagesSectionCards(summary);

  return (
    <>
      <SectionCards cardsData={cardsData} />
      <PackagesTable data={packages} />
    </>
  );
}
