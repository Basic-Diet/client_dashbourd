import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Package,
  Phone,
  PlusCircle,
  User,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useManualDeductSubscriptionMutation,
  useSearchSubscriptionsByPhoneQuery,
} from "@/hooks/useSubscriptionsQuery";
import { CustomerSearch } from "./CustomerSearch";
import { DeductionForm, type DeductionFormReturn, type DeductionFormValues } from "./DeductionForm";
import { ManualDeductionHistory } from "./ManualDeductionHistory";
import {
  getAddonName,
  getFulfillmentLabel,
  mapManualDeductionError,
  normalizeManualDeductionSearchResponse,
  type ManualDeductionBlockedMap,
  type ManualDeductionMutationResponse,
  type ManualDeductionPayload,
  type NormalizedManualDeductionSubscription,
} from "./manualDeductionModel";

function AddonSummary({ subscription }: { subscription: NormalizedManualDeductionSubscription }) {
  const available = subscription.addonBalances.filter((addon) => addon.remainingQty > 0).length;
  return (
    <Badge variant="secondary" className="gap-1">
      <PlusCircle className="h-3 w-3" />
      {available} متاح
    </Badge>
  );
}

function DailyStatusBadge({
  subscription,
}: {
  subscription: NormalizedManualDeductionSubscription;
}) {
  if (subscription.fulfillmentMethod === "pickup") {
    return <Badge variant="outline">استلام متعدد مسموح</Badge>;
  }

  if (subscription.dailyDeduction.blocked) {
    return (
      <Badge
        variant="outline"
        className="border-amber-500/40 bg-amber-500/10 text-amber-700"
      >
        يوجد خصم توصيل اليوم
      </Badge>
    );
  }

  if (!subscription.dailyDeduction.known) {
    return <Badge variant="outline">حالة اليوم غير مؤكدة</Badge>;
  }

  return <Badge variant="secondary">لا يوجد خصم توصيل اليوم</Badge>;
}

