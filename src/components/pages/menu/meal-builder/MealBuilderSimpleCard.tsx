import { useState } from "react";
import { AlertTriangle, CheckCircle2, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { mealBuilderIssueText } from "./mealBuilderIssueText";
import type { MealBuilderVisualCard } from "./mealBuilderVisualModel";

const COLLAPSED_ITEM_LIMIT = 4;

export function MealBuilderSimpleCard({
  card,
  readOnly = false,
  onEdit,
}: {
  card: MealBuilderVisualCard;
  readOnly?: boolean;
  onEdit?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const problem = firstVisibleProblem(card);
  const shownItems = expanded
    ? card.items
    : card.items.slice(0, COLLAPSED_ITEM_LIMIT);
  const remaining = Math.max(0, card.items.length - COLLAPSED_ITEM_LIMIT);
  const isPremium = card.key === "premium";

  return (
    <Card className="overflow-hidden border-border/80 shadow-none">
      <CardHeader className="gap-3 border-b bg-muted/10 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">{card.labelAr}</CardTitle>
              <CardStatus card={card} />
            </div>
            <p className="text-sm text-muted-foreground">
              {card.items.length
                ? `${card.items.length} عناصر متاحة للعميل`
                : "لا توجد عناصر في هذه البطاقة"}
            </p>
          </div>

          {!readOnly && !isPremium ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={onEdit}
            >
              <Pencil data-icon="inline-start" />
              تعديل
            </Button>
          ) : null}
        </div>

        {isPremium ? (
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            يتم تحديث الوجبات المميزة تلقائيًا من صفحة الوجبات المميزة.
          </p>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-3 p-4">
        {problem ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{problem}</span>
          </div>
        ) : null}

        {shownItems.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {shownItems.map((item) => (
              <div
                key={`${item.kind}:${item.id}`}
                className="flex min-w-0 items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2.5"
              >
                <span className="truncate text-sm font-medium">{item.name}</span>
                {!isReady(item) ? (
                  <Badge variant="secondary" className="shrink-0 text-[11px]">
                    مراجعة
                  </Badge>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            افتح البطاقة وأضف العناصر المناسبة.
          </div>
        )}

        {remaining > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground"
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? "عرض أقل" : `عرض ${remaining} عناصر أخرى`}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CardStatus({ card }: { card: MealBuilderVisualCard }) {
  const hasProblem = Boolean(firstVisibleProblem(card));

  return hasProblem ? (
    <Badge variant="secondary">
      <AlertTriangle data-icon="inline-start" />
      يحتاج مراجعة
    </Badge>
  ) : (
    <Badge>
      <CheckCircle2 data-icon="inline-start" />
      جاهز
    </Badge>
  );
}

function firstVisibleProblem(card: MealBuilderVisualCard) {
  const itemProblem = card.items.find((item) => !isReady(item));
  if (itemProblem) {
    return `العنصر «${itemProblem.name}» غير جاهز للظهور للعميل.`;
  }

  const issue =
    card.errors[0] ??
    card.backendIssues.find((entry) => entry.level === "error") ??
    card.warnings[0] ??
    card.backendIssues[0];

  return issue ? mealBuilderIssueText(issue) : null;
}

function isReady(item: MealBuilderVisualCard["items"][number]) {
  return (
    item.available &&
    item.published &&
    item.subscriptionEnabled &&
    item.catalogItemAvailable
  );
}
