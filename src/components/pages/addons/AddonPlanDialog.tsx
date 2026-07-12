import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { CheckCircle2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type {
  Addon,
  AddonCategoryOption,
  AddonPlanWritePayload,
  BasePlanPickerItem,
  MenuProductPickerItem,
} from "@/types/addonTypes";
import {
  addonId,
  ensurePriceRows,
  localizedName,
  planToForm,
  uniqueIds,
  upsertPriceRow,
  validateAndBuildPayload,
  type PlanFormState,
  type PriceRowState,
} from "./addon-plan-form-utils";

const UNCATEGORIZED_KEY = "__uncategorized__";

type AddonPlanDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: Addon | null;
  products: MenuProductPickerItem[];
  basePlans: BasePlanPickerItem[];
  categories: AddonCategoryOption[];
  isSaving: boolean;
  serverError?: string | null;
  onSubmit: (payload: AddonPlanWritePayload) => void;
};

type DialogFormState = {
  form: PlanFormState;
  error: string | null;
};

type TextFieldName = "nameAr" | "nameEn" | "category" | "maxPerDay";

type DialogFormAction =
  | { type: "RESET_FROM_PLAN"; form: PlanFormState }
  | { type: "SET_FIELD"; field: TextFieldName; value: string }
  | { type: "SET_FIELD"; field: "isActive"; value: boolean }
  | { type: "SET_PRODUCT_IDS"; productIds: string[] }
  | {
      type: "UPDATE_PRICE";
      basePlanId: string;
      patch: Partial<Pick<PriceRowState, "priceHalala" | "isActive">>;
    }
  | { type: "SET_ERROR"; error: string };

function dialogFormReducer(
  state: DialogFormState,
  action: DialogFormAction
): DialogFormState {
  switch (action.type) {
    case "RESET_FROM_PLAN":
      return { form: action.form, error: null };
    case "SET_FIELD":
      return {
        form: { ...state.form, [action.field]: action.value },
        error: null,
      };
    case "SET_PRODUCT_IDS":
      return {
        form: {
          ...state.form,
          menuProductIds: uniqueIds(action.productIds),
        },
        error: null,
      };
    case "UPDATE_PRICE":
      return {
        form: {
          ...state.form,
          prices: upsertPriceRow(
            state.form.prices,
            action.basePlanId,
            action.patch
          ),
        },
        error: null,
      };
    case "SET_ERROR":
      return { ...state, error: action.error };
    default:
      return state;
  }
}

