import { AlertTriangle } from "lucide-react";

export function OperationsKitchenWarnings({
  warnings,
}: {
  warnings: string[];
}) {
  if (!warnings.length) return null;

  return (
    <div className="space-y-2">
      {warnings.map((warning, index) => (
        <div
          key={`${warning}-${index}`}
          className="flex gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-800 dark:text-amber-300"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{warning}</span>
        </div>
      ))}
    </div>
  );
}
