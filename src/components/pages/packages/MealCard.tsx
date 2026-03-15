import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Trash2, UtensilsCrossed } from "lucide-react";
import { Controller } from "react-hook-form";
import type useCreatePackageForm from "@/hooks/useCreatePackageForm";

type FormType = ReturnType<typeof useCreatePackageForm>["form"];

export function MealCard({
  gramIndex,
  mealIndex,
  form,
  onRemove,
  canRemove,
}: {
  gramIndex: number;
  mealIndex: number;
  form: FormType;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const prefix = `gramsOptions.${gramIndex}.mealsOptions.${mealIndex}` as const;
  const errors =
    form.formState.errors?.gramsOptions?.[gramIndex]?.mealsOptions?.[mealIndex];

  return (
    <div className="relative rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-border/80">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <UtensilsCrossed className="size-3.5" />
          </div>
          <span className="text-sm font-semibold text-foreground">
            وجبة {mealIndex + 1}
          </span>
        </div>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onRemove}
            className="text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {/* Meals Per Day */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">عدد الوجبات يومياً</Label>
          <Input
            type="number"
            placeholder="1"
            {...form.register(`${prefix}.mealsPerDay`)}
            aria-invalid={!!errors?.mealsPerDay}
          />
          {errors?.mealsPerDay && (
            <p className="text-xs text-destructive">{errors.mealsPerDay.message}</p>
          )}
        </div>

        {/* Price */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">السعر (هللة)</Label>
          <Input
            type="number"
            placeholder="259900"
            {...form.register(`${prefix}.priceHalala`)}
            aria-invalid={!!errors?.priceHalala}
          />
          {errors?.priceHalala && (
            <p className="text-xs text-destructive">{errors.priceHalala.message}</p>
          )}
        </div>

        {/* Compare At Price */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">سعر المقارنة (هللة)</Label>
          <Input
            type="number"
            placeholder="289900"
            {...form.register(`${prefix}.compareAtHalala`)}
            aria-invalid={!!errors?.compareAtHalala}
          />
          {errors?.compareAtHalala && (
             <p className="text-xs text-destructive">{errors.compareAtHalala.message}</p>
          )}
        </div>

        {/* Sort Order */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">ترتيب العرض</Label>
          <Input
            type="number"
            placeholder="0"
            {...form.register(`${prefix}.sortOrder`)}
          />
        </div>

        {/* Active Toggle */}
        <label className="flex items-center gap-2 pb-2 mt-4 cursor-pointer lg:mt-0 lg:justify-center">
          <Controller
            control={form.control}
            name={`${prefix}.isActive`}
            render={({ field }) => (
              <Switch
                type="button"
                checked={field.value ?? true}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <span className="text-sm text-muted-foreground">
            مفعّلة
          </span>
        </label>
      </div>
    </div>
  );
}
