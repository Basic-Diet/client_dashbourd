import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import { Package } from "lucide-react";
import { Controller } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import type { CreatePackageSchemaType } from "@/lib/validations/createPackageSchema";

interface BasicInfoSectionProps {
  form: UseFormReturn<CreatePackageSchemaType>;
}

export function BasicInfoSection({ form }: BasicInfoSectionProps) {
  const isActive = form.watch("isActive") ?? true;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Package className="size-4" />
          </div>
          المعلومات الأساسية
        </CardTitle>
        <CardDescription>اسم الباقة والإعدادات العامة</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Names */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">اسم الباقة (عربي)</Label>
            <Input
              placeholder="مثال: 26 يوم"
              {...form.register("name.ar")}
              aria-invalid={!!form.formState.errors.name?.ar}
            />
            {form.formState.errors.name?.ar && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.ar.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">اسم الباقة (إنجليزي)</Label>
            <Input
              dir="ltr"
              placeholder="e.g. 26 Days"
              {...form.register("name.en")}
              aria-invalid={!!form.formState.errors.name?.en}
            />
            {form.formState.errors.name?.en && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.en.message}
              </p>
            )}
          </div>
        </div>

        {/* Days, Currency, Sort Order */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">عدد الأيام</Label>
            <Input
              type="number"
              min="1"
              placeholder="26"
              {...form.register("daysCount")}
              aria-invalid={!!form.formState.errors.daysCount}
            />
            {form.formState.errors.daysCount && (
              <p className="text-xs text-destructive">
                {form.formState.errors.daysCount.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">ترتيب العرض</Label>
            <Input
              type="number"
              min="0"
              placeholder="1"
              {...form.register("sortOrder")}
              aria-invalid={!!form.formState.errors.sortOrder}
            />
            {form.formState.errors.sortOrder && (
              <p className="text-xs text-destructive">
                {form.formState.errors.sortOrder.message}
              </p>
            )}
          </div>
        </div>

        {/* Active & Skip Compensated */}
        <div className="mt-2 grid grid-cols-1 gap-5 border-t border-border/40 pt-4 sm:grid-cols-2">
          <div className="space-y-3 rounded-lg border p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold text-primary">
                  تفعيل سياسة التخطي
                </Label>
              </div>
              <Controller
                control={form.control}
                name="skipPolicy.enabled"
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="data-[state=checked]:bg-green-500"
                  />
                )}
              />
            </div>

            {form.watch("skipPolicy.enabled") && (
              <div className="space-y-1.5 pt-2">
                <Label className="text-sm font-medium">
                  الحد الأقصى لأيام التخطي
                </Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="3"
                  {...form.register("skipPolicy.maxDays")}
                  aria-invalid={!!form.formState.errors.skipPolicy?.maxDays}
                />
                {form.formState.errors.skipPolicy?.maxDays && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.skipPolicy.maxDays.message}
                  </p>
                )}
              </div>
            )}
          </div>
          <label className="flex w-fit cursor-pointer items-center gap-3 justify-self-end">
            <Controller
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <Switch
                  type="button"
                  checked={field.value ?? true}
                  className="cursor-pointer data-[state=checked]:bg-green-500"
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <span className="text-sm font-bold">
              {isActive
                ? "الباقة مفعّلة ونشطة للإشتراك"
                : "الباقة معطلة (غير متاحة للإشتراك)"}
            </span>
          </label>
        </div>
      </CardContent>
    </Card>
  );
}
