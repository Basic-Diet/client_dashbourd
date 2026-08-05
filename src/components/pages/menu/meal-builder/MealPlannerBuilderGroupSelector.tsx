import { useMemo, useState } from "react";
import { Check, Layers3, Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { MealPlannerBuilderGroup } from "@/types/mealPlannerDashboardTypes";
import {
  builderGroupContextLabel,
  optionRoleLabel,
} from "./mealPlannerOptionGroupFlow";

export function MealPlannerBuilderGroupSelector({
  groups,
  selectedGroupId,
  disabled = false,
  loading = false,
  error = false,
  onRetry,
  onSelect,
}: {
  groups: MealPlannerBuilderGroup[];
  selectedGroupId?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  onSelect: (group: MealPlannerBuilderGroup) => void;
}) {
  const [search, setSearch] = useState("");
  const visibleGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return groups;
    return groups.filter((group) =>
      [
        group.id,
        group.productContextId,
        group.sourceGroupId,
        group.product?.key,
        group.product?.name?.ar,
        group.product?.name?.en,
        group.group?.key,
        group.group?.name?.ar,
        group.group?.name?.en,
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
            مجموعة الخيارات
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            اختر مجموعة مدعومة لإنشاء الكارت. المجموعات غير المرتبطة بسياق Meal Builder تظهر للمعلومة فقط.
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          {groups.length} مجموعة
        </Badge>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ابحث بالمفتاح أو الاسم..."
          className="pr-9"
          disabled={disabled || loading}
          aria-label="البحث في مجموعات الخيارات"
        />
      </div>

      {loading ? (
        <Message text="جاري تحميل مجموعات الخيارات..." />
      ) : error ? (
        <div className="space-y-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-center text-sm text-destructive">
          <p>تعذر تحميل مجموعات الخيارات من الـBackend.</p>
          {onRetry ? (
            <button type="button" className="underline" onClick={onRetry}>
              إعادة المحاولة
            </button>
          ) : null}
        </div>
      ) : visibleGroups.length ? (
        <div className="grid max-h-72 gap-2 overflow-y-auto rounded-2xl border bg-muted/10 p-2 sm:grid-cols-2">
          {visibleGroups.map((group) => {
            const saveable = group.eligible === true;
            const selected = saveable && group.id === selectedGroupId;
            const groupDisabled = disabled || !saveable;
            const groupName =
              group.group?.name?.ar ||
              group.group?.name?.en ||
              group.group?.key ||
              group.sourceGroupId;
            const label = `${builderGroupContextLabel(group)} ← ${groupName}`;
            return (
              <button
                key={group.id}
                type="button"
                aria-pressed={selected}
                aria-disabled={groupDisabled}
                disabled={groupDisabled}
                title={saveable ? undefined : "هذه المجموعة غير مرتبطة بسياق صالح في Meal Builder"}
                onClick={() => {
                  if (saveable) onSelect(group);
                }}
                className={`flex min-h-28 items-start gap-3 rounded-xl border p-3 text-right transition ${
                  selected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/10"
                    : saveable
                      ? "bg-background hover:border-primary/35"
                      : "border-dashed bg-muted/20"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${selected ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <Layers3 className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold">{label}</span>
                    <Badge variant="outline">{group.sourceGroupId}</Badge>
                    <Badge variant={saveable ? "secondary" : "outline"}>
                      {saveable ? "متاح للاختيار" : "غير مدعوم حاليًا"}
                    </Badge>
                    <Badge variant="outline">{optionRoleLabel(group.optionRole)}</Badge>
                  </span>
                  <span className="mt-2 block text-xs leading-5 text-muted-foreground">
                    {saveable
                      ? `${group.optionCount} خيارات • ${group.assignableOptionCount} قابلة للاختيار`
                      : builderGroupReason(group)}
                  </span>
                </span>
                <span className="grid size-6 shrink-0 place-items-center rounded-full border bg-background">
                  {selected ? <Check className="size-3.5 text-primary" /> : saveable ? null : <X className="size-3.5 text-muted-foreground" />}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <Message text="لا توجد مجموعات خيارات مطابقة." />
      )}
    </section>
  );
}

function Message({ text }: { text: string }) {
  return (
    <div className="grid min-h-28 place-items-center rounded-2xl border border-dashed p-4 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function builderGroupReason(group: MealPlannerBuilderGroup) {
  if (group.reasonCodes?.includes("PRODUCT_NOT_READY")) {
    return "المنتج غير جاهز للاشتراكات";
  }
  if (group.reasonCodes?.includes("GROUP_NOT_READY")) {
    return "مجموعة الخيارات غير جاهزة للاشتراكات";
  }
  return "العلاقة غير جاهزة للاستخدام في Meal Builder";
}
