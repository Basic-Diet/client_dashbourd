import { formatOperationsSar } from "@/lib/operationsOrderPresentation";
import type { OperationsPricingPresentation } from "@/lib/operationsOrderPresentation";

interface OperationsPricingSummaryProps {
  pricing: OperationsPricingPresentation;
}

function PricingRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number | null;
  strong?: boolean;
}) {
  if (value === null) return null;

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 ${
        strong ? "bg-primary/10 font-bold text-primary" : "bg-muted/35"
      }`}
    >
      <span>{label}</span>
      <span dir="ltr">{formatOperationsSar(value)}</span>
    </div>
  );
}

export function OperationsPricingSummary({ pricing }: OperationsPricingSummaryProps) {
  return (
    <div className="grid gap-2 text-sm">
      <PricingRow label="الأصناف الأساسية" value={pricing.baseItemsHalala} />
      <PricingRow label="الاختيارات المدفوعة ضمن الإجمالي" value={pricing.optionsHalala} />
      <PricingRow label="الإجمالي الفرعي" value={pricing.subtotalHalala} />
      <PricingRow label="التوصيل" value={pricing.deliveryHalala} />
      <PricingRow label="الخصم" value={pricing.discountHalala} />
      <PricingRow label="الضريبة" value={pricing.vatHalala} />
      <PricingRow label="الإجمالي النهائي" value={pricing.totalHalala} strong />
      {pricing.vatIncluded ? (
        <div className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
          الضريبة مشمولة
        </div>
      ) : null}
    </div>
  );
}
