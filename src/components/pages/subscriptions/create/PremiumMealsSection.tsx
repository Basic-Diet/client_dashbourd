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
import { usePremiumMealsQuery } from "@/hooks/usePremiumMealsQuery";
import { Sparkles, Plus, Trash2 } from "lucide-react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import type { CreateSubscriptionSchemaType } from "@/lib/validations/createSubscriptionSchema";
import type { PremiumMeal } from "@/types/premiumMealTypes";

interface PremiumMealsSectionProps {
  form: UseFormReturn<CreateSubscriptionSchemaType>;
}

export function PremiumMealsSection({ form }: PremiumMealsSectionProps) {
  const { data: premiumResponse, isLoading } = usePremiumMealsQuery();
  const premiumMeals = premiumResponse?.data?.filter((m) => m.isActive) || [];

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "premiumItems",
  });

  const selectedIds = form.watch("premiumItems")?.map((p) => p.premiumMealId) || [];

  const getSelectedMeal = (mealId: string): PremiumMeal | undefined =>
    premiumMeals.find((m) => m._id === mealId);

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
            onClick={() => append({ premiumMealId: "", qty: 1 })}
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
              const selectedMeal = getSelectedMeal(
                form.watch(`premiumItems.${index}.premiumMealId`)
              );
              return (
                <div
                  key={field.id}
                  className="flex items-start gap-3 rounded-xl border border-border/50 bg-card p-4 shadow-sm transition-all hover:border-border/80"
                >
                  {/* Meal image preview */}
                  {selectedMeal && (
                    <img
                      src={selectedMeal.imageUrl}
                      alt={selectedMeal.name.ar}
                      className="size-16 shrink-0 rounded-lg object-cover"
                    />
                  )}

                  <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
                    {/* Meal selector */}
                    <div className="flex-1 space-y-1.5">
                      <label className="text-xs text-muted-foreground">الوجبة المميزة</label>
                      <Select
                        value={form.watch(`premiumItems.${index}.premiumMealId`)}
                        onValueChange={(value) =>
                          form.setValue(`premiumItems.${index}.premiumMealId`, value, {
                            shouldValidate: true,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الوجبة" />
                        </SelectTrigger>
                        <SelectContent>
                          {premiumMeals.map((meal: PremiumMeal) => (
                            <SelectItem
                              key={meal._id}
                              value={meal._id}
                              disabled={
                                selectedIds.includes(meal._id) &&
                                form.watch(`premiumItems.${index}.premiumMealId`) !== meal._id
                              }
                            >
                              <span className="flex items-center gap-2">
                                {meal.name.ar}
                                <span className="text-xs text-muted-foreground">
                                  ({(meal.extraFeeHalala / 100).toFixed(0)} ريال)
                                </span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.formState.errors.premiumItems?.[index]?.premiumMealId && (
                        <p className="text-xs text-destructive">
                          {form.formState.errors.premiumItems[index].premiumMealId?.message}
                        </p>
                      )}
                    </div>

                    {/* Quantity */}
                    <div className="w-24 space-y-1.5">
                      <label className="text-xs text-muted-foreground">الكمية</label>
                      <Input
                        type="number"
                        min={1}
                        {...form.register(`premiumItems.${index}.qty`, {
                          valueAsNumber: true,
                        })}
                      />
                    </div>

                    {/* Price info */}
                    {selectedMeal && (
                      <div className="flex flex-col items-center gap-1 px-2">
                        <span className="text-[10px] text-muted-foreground">السعر</span>
                        <span className="text-sm font-bold text-amber-600">
                          {(selectedMeal.extraFeeHalala / 100).toFixed(0)} ريال
                        </span>
                      </div>
                    )}

                    {/* Remove */}
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
