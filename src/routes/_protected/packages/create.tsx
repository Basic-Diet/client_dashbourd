import { createFileRoute, useRouter } from "@tanstack/react-router";
import useCreatePackageForm from "@/hooks/useCreatePackageForm";
import { submitPackageForm } from "@/utils/submitPackageForm";
import type { CreatePackageSchemaType } from "@/lib/validations/createPackageSchema";
import { Controller } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Plus, Package, Snowflake, Weight, Save, Loader2 } from "lucide-react";
import { useState } from "react";
import { GramCard } from "../../../components/pages/packages/GramCard";

export const Route = createFileRoute("/_protected/packages/create")({
  component: CreatePackagePage,
});

/* ─── Main Page ─── */
function CreatePackagePage() {
  const router = useRouter();
  const { form, gramsFieldArray, addGram, removeGram, DEFAULT_MEAL } =
    useCreatePackageForm();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const freezeEnabled = form.watch("freezePolicy.enabled");

  const onSubmit = async (data: CreatePackageSchemaType) => {
    await submitPackageForm(data, {
      queryClient,
      routerNavigate: router.navigate,
      setIsSubmitting,
    });
  };

  return (
    <div className="w-full px-4 py-8 lg:px-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Package className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              إنشاء باقة جديدة
            </h1>
            <p className="text-sm text-muted-foreground">
              قم بتعبئة البيانات أدناه لإنشاء باقة جديدة
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* ─── Section 1: Basic Info ─── */}
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
                <Label className="text-sm font-medium">
                  اسم الباقة (إنجليزي)
                </Label>
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
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">عدد الأيام</Label>
                <Input
                  type="number"
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
                <Label className="text-sm font-medium">العملة</Label>
                <Select
                  value={form.watch("currency")}
                  onValueChange={(val) => form.setValue("currency", val)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="اختر العملة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAR">ريال سعودي (SAR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">ترتيب العرض</Label>
                <Input
                  type="number"
                  placeholder="1"
                  {...form.register("sortOrder")}
                />
              </div>
            </div>

            {/* Active & Skip Compensated */}
            <div className="mt-2 grid grid-cols-1 gap-5 border-t border-border/40 pt-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  أيام التعويض المتاحة للتخطي
                </Label>
                <Input
                  type="number"
                  placeholder="3"
                  {...form.register("skipAllowanceCompensatedDays")}
                />
              </div>
              <label className="flex items-center gap-3 pb-1 cursor-pointer sm:justify-end">
                <Controller
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <Switch
                      type="button"
                      checked={field.value ?? true}
                      className="data-[state=checked]:bg-green-500"
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <span className="text-sm font-bold">
                  الباقة مفعّلة ونشطة للإشتراك
                </span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* ─── Section 2: Freeze Policy ─── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                  <Snowflake className="size-4" />
                </div>
                سياسة التجميد
              </CardTitle>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm">
                  {freezeEnabled ? "مفعّلة" : "معطّلة"}
                </span>
                <Controller
                  control={form.control}
                  name="freezePolicy.enabled"
                  render={({ field }) => (
                    <Switch
                      type="button"
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </label>
            </div>
            <CardDescription>
              عند التفعيل، يمكن للمشترك تجميد الباقة
            </CardDescription>
          </CardHeader>

          {freezeEnabled && (
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    الحد الأقصى للأيام
                  </Label>
                  <Input
                    type="number"
                    placeholder="31"
                    {...form.register("freezePolicy.maxDays")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    الحد الأقصى لعدد مرات التجميد
                  </Label>
                  <Input
                    type="number"
                    placeholder="1"
                    {...form.register("freezePolicy.maxTimes")}
                  />
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* ─── Section 3: Gram Options ─── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Weight className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">خيارات الجرام</h2>
                <p className="text-sm text-muted-foreground">
                  أضف خيارات الجرام والوجبات لكل خيار
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={addGram}
              className="gap-2"
            >
              <Plus className="size-4" />
              إضافة جرام
            </Button>
          </div>

          {form.formState.errors.gramsOptions?.root && (
            <p className="text-sm text-destructive">
              {form.formState.errors.gramsOptions.root.message}
            </p>
          )}

          <div className="space-y-4">
            {gramsFieldArray.fields.map((field, gramIndex) => (
              <GramCard
                key={field.id}
                gramIndex={gramIndex}
                form={form}
                onRemove={() => removeGram(gramIndex)}
                canRemove={gramsFieldArray.fields.length > 1}
                defaultMeal={DEFAULT_MEAL}
              />
            ))}
          </div>
        </div>

        {/* ─── Submit ─── */}
        <div className="sticky bottom-6 z-10 pt-2">
          <Card className="border-primary/30 bg-card/95 shadow-2xl ring-1 shadow-primary/10 ring-primary/10 backdrop-blur-md transition-all hover:border-primary/50">
            <CardContent className="flex items-center justify-between p-4 sm:px-6">
              <p className="hidden text-sm font-medium text-muted-foreground sm:block">
                تأكد من مراجعة جميع البيانات والخيارات الخاصة بالباقة قبل النقر
                على الإنشاء
              </p>
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="w-full gap-2 px-10 text-base font-semibold shadow-md sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    جارٍ الإنشاء...
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    إنشاء الباقة
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
