import { createFileRoute, Link } from "@tanstack/react-router";
import { CreateSubscriptionFormContent } from "@/components/pages/subscriptions/create/CreateSubscriptionFormContent";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "lucide-react";

export const Route = createFileRoute("/_protected/subscriptions/create")({
  component: CreateSubscriptionPage,
});

function CreateSubscriptionPage() {
  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="shrink-0 rounded-full"
        >
          <Link to="/subscriptions">
            <ArrowRightIcon className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            إنشاء اشتراك جديد
          </h1>
          <p className="text-muted-foreground">
            اختر المستخدم والباقة والإضافات لإنشاء اشتراك جديد
          </p>
        </div>
      </div>

      <CreateSubscriptionFormContent />
    </div>
  );
}
