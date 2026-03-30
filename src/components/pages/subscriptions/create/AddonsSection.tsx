import { useCallback, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAddonsQuery } from "@/hooks/useAddonsQuery";
import { ShoppingBag, Check } from "lucide-react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import type { CreateSubscriptionSchemaType } from "@/lib/validations/createSubscriptionSchema";
import type { Addon } from "@/types/addonTypes";

interface AddonsSectionProps {
  form: UseFormReturn<CreateSubscriptionSchemaType>;
}

export function AddonsSection({ form }: AddonsSectionProps) {
  const { data: addonsResponse, isLoading } = useAddonsQuery();
  const allAddons = useMemo(
    () => addonsResponse?.data?.filter((a) => a.isActive) || [],
    [addonsResponse?.data]
  );

  const subscriptionAddons = useMemo(
    () => allAddons.filter((a: Addon) => a.type === "subscription"),
    [allAddons]
  );
  const oneTimeAddons = useMemo(
    () => allAddons.filter((a: Addon) => a.type === "one_time"),
    [allAddons]
  );

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "addons",
  });

  const selectedSet = useMemo(
    () => new Set(fields.map((f) => f.value)),
    [fields]
  );

  const toggleAddon = useCallback(
    (addonId: string) => {
      const idx = fields.findIndex((f) => f.value === addonId);
      if (idx >= 0) {
        remove(idx);
      } else {
        append({ value: addonId });
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
            {subscriptionAddons.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-foreground">إضافات الاشتراك</h4>
                  <span className="text-xs text-muted-foreground">(تضاف يومياً)</span>
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {subscriptionAddons.map((addon) => (
                    <AddonCard
                      key={addon._id}
                      addon={addon}
                      isSelected={selectedSet.has(addon._id)}
                      onToggle={toggleAddon}
                    />
                  ))}
                </div>
              </div>
            )}

            {oneTimeAddons.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-foreground">إضافات لمرة واحدة</h4>
                  <span className="text-xs text-muted-foreground">(تضاف مرة واحدة)</span>
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {oneTimeAddons.map((addon) => (
                    <AddonCard
                      key={addon._id}
                      addon={addon}
                      isSelected={selectedSet.has(addon._id)}
                      onToggle={toggleAddon}
                    />
                  ))}
                </div>
              </div>
            )}

            {allAddons.length === 0 && (
              <div className="rounded-lg border border-dashed border-border/60 py-8 text-center">
                <ShoppingBag className="mx-auto mb-2 size-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">لا توجد إضافات متاحة</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Isolated card component to prevent parent re-renders from propagating */
function AddonCard({
  addon,
  isSelected,
  onToggle,
}: {
  addon: Addon;
  isSelected: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onToggle(addon._id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle(addon._id);
        }
      }}
      className={`group relative flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-right transition-all ${
        isSelected
          ? "border-primary/40 bg-primary/5 shadow-sm ring-1 ring-primary/20"
          : "border-border/50 hover:border-border hover:bg-muted/30"
      }`}
    >
      {/* Custom checkbox visual — no Radix button */}
      <div className="pt-0.5">
        <div
          className={`flex size-4 shrink-0 items-center justify-center rounded-[4px] border shadow-xs transition-colors ${
            isSelected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input bg-transparent"
          }`}
        >
          {isSelected && <Check className="size-3" />}
        </div>
      </div>
      <img
        src={addon.imageUrl}
        alt={addon.name.ar}
        className="size-12 shrink-0 rounded-lg object-cover"
      />
      <div className="flex-1">
        <p className="text-sm font-semibold">{addon.name.ar}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
          {addon.description.ar}
        </p>
      </div>
      <div className="shrink-0 text-left">
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600">
          {addon.price} ريال
        </span>
      </div>
    </div>
  );
}
