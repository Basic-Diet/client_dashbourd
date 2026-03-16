import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, UtensilsCrossed, Weight } from "lucide-react";
import { Controller, useFieldArray } from "react-hook-form";
import type useCreatePackageForm from "@/hooks/useCreatePackageForm";
import type { MealOptionType } from "@/lib/validations/createPackageSchema";
import { MealCard } from "./MealCard";

type FormType = ReturnType<typeof useCreatePackageForm>["form"];

export function GramCard({
  gramIndex,
  form,
  onRemove,
  canRemove,
  defaultMeal,
}: {
  gramIndex: number;
  form: FormType;
  onRemove: () => void;
  canRemove: boolean;
  defaultMeal: MealOptionType;
}) {
  const mealsFieldArray = useFieldArray({
    control: form.control,
    name: `gramsOptions.${gramIndex}.mealsOptions`,
  });

  const errors = form.formState.errors?.gramsOptions?.[gramIndex];

  const isActive = form.watch(`gramsOptions.${gramIndex}.isActive`) ?? true;

  const addMeal = () => {
    mealsFieldArray.append({
      ...defaultMeal,
      sortOrder: mealsFieldArray.fields.length,
    });
  };

  const removeMeal = (mealIndex: number) => {
    if (mealsFieldArray.fields.length > 1) {
      mealsFieldArray.remove(mealIndex);
    }
  };

  return (
    <Card className="overflow-hidden border-border/50 pt-0 shadow-md transition-all hover:shadow-lg">
      {/* Gram Header */}
      <CardHeader className="border-b border-border/30 bg-linear-to-l from-primary/5 to-transparent pt-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Weight className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base">
                خيار الجرام {gramIndex + 1}
              </CardTitle>
              <CardDescription className="text-xs">
                {mealsFieldArray.fields.length} وجبة
              </CardDescription>
            </div>
          </div>
          {canRemove && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onRemove}
              className="gap-1.5"
            >
              <Trash2 className="size-3.5" />
              حذف
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-5">
        {/* Gram Fields */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {/* Grams */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">عدد الجرامات</Label>
            <Input
              type="number"
              min={1}
              placeholder="100"
              {...form.register(`gramsOptions.${gramIndex}.grams`)}
              aria-invalid={!!errors?.grams}
            />
            {errors?.grams && (
              <p className="text-xs text-destructive">{errors.grams.message}</p>
            )}
          </div>

          {/* Sort Order */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">ترتيب العرض</Label>
            <Input
              type="number"
              min="0"
              placeholder="0"
              {...form.register(`gramsOptions.${gramIndex}.sortOrder`)}
              aria-invalid={!!errors?.sortOrder}
            />
            {errors?.sortOrder && (
              <p className="text-xs text-destructive">
                {errors.sortOrder.message}
              </p>
            )}
          </div>

          {/* Active Toggle */}
          <label className="mt-6 flex cursor-pointer items-center gap-3 pb-1 sm:mt-0">
            <Controller
              control={form.control}
              name={`gramsOptions.${gramIndex}.isActive`}
              render={({ field }) => (
                <Switch
                  type="button"
                  checked={field.value ?? true}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <span className="text-sm font-medium">
              {isActive ? "خيار الجرام مفعّل" : "خيار الجرام معطل"}
            </span>
          </label>
        </div>

        {/* Meals Section */}
        {/* Removed bg-muted/20 as requested */}
        <div className="space-y-4 rounded-xl border border-dashed border-border p-4">
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <UtensilsCrossed className="size-4 text-accent" />
              الوجبات
            </h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addMeal}
              className="gap-1.5 border-dashed text-xs"
            >
              <Plus className="size-3.5" />
              إضافة وجبة
            </Button>
          </div>

          {errors?.mealsOptions?.root && (
            <p className="text-xs text-destructive">
              {errors.mealsOptions.root.message}
            </p>
          )}

          <div className="space-y-3">
            {mealsFieldArray.fields.map((field, mealIndex) => (
              <MealCard
                key={field.id}
                gramIndex={gramIndex}
                mealIndex={mealIndex}
                form={form}
                onRemove={() => removeMeal(mealIndex)}
                canRemove={mealsFieldArray.fields.length > 1}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
