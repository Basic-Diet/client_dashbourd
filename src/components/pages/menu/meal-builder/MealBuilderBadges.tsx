import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { MenuOption, MenuProduct } from "@/types/menuTypes";
import type { MealBuilderCheck, MealBuilderValidation } from "@/types/mealBuilderTypes";
import { mealBuilderIssueCode, mealBuilderIssueText } from "./mealBuilderIssueText";

export function StatusBadge({ validation }: { validation: MealBuilderValidation }) {
  const error = validation.status === "error" || validation.errors.length > 0;
  const warning = validation.status === "warning" || validation.warnings.length > 0;
  return (
    <Badge variant={error ? "destructive" : warning ? "secondary" : "default"}>
      {error ? "خطأ" : warning ? "تحذير" : "جاهز"}
    </Badge>
  );
}

export function IssueRow({ issue }: { issue: MealBuilderCheck }) {
  const code = mealBuilderIssueCode(issue);
  return (
    <div className="flex gap-2 rounded-md border p-2 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
      <div className="min-w-0">
        <p className="font-medium">{mealBuilderIssueText(issue)}</p>
        {code ? (
          <p className="break-all font-mono text-xs text-muted-foreground">
            {code}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function PremiumBadge({
  item,
  selectionType,
}: {
  item?: Partial<MenuOption | MenuProduct>;
  selectionType: string;
}) {
  const premium =
    selectionType === "premium_meal" ||
    selectionType === "premium_large_salad" ||
    Boolean((item as MenuOption | undefined)?.premiumKey) ||
    Number((item as MenuOption | undefined)?.extraFeeHalala ?? 0) > 0;
  if (!premium) return null;
  return (
    <div className="flex flex-wrap gap-1">
      <Badge variant="secondary">بريميوم</Badge>
      <Badge variant="outline">يتطلب رصيد/دفع</Badge>
    </div>
  );
}
