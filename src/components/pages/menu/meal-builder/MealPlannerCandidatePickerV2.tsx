import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Loader2, Search, UtensilsCrossed, X } from "lucide-react";

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
import type { MenuOption } from "@/types/menuTypes";
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
import { mergeMenuOptionsWithPicker } from "./mealPlannerOptionGroupFlow";

export function MealPlannerCandidatePickerV2({
  type,
  targetSectionKey,
  selectedIds,
  seedCandidates = [],
  menuOptions = [],
  menuOptionsLoading = false,
  menuOptionsError = false,
  productContextId,
  sourceGroupId,
  optionRole,
  familyKey,
  disabled = false,
  onRetryMenuOptions,
  onChange,
}: {
  type: "product" | "option";
  targetSectionKey?: string;
  selectedIds: string[];
  seedCandidates?: MealPlannerCatalogCandidate[];
  menuOptions?: MenuOption[];
  menuOptionsLoading?: boolean;
  menuOptionsError?: boolean;
  productContextId?: string;
  sourceGroupId?: string;
  optionRole?: MealPlannerOptionRole;
  familyKey?: string;
  disabled?: boolean;
  onRetryMenuOptions?: () => void;
  onChange: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const contextReady =
    type === "product" || Boolean(productContextId && sourceGroupId && optionRole);

  const pickerQuery = useInfiniteQuery({
    queryKey: [
      "dashboard.meal-planner.v2.picker",
      type,
      targetSectionKey,
      productContextId,
      sourceGroupId,
      optionRole,
      familyKey,
      type === "product" ? debouncedSearch : "",
    ],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      type === "product"
        ? getMealPlannerProductsPicker(
            {
              targetSectionKey,
              q: debouncedSearch || undefined,
              includeUnavailable: true,
              unassignedOnly: true,
              page: Number(pageParam),
              limit: 1000,
              lang: "ar",
            },
            signal
          )
        : getMealPlannerOptionsPicker(
            {
              targetSectionKey,
              productContextId,
              sourceGroupId,
              optionRole,
              familyKey:
                optionRole === "protein" && familyKey ? familyKey : undefined,
              includeUnavailable: true,
              unassignedOnly: false,
              page: Number(pageParam),
              limit: 1000,
              lang: "ar",
            },
            signal
          ),
    getNextPageParam: (lastPage) => {
      const page = Number(lastPage.data.meta?.page || 1);
      const pages = Number(lastPage.data.meta?.pages || 1);
      return page < pages ? page + 1 : undefined;
    },
    enabled: !disabled && contextReady,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const fetchedCandidates = useMemo(
    () => pickerQuery.data?.pages.flatMap((page) => page.data.candidates) ?? [],
    [pickerQuery.data?.pages]
  );

  const candidates = useMemo(() => {
    if (type === "option") {
      const authoritative = mergeCandidates(
        seedCandidates,
        fetchedCandidates,
        selectedIds
      );
      return menuOptions.length
        ? mergeMenuOptionsWithPicker(menuOptions, authoritative, selectedIds)
        : authoritative;
    }
    return mergeCandidates(seedCandidates, fetchedCandidates, selectedIds);
  }, [fetchedCandidates, menuOptions, seedCandidates, selectedIds, type]);

  const categories = useMemo(
    () =>
      [...new Set(candidates.map((candidate) => candidate.categoryKey).filter(Boolean))]
        .map(String)
        .sort((left, right) => left.localeCompare(right, "ar")),
    [candidates]
  );

  const visibleCandidates = useMemo(() => {
    const queryText = debouncedSearch.toLowerCase();
    return candidates.filter((candidate) => {
      if (
        type === "product" &&
        category !== "all" &&
        !selectedIds.includes(candidateId(candidate)) &&
        candidate.categoryKey !== category
      ) {
        return false;
      }
      if (!queryText) return true;
      return [candidate.key, candidate.name?.ar, candidate.name?.en]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(queryText);
    });
  }, [candidates, category, debouncedSearch, selectedIds, type]);

  const initialLoading =
    (type === "option" && menuOptionsLoading) ||
    (type === "product" && pickerQuery.isLoading && !pickerQuery.data);

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            {type === "product" ? "المنتجات داخل الكارت" : "الخيارات داخل المجموعة"}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {type === "product"
              ? "اختر المنتجات المتاحة لهذا الكارت."
              : "اختر من خيارات مجموعة المنيو. سيقوم الـBackend بالتحقق النهائي عند الحفظ."}
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
            disabled={disabled || !contextReady || menuOptionsLoading}
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

      {type === "option" && menuOptionsError ? (
        <PickerMessage
          text="تعذر تحميل خيارات المجموعة من الـBackend."
          destructive
          action={onRetryMenuOptions}
        />
      ) : type === "option" && !sourceGroupId ? (
        <PickerMessage text="اختر مجموعة خيارات أولًا." />
      ) : initialLoading ? (
        <div className="grid min-h-40 place-items-center rounded-2xl border">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : type === "option" && !contextReady ? (
        <PickerMessage text="اختر سياق المنتج المرتبط بالمجموعة أولًا." />
      ) : (
        <>
          {type === "option" && pickerQuery.error ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-5 text-amber-700 dark:text-amber-300">
              تعذر تحميل بيانات الإتاحة من الـBackend. الخيارات غير المؤكدة ستظل معطلة حتى إعادة المحاولة.
            </p>
          ) : null}

          {visibleCandidates.length ? (
            <OptionRows
              candidates={visibleCandidates}
              selectedIds={selectedIds}
              onChange={onChange}
            />
          ) : (
            <PickerMessage text="لا توجد خيارات مطابقة." />
          )}

          {pickerQuery.hasNextPage ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={pickerQuery.isFetchingNextPage}
              onClick={() => void pickerQuery.fetchNextPage()}
            >
              {pickerQuery.isFetchingNextPage ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ChevronDown className="size-4" />
              )}
              تحميل المزيد
            </Button>
          ) : null}
        </>
      )}
    </section>
  );
}

function OptionRows({
  candidates,
  selectedIds,
  onChange,
}: {
  candidates: MealPlannerCatalogCandidate[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <div className="grid max-h-80 gap-2 overflow-y-auto rounded-2xl border bg-muted/15 p-2 sm:grid-cols-2">
      {candidates.map((candidate) => {
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
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "bg-background hover:border-primary/35 hover:bg-muted/20"
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
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                {selectable ? candidateMeta(candidate) : friendlyReason(candidate)}
                {candidate.assignedSectionKey
                  ? ` • مضاف إلى الكارت: ${candidate.assignedSectionKey}`
                  : ""}
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
  );
}

function PickerMessage({
  text,
  destructive = false,
  action,
}: {
  text: string;
  destructive?: boolean;
  action?: () => void;
}) {
  return (
    <div
      className={`grid min-h-32 place-items-center rounded-2xl border border-dashed p-4 text-center text-sm ${
        destructive
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "text-muted-foreground"
      }`}
    >
      <div className="space-y-2">
        <p>{text}</p>
        {action ? (
          <button type="button" className="underline" onClick={action}>
            إعادة المحاولة
          </button>
        ) : null}
      </div>
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
        : { id, label: id, selected: true, assignable: true }
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
  return parts.filter(Boolean).join(" • ") || "متاح للاختيار";
}

function friendlyReason(candidate: MealPlannerCatalogCandidate) {
  const reason = candidateReason(candidate);
  if (!reason || reason === "MENU_CATALOG_FALLBACK" || reason === "NO_AUTHORITATIVE_CANDIDATE") {
    return "غير متاح لهذا السياق";
  }
  return reason;
}
