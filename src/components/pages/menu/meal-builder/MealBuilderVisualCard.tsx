import {
  AlertTriangle,
  CheckCircle2,
  Package,
  Pencil,
  ShieldAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IssueRow } from "./MealBuilderBadges";
import type { MealBuilderVisualCard as VisualCard } from "./mealBuilderVisualModel";

type VisualItem = VisualCard["items"][number];

export function MealBuilderVisualCard({
  card,
  onEdit,
}: {
  card: VisualCard;
  onEdit: () => void;
}) {
  const visibleIssues = [...card.errors, ...card.warnings];

  return (
    <Card className="border-border/80 shadow-none">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{card.sortOrder}</Badge>
              <CardTitle className="text-base">{card.labelAr}</CardTitle>
              <CardState card={card} />
            </div>
            <CardDescription>
              {card.items.length
                ? `${card.items.length} عنصر ظاهر للعميل`
                : "لا توجد عناصر ظاهرة الآن"}
            </CardDescription>
          </div>
          <Button type="button" variant="outline" onClick={onEdit}>
            <Pencil data-icon="inline-start" />
            تعديل
          </Button>
        </div>
        {card.rules.length ? (
          <div className="flex flex-wrap gap-2">
            {card.rules.slice(0, 4).map((rule) => (
              <Badge key={rule} variant="secondary">
                {rule}
              </Badge>
            ))}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {visibleIssues.map((issue) => (
          <CardIssue key={issue} message={issue} warning={card.warnings.includes(issue)} />
        ))}

        {card.backendIssues.slice(0, 4).map((issue, index) => (
          <IssueRow key={`${issue.code ?? "issue"}-${index}`} issue={issue} />
        ))}

        {card.items.length ? (
          <div className="grid gap-2">
            {card.items.map((item) => (
              <MealBuilderItemRow
                key={`${item.kind}:${item.id}`}
                cardKey={card.key}
                item={item}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            اضغط تعديل لاختيار العناصر التي ستظهر في هذه البطاقة.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MealBuilderItemRow({
  cardKey,
  item,
}: {
  cardKey: string;
  item: VisualItem;
}) {
  const needsAttention =
    !item.linked ||
    !item.available ||
    !item.published ||
    !item.subscriptionEnabled ||
    !item.catalogItemAvailable ||
    item.errors.length > 0 ||
    item.warnings.length > 0;

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-background p-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Package className="size-4 text-muted-foreground" />
          <span className="font-medium">{item.name}</span>
          <Badge variant="outline">
            {item.kind === "product" ? "منتج" : "خيار"}
          </Badge>
          {item.selected ? <Badge variant="default">مختار</Badge> : null}
          {item.kind === "product" && item.treatAsFullMeal ? (
            <Badge variant="secondary">وجبة كاملة</Badge>
          ) : null}
          {isPremiumVisualItem(cardKey, item.key) ? (
            <Badge variant="secondary">مميز</Badge>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {needsAttention ? (
            <>
              {!item.linked ? <Badge variant="destructive">غير مرتبط</Badge> : null}
              {!item.available ? <Badge variant="destructive">غير متاح</Badge> : null}
              {!item.published ? <Badge variant="secondary">غير منشور</Badge> : null}
              {!item.subscriptionEnabled ? (
                <Badge variant="destructive">ليس للاشتراك</Badge>
              ) : null}
              {!item.catalogItemAvailable ? (
                <Badge variant="destructive">غير متاح في الكتالوج</Badge>
              ) : null}
              {item.kind === "product" && item.requiresBuilder ? (
                <Badge variant="outline">يحتاج تخصيص</Badge>
              ) : null}
            </>
          ) : (
            <Badge variant="outline">جاهز</Badge>
          )}
        </div>

        {item.errors.length || item.warnings.length ? (
          <div className="space-y-1 pt-1">
            {[...item.errors, ...item.warnings].slice(0, 3).map((issue, index) => (
              <p
                key={`${issue.code ?? "issue"}-${index}`}
                className="text-xs text-muted-foreground"
              >
                {reasonCodeLabel(String(issue.code ?? "")) || issue.message}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CardIssue({
  message,
  warning,
}: {
  message: string;
  warning: boolean;
}) {
  const Icon = warning ? AlertTriangle : ShieldAlert;
  return (
    <div
      className={
        warning
          ? "flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
          : "flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
      }
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function CardState({ card }: { card: VisualCard }) {
  if (card.errors.length || card.backendIssues.length) {
    return (
      <Badge variant="destructive">
        <ShieldAlert data-icon="inline-start" />
        يحتاج مراجعة
      </Badge>
    );
  }
  if (card.warnings.length) {
    return (
      <Badge variant="secondary">
        <AlertTriangle data-icon="inline-start" />
        تحذير
      </Badge>
    );
  }
  return (
    <Badge variant="default">
      <CheckCircle2 data-icon="inline-start" />
      جاهز
    </Badge>
  );
}

function isPremiumVisualItem(cardKey: string, itemKey: string) {
  return (
    cardKey === "premium" ||
    itemKey === "beef_steak" ||
    itemKey === "shrimp" ||
    itemKey === "salmon" ||
    itemKey === "premium_large_salad"
  );
}

function reasonCodeLabel(code: string) {
  const labels: Record<string, string> = {
    SELECTED: "مختار",
    ELIGIBLE: "مؤهل",
    NOT_LINKED_TO_PRODUCT_GROUP: "غير مرتبط بالمنتج/المجموعة",
    PRODUCT_GROUP_RELATION_MISSING: "علاقة المجموعة مفقودة",
    PRODUCT_OPTION_RELATION_UNAVAILABLE: "علاقة الخيار غير متاحة",
    OPTION_UNPUBLISHED: "الخيار غير منشور",
    OPTION_UNAVAILABLE: "الخيار غير متاح",
    PRODUCT_UNPUBLISHED: "المنتج غير منشور",
    PRODUCT_UNAVAILABLE: "المنتج غير متاح",
    WRONG_VISUAL_FAMILY: "تصنيف غير صحيح",
    PREMIUM_REQUIRED_KEY: "بريميوم مطلوب",
    PREMIUM_LARGE_SALAD_MISSING: "سلطة بريميوم مفقودة",
    CATALOG_ITEM_UNAVAILABLE: "غير متاح في الكتالوج العام",
  };
  return labels[code] ?? code;
}
