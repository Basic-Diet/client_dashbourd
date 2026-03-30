import { createFileRoute, Link } from "@tanstack/react-router";
import { CreateSubscriptionFormContent } from "@/components/pages/subscriptions/create/CreateSubscriptionFormContent";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "lucide-react";
import { userDetailsQueryOptions } from "@/hooks/useUsersQuery";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Loader } from "@/components/global/loader";

export const Route = createFileRoute(
  "/_protected/users/$userId/create-subscription"
)({
  loader: ({ context, params }) => {
    context.queryClient.ensureQueryData(
      userDetailsQueryOptions(params.userId)
    );
  },
  pendingComponent: Loader,
  component: CreateSubscriptionPage,
});

function CreateSubscriptionPage() {
  const { userId } = Route.useParams();
  const { data: response } = useSuspenseQuery(
    userDetailsQueryOptions(userId)
  );

  const userName = response?.data?.fullName || "";

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
          <Link to="/users/$userId" params={{ userId }}>
            <ArrowRightIcon className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            إنشاء اشتراك جديد
          </h1>
          <p className="text-muted-foreground">
            إنشاء اشتراك جديد للمستخدم{" "}
            <span className="font-semibold text-foreground">{userName}</span>
          </p>
        </div>
      </div>

      <CreateSubscriptionFormContent userId={userId} />
    </div>
  );
}
