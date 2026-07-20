import {
  Crown,
  Eye,
  EyeOff,
  Layers3,
  ListChecks,
  Package,
  Pencil,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  MealPlannerCatalogV2,
  MealPlannerPremiumSectionV2,
  MealPlannerSectionV2,
  MealPlannerValidationIssue,
} from "@/types/mealPlannerDashboardTypes";
import {
  candidateId,
  candidateName,
  findBuilderGroup,
  issueText,
  normalizeCardType,
  sectionItems,
  sectionOptionRole,
  sectionTitle,
} from "./mealPlannerV2Utils";

export function MealPlannerCardGridV2({
  premiumSection,
  catalog,
  sections,
  issues,
  pending,
  readOnly = false,
  onEdit,
  onManageItems,
  onToggleVisibility,
  onDelete,
}: {
  premiumSection?: MealPlannerPremiumSectionV2 | null;
  catalog: MealPlannerCatalogV2;
  sections: MealPlannerSectionV2[];
  issues: MealPlannerValidationIssue[];
  pending: boolean;
  readOnly?: boolean;
  onEdit: (section: MealPlannerSectionV2) => void;
  onManageItems: (section: MealPlannerSectionV2) => void;
  onToggleVisibility: (section: MealPlannerSectionV2) => void;
  onDelete: (section: MealPlannerSectionV2) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">كروت منشئ الوجبات</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Premium أولًا، ثم الوجبات الكاملة والبروتين والكارب. كل إجراء بجوار الكارت الذي يؤثر عليه.
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          {sections.length + 1} كروت
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        <PremiumCard premiumSection={premiumSection} />
        {sections.map((section) => (
          <DynamicCard
            key={section.key}
            section={section}
            catalog={catalog}
            issues={issues.filter(
              (issue) => !issue.sectionKey || issue.sectionKey === section.key
            )}
            pending={pending}
            readOnly={readOnly}
            onEdit={() => onEdit(section)}
            onManageItems={() => onManageItems(section)}
            onToggleVisibility={() => onToggleVisibility(section)}
            onDelete={() => onDelete(section)}
          />
        ))}
        {!sections.length ? (
          <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed bg-card p-6 text-center md:col-span-1 2xl:col-span-2">
            <div className="max-w-sm">
              <Package className="mx-auto size-8 text-muted-foreground" />
              <h3 className="mt-3 font-semibold">لا توجد كروت وجبات ديناميكية</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                ابدأ بإضافة كارت منتجات كاملة أو كارت خيارات بروتين أو كارب.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function PremiumCard({
  premiumSection,
}: {
  premiumSection?: MealPlannerPremiumSectionV2 | null;
}) {
  const items = premiumSection?.items || [];
  return (
    <article className="flex min-h-72 flex-col overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50 to-card p-4 shadow-sm dark:border-amber-900/60 dark:from-amber-950/25 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">الوجبات المميزة</h3>
            <Badge variant="secondary">يُدار من النظام</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? "عنصر" : "عناصر"}
          </p>
        </div>
        <span className="grid size-11 place-items-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
          <Crown className="size-5" />
        </span>
      </div>

      <div className="mt-4 grid gap-2">
        {items.slice(0, 3).map((item) => (
          <ItemPreview
            key={item.id}
            name={candidateName(item)}
            imageUrl={item.imageUrl}
          />
        ))}
        {!items.length ? (
          <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
            لا توجد ترقيات Premium فعالة حاليًا.
          </p>
        ) : null}
        {items.length > 3 ? (
          <p className="text-xs text-muted-foreground">
            + {items.length - 3} عناصر أخرى
          </p>
        ) : null}
      </div>

      <p className="mt-auto rounded-xl bg-background/70 p-3 pt-3 text-xs leading-5 text-muted-foreground">
        هذا الكارت ثابت للقراءة فقط. عناصر Premium تُدار من صفحة Premium Upgrades.
      </p>
    </article>
  );
}

function DynamicCard({
  section,
  catalog,
  issues,
  pending,
  readOnly,
  onEdit,
  onManageItems,
  onToggleVisibility,
  onDelete,
}: {
  section: MealPlannerSectionV2;
  catalog: MealPlannerCatalogV2;
  issues: MealPlannerValidationIssue[];
  pending: boolean;
  readOnly: boolean;
  onEdit: () => void;
  onManageItems: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
}) {
  const cardType = normalizeCardType(section);
  const role = sectionOptionRole(section);
  const configuredIds =
    cardType === "direct_product"
      ? section.selectedProductIds || []
      : section.selectedOptionIds || [];
  const hydratedItems = sectionItems(section);
  const builderGroup =
    cardType === "option_family"
      ? findBuilderGroup(
          catalog,
          section.productContextId ?? undefined,
          section.sourceGroupId ?? undefined
        )
      : null;
  const catalogItems =
    cardType === "direct_product"
      ? (catalog.products || []).filter((candidate) =>
          configuredIds.includes(candidateId(candidate))
        )
      : (builderGroup?.options || []).filter((candidate) =>
          configuredIds.includes(candidateId(candidate))
        );
  const items = hydratedItems.length ? hydratedItems : catalogItems;
  const configuredCount = Math.max(items.length, configuredIds.length);
  const productLabel =
    builderGroup?.product?.name?.ar ||
    builderGroup?.product?.name?.en ||
    builderGroup?.product?.key ||
    "المنتج الأساسي";
  const groupLabel =
    builderGroup?.group?.name?.ar ||
    builderGroup?.group?.name?.en ||
    builderGroup?.group?.key ||
    "مجموعة الخيارات";
  const familyKey = String(
    section.metadata?.familyKey || section.metadata?.proteinFamilyKey || ""
  );
  const errors = issues.filter((issue) => issue.level !== "warning");
  const warnings = issues.filter((issue) => issue.level === "warning");
  const cardLabel =
    cardType === "direct_product"
      ? "وجبة كاملة"
      : role === "carbs"
        ? "خيارات كارب"
        : "خيارات بروتين";
  const Icon = cardType === "direct_product" ? Package : Layers3;

  return (
    <article className="flex min-h-72 flex-col rounded-2xl border bg-card p-4 shadow-sm transition hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="max-w-full truncate font-semibold">
              {sectionTitle(section)}
            </h3>
            <Badge variant="outline">{cardLabel}</Badge>
            <Badge variant={section.visible === false ? "outline" : "secondary"}>
              {section.visible === false ? "مخفي" : "ظاهر"}
            </Badge>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            عدد العناصر: {configuredCount} •{" "}
            {cardType === "direct_product"
              ? "يُحتسب كوجبة كاملة"
              : "يُستخدم ضمن وجبة مركبة"}
          </p>
        </div>
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted">
          <Icon className="size-5" />
        </span>
      </div>

      {cardType === "option_family" ? (
        <div className="mt-4 rounded-xl border bg-muted/20 p-3">
          <p className="text-sm font-medium">{productLabel} ← {groupLabel}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{role === "carbs" ? "كارب" : "بروتين"}</Badge>
            {familyKey ? <Badge variant="outline">العائلة: {familyKey}</Badge> : null}
            <Badge variant="outline">{section.required ? "مطلوب" : "اختياري"}</Badge>
            <Badge variant="outline">
              الحد: {section.minSelections ?? 0}–{section.maxSelections ?? "بدون حد"}
            </Badge>
            <Badge variant="outline">{section.multiSelect ? "اختيار متعدد" : "اختيار واحد"}</Badge>
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-2">
        {items.slice(0, 3).map((item) => (
          <ItemPreview
            key={item.id}
            name={candidateName(item)}
            imageUrl={item.imageUrl}
          />
        ))}
        {!items.length ? (
          <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
            {configuredIds.length
              ? `يوجد ${configuredIds.length} عنصر محفوظ، لكن تعذر تحميل تفاصيله الآن. حدّث البيانات للمزامنة.`
              : "لا توجد عناصر محددة لهذا الكارت بعد."}
          </p>
        ) : null}
        {items.length > 3 ? (
          <p className="text-xs text-muted-foreground">
            + {items.length - 3} عناصر أخرى
          </p>
        ) : null}
      </div>

      {errors.length || warnings.length ? (
        <div className="mt-4 space-y-2">
          {errors.slice(0, 1).map((issue, index) => (
            <p
              key={`${issue.code}-${index}`}
              className="rounded-xl border border-destructive/30 bg-destructive/8 p-2.5 text-xs leading-5 text-destructive"
            >
              {issueText(issue)}
            </p>
          ))}
          {!errors.length && warnings.length ? (
            <p className="rounded-xl border border-amber-300/50 bg-amber-50 p-2.5 text-xs leading-5 text-amber-900 dark:bg-amber-950/20 dark:text-amber-100">
              {issueText(warnings[0])}
            </p>
          ) : null}
        </div>
      ) : null}

      {!readOnly ? (
      <div className="mt-auto grid gap-2 pt-5 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={onManageItems}
        >
          <ListChecks className="size-4" />
          إدارة العناصر
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={onEdit}>
          <Pencil className="size-4" />
          تعديل البيانات
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={onToggleVisibility}
        >
          {section.visible === false ? (
            <Eye className="size-4" />
          ) : (
            <EyeOff className="size-4" />
          )}
          {section.visible === false ? "إظهار" : "إخفاء"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={onDelete}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" />
          حذف الكارت
        </Button>
      </div>
      ) : (
        <p className="mt-auto rounded-xl bg-muted/50 p-3 pt-3 text-xs leading-5 text-muted-foreground">
          عرض فقط — التعديل متاح لحسابات Admin وSuperadmin.
        </p>
      )}
    </article>
  );
}

function ItemPreview({
  name,
  imageUrl,
}: {
  name: string;
  imageUrl?: string | null;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-background p-2.5">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          className="size-10 rounded-lg object-cover"
          loading="lazy"
        />
      ) : (
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted">
          <UtensilsCrossed className="size-4 text-muted-foreground" />
        </span>
      )}
      <p className="min-w-0 flex-1 truncate text-sm font-medium">{name}</p>
    </div>
  );
}
