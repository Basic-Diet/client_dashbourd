import { useState } from "react";
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
import { mealBuilderIssueCode, mealBuilderIssueText } from "./mealBuilderIssueText";
import type { MealBuilderVisualCard as VisualCard } from "./mealBuilderVisualModel";

type VisualItem = VisualCard["items"][number];

const VISIBLE_ITEM_LIMIT = 5;

export function MealBuilderVisualCard({
  card,
  onEdit,
}: {
  card: VisualCard;
  onEdit: () => void;
}) {
  const [showAllItems, setShowAllItems] = useState(false);
  const blockingIssues = [
    ...card.errors,
    ...card.backendIssues.filter((issue) => issue.level === "error"),
  ];
  const reviewIssues = [
    ...card.warnings,
    ...card.backendIssues.filter((issue) => issue.level !== "error"),
  ].filter(isActionableIssue);
  const hiddenItems = card.items.slice(VISIBLE_ITEM_LIMIT);
  const shownItems = showAllItems
    ? card.items
    : card.items.slice(0, VISIBLE_ITEM_LIMIT);
  const ruleLabels = card.rules
    .filter((rule) => !rule.includes("=") && !rule.includes("requiresBuilder"))
    .slice(0, 3);

  return (
    <Card className="h-full border-border/80 shadow-none transition-colors hover:border-primary/30">
      <CardHeader className="gap-3 border-b pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono">
                {card.sortOrder}
              </Badge>
              <CardTitle className="text-base">{card.labelAr}</CardTitle>
              {card.labelEn ? (
                <CardDescription>{card.labelEn}</CardDescription>
              ) : null}
              <CardState card={card} />
              {reviewIssues.length ? (
                <Badge variant="secondary" className="font-normal">
                  مراجعة اختيارية
                </Badge>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{card.items.length} عناصر مختارة</span>
              <ProblemCount card={card} />
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full shrink-0 justify-center sm:w-auto"
            onClick={onEdit}
          >
            <Pencil data-icon="inline-start" />
            تعديل البطاقة
          </Button>
        </div>

        {ruleLabels.length ? (
          <div className="flex flex-wrap gap-1.5">
            {ruleLabels.map((rule) => (
              <Badge key={rule} variant="secondary" className="font-normal">
                {rule}
              </Badge>
            ))}
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-3 pt-4">
        {blockingIssues.length ? (
          <div className="flex gap-2 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <span>{mealBuilderIssueText(blockingIssues[0])}</span>
          </div>
        ) : null}

        {reviewIssues.length ? (
          <details className="rounded-md bg-muted/30 px-3 py-2 text-sm">
            <summary className="cursor-pointer text-muted-foreground">
              تفاصيل المراجعة
            </summary>
            <div className="mt-3 grid gap-2">
              {reviewIssues.slice(0, 4).map((issue, index) => (
                <div
                  key={`${mealBuilderIssueCode(issue) || "issue"}-${index}`}
                  className="flex gap-2 text-amber-700"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>{mealBuilderIssueText(issue)}</span>
                </div>
              ))}
              {reviewIssues.length > 4 ? (
                <p className="text-xs text-muted-foreground">
                  +{reviewIssues.length - 4} ملاحظات أخرى
                </p>
              ) : null}
            </div>
          </details>
        ) : null}

        {card.items.length ? (
          <div className="grid gap-2">
            {shownItems.map((item) => (
              <MealBuilderItemRow
                key={`${item.kind}:${item.id}`}
                cardKey={card.key}
                item={item}
              />
            ))}
            {hiddenItems.length ? (
              <div className="flex justify-start">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs text-muted-foreground"
                  onClick={() => setShowAllItems((current) => !current)}
                >
                  {showAllItems
                    ? "إخفاء العناصر"
                    : `+${hiddenItems.length} عناصر أخرى`}
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            لا توجد عناصر كتالوج ظاهرة داخل هذه البطاقة الآن.
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
  const itemIssues = [...item.errors, ...item.warnings];

  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Package className="size-4 text-muted-foreground" />
          <span className="font-medium">{item.name}</span>
          {isPremiumVisualItem(cardKey, item.key) ? (
            <Badge variant="secondary">بريميوم</Badge>
          ) : null}
          {item.kind === "product" && item.treatAsFullMeal ? (
            <Badge variant="secondary">وجبة كاملة</Badge>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            {item.kind === "product" ? "منتج" : "خيار"}
          </Badge>
          {item.selected ? <Badge variant="default">مختار</Badge> : null}
          {isReadyItem(item) ? <Badge variant="outline">جاهز</Badge> : null}
          {!item.available ? <Badge variant="destructive">غير متاح</Badge> : null}
          {!item.published ? <Badge variant="secondary">غير منشور</Badge> : null}
          {!item.subscriptionEnabled ? (
            <Badge variant="destructive">ليس للاشتراك</Badge>
          ) : null}
          {!item.linked ? <Badge variant="destructive">غير مرتبط</Badge> : null}
          {!item.catalogItemAvailable ? (
            <Badge variant="destructive">غير متاح في كتالوج العميل</Badge>
          ) : null}
        </div>

        {itemIssues.length ? (
          <div className="space-y-1 pt-1">
            {itemIssues.slice(0, 2).map((issue, index) => (
              <p
                key={`${mealBuilderIssueCode(issue) || "item-issue"}-${index}`}
                className="text-xs text-muted-foreground"
              >
                {mealBuilderIssueText(issue)}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function isReadyItem(item: VisualItem) {
  return (
    item.available &&
    item.published &&
    item.subscriptionEnabled &&
    item.linked &&
    item.catalogItemAvailable
  );
}

function ProblemCount({ card }: { card: VisualCard }) {
  const unavailable = card.items.filter((item) => !item.available).length;
  const unpublished = card.items.filter((item) => !item.published).length;
  const notForSubscription = card.items.filter(
    (item) => !item.subscriptionEnabled
  ).length;

  return (
    <>
      {unavailable ? <span>{unavailable} غير متاح</span> : null}
      {unpublished ? <span>{unpublished} غير منشور</span> : null}
      {notForSubscription ? <span>{notForSubscription} ليس للاشتراك</span> : null}
    </>
  );
}

function isActionableIssue(issue: unknown) {
  const code = mealBuilderIssueCode(issue);
  if (!code) return typeof issue === "string";
  return /UNAVAILABLE|UNPUBLISHED|MISSING|NOT_LINKED|NOT_INCLUDED|PRICE/.test(
    code
  );
}

function CardState({ card }: { card: VisualCard }) {
  const hasBlockingIssue =
    card.errors.length ||
    card.backendIssues.some((issue) => issue.level === "error");
  const hasItemProblem = card.items.some(
    (item) =>
      !item.available ||
      !item.published ||
      !item.catalogItemAvailable ||
      !item.subscriptionEnabled
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

function isPremiumVisualItem(cardKey: string, itemKey: string) {
  return (
    cardKey === "premium" ||
    itemKey === "beef_steak" ||
    itemKey === "shrimp" ||
    itemKey === "salmon" ||
    itemKey === "premium_large_salad"
  );
}
