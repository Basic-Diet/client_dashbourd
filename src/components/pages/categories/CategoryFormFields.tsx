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
import { FolderOpen } from "lucide-react";
import { Controller } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import type { CategorySchemaType } from "@/lib/validations/categorySchema";

interface CategoryFormFieldsProps {
  form: UseFormReturn<CategorySchemaType>;
}

export function CategoryFormFields({ form }: CategoryFormFieldsProps) {
  const isActive = form.watch("isActive") ?? true;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FolderOpen className="size-4" />
            </div>
            المعلومات الأساسية
          </CardTitle>
          <CardDescription>أدخل تفاصيل التصنيف الأساسية</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Names */}
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">الاسم (عربي)</Label>
              <Input
                placeholder="مثال: الفطور"
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
                placeholder="e.g. Breakfast"
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
                placeholder="وصف التصنيف..."
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
                placeholder="Category description..."
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

          {/* Sort Order & Active */}
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

            <div className="flex items-end pb-2">
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
                  {isActive ? "التصنيف نشط" : "التصنيف غير نشط"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
