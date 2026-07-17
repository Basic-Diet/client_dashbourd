import { Badge } from "@/components/ui/badge";
import type { PresentedKitchenSection } from "@/lib/operationsKitchenV2Presentation";

export function OperationsKitchenSectionList({
  sections,
}: {
  sections: PresentedKitchenSection[];
}) {
  if (!sections.length) return null;

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <div key={section.label} className="rounded-lg border bg-muted/20 p-3">
          <p className="mb-2 text-sm font-bold">{section.label}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {section.items.map((item, index) => (
              <div key={`${item.name}-${index}`} className="rounded-md bg-background px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{item.name}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {item.quantity ? <Badge variant="outline">x{item.quantity}</Badge> : null}
                    {item.grams ? <Badge variant="secondary">{item.grams} جم</Badge> : null}
                    {item.paidAmountHalala > 0 ? (
                      <Badge className="bg-emerald-600 text-white">
                        {item.paidLabel}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
