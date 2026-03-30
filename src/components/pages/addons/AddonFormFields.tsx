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
import { PlusSquare } from "lucide-react";
import { Controller } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import type { AddonSchemaType } from "@/lib/validations/addonSchema";

interface AddonFormFieldsProps {
  form: UseFormReturn<AddonSchemaType>;
}

export function AddonFormFields({ form }: AddonFormFieldsProps) {
  const isActive = form.watch("isActive") ?? true;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <PlusSquare className="size-4" />
          </div>
          معلومات الإضافة
        </CardTitle>
        <CardDescription>أدخل تفاصيل الإضافة</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Names */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">الاسم (عربي)</Label>
            <Input
              placeholder="مثال: عصير برتقال يومي"
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
              placeholder="e.g. Daily Orange Juice"
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
              placeholder="وصف مكونات الإضافة..."
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
              placeholder="Addon ingredients description..."
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

        {/* Image & Type */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
          <div className="flex flex-col justify-end space-y-1.5">
            <Label className="text-sm font-medium">صورة الإضافة (Image)</Label>
            <div className="flex items-center gap-3">
              {(form.watch("imageFile") || form.watch("imageUrl")) && (
                <div className="relative size-10 shrink-0 overflow-hidden rounded-md border bg-muted">
                  <img
                    src={
                      form.watch("imageFile")
                        ? URL.createObjectURL(
                            form.watch("imageFile") as unknown as File
                          )
                        : form.watch("imageUrl")!
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
              !form.watch("imageUrl") &&
              form.formState.errors.imageUrl && (
                <p className="text-xs text-destructive">
                  يرجى رفع صورة للإضافة
                </p>
              )}
          </div>

          {/* Type Select */}
          <div className="flex flex-col justify-end">
            <Label className="mb-2 text-sm font-medium">النوع (Type)</Label>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(val: "subscription" | "one_time") =>
                    field.onChange(val)
                  }
                >
                  <SelectTrigger aria-invalid={!!form.formState.errors.type}>
                    <SelectValue placeholder="اختر نوع الإضافة" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectGroup>
                      <SelectItem value="subscription">
                        اشتراك (Subscription)
                      </SelectItem>
                      <SelectItem value="one_time">
                        مرة واحدة (One Time)
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.type && (
              <p className="text-xs text-destructive">
                {form.formState.errors.type.message}
              </p>
            )}
          </div>
        </div>

        {/* Pricing, Category, Sorting */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">التصنيف (Category)</Label>
            <Input
              dir="ltr"
              placeholder="e.g. beverage, snacks"
              {...form.register("category")}
              aria-invalid={!!form.formState.errors.category}
            />
            {form.formState.errors.category && (
              <p className="text-xs text-destructive">
                {form.formState.errors.category.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">السعر (ريال)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="12.00"
              {...form.register("priceSar")}
              aria-invalid={!!form.formState.errors.priceSar}
            />
            {form.formState.errors.priceSar && (
              <p className="text-xs text-destructive">
                {form.formState.errors.priceSar.message}
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

        {/* Active Toggle */}
        <div className="mt-2 flex w-fit cursor-pointer items-center gap-3 border-t border-border/40 pt-4">
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
            {isActive ? "الإضافة متاحة للإختيار" : "الإضافة غير متاحة"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
