import { AlertCircle, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSubscriptionManualDeductionsQuery } from "@/hooks/useSubscriptionsQuery";
import {
  getAddonName,
  getFulfillmentLabel,
  getReasonLabel,
  mapManualDeductionError,
  type ManualDeductionSearchSubscription,
} from "./manualDeductionModel";

interface ManualDeductionHistoryProps {
  subscription: ManualDeductionSearchSubscription | null;
}

const formatDateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString("ar-EG") : "غير متاح";

export function ManualDeductionHistory({
  subscription,
}: ManualDeductionHistoryProps) {
  const query = useSubscriptionManualDeductionsQuery(subscription?.id ?? null);
  const items = query.data?.data.items ?? [];
  const latestItems = items.slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5" />
          آخر الخصومات اليدوية
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!subscription ? (
          <p className="text-sm text-muted-foreground">
            اختر اشتراكاً لعرض السجل.
          </p>
        ) : null}

        {query.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : null}

        {query.isError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{mapManualDeductionError(query.error).message}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void query.refetch()}
              >
                <RefreshCw className="h-4 w-4" />
                إعادة المحاولة
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {subscription && !query.isLoading && !query.isError && !items.length ? (
          <p className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
            لا توجد خصومات يدوية مسجلة لهذا الاشتراك.
          </p>
        ) : null}

        {latestItems.map((item, index) => (
          <div
            key={item.id ?? `${item.createdAt ?? "deduction"}-${index}`}
            className="rounded-lg border bg-card p-4"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-semibold">{formatDateTime(item.createdAt)}</p>
                <p className="text-xs text-muted-foreground">
                  يوم العمل: {item.businessDate ?? "غير متاح"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {getFulfillmentLabel(item.fulfillmentMethod)}
                </Badge>
                <Badge variant="secondary">
                  {item.actor.role ?? "دور غير متاح"}
                </Badge>
              </div>
            </div>

            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              <p>عادي: {item.deducted.regularMeals}</p>
              <p>مميز: {item.deducted.premiumMeals}</p>
              <p>الإجمالي: {item.deducted.total}</p>
            </div>

            {item.deducted.addons.length ? (
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {item.deducted.addons.map((addon) => (
                  <span
                    key={addon.addonId}
                    className="rounded-full border bg-muted/30 px-2 py-1"
                  >
                    {getAddonName(addon.addonId, subscription ?? undefined)}: {addon.qty}
                    {addon.remainingAfter !== undefined
                      ? `، المتبقي ${addon.remainingAfter}`
                      : ""}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
              <p>
                قبل: عادي {item.before.remainingRegularMeals ?? "-"}، مميز{" "}
                {item.before.remainingPremiumMeals ?? "-"}، كلي{" "}
                {item.before.remainingMeals ?? "-"}
              </p>
              <p>
                بعد: عادي {item.after.remainingRegularMeals ?? "-"}، مميز{" "}
                {item.after.remainingPremiumMeals ?? "-"}، كلي{" "}
                {item.after.remainingMeals ?? "-"}
              </p>
            </div>

            <p className="mt-3 text-sm">
              <span className="text-muted-foreground">السبب: </span>
              {getReasonLabel(item.reason)}
            </p>
            {item.notes ? (
              <p className="mt-1 text-sm text-muted-foreground">{item.notes}</p>
            ) : null}
          </div>
        ))}

        {items.length > latestItems.length ? (
          <p className="text-xs text-muted-foreground">
            يتم عرض آخر {latestItems.length} من أصل {query.data?.data.count ?? items.length}.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
