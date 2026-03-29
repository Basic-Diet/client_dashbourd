import { ToastMessage } from "@/components/global/ToastMessage";
import type { Package, GramsOption, MealOption } from "@/types/packageTypes";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useCreateSubscriptionForm from "@/hooks/useCreateSubscriptionForm";
import type { CreateSubscriptionSchemaType } from "@/lib/validations/createSubscriptionSchema";
import { useCreateSubscriptionMutation } from "@/hooks/useSubscriptionsQuery";
import { usePackagesQuery } from "@/hooks/usePackagesQuery";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useFieldArray } from "react-hook-form";

interface CreateSubscriptionFormProps {
  userId: string;
}

export function CreateSubscriptionForm({ userId }: CreateSubscriptionFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useCreateSubscriptionForm(userId);

  const navigate = useNavigate();
  const { mutate, isPending } = useCreateSubscriptionMutation();
  const { data: packagesResponse } = usePackagesQuery();

  const packages = packagesResponse?.data || [];
  const selectedPlanId = watch("planId");
  const selectedPackage = packages.find(
    (pkg: Package) => pkg._id === selectedPlanId
  );

  // Get available grams and meals options from selected package
  const gramsOptions =
    selectedPackage?.gramsOptions?.filter((g: GramsOption) => g.isActive) || [];
  const selectedGrams = watch("grams");
  const selectedGramsOption = gramsOptions.find(
    (g: GramsOption) => g.grams === selectedGrams
  );
  const mealsOptions =
    selectedGramsOption?.mealsOptions?.filter((m: MealOption) => m.isActive) || [];

  const {
    fields: premiumFields,
    append: appendPremium,
    remove: removePremium,
  } = useFieldArray({ control, name: "premiumItems" });

  const {
    fields: addonFields,
    append: appendAddon,
    remove: removeAddon,
  } = useFieldArray({ control, name: "addons" });

  const onSubmit = (data: CreateSubscriptionSchemaType) => {
    const payload = {
      ...data,
      addons: data.addons.map((a) => a.value),
    };
    
    mutate(payload as unknown as Record<string, unknown>, {
      onSuccess: () => {
        ToastMessage("تم إنشاء الاشتراك بنجاح", "success");
        navigate({ to: "/users/$userId", params: { userId } });
      },
      onError: (error: unknown) => {
        const err = error as { response?: { data?: { error?: { message?: string } } } };
        const message =
          err?.response?.data?.error?.message ||
          "حدث خطأ أثناء إنشاء الاشتراك";
        ToastMessage(message, "error");
      },
    });
  };

  return (
    <div className="mx-auto w-full max-w-4xl" dir="rtl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Plan Selection */}
        <Card>
          <CardHeader>
            <CardTitle>اختيار الباقة</CardTitle>
            <CardDescription>اختر الباقة وحدد تفاصيل الاشتراك</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel>الباقة</FieldLabel>
                <Select
                  value={selectedPlanId}
                  onValueChange={(value) => {
                    setValue("planId", value);
                    // Reset grams and meals when plan changes
                    setValue("grams", 0);
                    setValue("mealsPerDay", 0);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الباقة" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.map((pkg: Package) => (
                      <SelectItem key={pkg._id} value={pkg._id}>
                        {pkg.name?.ar || pkg.name?.en} — {pkg.daysCount} يوم
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.planId && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.planId.message}
                  </p>
                )}
              </Field>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>الجرامات</FieldLabel>
                  <Select
                    value={selectedGrams ? String(selectedGrams) : ""}
                    onValueChange={(value) => {
                      setValue("grams", Number(value));
                      setValue("mealsPerDay", 0);
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
                  {errors.grams && (
                    <p className="mt-1 text-sm text-destructive">
                      {errors.grams.message}
                    </p>
                  )}
                </Field>

                <Field>
                  <FieldLabel>عدد الوجبات في اليوم</FieldLabel>
                  <Select
                    value={watch("mealsPerDay") ? String(watch("mealsPerDay")) : ""}
                    onValueChange={(value) =>
                      setValue("mealsPerDay", Number(value))
                    }
                    disabled={!selectedGrams}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر عدد الوجبات" />
                    </SelectTrigger>
                    <SelectContent>
                      {mealsOptions.map((m: MealOption) => (
                        <SelectItem
                          key={m.mealsPerDay}
                          value={String(m.mealsPerDay)}
                        >
                          {m.mealsPerDay} وجبات
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.mealsPerDay && (
                    <p className="mt-1 text-sm text-destructive">
                      {errors.mealsPerDay.message}
                    </p>
                  )}
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="startDate">تاريخ البداية</FieldLabel>
                <Input
                  id="startDate"
                  type="date"
                  dir="ltr"
                  {...register("startDate")}
                  className="text-left"
                />
                {errors.startDate && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.startDate.message}
                  </p>
                )}
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Premium Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>الوجبات المميزة</CardTitle>
                <CardDescription>أضف وجبات مميزة إلى الاشتراك (اختياري)</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  appendPremium({ premiumMealId: "", qty: 1 })
                }
              >
                إضافة وجبة
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {premiumFields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                لا توجد وجبات مميزة مضافة
              </p>
            ) : (
              <div className="space-y-3">
                {premiumFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex items-end gap-3 rounded-lg border p-3"
                  >
                    <Field className="flex-1">
                      <FieldLabel>معرف الوجبة المميزة</FieldLabel>
                      <Input
                        placeholder="أدخل معرف الوجبة"
                        {...register(`premiumItems.${index}.premiumMealId`)}
                      />
                      {errors.premiumItems?.[index]?.premiumMealId && (
                        <p className="mt-1 text-sm text-destructive">
                          {errors.premiumItems[index].premiumMealId?.message}
                        </p>
                      )}
                    </Field>
                    <Field className="w-24">
                      <FieldLabel>الكمية</FieldLabel>
                      <Input
                        type="number"
                        min={1}
                        {...register(`premiumItems.${index}.qty`, {
                          valueAsNumber: true,
                        })}
                      />
                    </Field>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removePremium(index)}
                    >
                      حذف
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Addons */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>الإضافات</CardTitle>
                <CardDescription>أضف إضافات إلى الاشتراك (اختياري)</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendAddon({ value: "" })}
              >
                إضافة
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {addonFields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                لا توجد إضافات
              </p>
            ) : (
              <div className="space-y-3">
                {addonFields.map((field, index) => (
                  <div key={field.id} className="flex items-end gap-3">
                    <Field className="flex-1">
                      <FieldLabel>معرف الإضافة</FieldLabel>
                      <Input
                        placeholder="أدخل معرف الإضافة"
                        {...register(`addons.${index}.value` as const)}
                      />
                    </Field>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeAddon(index)}
                    >
                      حذف
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delivery Info */}
        <Card>
          <CardHeader>
            <CardTitle>معلومات التوصيل</CardTitle>
            <CardDescription>أدخل تفاصيل عنوان التوصيل</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="zoneId">معرف منطقة التوصيل</FieldLabel>
                  <Input
                    id="zoneId"
                    placeholder="أدخل معرف المنطقة"
                    {...register("delivery.zoneId")}
                  />
                  {errors.delivery?.zoneId && (
                    <p className="mt-1 text-sm text-destructive">
                      {errors.delivery.zoneId.message}
                    </p>
                  )}
                </Field>

                <Field>
                  <FieldLabel htmlFor="deliveryWindow">فترة التوصيل</FieldLabel>
                  <Input
                    id="deliveryWindow"
                    dir="ltr"
                    placeholder="09:00-12:00"
                    {...register("delivery.slot.window")}
                    className="text-left"
                  />
                  {errors.delivery?.slot?.window && (
                    <p className="mt-1 text-sm text-destructive">
                      {errors.delivery.slot.window.message}
                    </p>
                  )}
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="addressLabel">تصنيف العنوان</FieldLabel>
                <Input
                  id="addressLabel"
                  placeholder="مثال: المنزل، العمل"
                  {...register("delivery.address.label")}
                />
                {errors.delivery?.address?.label && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.delivery.address.label.message}
                  </p>
                )}
              </Field>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="city">المدينة</FieldLabel>
                  <Input
                    id="city"
                    placeholder="أدخل المدينة"
                    {...register("delivery.address.city")}
                  />
                  {errors.delivery?.address?.city && (
                    <p className="mt-1 text-sm text-destructive">
                      {errors.delivery.address.city.message}
                    </p>
                  )}
                </Field>

                <Field>
                  <FieldLabel htmlFor="district">الحي</FieldLabel>
                  <Input
                    id="district"
                    placeholder="أدخل الحي"
                    {...register("delivery.address.district")}
                  />
                  {errors.delivery?.address?.district && (
                    <p className="mt-1 text-sm text-destructive">
                      {errors.delivery.address.district.message}
                    </p>
                  )}
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="street">الشارع</FieldLabel>
                  <Input
                    id="street"
                    placeholder="أدخل اسم الشارع"
                    {...register("delivery.address.street")}
                  />
                  {errors.delivery?.address?.street && (
                    <p className="mt-1 text-sm text-destructive">
                      {errors.delivery.address.street.message}
                    </p>
                  )}
                </Field>

                <Field>
                  <FieldLabel htmlFor="building">رقم المبنى</FieldLabel>
                  <Input
                    id="building"
                    placeholder="أدخل رقم المبنى"
                    {...register("delivery.address.building")}
                  />
                  {errors.delivery?.address?.building && (
                    <p className="mt-1 text-sm text-destructive">
                      {errors.delivery.address.building.message}
                    </p>
                  )}
                </Field>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isPending}
            size="lg"
            className="min-w-48"
          >
            {isPending ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                جاري إنشاء الاشتراك...
              </>
            ) : (
              "إنشاء الاشتراك"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
