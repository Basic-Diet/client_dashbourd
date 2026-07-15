import { CheckCircle2, CircleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { PremiumUpgradeConfigDto } from "@/types/premiumUpgradeTypes";
import {
  premiumHealthLabel,
  premiumRowHealth,
} from "@/utils/fetchPremiumUpgrades";
import { cn } from "@/lib/utils";

export function HealthBadge({ row }: { row: PremiumUpgradeConfigDto }) {
  const health = premiumRowHealth(row);

  if (health === "broken") {
    return (
      <Badge variant="destructive">
        <CircleAlert className="size-3" />
        {premiumHealthLabel(health)}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="border-emerald-200 text-emerald-700">
      <CheckCircle2 className="size-3" />
      {premiumHealthLabel(health)}
    </Badge>
  );
}

export function ReadOnlyItem({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-medium">{value}</p>
    </div>
  );
}

export function StateToggleLine({
  label,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange(event.target.checked)}
      />
      <span
        className={cn(
          "inline-flex h-[18px] w-8 items-center rounded-full border transition",
          checked ? "border-primary bg-primary" : "border-input bg-input"
        )}
      >
        <span
          className={cn(
            "size-4 rounded-full bg-background transition",
            checked ? "-translate-x-3.5" : "translate-x-0.5"
          )}
        />
      </span>
      <span>{label}</span>
    </label>
  );
}
