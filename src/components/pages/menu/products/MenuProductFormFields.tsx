import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ImageIcon, Package, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller } from "react-hook-form";
import type {
  FieldPath,
  UseFormRegisterReturn,
  UseFormReturn,
} from "react-hook-form";
import type {
  MenuProductSchemaInput,
  MenuProductSchemaType,
} from "@/lib/validations/menuProductSchema";
import {
  useMenuCategoriesQuery,
  useMenuCategoryDetailQuery,
} from "@/hooks/useMenuQuery";
import { MENU_PRODUCT_CARD_SIZE_OPTIONS } from "@/constants/menuCatalog";
import type { MenuCategory } from "@/types/menuTypes";

interface Props {
  form: UseFormReturn<MenuProductSchemaInput, unknown, MenuProductSchemaType>;
  isEdit?: boolean;
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function resolveExistingImageUrl(value: unknown): string {
  if (typeof value === "string") return value.trim();

  const root = asRecord(value);
  const nestedImage = asRecord(root?.image);
  const data = asRecord(root?.data);

  const candidates = [
    root?.imageUrl,
    root?.image_url,
    root?.secureUrl,
    root?.secure_url,
    root?.url,
    nestedImage?.imageUrl,
    nestedImage?.image_url,
    nestedImage?.secureUrl,
    nestedImage?.secure_url,
    nestedImage?.url,
    data?.imageUrl,
    data?.image_url,
    data?.secureUrl,
    data?.secure_url,
    data?.url,
  ];

  return (
    candidates.find(
      (candidate): candidate is string =>
        typeof candidate === "string" && candidate.trim().length > 0
    )?.trim() || ""
  );
}

function isImageFile(value: unknown): value is File {
  return (
    typeof File !== "undefined" &&
    value instanceof File &&
    (!value.type || value.type.startsWith("image/"))
  );
}

export function MenuProductFormFields({ form, isEdit }: Props) {
  const pricingModel = form.watch("pricingModel");
  const selectedCategoryId = form.watch("categoryId") ?? "";
  const isActive = form.watch("isActive") ?? true;
  const isAvailable = form.watch("isAvailable") ?? true;
  const isVisible = form.watch("isVisible") ?? true;
  const numberInput = (
    name: FieldPath<MenuProductSchemaInput>
  ): UseFormRegisterReturn =>
    form.register(name, {
      setValueAs: (value) => (value === "" ? undefined : Number(value)),
    });

  const { data: catsData } = useMenuCategoriesQuery({ limit: 100 });
  const { data: selectedCatData } = useMenuCategoryDetailQuery(selectedCategoryId);

  const categories = mergeCategoriesWithSelected(
    catsData?.data?.items || [],
    selectedCatData?.data,
    selectedCategoryId
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Package className="size-4" />
            </span>
            المعلومات الأساسية
          </CardTitle>
          <CardDescription>أدخل تفاصيل المنتج</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isEdit ? (
            <div className="space-y-2">
              <Label>المفتاح</Label>
              <Input dir="ltr" {...form.register("key")} disabled />
              <p className="text-xs text-muted-foreground">
                يتم توليد المفتاح من الخادم ولا يمكن تعديله.
              </p>
            </div>
          ) : (
            <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
              سيتم توليد المفتاح تلقائياً من الخادم بعد إنشاء المنتج.
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>التصنيف</Label>
              <Controller
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger className="min-w-full" dir="rtl">
                      <SelectValue placeholder="اختر التصنيف" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name.ar ||
                            category.name.en ||
                            category.key ||
                            category.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>حجم بطاقة المنتج</Label>
              <Controller
                control={form.control}
                name="ui.cardSize"
                render={({ field }) => (
                  <Select
                    value={field.value ?? "medium"}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="min-w-full" dir="rtl">
                      <SelectValue placeholder="اختر حجم البطاقة" />
                    </SelectTrigger>
                    <SelectContent>
                      {MENU_PRODUCT_CARD_SIZE_OPTIONS.map((size) => (
                        <SelectItem key={size.value} value={size.value}>
                          {size.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-muted-foreground">
                يستخدمه تطبيق الجوال لتحديد شكل بطاقة المنتج.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Field
              label="الاسم بالعربية"
              placeholder="مثال: دجاج مشوي"
              error={form.formState.errors.name?.ar?.message}
              inputProps={form.register("name.ar")}
            />
            <Field
              label="الاسم بالإنجليزية"
              placeholder="e.g. Grilled Chicken"
              dir="ltr"
              error={form.formState.errors.name?.en?.message}
              inputProps={form.register("name.en")}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <TextAreaField
              label="الوصف بالعربية"
              placeholder="وصف المنتج..."
              inputProps={form.register("description.ar")}
            />
            <TextAreaField
              label="الوصف بالإنجليزية"
              placeholder="Product description..."
              dir="ltr"
              inputProps={form.register("description.en")}
            />
          </div>

          <MenuProductImageField form={form} isEdit={isEdit} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>التسعير</CardTitle>
          <CardDescription>حدد نوع التسعير والسعر</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>نوع التسعير</Label>
              <Controller
                control={form.control}
                name="pricingModel"
                render={({ field }) => (
                  <Select value={field.value ?? "fixed"} onValueChange={field.onChange}>
                    <SelectTrigger dir="rtl" className="min-w-full">
                      <SelectValue placeholder="اختر نوع التسعير" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">سعر ثابت</SelectItem>
                      <SelectItem value="per_100g">بالوزن لكل 100 جم</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <Field
              label="السعر (ر.س)"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              error={form.formState.errors.priceSar?.message}
              inputProps={form.register("priceSar")}
            />
          </div>

          {pricingModel === "per_100g" ? (
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-5">
              <Field
                label="وحدة الوزن (جم)"
                type="number"
                min="1"
                inputProps={numberInput("baseUnitGrams")}
              />
              <Field
                label="الوزن الافتراضي"
                type="number"
                min="0"
                inputProps={numberInput("defaultWeightGrams")}
              />
              <Field
                label="الحد الأدنى"
                type="number"
                min="0"
                inputProps={numberInput("minWeightGrams")}
              />
              <Field
                label="الحد الأقصى"
                type="number"
                min="0"
                inputProps={numberInput("maxWeightGrams")}
              />
              <Field
                label="خطوة الوزن"
                type="number"
                min="1"
                inputProps={numberInput("weightStepGrams")}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>إعدادات الحالة والظهور</CardTitle>
          <CardDescription>
            تحكم في ترتيب وتفعيل وظهور المنتج في التطبيق
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Field
            label="ترتيب العرض"
            type="number"
            min="0"
            placeholder="0"
            error={form.formState.errors.sortOrder?.message}
            inputProps={form.register("sortOrder")}
          />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <ToggleCard
              label="نشط"
              note={isActive ? "المنتج مفعل" : "المنتج معطل"}
              name="isActive"
              form={form}
              className="data-[state=checked]:bg-green-500"
            />
            <ToggleCard
              label="متوفر"
              note={isAvailable ? "متاح للطلب" : "غير متوفر حالياً"}
              name="isAvailable"
              form={form}
              className="data-[state=checked]:bg-emerald-500"
            />
            <ToggleCard
              label="ظاهر"
              note={isVisible ? "يظهر في التطبيق" : "مخفي عن العملاء"}
              name="isVisible"
              form={form}
              className="data-[state=checked]:bg-sky-500"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MenuProductImageField({
  form,
  isEdit,
}: {
  form: UseFormReturn<MenuProductSchemaInput, unknown, MenuProductSchemaType>;
  isEdit?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const imageFileValue = form.watch("imageFile");
  const currentImageUrl = resolveExistingImageUrl(form.watch("imageUrl"));
  const replacementFile = isImageFile(imageFileValue) ? imageFileValue : null;
  const [failedSource, setFailedSource] = useState("");

  const replacementPreviewUrl = useMemo(() => {
    if (
      !replacementFile ||
      typeof URL === "undefined" ||
      typeof URL.createObjectURL !== "function"
    ) {
      return "";
    }
    return URL.createObjectURL(replacementFile);
  }, [replacementFile]);

  useEffect(() => {
    return () => {
      if (
        replacementPreviewUrl &&
        typeof URL !== "undefined" &&
        typeof URL.revokeObjectURL === "function"
      ) {
        URL.revokeObjectURL(replacementPreviewUrl);
      }
    };
  }, [replacementPreviewUrl]);

  const previewUrl = replacementPreviewUrl || currentImageUrl;
  const previewFailed = Boolean(previewUrl && failedSource === previewUrl);
  const imageError = form.formState.errors.imageFile?.message;

  const clearReplacement = () => {
    form.setValue("imageFile", undefined, {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.clearErrors("imageFile");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="menu-product-image">صورة المنتج</Label>
      <div className="grid gap-4 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-center">
        <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl border bg-muted">
          {previewUrl && !previewFailed ? (
            <img
              key={previewUrl}
              src={previewUrl}
              alt="معاينة صورة المنتج"
              className="size-full object-cover"
              onError={() => setFailedSource(previewUrl)}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 px-2 text-center text-xs text-muted-foreground">
              <ImageIcon className="size-7" />
              <span>{previewFailed ? "تعذر عرض الصورة" : "لا توجد صورة"}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Input
            ref={inputRef}
            id="menu-product-image"
            type="file"
            accept="image/*"
            dir="ltr"
            aria-label={isEdit ? "استبدال صورة المنتج" : "اختيار صورة المنتج"}
            onClick={(event) => {
              event.currentTarget.value = "";
            }}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;

              if (!file.type.startsWith("image/")) {
                form.setError("imageFile", {
                  type: "validate",
                  message: "اختر ملف صورة صالحاً",
                });
                event.currentTarget.value = "";
                return;
              }

              form.clearErrors("imageFile");
              form.setValue("imageFile", file, {
                shouldDirty: true,
                shouldValidate: true,
              });
              setFailedSource("");
            }}
          />

          <p className="text-xs text-muted-foreground">
            {replacementFile
              ? `الصورة الجديدة: ${replacementFile.name}`
              : isEdit && currentImageUrl
                ? "ستبقى الصورة الحالية ما لم تختر صورة جديدة."
                : "اختر صورة واضحة للمنتج."}
          </p>

          {typeof imageError === "string" ? (
            <p className="text-xs text-destructive">{imageError}</p>
          ) : null}

          {replacementFile ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={clearReplacement}
            >
              <RotateCcw className="size-4" />
              التراجع عن الصورة الجديدة
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function mergeCategoriesWithSelected(
  categories: MenuCategory[],
  selectedCategory: MenuCategory | undefined,
  selectedCategoryId: string
): MenuCategory[] {
  const byId = new Map<string, MenuCategory>();
  categories.forEach((category) => {
    if (category.id) byId.set(category.id, category);
  });

  if (selectedCategory?.id) {
    byId.set(selectedCategory.id, selectedCategory);
  } else if (selectedCategoryId && !byId.has(selectedCategoryId)) {
    byId.set(selectedCategoryId, {
      id: selectedCategoryId,
      key: selectedCategoryId,
      name: { ar: selectedCategoryId, en: selectedCategoryId },
      isActive: true,
      isAvailable: true,
      isVisible: true,
      sortOrder: 0,
    });
  }

  return Array.from(byId.values());
}

function Field({
  label,
  error,
  inputProps,
  dir,
  ...props
}: React.ComponentProps<typeof Input> & {
  label: string;
  error?: string;
  inputProps: UseFormRegisterReturn;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input dir={dir} {...props} {...inputProps} />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function TextAreaField({
  label,
  inputProps,
  dir,
  ...props
}: React.ComponentProps<typeof Textarea> & {
  label: string;
  inputProps: ReturnType<UseFormReturn["register"]>;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Textarea dir={dir} className="resize-none" {...props} {...inputProps} />
    </div>
  );
}

function ToggleCard({
  label,
  note,
  name,
  form,
  className,
  defaultChecked = true,
}: {
  label: string;
  note: string;
  name: "isActive" | "isAvailable" | "isVisible";
  form: UseFormReturn<MenuProductSchemaInput, unknown, MenuProductSchemaType>;
  className: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm transition-colors hover:bg-muted/50">
      <div className="space-y-0.5">
        <Label className="text-base font-bold">{label}</Label>
        <p className="text-xs text-muted-foreground">{note}</p>
      </div>
      <Controller
        control={form.control}
        name={name}
        render={({ field }) => (
          <Switch
            type="button"
            checked={field.value ?? defaultChecked}
            className={className}
            onCheckedChange={field.onChange}
          />
        )}
      />
    </div>
  );
}