export function AddonPlanDialog({
  open,
  onOpenChange,
  plan,
  products,
  basePlans,
  isSaving,
  serverError,
  onSubmit,
}: AddonPlanDialogProps) {
  const [state, dispatch] = useReducer(dialogFormReducer, null, () => ({
    form: planToForm(plan, basePlans),
    error: null,
  }));
  const { form } = state;
  const [productSearch, setProductSearch] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const planKey = plan ? addonId(plan) : "create";
  const basePlanIdsKey = useMemo(
    () => basePlans.map((basePlan) => basePlan.id).join("|"),
    [basePlans]
  );
  const resetKey = `${planKey}:${basePlanIdsKey}`;
  const lastResetKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (lastResetKeyRef.current === resetKey) return;

    dispatch({
      type: "RESET_FROM_PLAN",
      form: planToForm(plan, basePlans),
    });
    setProductSearch("");
    setProductCategoryFilter("all");
    lastResetKeyRef.current = resetKey;
  }, [basePlans, open, plan, resetKey]);

  const productCategoryOptions = useMemo(() => {
    const counts = new Map<string, number>();

    products.forEach((product) => {
      const key = getProductCategoryKey(product);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((left, right) =>
        formatProductCategory(left.key).localeCompare(
          formatProductCategory(right.key),
          "ar"
        )
      );
  }, [products]);

  const filteredProducts = useMemo(() => {
    const search = productSearch.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        productCategoryFilter === "all" ||
        getProductCategoryKey(product) === productCategoryFilter;

      if (!matchesCategory) return false;
      if (!search) return true;

      const haystack = [
        product.key,
        product.category,
        product.name.ar,
        product.name.en,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });
  }, [productCategoryFilter, productSearch, products]);

  const selectedProducts = useMemo(
    () =>
      products.filter((product) => form.menuProductIds.includes(product.id)),
    [form.menuProductIds, products]
  );

  const activePriceRows = useMemo(
    () => ensurePriceRows(form.prices, basePlans).filter((price) => price.isActive),
    [basePlans, form.prices]
  );

  const updateTextField = (field: TextFieldName, value: string) => {
    dispatch({ type: "SET_FIELD", field, value });
  };

  const setProductSelected = (productId: string, selected: boolean) => {
    const currentIds = uniqueIds(form.menuProductIds);

    dispatch({
      type: "SET_PRODUCT_IDS",
      productIds: selected
        ? uniqueIds([...currentIds, productId])
        : currentIds.filter((id) => id !== productId),
    });
  };

  const updatePrice = (
    basePlanId: string,
    patch: Partial<Pick<PriceRowState, "priceHalala" | "isActive">>
  ) => {
    dispatch({ type: "UPDATE_PRICE", basePlanId, patch });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;

    const result = validateAndBuildPayload(form, basePlans);
    if (!result.ok) {
      dispatch({ type: "SET_ERROR", error: result.message });
      return;
    }

    onSubmit(result.payload);
  };

  const shownError = state.error || serverError;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="grid max-h-[92dvh] w-[calc(100%-1rem)] max-w-[72rem] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-[72rem] [&_*]:min-w-0"
        dir="rtl"
      >
        <DialogHeader className="border-b px-5 py-4 text-right">
          <DialogTitle>
            {plan ? "تعديل باقة إضافة" : "إنشاء باقة إضافة"}
          </DialogTitle>
          <DialogDescription>
            اربط المنتجات المطلوبة مباشرة بالباقة، واستخدم فلتر التصنيف للوصول
            إليها بسرعة، ثم أدخل السعر لكل باقة اشتراك أساسية.
          </DialogDescription>
        </DialogHeader>

        <form
          id="addon-plan-form"
          className="min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-5"
          onSubmit={handleSubmit}
        >
          <div className="space-y-4">
            <section className="space-y-4 rounded-lg border bg-muted/10 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0 text-primary" />
                <h3 className="text-sm font-semibold">بيانات باقة الإضافة</h3>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field
                  label="الاسم بالعربي"
                  value={form.nameAr}
                  onChange={(value) => updateTextField("nameAr", value)}
                  required
                />
                <Field
                  label="الاسم بالإنجليزي"
                  value={form.nameEn}
                  onChange={(value) => updateTextField("nameEn", value)}
                  required
                  dir="ltr"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-[9rem_9rem] md:items-end">
                <Field
                  label="الحد اليومي"
                  type="number"
                  value={form.maxPerDay}
                  onChange={(value) => updateTextField("maxPerDay", value)}
                  required
                />
                <div className="flex h-10 items-center justify-between gap-3 rounded-md border bg-background px-3">
                  <Label>نشطة</Label>
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={(checked) =>
                      dispatch({
                        type: "SET_FIELD",
                        field: "isActive",
                        value: checked,
                      })
                    }
                  />
                </div>
              </div>
            </section>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.72fr)] xl:items-start">
              <section className="space-y-3 rounded-lg border bg-muted/10 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">
                      مصفوفة أسعار باقات الاشتراك الأساسية
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      أدخل السعر بالهللة لكل باقة اشتراك أساسية، ويمكن تعطيل أي صف
                      بدون حذفه.
                    </p>
                  </div>
                  <Badge variant="outline">
                    {activePriceRows.length.toLocaleString("ar-EG")} نشطة
                  </Badge>
                </div>
                {basePlans.length === 0 ? (
                  <p className="rounded-lg border border-dashed bg-background p-4 text-sm text-muted-foreground">
                    لا توجد باقات اشتراك أساسية من الخادم.
                  </p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {basePlans.map((basePlan) => {
                      const row = form.prices.find(
                        (price) => price.basePlanId === basePlan.id
                      );

                      return (
                        <div
                          key={basePlan.id}
                          className="rounded-lg border bg-background p-3 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="line-clamp-2 text-sm font-semibold leading-6">
                                {basePlan.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {basePlan.daysCount ?? "-"} يوم ·{" "}
                                {basePlan.mealsCount ?? "-"} وجبة
                              </p>
                            </div>
                            <Switch
                              checked={row?.isActive ?? true}
                              onCheckedChange={(checked) =>
                                updatePrice(basePlan.id, { isActive: checked })
                              }
                            />
                          </div>
                          <div className="mt-3 space-y-2">
                            <Label className="text-xs">السعر بالهللة</Label>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              inputMode="numeric"
                              value={row?.priceHalala ?? "0"}
                              onChange={(event) =>
                                updatePrice(basePlan.id, {
                                  priceHalala: event.target.value,
                                })
                              }
                              className="h-10 text-right"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <div className="space-y-4">
                <section className="space-y-3 rounded-lg border bg-muted/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">ربط المنتجات</h3>
                      <p className="text-xs text-muted-foreground">
                        اختر المنتجات نفسها. فلتر التصنيف للتنظيم فقط ولا يربط
                        التصنيف بالباقة.
                      </p>
                    </div>
                    <Badge variant="outline">
                      {form.menuProductIds.length.toLocaleString("ar-EG")} مختارة
                    </Badge>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_13rem]">
                    <div className="relative">
                      <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={productSearch}
                        onChange={(event) => setProductSearch(event.target.value)}
                        className="pr-9"
                        placeholder="ابحث باسم المنتج أو الكود"
                      />
                    </div>
                    <Select
                      value={productCategoryFilter}
                      onValueChange={setProductCategoryFilter}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="كل التصنيفات" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          كل التصنيفات ({products.length.toLocaleString("ar-EG")})
                        </SelectItem>
                        {productCategoryOptions.map((category) => (
                          <SelectItem key={category.key} value={category.key}>
                            {formatProductCategory(category.key)} ({category.count.toLocaleString("ar-EG")})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>
                      ظاهر {filteredProducts.length.toLocaleString("ar-EG")} من{" "}
                      {products.length.toLocaleString("ar-EG")} منتج
                    </span>
                    {productCategoryFilter !== "all" || productSearch.trim() ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          setProductSearch("");
                          setProductCategoryFilter("all");
                        }}
                      >
                        مسح الفلتر
                      </Button>
                    ) : null}
                  </div>

                  <div className="max-h-[19rem] overflow-y-auto overflow-x-hidden rounded-lg border bg-background">
                    {filteredProducts.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground">
                        لا توجد منتجات مطابقة للبحث والتصنيف المحددين.
                      </p>
                    ) : (
                      <div className="divide-y">
                        {filteredProducts.map((product) => {
                          const checked = form.menuProductIds.includes(product.id);
                          const checkboxId = `addon-product-${product.id}`;
                          const categoryKey = getProductCategoryKey(product);

                          return (
                            <div
                              key={product.id}
                              className="flex w-full items-center gap-3 px-3 py-3 text-right transition hover:bg-muted/50"
                            >
                              <Checkbox
                                id={checkboxId}
                                checked={checked}
                                onCheckedChange={(value) =>
                                  setProductSelected(product.id, value === true)
                                }
                              />
                              <label
                                htmlFor={checkboxId}
                                className="min-w-0 flex-1 cursor-pointer"
                              >
                                <span className="block truncate text-sm font-medium">
                                  {localizedName(product.name)}
                                </span>
                                <span
                                  className="block truncate text-xs text-muted-foreground"
                                  dir="ltr"
                                >
                                  {product.key || product.id}
                                </span>
                              </label>
                              <Badge variant="secondary" className="max-w-28 truncate">
                                {formatProductCategory(categoryKey)}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </section>

                <section className="space-y-2 rounded-lg border bg-muted/10 p-4">
                  <h3 className="text-sm font-semibold">المنتجات المختارة</h3>
                  {selectedProducts.length === 0 ? (
                    <p className="rounded-md border border-dashed bg-background p-3 text-sm text-muted-foreground">
                      اختر منتجا واحدا على الأقل.
                    </p>
                  ) : (
                    <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto overflow-x-hidden">
                      {selectedProducts.map((product) => (
                        <Badge key={product.id} variant="secondary">
                          {localizedName(product.name)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </section>

                {shownError ? (
                  <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    {shownError}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </form>

        <DialogFooter className="border-t bg-background px-5 py-4">
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={() => onOpenChange(false)}
          >
            إلغاء
          </Button>
          <Button type="submit" form="addon-plan-form" disabled={isSaving}>
            حفظ الباقة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getProductCategoryKey(product: MenuProductPickerItem) {
  return product.category?.trim() || UNCATEGORIZED_KEY;
}

function formatProductCategory(categoryKey: string) {
  if (categoryKey === UNCATEGORIZED_KEY) return "بدون تصنيف";
  return categoryKey.replace(/[_-]+/g, " ");
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  dir,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
  required?: boolean;
  dir?: "rtl" | "ltr";
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        required={required}
        dir={dir}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
