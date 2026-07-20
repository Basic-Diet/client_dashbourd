import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  Check,
  ChevronDown,
  Loader2,
  Search,
  UtensilsCrossed,
  X,
} from "lucide-react";

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
import type {
  MealPlannerCatalogCandidate,
  MealPlannerOptionRole,
} from "@/types/mealPlannerDashboardTypes";
import {
  getMealPlannerOptionsPicker,
  getMealPlannerProductsPicker,
} from "@/utils/fetchMealPlannerDashboard";
import {
  candidateId,
  candidateName,
  candidateReason,
  candidateSelectable,
} from "./mealPlannerV2Utils";

export function MealPlannerCandidatePickerV2({
  type,
  targetSectionKey,
  selectedIds,
  seedCandidates = [],
  productContextId,
  sourceGroupId,
  optionRole,
  familyKey,
  disabled = false,
  onChange,
}: {
  type: "product" | "option";
  targetSectionKey?: string;
  selectedIds: string[];
  seedCandidates?: MealPlannerCatalogCandidate[];
  productContextId?: string;
  sourceGroupId?: string;
  optionRole?: MealPlannerOptionRole;
  familyKey?: string;
  disabled?: boolean;
  onChange: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const contextReady =
    type === "product" ||
    Boolean(productContextId && sourceGroupId && optionRole);
  const query = useInfiniteQuery({
    queryKey: [
      "dashboard.meal-planner.v2.picker",
      type,
      targetSectionKey,
      productContextId,
      sourceGroupId,
      optionRole,
      familyKey,
      debouncedSearch,
    ],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      type === "product"
        ? getMealPlannerProductsPicker({
            targetSectionKey,
            q: debouncedSearch || undefined,
            includeUnavailable: true,
            unassignedOnly: true,
            page: Number(pageParam),
            limit: 1000,
          }, signal)
        : getMealPlannerOptionsPicker({
            targetSectionKey,
            productContextId,
            sourceGroupId,
            optionRole,
            familyKey:
              optionRole === "protein" && familyKey ? familyKey : undefined,
            q: debouncedSearch || undefined,
            includeUnavailable: true,
            unassignedOnly: true,
            page: Number(pageParam),
            limit: 1000,
          }, signal),
    getNextPageParam: (lastPage) => {
      const page = Number(lastPage.data.meta?.page || 1);
      const pages = Number(lastPage.data.meta?.pages || 1);
      return page < pages ? page + 1 : undefined;
    },
    enabled: !disabled && contextReady,
    staleTime: 10_000,
  });

  const fetchedCandidates = useMemo(
    () =>
      query.data?.pages.flatMap((page) => page.data.candidates) ?? [],
    [query.data?.pages]
  );

  useEffect(() => {
    if (!query.data || !selectedIds.length) return;
    const fetchedById = new Map(
      fetchedCandidates.map((candidate) => [candidateId(candidate), candidate])
    );
    const reconciled = selectedIds.filter((id) => {
      const candidate = fetchedById.get(id);
      if (!candidate) return true;
      return candidate.selected === true || candidate.assignable === true;
    });
    if (
      reconciled.length !== selectedIds.length ||
      reconciled.some((id, index) => id !== selectedIds[index])
    ) {
      onChange(reconciled);
    }
  }, [fetchedCandidates, onChange, query.data, selectedIds]);

  const candidates = useMemo(
    () => mergeCandidates(seedCandidates, fetchedCandidates, selectedIds),
    [fetchedCandidates, seedCandidates, selectedIds]
  );
  const categories = useMemo(
    () =>
      [...new Set(candidates.map((candidate) => candidate.categoryKey).filter(Boolean))]
        .map(String)
        .sort((left, right) => left.localeCompare(right, "ar")),
    [candidates]
  );
  const visibleCandidates = useMemo(
    () =>
      type === "product" && category !== "all"
        ? candidates.filter(
            (candidate) =>
              selectedIds.includes(candidateId(candidate)) ||
              candidate.categoryKey === category
          )
        : candidates,
    [candidates, category, selectedIds, type]
  );
  const initialLoading = query.isLoading && !query.data && !seedCandidates.length;

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            {type === "product" ? "المنتجات داخل الكارت" : "الخيارات داخل الكارت"}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            العناصر غير الجاهزة أو المستخدمة في كارت آخر تظهر معطلة وسبب واضح.
          </p>
        </div>
        <Badge variant="outline">{selectedIds.length} محدد</Badge>
      </div>

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث بالاسم أو المفتاح..."
            className="pr-9"
            disabled={disabled || !contextReady}
          />
        </div>
        {type === "product" ? (
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="كل التصنيفات" />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="all">كل التصنيفات</SelectItem>
              {categories.map((categoryKey) => (
                <SelectItem key={categoryKey} value={categoryKey}>
                  {categoryKey}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      {!contextReady ? (
        <PickerMessage text="اختر المنتج الأساسي ومجموعة الخيارات أولًا." />
      ) : initialLoading ? (
        <div className="grid min-h-40 place-items-center rounded-2xl border">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : query.error ? (
        <PickerMessage
          text="تعذر تحميل العناصر من الـBackend. راجع الاختيارات وحاول مرة أخرى."
          destructive
        />
      ) : visibleCandidates.length ? (
        <>
          <div className="grid max-h-80 gap-2 overflow-y-auto rounded-2xl border bg-muted/15 p-2 sm:grid-cols-2">
            {visibleCandidates.map((candidate) => {
              const id = candidateId(candidate);
              const selected = selectedIds.includes(id);
              const selectable = candidateSelectable(candidate);
              return (
                <button
                  key={id}
                  type="button"
                  disabled={!selectable}
                  aria-pressed={selected}
                  onClick={() =>
                    onChange(
                      selected
                        ? selectedIds.filter((item) => item !== id)
                        : [...selectedIds, id]
                    )
                  }
                  className={`flex min-h-16 items-center gap-3 rounded-xl border p-3 text-right transition ${
                    selected
                      ? "border-primary bg-primary/5"
                      : "bg-background hover:border-primary/35"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {candidate.imageUrl ? (
                    <img
                      src={candidate.imageUrl}
                      alt=""
                      className="size-11 rounded-lg object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-muted">
                      <UtensilsCrossed className="size-4 text-muted-foreground" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {candidateName(candidate)}
                    </span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {selectable
                        ? candidateMeta(candidate)
                        : candidateReason(candidate)}
                    </span>
                  </span>
                  <span
                    className={`grid size-6 shrink-0 place-items-center rounded-full border ${
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-background"
                    }`}
                  >
                    {selected ? (
                      <Check className="size-3.5" />
                    ) : selectable ? null : (
                      <X className="size-3.5" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          {query.hasNextPage ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              {query.isFetchingNextPage ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ChevronDown className="size-4" />
              )}
              تحميل المزيد
            </Button>
          ) : null}
        </>
      ) : (
        <PickerMessage text="لا توجد نتائج مطابقة أو عناصر مرتبطة بهذه الاختيارات." />
      )}
    </section>
  );
}

function PickerMessage({
  text,
  destructive = false,
}: {
  text: string;
  destructive?: boolean;
}) {
  return (
    <div
      className={`grid min-h-32 place-items-center rounded-2xl border border-dashed p-4 text-center text-sm ${
        destructive
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "text-muted-foreground"
      }`}
    >
      {text}
    </div>
  );
}

function mergeCandidates(
  seed: MealPlannerCatalogCandidate[],
  fetched: MealPlannerCatalogCandidate[],
  selectedIds: string[]
) {
  const map = new Map<string, MealPlannerCatalogCandidate>();
  for (const candidate of [...seed, ...fetched]) {
    const id = candidateId(candidate);
    if (id) map.set(id, candidate);
  }
  for (const id of selectedIds) {
    const candidate = map.get(id);
    map.set(
      id,
      candidate
        ? { ...candidate, selected: true }
        : {
            id,
            label: id,
            selected: true,
            assignable: true,
          }
    );
  }
  return [...map.values()].sort((left, right) => {
    const leftSelected = selectedIds.includes(candidateId(left)) ? 1 : 0;
    const rightSelected = selectedIds.includes(candidateId(right)) ? 1 : 0;
    return (
      rightSelected - leftSelected ||
      candidateName(left).localeCompare(candidateName(right), "ar")
    );
  });
}

function candidateMeta(candidate: MealPlannerCatalogCandidate) {
  const parts = [candidate.key];
  const family = candidate.familyKey || candidate.proteinFamilyKey;
  if (family) parts.push(`العائلة: ${family}`);
  const price = candidate.extraPriceHalala ?? candidate.priceHalala;
  if (typeof price === "number") {
    parts.push(`${(price / 100).toFixed(2)} ${candidate.currency || "SAR"}`);
  }
  return parts.filter(Boolean).join(" • ") || "جاهز للاختيار";
}
