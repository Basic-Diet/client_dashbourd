import { useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDashboardAddonPlansQuery } from "@/hooks/useSubscriptionCreation";
import { ShoppingBag, Check } from "lucide-react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import type { CreateSubscriptionSchemaType } from "@/lib/validations/createSubscriptionSchema";
import type { SubscriptionAddonPlanCatalogItem } from "@/types/subscriptionCreationTypes";

interface AddonsSectionProps {
  form: UseFormReturn<CreateSubscriptionSchemaType>;
}

export function AddonsSection({ form }: AddonsSectionProps) {
  const { data: addonsResponse, isLoading } = useDashboardAddonPlansQuery();
  const allAddons = addonsResponse?.data?.filter((a) => a.isActive) || [];
  const selectedPlanId = form.watch("planId");

  const getSubscriptionAddons = () => allAddons;
  const getOneTimeAddons = () => [];

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "addons",
  });

  const getSelectedSet = () => new Set(fields.map((f) => f.addonId));

  const toggleAddon = useCallback(
    (addonId: string) => {
      const idx = fields.findIndex((f) => f.addonId === addonId);
      if (idx >= 0) {
        remove(idx);
      } else {
        append({ addonId, qty: 1 });
      }
    },
    [fields, remove, append]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
            <ShoppingBag className="size-4" />
          </div>
          الإضافات
        </CardTitle>
        <CardDescription>
          اختر الإضافات المرغوبة للاشتراك (اختياري)
          {fields.length > 0 && (
            <span className="mr-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {fields.length} مختار
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            {getSubscriptionAddons().length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-foreground">
                    إضافات الاشتراك
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    (تضاف يومياً)
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {getSubscriptionAddons().map((addon: SubscriptionAddonPlanCatalogItem) => {
                    const id = getAddonPlanId(addon);
                    const index = fields.findIndex((field) => field.addonId === id);

                    return (
                      <AddonCard
                        key={id}
                        addon={addon}
                        selectedPlanId={selectedPlanId}
                        isSelected={getSelectedSet().has(id)}
                        selectedIndex={index}
                        form={form}
                        onToggle={toggleAddon}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {getOneTimeAddons().length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-foreground">
                    إضافات لمرة واحدة
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    (تضاف مرة واحدة)
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2" />
              </div>
            )}

            {getSubscriptionAddons().length === 0 && (
              <div className="rounded-lg border border-dashed border-border/60 py-8 text-center">
                <ShoppingBag className="mx-auto mb-2 size-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  لا توجد إضافات متاحة
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function getAddonPlanId(addon: SubscriptionAddonPlanCatalogItem) {
  return addon.id || addon._id || "";
}

/** Isolated card component to prevent parent re-renders from propagating */
function AddonCard({
  addon,
  selectedPlanId,
  isSelected,
  selectedIndex,
  form,
  onToggle,
}: {
  addon: SubscriptionAddonPlanCatalogItem;
  selectedPlanId: string;
  isSelected: boolean;
  selectedIndex: number;
  form: UseFormReturn<CreateSubscriptionSchemaType>;
  onToggle: (id: string) => void;
}) {
  const planId = getAddonPlanId(addon);
  const matchingPrice = addon.planPrices?.find(
    (price) => price.basePlanId === selectedPlanId
  );
  const priceSar =
    matchingPrice?.priceSar ??
    addon.planPrices?.[0]?.priceSar ??
    addon.priceSar ??
    addon.price ??
    0;
  const description = addon.description?.ar || addon.category;

  return (
    <div
      className={`group relative flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-right transition-all ${
        isSelected
          ? "border-primary/40 bg-primary/5 shadow-sm ring-1 ring-primary/20"
          : "border-border/50 hover:border-border hover:bg-muted/30"
      }`}
    >
      {/* Custom checkbox visual — no Radix button */}
      <button
        type="button"
        onClick={() => planId && onToggle(planId)}
        className="pt-0.5"
        aria-label={isSelected ? "إزالة الإضافة" : "اختيار الإضافة"}
      >
        <div
          className={`flex size-4 shrink-0 items-center justify-center rounded-[4px] border shadow-xs transition-colors ${
            isSelected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input bg-transparent"
          }`}
        >
          {isSelected && <Check className="size-3" />}
        </div>
      </button>
      {addon.imageUrl?.trim() ? (
        <img
          src={addon.imageUrl}
          alt={addon.name.ar}
          className="size-12 shrink-0 rounded-lg object-cover"
        />
      ) : null}
      <div className="flex-1">
        <p className="text-sm font-semibold">{addon.name.ar}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="shrink-0 text-left">
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600">
          {priceSar} ريال
        </span>
      </div>
      {isSelected && selectedIndex >= 0 ? (
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            onClick={() => {
              const current = form.getValues(`addons.${selectedIndex}.qty`) || 1;
              form.setValue(`addons.${selectedIndex}.qty`, Math.max(1, current - 1), {
                shouldDirty: true,
                shouldValidate: true,
              });
            }}
          >
            -
          </Button>
          <Input
            aria-label={`${addon.name.ar} الكمية`}
            type="number"
            min={1}
            className="h-8 w-16 text-center"
            {...form.register(`addons.${selectedIndex}.qty`, {
              valueAsNumber: true,
            })}
          />
          <Button
            type="button"
            variant="outline"
            size="icon-xs"
            onClick={() => {
              const current = form.getValues(`addons.${selectedIndex}.qty`) || 1;
              form.setValue(`addons.${selectedIndex}.qty`, current + 1, {
                shouldDirty: true,
                shouldValidate: true,
              });
            }}
          >
            +
          </Button>
        </div>
      ) : null}
    </div>
  );
}
