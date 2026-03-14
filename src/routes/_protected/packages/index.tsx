import { SectionCards } from "@/components/custom/section-cards";
import { Button, buttonVariants } from "@/components/ui/button";
import { packagesSectionCards } from "@/constants/SectionCardsData";
import { cn } from "@/lib/utils";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";

export const Route = createFileRoute("/_protected/packages/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <SectionCards cardsData={packagesSectionCards} />
      <div className="px-4 lg:px-6">
        <Link
          to="/packages/create"
          className={cn(buttonVariants({ variant: "default" }), "bg-primary")}
        >
          <PlusIcon />
          إضافة باقة جديدة
        </Link>
      </div>
    </>
  );
}
