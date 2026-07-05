import { CheckCircle2, Clock3, FilePenLine, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type {
  MealBuilderConfig,
  MealBuilderValidation,
} from "@/types/mealBuilderTypes";
import { formatDate, readinessLabel } from "./mealBuilderUtils";

export function MealBuilderStatusCards({
  draft,
  published,
  readiness,
}: {
  draft: MealBuilderConfig | null;
  published: MealBuilderConfig | null;
  readiness: MealBuilderValidation | null;
}) {
  const hasErrors = Boolean(readiness?.errors.length);
  const hasWarnings = Boolean(readiness?.warnings.length);

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <StatusCard
        icon={FilePenLine}
        label="المسودة"
        value={draft ? "جاهزة للتعديل" : "لا توجد مسودة"}
        hint={draft?.updatedAt ? `آخر تعديل: ${formatDate(draft.updatedAt)}` : undefined}
      />
      <StatusCard
        icon={Send}
        label="النسخة المنشورة"
        value={published ? "منشورة" : "لم تنشر بعد"}
        hint={published?.publishedAt ? `تاريخ النشر: ${formatDate(published.publishedAt)}` : undefined}
      />
      <StatusCard
        icon={hasErrors ? Clock3 : CheckCircle2}
        label="الجاهزية"
        value={readinessLabel(readiness)}
        hint={
          hasErrors
            ? "توجد أخطاء تحتاج إصلاح"
            : hasWarnings
              ? "توجد تحذيرات للمراجعة"
              : "لا توجد مشاكل ظاهرة"
        }
        state={hasErrors ? "error" : hasWarnings ? "warning" : "ready"}
      />
    </div>
  );
}

function StatusCard({
  icon: Icon,
  label,
  value,
  hint,
  state = "neutral",
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: string;
  hint?: string;
  state?: "neutral" | "ready" | "warning" | "error";
}) {
  return (
    <Card className="border-border/80 shadow-none">
      <CardContent className="flex items-start gap-3 pt-5">
        <span className="rounded-full bg-muted p-2 text-muted-foreground">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs text-muted-foreground">{label}</p>
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold" title={value}>
              {value}
            </p>
            {state !== "neutral" ? (
              <Badge variant={state === "error" ? "destructive" : "secondary"}>
                {state === "ready" ? "تمام" : state === "warning" ? "مراجعة" : "خطأ"}
              </Badge>
            ) : null}
          </div>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
