import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ImageOff, Loader2, Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MealPlannerStateResponseV2 } from "@/types/mealPlannerDashboardTypes";
import { fetchMenuCategories } from "@/utils/fetchMenuCategories";
import { fetchMenuProducts } from "@/utils/fetchMenuProducts";
import {
  buildMenuProductCandidates,
  buildProductAssignments,
  categoryLabel,
  filterMenuProductCandidates,
  UNCATEGORIZED_CATEGORY_ID,
} from "./mealPlannerMenuProductFlow";

export const MEAL_BUILDER_MENU_CATEGORY_PARAMS = {
  limit: 100,
  includeInactive: true,
} as const;

export const MEAL_BUILDER_MENU_PRODUCT_PARAMS = {
  limit: 1000,
  includeInactive: true,
} as const;

const STATE_KEY = ["dashboard.meal-planner.v2.state"] as const;

export function MealPlannerMenuProductPicker({
  selectedIds,
  currentSectionKey,
  onChange,
}: {
  selectedIds: string[];
  currentSectionKey?: string;
  onChange: (ids: string[]) => void;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");

  const categoriesQuery = useQuery({
    queryKey: ["menu.categories", MEAL_BUILDER_MENU_CATEGORY_PARAMS],
    queryFn: () => fetchMenuCategories(MEAL_BUILDER_MENU_CATEGORY_PARAMS),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const productsQuery = useQuery({
    queryKey: ["menu.products", MEAL_BUILDER_MENU_PRODUCT_PARAMS],
    queryFn: () => fetchMenuProducts(MEAL_BUILDER_MENU_PRODUCT_PARAMS),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const categories = useMemo(
    () => categoriesQuery.data?.data.items ?? [],
    [categoriesQuery.data]
  );
  const products = useMemo(
    () => productsQuery.data?.data.items ?? [],
    [productsQuery.data]
  );
  const state = queryClient.getQueryData<MealPlannerStateResponseV2>(STATE_KEY)?.data;
  const workingSections = useMemo(
    () => state?.draft?.sections ?? state?.published?.sections ?? [],
    [state]
  );
  const assignments = useMemo(
    () => buildProductAssignments(workingSections),
    [workingSections]
  );
  const candidates = useMemo(
    () =>
      buildMenuProductCandidates({
        products,
        selectedIds,
        currentSectionKey,
        assignmentByProductId: assignments,
      }),
    [assignments, currentSectionKey, products, selectedIds]
  );
  const visibleCandidates = useMemo(
    () =>
      filterMenuProductCandidates({
        candidates,
        categories,
        selectedCategoryId,
        search,
      }),
    [candidates, categories, search, selectedCategoryId]
  );
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [String(category.id), category])),
    [categories]
  );
  const hasUncategorized = candidates.some(
    (candidate) =>
      !candidate.categoryId || !categoryById.has(String(candidate.categoryId))
  );

  if (categoriesQuery.isLoading || productsQuery.isLoading) {
    return (
      <div className="grid min-h-44 place-items-center rounded-2xl border">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (categoriesQuery.error || productsQuery.error) {
    return (
      <div className="grid min-h-36 place-items-center rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-center">
        <div className="space-y-3">
          <p className="text-sm text-destructive">
            تعذر تحميل منتجات أو تصنيفات المنيو.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              void Promise.all([
                categoriesQuery.refetch(),
                productsQuery.refetch(),
              ])
            }
          >
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium">منتجات المنيو داخل الكارت</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            كل منتجات المنيو ظاهرة هنا، بما فيها غير النشط أو المخفي، مع توضيح حالتها بدل حذفها.
          </p>
        </div>
        <Badge variant="outline">{selectedIds.length} محدد</Badge>
      </div>

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث بالاسم أو المفتاح أو التصنيف..."
            className="pr-9"
          />
        </div>
        <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="كل التصنيفات" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="all">كل التصنيفات</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={String(category.id)}>
                {categoryLabel(category)}
              </SelectItem>
            ))}
            {hasUncategorized ? (
              <SelectItem value={UNCATEGORIZED_CATEGORY_ID}>غير مصنف</SelectItem>
            ) : null}
          </SelectContent>
        </Select>
      </div>

      {visibleCandidates.length ? (
        <div className="grid max-h-[28rem] gap-2 overflow-y-auto rounded-2xl border bg-muted/15 p-2 sm:grid-cols-2">
          {visibleCandidates.map((candidate) => {
            const category = candidate.categoryId
              ? categoryById.get(String(candidate.categoryId))
              : undefined;
            const disabled = candidate.assignedToAnotherCard;
            return (
              <button
                key={candidate.id}
                type="button"
                disabled={disabled}
                aria-pressed={candidate.selected}
                onClick={() =>
                  onChange(
                    candidate.selected
                      ? selectedIds.filter((id) => id !== candidate.id)
                      : [...selectedIds, candidate.id]
                  )
                }
                className={`flex min-h-24 items-center gap-3 rounded-xl border p-3 text-right transition ${
                  candidate.selected
                    ? "border-primary bg-primary/5"
                    : "bg-background hover:border-primary/35"
                } disabled:cursor-not-allowed disabled:opacity-65`}
              >
                {candidate.imageUrl ? (
                  <img
                    src={candidate.imageUrl}
                    alt=""
                    className="size-14 rounded-xl object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-muted">
                    <ImageOff className="size-4 text-muted-foreground" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {candidate.name?.ar || candidate.name?.en || candidate.key}
                  </span>
                  {candidate.name?.en && candidate.name.en !== candidate.name?.ar ? (
                    <span
                      className="mt-0.5 block truncate text-xs text-muted-foreground"
                      dir="ltr"
                    >
                      {candidate.name.en}
                    </span>
                  ) : null}
                  <span className="mt-1 block truncate text-xs text-muted-foreground">
                    {candidate.key} • {categoryLabel(category)}
                  </span>
                  <span className="mt-2 flex flex-wrap gap-1">
                    {candidate.itemType ? (
                      <Badge variant="outline">{candidate.itemType}</Badge>
                    ) : null}
                    {candidate.isActive === false ? (
                      <Badge variant="destructive">غير نشط</Badge>
                    ) : null}
                    {candidate.isVisible === false ? (
                      <Badge variant="secondary">مخفي</Badge>
                    ) : null}
                    {candidate.isAvailable === false ? (
                      <Badge variant="secondary">غير متاح</Badge>
                    ) : null}
                    {candidate.assignedToAnotherCard ? (
                      <Badge variant="destructive">
                        مضاف إلى {candidate.assignedSectionKey}
                      </Badge>
                    ) : null}
                  </span>
                </span>
                <span
                  className={`grid size-6 shrink-0 place-items-center rounded-full border ${
                    candidate.selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background"
                  }`}
                >
                  {candidate.selected ? (
                    <Check className="size-3.5" />
                  ) : disabled ? (
                    <X className="size-3.5" />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid min-h-32 place-items-center rounded-2xl border border-dashed text-sm text-muted-foreground">
          لا توجد منتجات مطابقة للبحث أو التصنيف.
        </div>
      )}

      {selectedIds.some(
        (id) => !visibleCandidates.some((candidate) => candidate.id === id)
      ) ? (
        <p className="rounded-xl border bg-muted/20 p-3 text-xs text-muted-foreground">
          بعض المنتجات المحددة غير ظاهرة بسبب البحث أو التصنيف الحالي، لكنها ستظل محفوظة ضمن الاختيارات.
        </p>
      ) : null}
    </section>
  );
}
