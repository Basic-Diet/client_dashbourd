import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePackagesQuery } from "@/hooks/usePackagesQuery";
import { Package, CalendarDays } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import type { CreateSubscriptionSchemaType } from "@/lib/validations/createSubscriptionSchema";
import type { Package as PackageType, GramsOption, MealOption } from "@/types/packageTypes";

interface PlanSelectionSectionProps {
  form: UseFormReturn<CreateSubscriptionSchemaType>;
}

export function PlanSelectionSection({ form }: PlanSelectionSectionProps) {
  const { data: packagesResponse } = usePackagesQuery();
  const packages = packagesResponse?.data || [];

  const selectedPlanId = form.watch("planId");
  const selectedPackage = packages.find(
    (pkg: PackageType) => pkg._id === selectedPlanId
  );

  const gramsOptions =
    selectedPackage?.gramsOptions?.filter((g: GramsOption) => g.isActive) || [];
  const selectedGrams = form.watch("grams");
  const selectedGramsOption = gramsOptions.find(
    (g: GramsOption) => g.grams === selectedGrams
  );
  const mealsOptions =
    selectedGramsOption?.mealsOptions?.filter((m: MealOption) => m.isActive) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Package className="size-4" />
          </div>
          اختيار الباقة
        </CardTitle>
        <CardDescription>اختر الباقة وحدد تفاصيل الاشتراك</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Package Selector */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">الباقة</Label>
          <Select
            value={selectedPlanId}
            onValueChange={(value) => {
              form.setValue("planId", value, { shouldValidate: true });
              form.setValue("grams", 0);
              form.setValue("mealsPerDay", 0);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر الباقة" />
            </SelectTrigger>
            <SelectContent>
              {packages.map((pkg: PackageType) => (
                <SelectItem key={pkg._id} value={pkg._id}>
                  {pkg.name?.ar || pkg.name?.en} — {pkg.daysCount} يوم
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.planId && (
            <p className="text-xs text-destructive">
              {form.formState.errors.planId.message}
            </p>
          )}
        </div>

        {/* Selected package info */}
        {selectedPackage && (
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-border/60 bg-muted/30 p-3">
            <CalendarDays className="size-5 text-muted-foreground" />
            <div className="text-sm">
              <span className="font-semibold">{selectedPackage.name?.ar}</span>
              <span className="mx-2 text-muted-foreground">•</span>
              <span className="text-muted-foreground">{selectedPackage.daysCount} يوم</span>
            </div>
          </div>
        )}

        {/* Grams & Meals */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">الجرامات</Label>
            <Select
              value={selectedGrams ? String(selectedGrams) : ""}
              onValueChange={(value) => {
                form.setValue("grams", Number(value), { shouldValidate: true });
                form.setValue("mealsPerDay", 0);
              }}
              disabled={!selectedPlanId}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر الجرامات" />
              </SelectTrigger>
              <SelectContent>
                {gramsOptions.map((g: GramsOption) => (
                  <SelectItem key={g.grams} value={String(g.grams)}>
                    {g.grams} جرام
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.grams && (
              <p className="text-xs text-destructive">
                {form.formState.errors.grams.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">عدد الوجبات في اليوم</Label>
            <Select
              value={form.watch("mealsPerDay") ? String(form.watch("mealsPerDay")) : ""}
              onValueChange={(value) =>
                form.setValue("mealsPerDay", Number(value), { shouldValidate: true })
              }
              disabled={!selectedGrams}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر عدد الوجبات" />
              </SelectTrigger>
              <SelectContent>
                {mealsOptions.map((m: MealOption) => (
                  <SelectItem key={m.mealsPerDay} value={String(m.mealsPerDay)}>
                    {m.mealsPerDay} وجبات — {(m.priceHalala / 100).toFixed(0)} ريال
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.mealsPerDay && (
              <p className="text-xs text-destructive">
                {form.formState.errors.mealsPerDay.message}
              </p>
            )}
          </div>
        </div>

        {/* Start Date */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">تاريخ البداية</Label>
          <Input
            type="date"
            dir="ltr"
            {...form.register("startDate")}
            className="text-left"
          />
          {form.formState.errors.startDate && (
            <p className="text-xs text-destructive">
              {form.formState.errors.startDate.message}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
