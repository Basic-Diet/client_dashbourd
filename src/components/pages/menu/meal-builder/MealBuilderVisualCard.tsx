import {
  AlertTriangle,
  CheckCircle2,
  Pencil,
  ShieldAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const issueCount = visibleIssues.length + card.backendIssues.length;
  const previewItems = card.items.slice(0, 3);
  const remainingCount = Math.max(card.items.length - previewItems.length, 0);

  return (
    <Card className="border-border/80 shadow-none transition-colors hover:border-primary/35">
      <CardHeader className="gap-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="h-6 min-w-6 justify-center px-1.5">
                {card.sortOrder}
              </Badge>
              <CardTitle className="truncate text-base leading-6">
                {card.labelAr || card.labelEn}
              </CardTitle>
              <CardState card={card} />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>
                {card.items.length
                  ? `${card.items.length} عناصر مختارة`
                  : "لا توجد عناصر"}
              </span>
              {issueCount ? <span>{issueCount} ملاحظات</span> : null}
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="size-4" />
            <span className="sr-only">تعديل</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {card.items.length ? (
          <div className="flex flex-wrap gap-1.5">
            {previewItems.map((item) => (
              <ItemChip key={`${item.kind}:${item.id}`} cardKey={card.key} item={item} />
            ))}
            {remainingCount ? <Badge variant="secondary">+{remainingCount}</Badge> : null}
          </div>
        ) : (
          <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
            استخدم تعديل لاختيار العناصر.
          </div>
        )}

        {issueCount ? (
          <details className="rounded-md border bg-muted/20 px-3 py-2 text-xs">
            <summary className="cursor-pointer text-muted-foreground">
              مراجعة {issueCount} ملاحظات
            </summary>
            <div className="mt-2 space-y-1.5">
              {visibleIssues.slice(0, 3).map((issue) => (
                <CardIssue
                  key={issue}
                  message={issue}
                  warning={card.warnings.includes(issue)}
                />
              ))}
              {card.backendIssues.slice(0, 3).map((issue, index) => (
                <p
                  key={`${issue.code ?? "issue"}-${index}`}
                  className="text-muted-foreground"
                >
                  {reasonCodeLabel(String(issue.code ?? "")) ||
                    issue.message ||
                    "تحتاج مراجعة"}
                </p>
              ))}
            </div>
          </details>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ItemChip({
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
    <Badge
      variant={needsAttention ? "secondary" : "outline"}
      className="max-w-full gap-1 truncate"
    >
      <span className="truncate">{item.name}</span>
      {isPremiumVisualItem(cardKey, item.key) ? <span>بريميوم</span> : null}
    </Badge>
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
        warning ? "flex gap-2 text-amber-700" : "flex gap-2 text-destructive"
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
        مراجعة
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
    ELIGIBLE: "متاح",
    NOT_LINKED_TO_PRODUCT_GROUP: "غير مرتبط بمجموعة منتجات",
    PRODUCT_GROUP_RELATION_MISSING: "رابط مجموعة المنتجات غير موجود",
    PRODUCT_OPTION_RELATION_UNAVAILABLE: "رابط الخيار غير متاح",
    OPTION_UNPUBLISHED: "الخيار غير منشور",
    OPTION_UNAVAILABLE: "الخيار غير متاح",
    PRODUCT_UNPUBLISHED: "المنتج غير منشور",
    PRODUCT_UNAVAILABLE: "المنتج غير متاح",
    WRONG_VISUAL_FAMILY: "العنصر في مجموعة عرض غير مناسبة",
    PREMIUM_REQUIRED_KEY: "عنصر بريميوم مطلوب",
    PREMIUM_LARGE_SALAD_MISSING: "سلطة بريميوم كبيرة غير موجودة",
    CATALOG_ITEM_UNAVAILABLE: "غير متاح في كتالوج العميل",
  };
  return labels[code] ?? code;
}
