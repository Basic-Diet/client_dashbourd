import { useState } from "react";
import { toast } from "sonner";
import { AlertCircle, Phone, Package, PlusCircle, User } from "lucide-react";
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
  useSearchSubscriptionsByPhoneQuery,
  useManualDeductSubscriptionMutation,
} from "@/hooks/useSubscriptionsQuery";
import { useQueryClient } from "@tanstack/react-query";
import type {
  ManualDeductionResponse,
  Subscription,
} from "@/types/subscriptionTypes";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  createColumnHelper,
} from "@tanstack/react-table";
import { getApiErrorMessage } from "@/lib/apiErrors";

import { CustomerSearch } from "./CustomerSearch";
import { DeductionForm } from "./DeductionForm";
import type { DeductionFormReturn, DeductionFormValues } from "./DeductionForm";

const columnHelper = createColumnHelper<Subscription>();

type ManualDeductionSubscription = Subscription & {
  remainingPremiumMeals?: number;
  remainingRegularMeals?: number;
  fulfillmentMethod?: string;
};

function getAddonCount(subscription: Subscription) {
  return subscription.addonBalances?.filter((addon) => addon.remainingQty > 0).length ?? 0;
}

export default function ManualDeductionPage() {
  const [searchPhone, setSearchPhone] = useState("");
  const [selectedSubscription, setSelectedSubscription] =
    useState<Subscription | null>(null);
  const queryClient = useQueryClient();

  const {
    data: searchResponse,
    isLoading: isSearching,
    error: searchError,
  } = useSearchSubscriptionsByPhoneQuery(searchPhone);

  const deductMutation = useManualDeductSubscriptionMutation();

  const rawData = searchResponse?.data;
  const rawSubscriptions = rawData?.subscriptions ?? [];
  const customer = rawData?.customer;
  const today = rawData?.today;

  const subscriptions: Subscription[] = rawSubscriptions.map(
    (sub: ManualDeductionSubscription) => {
      const totalRemaining = sub.remainingMeals ?? 0;
      const premiumRemaining =
        sub.remainingPremiumMeals ?? sub.premiumRemaining ?? 0;
      const regularRemaining =
        sub.remainingRegularMeals ??
        Math.max(0, totalRemaining - premiumRemaining);
      const user = sub.user ?? {
        id: customer?.id ?? sub.userId ?? "",
        fullName: customer?.name ?? sub.userName ?? "—",
        phone: customer?.phone ?? "",
        email: "",
        isActive: true,
      };

      return {
        ...sub,
        userName: customer?.name ?? sub.userName,
        user: {
          ...user,
          id: user.id ?? customer?.id ?? sub.userId ?? "",
          fullName: customer?.name ?? user.fullName ?? "—",
          phone: customer?.phone ?? user.phone ?? "",
          email: user.email ?? "",
          isActive: user.isActive ?? true,
        },
        remainingMeals: totalRemaining,
        remainingRegularMeals: regularRemaining,
        remainingPremiumMeals: premiumRemaining,
        premiumRemaining,
        addonBalances: sub.addonBalances ?? [],
        hasDeliveryDeductionToday: today?.hasDeliveryDeductionToday ?? false,
        deliveryMode: sub.fulfillmentMethod ?? sub.deliveryMode ?? "delivery",
      };
    }
  );

  const handleSearch = (phone: string) => {
    setSearchPhone(phone);
    setSelectedSubscription(null);
  };

  const handleSelectSubscription = (sub: Subscription) => {
    setSelectedSubscription(sub);
  };

  const handleCancelDeduction = () => {
    setSelectedSubscription(null);
  };

  const onDeductionSubmit = async (
    values: DeductionFormValues,
    form: DeductionFormReturn
  ) => {
    if (!selectedSubscription) return;

    const addons = values.addons
      .filter((addon) => Number(addon.qty) > 0)
      .map((addon) => ({ addonId: addon.addonId, qty: Number(addon.qty) }));
    const totalSelected =
      Number(values.regularMeals || 0) +
      Number(values.premiumMeals || 0) +
      addons.reduce((sum, addon) => sum + addon.qty, 0);

    if (totalSelected === 0) {
      form.setError("regularMeals", {
        type: "manual",
        message: "ادخل كمية واحدة على الأقل من الوجبات أو الإضافات",
      });
      return;
    }

    try {
      const result = (await deductMutation.mutateAsync({
        id: selectedSubscription.id,
        data: {
          regularMeals: Number(values.regularMeals || 0),
          premiumMeals: Number(values.premiumMeals || 0),
          ...(addons.length ? { addons } : {}),
          reason: values.reason.trim(),
          notes: values.notes?.trim() || undefined,
        },
      })) as ManualDeductionResponse;

      toast.success("تم تنفيذ الخصم اليدوي بنجاح");

      const remaining = result?.data?.remaining;
      if (remaining) {
        setSelectedSubscription((current) => {
          if (!current) return current;
          const remainingAddons = remaining.addons ?? [];
          return {
            ...current,
            remainingMeals: remaining.totalMeals ?? current.remainingMeals,
            remainingRegularMeals:
              remaining.regularMeals ?? current.remainingRegularMeals,
            remainingPremiumMeals:
              remaining.premiumMeals ?? current.remainingPremiumMeals,
            premiumRemaining:
              remaining.premiumMeals ?? current.premiumRemaining,
            addonBalances: (current.addonBalances ?? []).map((addon) => {
              const updated = remainingAddons.find(
                (row) => row.addonId === addon.addonId
              );
              return updated
                ? { ...addon, remainingQty: updated.remainingQty }
                : addon;
            }),
          };
        });
      }

      form.reset({
        regularMeals: 0,
        premiumMeals: 0,
        addons: (selectedSubscription.addonBalances ?? []).map((addon) => ({
          addonId: addon.addonId,
          name: addon.name,
          remainingQty: addon.remainingQty,
          qty: 0,
        })),
        reason: "cashier_walk_in",
        notes: "",
      });

      await queryClient.invalidateQueries({
        queryKey: ["subscriptions-search", searchPhone],
      });
    } catch (err: unknown) {
      const message = getApiErrorMessage(err) || "حدث خطأ أثناء تنفيذ الخصم";
      toast.error(message);
    }
  };

  const columns = [
    columnHelper.accessor((row) => row.userName || row.user?.fullName || "—", {
      id: "userName",
      header: "العميل",
      cell: (info) => (
        <div className="flex items-center gap-2 font-semibold">
          <User className="h-4 w-4 text-muted-foreground" />
          {info.getValue()}
        </div>
      ),
    }),
    columnHelper.accessor((row) => row.user?.phone || "—", {
      id: "userPhone",
      header: "الهاتف",
      cell: (info) => (
        <div className="flex items-center gap-2 text-sm text-muted-foreground" dir="ltr">
          <Phone className="h-4 w-4" />
          {info.getValue()}
        </div>
      ),
    }),
    columnHelper.accessor((row) => row.planName || row.plan?.name || "—", {
      id: "planName",
      header: "الخطة",
      cell: (info) => (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Package className="h-4 w-4" />
          {info.getValue()}
        </div>
      ),
    }),
    columnHelper.accessor("remainingMeals", {
      header: "الرصيد الكلي",
      cell: (info) => <Badge variant="outline">{info.getValue()} وجبة</Badge>,
    }),
    columnHelper.accessor(
      (row) => row.remainingRegularMeals ?? row.remainingMeals,
      {
        id: "remainingRegularMeals",
        header: "العادي",
        cell: (info) => (
          <Badge variant="secondary">{info.getValue()} وجبة</Badge>
        ),
      }
    ),
    columnHelper.accessor(
      (row) => row.remainingPremiumMeals ?? row.premiumRemaining ?? 0,
      {
        id: "remainingPremiumMeals",
        header: "المميز",
        cell: (info) => <Badge variant="outline">{info.getValue()} وجبة</Badge>,
      }
    ),
    columnHelper.display({
      id: "addons",
      header: "الإضافات",
      cell: ({ row }) => (
        <Badge variant="secondary" className="gap-1">
          <PlusCircle className="h-3 w-3" />
          {getAddonCount(row.original)} متاح
        </Badge>
      ),
    }),
    columnHelper.accessor("deliveryMode", {
      header: "طريقة التنفيذ",
      cell: (info) => {
        const isDelivery = info.getValue() === "delivery";
        return (
          <Badge variant={isDelivery ? "secondary" : "outline"}>
            {isDelivery ? "توصيل" : "استلام"}
          </Badge>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: (info) => {
        const row = info.row.original;
        const alreadyDeductedToday =
          row.deliveryMode === "delivery" && row.hasDeliveryDeductionToday;

        return (
          <div className="flex flex-col gap-2">
            {alreadyDeductedToday ? (
              <Badge variant="outline" className="w-fit border-amber-500/30 bg-amber-500/10 text-amber-700">
                يوجد خصم توصيل اليوم
              </Badge>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSelectSubscription(row)}
            >
              اختيار
            </Button>
          </div>
        );
      },
    }),
  ];

  const table = useReactTable({
    data: subscriptions,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="mx-auto max-w-full space-y-6 p-4 md:p-6" dir="rtl">
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-foreground">
          خصم يدوي من الاشتراك
        </h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          ابحث عن العميل بالهاتف، اختر الاشتراك، ثم نفذ خصم وجبات عادية أو مميزة أو إضافات في معاملة واحدة.
        </p>
      </div>

      <CustomerSearch
        onSearch={handleSearch}
        isSearching={isSearching}
        error={searchError}
      />

      {searchPhone &&
        !isSearching &&
        subscriptions.length > 0 &&
        !selectedSubscription && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">اختر الاشتراك</CardTitle>
              <CardDescription>
                تم العثور على {subscriptions.length} اشتراك. الخصم النهائي يتم التحقق منه من الخادم.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader className="bg-muted/50">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead
                            key={header.id}
                            className="whitespace-nowrap py-3 text-right font-semibold"
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="whitespace-nowrap py-3 text-right">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

      {searchPhone &&
        !isSearching &&
        !searchError &&
        subscriptions.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              لم يتم العثور على اشتراكات مرتبطة بهذا الرقم
            </AlertDescription>
          </Alert>
        )}

      {selectedSubscription && (
        <DeductionForm
          key={selectedSubscription.id}
          subscription={selectedSubscription}
          onSubmit={onDeductionSubmit}
          onCancel={handleCancelDeduction}
          isPending={deductMutation.isPending}
        />
      )}
    </div>
  );
}
