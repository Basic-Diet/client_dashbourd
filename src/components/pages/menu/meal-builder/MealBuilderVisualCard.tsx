import {
  AlertTriangle,
  CheckCircle2,
  Pencil,
  ShieldAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mealBuilderIssueCode, mealBuilderIssueText } from "./mealBuilderIssueText";
import type { MealBuilderVisualCard as VisualCard } from "./mealBuilderVisualModel";

type VisualItem = VisualCard["items"][number];

export function MealBuilderVisualCard({
  card,
  onEdit,
}: {
  card: VisualCard;
  onEdit: () => void;
}) {
  const blockingIssues = [
    ...card.errors,
    ...card.backendIssues.filter((issue) => issue.level === "error"),
  ];
  const reviewIssues = [
    ...card.warnings,
    ...card.backendIssues.filter((issue) => issue.level !== "error"),
  ];
  const unavailableCount = card.items.filter((item) => !item.available).length;
  const unpublishedCount = card.items.filter((item) => !item.published).length;
  const previewItems = card.items.slice(0, 5);
  const remainingCount = Math.max(card.items.length - previewItems.length, 0);
  const metadata = cardMetadata(card, unavailableCount, unpublishedCount);

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
              {unavailableCount ? <span>يوجد غير متاح</span> : null}
              {unpublishedCount ? <span>يوجد غير منشور</span> : null}
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="size-4" />
            <span className="sr-only">تعديل</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {metadata.length ? (
          <div className="flex flex-wrap gap-1.5">
            {metadata.map((label) => (
              <Badge key={label} variant="secondary" className="font-normal">
                {label}
              </Badge>
            ))}
          </div>
        ) : null}

        {card.items.length ? (
          <div className="flex flex-wrap gap-1.5">
            {previewItems.map((item) => (
              <ItemChip key={`${item.kind}:${item.id}`} cardKey={card.key} item={item} />
            ))}
            {remainingCount ? (
              <Badge variant="secondary">+{remainingCount} أكثر</Badge>
            ) : null}
          </div>
        ) : (
          <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
            استخدم تعديل لاختيار العناصر.
          </div>
        )}

        {blockingIssues.length ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <span>{mealBuilderIssueText(blockingIssues[0])}</span>
          </div>
        ) : null}

        {reviewIssues.length ? (
          <details className="rounded-md border bg-muted/20 px-3 py-2 text-xs">
            <summary className="cursor-pointer text-muted-foreground">
              مراجعة اختيارية
            </summary>
            <div className="mt-2 space-y-1.5">
              {reviewIssues.slice(0, 3).map((issue, index) => (
                <CardIssue
                  key={`${mealBuilderIssueCode(issue) || "issue"}-${index}`}
                  issue={issue}
                />
              ))}
              {reviewIssues.length > 3 ? (
                <p className="text-muted-foreground">
                  +{reviewIssues.length - 3} ملاحظات أخرى داخل المراجعة
                </p>
              ) : null}
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

function CardIssue({ issue }: { issue: unknown }) {
  return (
    <div className="flex gap-2 text-amber-700">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>{mealBuilderIssueText(issue)}</span>
    </div>
  );
}

function CardState({ card }: { card: VisualCard }) {
  const hasBlockingIssue =
    card.errors.length ||
    card.backendIssues.some((issue) => issue.level === "error");
  const hasItemProblem = card.items.some(
    (item) => !item.available || !item.published || !item.catalogItemAvailable
  );

  if (hasBlockingIssue || hasItemProblem) {
    return (
      <Badge variant="destructive">
        <ShieldAlert data-icon="inline-start" />
        مراجعة مطلوبة
      </Badge>
    );
  }
  if (card.warnings.length || card.backendIssues.length) {
    return (
      <Badge variant="secondary">
        <AlertTriangle data-icon="inline-start" />
        يحتاج مراجعة
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

function cardMetadata(
  card: VisualCard,
  unavailableCount: number,
  unpublishedCount: number
) {
  const labels = new Set<string>();
  if (card.items.some((item) => "required" in item && item.required)) {
    labels.add("إجباري");
  }
  if (card.items.some((item) => item.kind === "product" && item.treatAsFullMeal)) {
    labels.add("وجبة كاملة");
  }
  card.rules
    .filter((rule) => !rule.includes("=") && !rule.includes("requiresBuilder"))
    .slice(0, 2)
    .forEach((rule) => labels.add(rule));
  if (unavailableCount) labels.add(`${unavailableCount} غير متاح`);
  if (unpublishedCount) labels.add(`${unpublishedCount} غير منشور`);
  return [...labels].slice(0, 4);
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