function SubscriptionAction({
  subscription,
  disabled,
  onSelect,
}: {
  subscription: NormalizedManualDeductionSubscription;
  disabled: boolean;
  onSelect: (subscription: NormalizedManualDeductionSubscription) => void;
}) {
  const blocked =
    subscription.fulfillmentMethod === "delivery" &&
    subscription.dailyDeduction.blocked;

  if (blocked) {
    return (
      <div className="space-y-2">
        <Button variant="outline" size="sm" disabled>
          غير متاح
        </Button>
        <p className="max-w-44 text-xs text-muted-foreground">
          لا يمكن تنفيذ خصم توصيل مرتين لنفس يوم العمل.
        </p>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={() => onSelect(subscription)}
    >
      اختيار
    </Button>
  );
}

function ReceiptCard({
  receipt,
  subscription,
}: {
  receipt: ManualDeductionMutationResponse | null;
  subscription: NormalizedManualDeductionSubscription | null;
}) {
  if (!receipt) return null;
  const data = receipt.data;

  return (
    <Card className="border-emerald-500/30 bg-emerald-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-emerald-700">
          <CheckCircle2 className="h-5 w-5" />
          تم تنفيذ الخصم
        </CardTitle>
        <CardDescription>
          يوم العمل {data.businessDate} - {getFulfillmentLabel(data.fulfillmentMethod)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-background p-3">
            <p className="text-xs text-muted-foreground">عادي مخصوم</p>
            <p className="font-semibold">{data.deducted.regularMeals}</p>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <p className="text-xs text-muted-foreground">مميز مخصوم</p>
            <p className="font-semibold">{data.deducted.premiumMeals}</p>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <p className="text-xs text-muted-foreground">إجمالي الوجبات</p>
            <p className="font-semibold">{data.deducted.total}</p>
          </div>
        </div>

        {data.deducted.addons.length ? (
          <div className="flex flex-wrap gap-2">
            {data.deducted.addons.map((addon) => (
              <Badge key={addon.addonId} variant="outline">
                {getAddonName(addon.addonId, subscription ?? undefined)}: {addon.qty}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-background p-3">
            <p className="text-xs text-muted-foreground">المتبقي العادي</p>
            <p className="font-semibold">{data.remaining.regularMeals}</p>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <p className="text-xs text-muted-foreground">المتبقي المميز</p>
            <p className="font-semibold">{data.remaining.premiumMeals}</p>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <p className="text-xs text-muted-foreground">المتبقي الكلي</p>
            <p className="font-semibold">{data.remaining.totalMeals}</p>
          </div>
        </div>

        {data.remaining.addons.length ? (
          <div className="flex flex-wrap gap-2 text-sm">
            {data.remaining.addons.map((addon) => (
              <span key={addon.addonId} className="rounded-full border bg-background px-3 py-1">
                {getAddonName(addon.addonId, subscription ?? undefined)}: المتبقي{" "}
                {addon.remainingQty}
              </span>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function applyReceiptToSubscription(
  subscription: NormalizedManualDeductionSubscription,
  receipt: ManualDeductionMutationResponse | null
): NormalizedManualDeductionSubscription {
  if (!receipt || receipt.data.subscriptionId !== subscription.id) {
    return subscription;
  }

  const remainingAddons = receipt.data.remaining.addons;

  return {
    ...subscription,
    remainingMeals: receipt.data.remaining.totalMeals,
    remainingRegularMeals: receipt.data.remaining.regularMeals,
    remainingPremiumMeals: receipt.data.remaining.premiumMeals,
    addonBalances: subscription.addonBalances.map((addon) => {
      const updated = remainingAddons.find((row) => row.addonId === addon.addonId);
      return updated ? { ...addon, remainingQty: updated.remainingQty } : addon;
    }),
  };
}

export default function ManualDeductionPage() {
  const [searchPhone, setSearchPhone] = useState("");
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(null);
  const [blockedBySubscriptionId, setBlockedBySubscriptionId] =
    useState<ManualDeductionBlockedMap>({});
  const [receipt, setReceipt] = useState<ManualDeductionMutationResponse | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const searchQuery = useSearchSubscriptionsByPhoneQuery(searchPhone);
  const deductMutation = useManualDeductSubscriptionMutation();
  const isBusy = deductMutation.isPending || inFlightRef.current;

  const normalizedSearch = useMemo(() => {
    if (!searchQuery.data) return null;
    return normalizeManualDeductionSearchResponse(
      searchQuery.data,
      blockedBySubscriptionId
    );
  }, [blockedBySubscriptionId, searchQuery.data]);

  const customer = normalizedSearch?.kind === "found" ? normalizedSearch.customer : null;
  const subscriptions =
    normalizedSearch?.kind === "found"
      ? normalizedSearch.subscriptions.map((subscription) =>
          applyReceiptToSubscription(subscription, receipt)
        )
      : [];
  const selectedSubscription =
    subscriptions.find((subscription) => subscription.id === selectedSubscriptionId) ?? null;
  const receiptSubscription =
    subscriptions.find((subscription) => subscription.id === receipt?.data.subscriptionId) ??
    selectedSubscription;
  const historySubscription = selectedSubscription ?? receiptSubscription;

  const handleSearch = async (phone: string) => {
    const normalizedPhone = phone.trim();
    if (!normalizedPhone) return;
    setSelectedSubscriptionId(null);
    setReceipt(null);
    setMutationError(null);

    if (normalizedPhone === searchPhone) {
      await searchQuery.refetch();
      return;
    }

    setSearchPhone(normalizedPhone);
  };

  const handleSelectSubscription = (
    subscription: NormalizedManualDeductionSubscription
  ) => {
    if (isBusy) return;
    setSelectedSubscriptionId(subscription.id);
    setMutationError(null);
  };

  const handleCancelDeduction = () => {
    if (isBusy) return;
    setSelectedSubscriptionId(null);
  };

  const handleDeductionConfirm = async (
    payload: ManualDeductionPayload,
    _values: DeductionFormValues,
    form: DeductionFormReturn
  ) => {
    if (!selectedSubscription || inFlightRef.current) return;

    inFlightRef.current = true;
    setMutationError(null);

    try {
      const result = await deductMutation.mutateAsync({
        id: selectedSubscription.id,
        data: payload,
      });

      setReceipt(result);
      if (result.data.fulfillmentMethod === "delivery") {
        setBlockedBySubscriptionId((current) => ({
          ...current,
          [result.data.subscriptionId]: "session-success",
        }));
      }
      setSelectedSubscriptionId(null);
      toast.success("تم تنفيذ الخصم اليدوي بنجاح");
    } catch (error) {
      const mapped = mapManualDeductionError(
        error,
        "تعذر تنفيذ الخصم اليدوي. حاول مرة أخرى."
      );
      if (mapped.code === "DELIVERY_ALREADY_DEDUCTED_TODAY") {
        setBlockedBySubscriptionId((current) => ({
          ...current,
          [selectedSubscription.id]: "backend-rejection",
        }));
        setSelectedSubscriptionId(null);
        setMutationError(mapped.message);
        toast.error(mapped.message);
        return;
      }
      setMutationError(mapped.message);
      form.setError("root", {
        type: "server",
        message: mapped.message,
      });
      toast.error(mapped.message);
      throw error;
    } finally {
      inFlightRef.current = false;
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6" dir="rtl">
      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground">
          خصم يدوي من الاشتراك
        </h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          ابحث عن العميل بالهاتف، اختر الاشتراك، ثم راجع الخصم قبل تنفيذه كمعاملة واحدة.
        </p>
      </div>

      <CustomerSearch
        onSearch={handleSearch}
        isSearching={searchQuery.isLoading || searchQuery.isFetching}
        error={searchQuery.error}
        disabled={isBusy}
      />

      {searchPhone && searchQuery.isFetching && searchQuery.data ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>جاري تحديث نتيجة البحث الحالية...</AlertDescription>
        </Alert>
      ) : null}

      {normalizedSearch?.kind === "customer_not_found" ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{normalizedSearch.message}</AlertDescription>
        </Alert>
      ) : null}

      {normalizedSearch?.kind === "subscription_not_found" ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{normalizedSearch.message}</AlertDescription>
        </Alert>
      ) : null}

      <ReceiptCard receipt={receipt} subscription={receiptSubscription} />

      {mutationError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{mutationError}</AlertDescription>
        </Alert>
      ) : null}

      {customer && subscriptions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">اختر الاشتراك</CardTitle>
            <CardDescription>
              تم العثور على {subscriptions.length} اشتراك للعميل {customer.name}. حالة خصم
              التوصيل اليومية معروفة فقط للاشتراك الافتراضي أو ما تعلمته هذه الجلسة.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="hidden rounded-md border md:block">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-right">العميل</TableHead>
                    <TableHead className="text-right">الهاتف</TableHead>
                    <TableHead className="text-right">الخطة</TableHead>
                    <TableHead className="text-right">الرصيد</TableHead>
                    <TableHead className="text-right">عادي</TableHead>
                    <TableHead className="text-right">مميز</TableHead>
                    <TableHead className="text-right">الإضافات</TableHead>
                    <TableHead className="text-right">التنفيذ</TableHead>
                    <TableHead className="text-right">حالة اليوم</TableHead>
                    <TableHead className="text-right">الإجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((subscription) => (
                    <TableRow key={subscription.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 font-semibold">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {customer.name}
                        </div>
                      </TableCell>
                      <TableCell dir="ltr" className="text-right">
                        <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          {customer.phone}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          {subscription.planName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{subscription.remainingMeals} وجبة</Badge>
                      </TableCell>
                      <TableCell>{subscription.remainingRegularMeals}</TableCell>
                      <TableCell>{subscription.remainingPremiumMeals}</TableCell>
                      <TableCell>
                        <AddonSummary subscription={subscription} />
                      </TableCell>
                      <TableCell>
                        <Badge variant={subscription.fulfillmentMethod === "delivery" ? "secondary" : "outline"}>
                          {getFulfillmentLabel(subscription.fulfillmentMethod)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DailyStatusBadge subscription={subscription} />
                      </TableCell>
                      <TableCell>
                        <SubscriptionAction
                          subscription={subscription}
                          disabled={isBusy}
                          onSelect={handleSelectSubscription}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-3 md:hidden">
              {subscriptions.map((subscription) => (
                <div key={subscription.id} className="rounded-lg border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{subscription.planName}</p>
                      <p className="text-sm text-muted-foreground">{customer.name}</p>
                      <p dir="ltr" className="text-sm text-muted-foreground">
                        {customer.phone}
                      </p>
                    </div>
                    <Badge variant={subscription.fulfillmentMethod === "delivery" ? "secondary" : "outline"}>
                      {getFulfillmentLabel(subscription.fulfillmentMethod)}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                    <div className="rounded-md bg-muted/40 p-2">
                      <p className="text-xs text-muted-foreground">الكلي</p>
                      <p className="font-semibold">{subscription.remainingMeals}</p>
                    </div>
                    <div className="rounded-md bg-muted/40 p-2">
                      <p className="text-xs text-muted-foreground">عادي</p>
                      <p className="font-semibold">{subscription.remainingRegularMeals}</p>
                    </div>
                    <div className="rounded-md bg-muted/40 p-2">
                      <p className="text-xs text-muted-foreground">مميز</p>
                      <p className="font-semibold">{subscription.remainingPremiumMeals}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <AddonSummary subscription={subscription} />
                      <DailyStatusBadge subscription={subscription} />
                    </div>
                    <SubscriptionAction
                      subscription={subscription}
                      disabled={isBusy}
                      onSelect={handleSelectSubscription}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {customer && selectedSubscription ? (
        <DeductionForm
          key={selectedSubscription.id}
          customer={customer}
          subscription={selectedSubscription}
          onConfirm={handleDeductionConfirm}
          onCancel={handleCancelDeduction}
          isPending={isBusy}
        />
      ) : null}

      <ManualDeductionHistory subscription={historySubscription} />
    </div>
  );
}
