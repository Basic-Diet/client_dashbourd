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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusSquare, Loader2 } from "lucide-react";
import { Controller } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import type { MealSchemaType } from "@/lib/validations/mealSchema";
import { useCategoriesQuery } from "@/hooks/useCategoriesQuery";

interface MealFormFieldsProps {
  form: UseFormReturn<MealSchemaType>;
}

export function MealFormFields({ form }: MealFormFieldsProps) {
  const isActive = form.watch("isActive") ?? true;
  const availableForOrder = form.watch("availableForOrder") ?? true;
  const availableForSubscription = form.watch("availableForSubscription") ?? true;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PlusSquare className="size-4" />
            </div>
            المعلومات الأساسية
          </CardTitle>
          <CardDescription>أدخل تفاصيل الوجبة الأساسية</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Names */}
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">الاسم (عربي)</Label>
              <Input
                placeholder="مثال: دجاج مشوي"
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
              <Label className="text-sm font-medium">الاسم (إنجليزي)</Label>
              <Input
                dir="ltr"
                placeholder="e.g. Grilled Chicken"
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

          {/* Descriptions */}
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">الوصف (عربي)</Label>
              <Textarea
                placeholder="وصف مكونات الوجبة..."
                className="resize-none"
                {...form.register("description.ar")}
                aria-invalid={!!form.formState.errors.description?.ar}
              />
              {form.formState.errors.description?.ar && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.description.ar.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">الوصف (إنجليزي)</Label>
              <Textarea
                dir="ltr"
                placeholder="Meal ingredients description..."
                className="resize-none"
                {...form.register("description.en")}
                aria-invalid={!!form.formState.errors.description?.en}
              />
              {form.formState.errors.description?.en && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.description.en.message}
                </p>
              )}
            </div>
          </div>

          {/* Category & Image */}
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
            <CategorySelect form={form} />

            <div className="flex flex-col justify-end space-y-1.5">
              <Label className="text-sm font-medium">صورة الوجبة (Image)</Label>
              <div className="flex items-center gap-3">
                {(form.watch("imageFile") || form.watch("image")) && (
                  <div className="relative size-10 shrink-0 overflow-hidden rounded-md border bg-muted">
                    <img
                      src={
                        form.watch("imageFile")
                          ? URL.createObjectURL(
                              form.watch("imageFile") as unknown as File
                            )
                          : form.watch("image")!
                      }
                      alt="Preview"
                      className="size-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    dir="ltr"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        form.setValue("imageFile", file, {
                          shouldValidate: true,
                        });
                      } else {
                        form.setValue("imageFile", undefined, {
                          shouldValidate: true,
                        });
                      }
                    }}
                    aria-invalid={!!form.formState.errors.imageFile}
                  />
                </div>
              </div>
              {form.formState.errors.imageFile && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.imageFile.message}
                </p>
              )}
              {!form.watch("imageFile") &&
                !form.watch("image") &&
                form.formState.errors.image && (
                  <p className="text-xs text-destructive">
                    يرجى رفع صورة للوجبة
                  </p>
                )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">الماكروز والإعدادات (Macros & Settings)</CardTitle>
          <CardDescription>حدد القيم الغذائية وإعدادات العرض</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Macros */}
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">البروتين (غرام)</Label>
              <Input
                type="number"
                min="0"
                placeholder="25"
                {...form.register("proteinGrams")}
                aria-invalid={!!form.formState.errors.proteinGrams}
              />
              {form.formState.errors.proteinGrams && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.proteinGrams.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">الكربوهيدرات (غرام)</Label>
              <Input
                type="number"
                min="0"
                placeholder="15"
                {...form.register("carbGrams")}
                aria-invalid={!!form.formState.errors.carbGrams}
              />
              {form.formState.errors.carbGrams && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.carbGrams.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">الدهون (غرام)</Label>
              <Input
                type="number"
                min="0"
                placeholder="12"
                {...form.register("fatGrams")}
                aria-invalid={!!form.formState.errors.fatGrams}
              />
              {form.formState.errors.fatGrams && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.fatGrams.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
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

          {/* Toggles */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 pt-4 border-t border-border/40">
            <div className="flex cursor-pointer items-center gap-3">
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
                {isActive ? "الوجبة نشطة" : "الوجبة غير نشطة"}
              </span>
            </div>

            <div className="flex cursor-pointer items-center gap-3">
              <Controller
                control={form.control}
                name="availableForOrder"
                render={({ field }) => (
                  <Switch
                    type="button"
                    checked={field.value ?? true}
                    className="cursor-pointer data-[state=checked]:bg-blue-500"
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <span className="text-sm font-bold">
                {availableForOrder ? "متاحة للطلب" : "غير متاحة للطلب"}
              </span>
            </div>

            <div className="flex cursor-pointer items-center gap-3">
              <Controller
                control={form.control}
                name="availableForSubscription"
                render={({ field }) => (
                  <Switch
                    type="button"
                    checked={field.value ?? true}
                    className="cursor-pointer data-[state=checked]:bg-purple-500"
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <span className="text-sm font-bold">
                {availableForSubscription ? "متاحة للاشتراك" : "غير متاحة للاشتراك"}
              </span>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}

function CategorySelect({ form }: { form: UseFormReturn<MealSchemaType> }) {
  const { data: categoriesResponse, isLoading } = useCategoriesQuery();
  const categories = categoriesResponse?.data || [];

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">التصنيف (Category)</Label>
      <Controller
        control={form.control}
        name="categoryId"
        render={({ field }) => (
          <Select
            onValueChange={field.onChange}
            value={field.value}
            disabled={isLoading}
          >
            <SelectTrigger
              dir="rtl"
              className="w-full"
              aria-invalid={!!form.formState.errors.categoryId}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  <span>جاري التحميل...</span>
                </div>
              ) : (
                <SelectValue placeholder="اختر تصنيف الوجبة" />
              )}
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectGroup>
                {categories.map((cat) => (
                  <SelectItem key={cat._id} value={cat._id}>
                    {cat.name.ar} ({cat.name.en})
                  </SelectItem>
                ))}
                {categories.length === 0 && !isLoading && (
                  <div className="p-2 text-center text-xs text-muted-foreground">
                    لا يوجد تصنيفات متاحة
                  </div>
                )}
              </SelectGroup>
            </SelectContent>
          </Select>
        )}
      />
      {form.formState.errors.categoryId && (
        <p className="text-xs text-destructive">
          {form.formState.errors.categoryId.message}
        </p>
      )}
    </div>
  );
}
