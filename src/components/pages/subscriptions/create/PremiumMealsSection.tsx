import { useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/lib/apis";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Plus, Trash2 } from "lucide-react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import type { CreateSubscriptionSchemaType } from "@/lib/validations/createSubscriptionSchema";

interface PremiumMealsSectionProps {
  form: UseFormReturn<CreateSubscriptionSchemaType>;
  onPriceChange?: (price: { halala: number; currency?: string }) => void;
}

export interface BuilderPremiumMeal {
  id: string;
  configId?: string | null;
  sourceId?: string | null;
  premiumKey: string;
  sourceModel?: string;
  sourceType?: string;
  kind?: string;
  selectionType?: string;
  name: { ar?: string; en?: string } | string;
  imageUrl?: string;
  extraFeeHalala?: number;
  priceHalala?: number;
  currency?: string;
  isActive?: boolean;
  availableForSubscription?: boolean;
  health?: string;
  issueCode?: string | null;
  legacy?: boolean;
}

interface BuilderPremiumMealsResponse {
  status: boolean;
  data: BuilderPremiumMeal[];
}

const fetchBuilderPremiumMeals = async (): Promise<BuilderPremiumMealsResponse> => {
  const response = await api.get("/api/admin/builder-premium-meals");
  return response.data;
};

export function isSelectablePremiumMeal(meal: BuilderPremiumMeal): boolean {
  return (
    typeof meal.premiumKey === "string" &&
    meal.premiumKey.trim().length > 0 &&
    meal.isActive !== false &&
    meal.availableForSubscription !== false &&
    (!meal.health || meal.health === "ready")
  );
}

const getMealName = (meal: BuilderPremiumMeal) =>
  typeof meal.name === "string" ? meal.name : meal.name.ar || meal.name.en || "";

const formatSar = (halala: number) => {
  const sar = halala / 100;
  return Number.isInteger(sar) ? String(sar) : sar.toFixed(2).replace(/\.?0+$/, "");
};

export function PremiumMealsSection({
  form,
  onPriceChange,
}: PremiumMealsSectionProps) {
  const { data: premiumResponse, isLoading } = useQuery({
    queryKey: ["builder-premium-meals"],
    queryFn: fetchBuilderPremiumMeals,
    staleTime: 1000 * 60 * 2,
  });
  const premiumMeals = premiumResponse?.data.filter(isSelectablePremiumMeal) || [];

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "premiumItems",
  });

  const premiumItems = form.watch("premiumItems") || [];
  const selectedKeys = premiumItems.map((item) => item.premiumKey);

  const getSelectedMeal = (premiumKey: string): BuilderPremiumMeal | undefined =>
    premiumMeals.find((meal) => meal.premiumKey === premiumKey);

  const premiumTotalHalala = premiumItems.reduce((total, item) => {
    const meal = getSelectedMeal(item.premiumKey);
    const unitPrice = meal?.extraFeeHalala ?? meal?.priceHalala ?? 0;
    const qty = Math.max(0, Number(item.qty) || 0);
    return total + unitPrice * qty;
  }, 0);
  const selectedCurrency = premiumItems
    .map((item) => getSelectedMeal(item.premiumKey)?.currency)
    .find(Boolean);

  useEffect(() => {
    onPriceChange?.({
      halala: premiumTotalHalala,
      currency: selectedCurrency || "SAR",
    });
  }, [onPriceChange, premiumTotalHalala, selectedCurrency]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                <Sparkles className="size-4" />
              </div>
              الوجبات المميزة
            </CardTitle>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => append({ premiumKey: "", qty: 1 })}
          >
            <Plus className="size-3.5" />
            إضافة وجبة
          </Button>
        </div>
        <CardDescription>أضف وجبات مميزة إلى الاشتراك (اختياري)</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : fields.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 py-8 text-center">
            <Sparkles className="mx-auto mb-2 size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              لا توجد وجبات مميزة مضافة
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              اضغط على "إضافة وجبة" لإضافة وجبة مميزة
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {fields.map((field, index) => {
              const premiumKey = premiumItems[index]?.premiumKey || "";
              const qty = Math.max(1, Number(premiumItems[index]?.qty) || 1);
              const selectedMeal = getSelectedMeal(premiumKey);
              const unitPriceHalala =
                selectedMeal?.extraFeeHalala ?? selectedMeal?.priceHalala ?? 0;
              const totalHalala = unitPriceHalala * qty;

              return (
                <div
                  key={field.id}
                  className="flex items-start gap-3 rounded-xl border border-border/50 bg-card p-4 shadow-sm transition-all hover:border-border/80"
                >
                  {selectedMeal?.imageUrl && (
                    <img
                      src={selectedMeal.imageUrl}
                      alt={getMealName(selectedMeal)}
                      className="size-16 shrink-0 rounded-lg object-cover"
                    />
                  )}

                  <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-xs text-muted-foreground">الوجبة المميزة</label>
                      <Select
                        value={premiumKey}
                        onValueChange={(value) =>
                          form.setValue(`premiumItems.${index}.premiumKey`, value, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الوجبة" />
                        </SelectTrigger>
                        <SelectContent>
                          {premiumMeals.map((meal) => (
                            <SelectItem
                              key={meal.premiumKey}
                              value={meal.premiumKey}
                              disabled={
                                selectedKeys.includes(meal.premiumKey) &&
                                premiumKey !== meal.premiumKey
                              }
                            >
                              <span className="flex items-center gap-2">
                                {getMealName(meal)}
                                <span className="text-xs text-muted-foreground">
                                  ({formatSar(meal.extraFeeHalala ?? meal.priceHalala ?? 0)} ريال)
                                </span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.formState.errors.premiumItems?.[index]?.premiumKey && (
                        <p className="text-xs text-destructive">
                          {form.formState.errors.premiumItems[index].premiumKey?.message}
                        </p>
                      )}
                    </div>

                    <div className="w-24 space-y-1.5">
                      <label className="text-xs text-muted-foreground">الكمية</label>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        inputMode="numeric"
                        {...form.register(`premiumItems.${index}.qty`, {
                          valueAsNumber: true,
                        })}
                      />
                      {form.formState.errors.premiumItems?.[index]?.qty && (
                        <p className="text-xs text-destructive">
                          {form.formState.errors.premiumItems[index].qty?.message}
                        </p>
                      )}
                    </div>

                    {selectedMeal && (
                      <div className="min-w-24 rounded-lg bg-amber-500/10 px-3 py-2 text-center">
                        <span className="block text-[10px] text-muted-foreground">
                          الإجمالي
                        </span>
                        <span className="text-sm font-bold text-amber-600">
                          {formatSar(totalHalala)} ريال
                        </span>
                        <span className="block text-[10px] text-muted-foreground">
                          {qty} × {formatSar(unitPriceHalala)}
                        </span>
                      </div>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => remove(index)}
                      className="shrink-0 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
