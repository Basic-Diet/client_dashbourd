import { useMemo, useState } from "react";
import { Check, Layers3, Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { MealPlannerBuilderGroup } from "@/types/mealPlannerDashboardTypes";

export function MealPlannerBuilderGroupSelector({
  groups,
  selectedId,
  disabled = false,
  onSelect,
}: {
  groups: MealPlannerBuilderGroup[];
  selectedId?: string;
  disabled?: boolean;
  onSelect: (group: MealPlannerBuilderGroup) => void;
}) {
  const [search, setSearch] = useState("");
  const visibleGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return groups;
    return groups.filter((group) =>
      [
        group.id,
        group.product?.key,
        group.product?.name?.ar,
        group.product?.name?.en,
        group.group?.key,
        group.group?.name?.ar,
        group.group?.name?.en,
        group.optionRole,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [groups, search]);

  return (
    <section className="space-y-3" aria-labelledby="meal-builder-group-label">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p id="meal-builder-group-label" className="text-sm font-medium">
            مجموعة البناء من الـBackend
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            اختر علاقة المنتج ومجموعة الخيارات كما أرسلها الـBackend بدون إعادة بناء محلية.
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          {groups.filter((group) => group.eligible === true).length} متاح
        </Badge>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ابحث باسم المنتج أو المجموعة..."
          className="pr-9"
          disabled={disabled}
        />
      </div>

      {visibleGroups.length ? (
        <div className="grid max-h-72 gap-2 overflow-y-auto rounded-2xl border bg-muted/10 p-2 sm:grid-cols-2">
          {visibleGroups.map((group) => {
            const selected = group.id === selectedId;
            const selectable = group.eligible === true;
            return (
              <button
                key={group.id}
                type="button"
                aria-pressed={selected}
                disabled={disabled || (!selected && !selectable)}
                onClick={() => onSelect(group)}
                className={`flex min-h-28 items-start gap-3 rounded-xl border p-3 text-right transition ${
                  selected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/10"
                    : "bg-background hover:border-primary/35"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                    selected ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  <Layers3 className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold">
                      {builderGroupLabel(group)}
                    </span>
                    <Badge variant="outline">
                      {group.optionRole === "carbs" ? "كارب" : "بروتين"}
                    </Badge>
                    <Badge variant={selectable ? "secondary" : "outline"}>
                      {selectable ? "متاح" : "غير متاح"}
                    </Badge>
                  </span>
                  <span className="mt-2 block text-xs leading-5 text-muted-foreground">
                    {group.optionCount ?? group.options?.length ?? 0} خيارات • {" "}
                    {group.assignableOptionCount ?? 0} قابلة للاختيار
                  </span>
                  {!selectable ? (
                    <span className="mt-1 block text-xs leading-5 text-destructive">
                      {builderGroupReason(group)}
                    </span>
                  ) : null}
                </span>
                <span className="grid size-6 shrink-0 place-items-center rounded-full border bg-background">
                  {selected ? (
                    <Check className="size-3.5 text-primary" />
                  ) : selectable ? null : (
                    <X className="size-3.5 text-destructive" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid min-h-28 place-items-center rounded-2xl border border-dashed p-4 text-center text-sm text-muted-foreground">
          لا توجد مجموعات مطابقة.
        </div>
      )}
    </section>
  );
}

function builderGroupLabel(group: MealPlannerBuilderGroup) {
  const product =
    group.product?.name?.ar ||
    group.product?.name?.en ||
    group.product?.key ||
    "منتج";
  const optionGroup =
    group.group?.name?.ar ||
    group.group?.name?.en ||
    group.group?.key ||
    "مجموعة خيارات";
  return `${product} ← ${optionGroup}`;
}

function builderGroupReason(group: MealPlannerBuilderGroup) {
  const labels: Record<string, string> = {
    PRODUCT_NOT_READY: "المنتج غير جاهز للاشتراكات",
    OPTION_GROUP_NOT_READY: "مجموعة الخيارات غير جاهزة",
    PRODUCT_GROUP_RELATION_UNAVAILABLE: "العلاقة بين المنتج والمجموعة غير متاحة",
    UNSUPPORTED_OPTION_GROUP_ROLE: "دور المجموعة غير مدعوم",
    NO_ASSIGNABLE_STANDARD_OPTIONS: "لا توجد خيارات عادية قابلة للاختيار",
  };
  const reasons = group.reasonCodes || [];
  return reasons.length
    ? reasons.map((reason) => labels[reason] || reason).join(" • ")
    : "المجموعة غير مؤهلة للاستخدام";
}
