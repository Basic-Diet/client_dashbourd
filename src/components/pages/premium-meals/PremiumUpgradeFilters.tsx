import { useEffect, useState } from "react";
import { Filter, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/useDebounce";
import type { PremiumUpgradeListFilters } from "@/types/premiumUpgradeTypes";
import { defaultPremiumUpgradeListFilters } from "@/utils/fetchPremiumUpgrades";

export function PremiumUpgradeFilters({
  filters,
  onChange,
}: {
  filters: PremiumUpgradeListFilters;
  onChange: (filters: PremiumUpgradeListFilters) => void;
}) {
  const [searchValue, setSearchValue] = useState(filters.q);
  const debouncedSearch = useDebounce(searchValue, 400);
  const filtersActive =
    Boolean(filters.q) ||
    filters.kind !== "all" ||
    filters.status !== "all" ||
    filters.health !== "all";

  useEffect(() => {
    if (debouncedSearch !== filters.q) {
      onChange({ ...filters, q: debouncedSearch, page: 1 });
    }
  }, [debouncedSearch, filters, onChange]);

  function update(next: Partial<PremiumUpgradeListFilters>) {
    onChange({ ...filters, ...next, page: next.page ?? 1 });
  }

  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Filter className="size-4" />
          التصفية والبحث
        </CardTitle>
        {filtersActive ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchValue("");
              onChange(defaultPremiumUpgradeListFilters);
            }}
          >
            <X data-icon="inline-start" />
            مسح الفلاتر
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <div className="space-y-2 xl:col-span-2">
          <Label htmlFor="premium-search">بحث</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="premium-search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              className="pr-9"
              placeholder="اسم أو مفتاح"
            />
          </div>
        </div>
        <SelectField
          label="النوع"
          value={filters.kind}
          onValueChange={(kind) => update({ kind })}
          options={[
            ["all", "الكل"],
            ["product", "منتج كامل"],
            ["option", "خيار داخل وجبة"],
          ]}
        />
        <SelectField
          label="الحالة"
          value={filters.status}
          onValueChange={(status) => update({ status })}
          options={[
            ["all", "الكل"],
            ["active", "نشط"],
            ["hidden", "مخفي"],
            ["disabled", "متوقف"],
            ["archived", "مؤرشف"],
          ]}
        />
        <SelectField
          label="الصحة"
          value={filters.health}
          onValueChange={(health) => update({ health })}
          options={[
            ["all", "الكل"],
            ["ready", "جاهز"],
            ["broken", "يحتاج إصلاح"],
          ]}
        />
      </CardContent>
    </Card>
  );
}

export function SelectField({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(([optionValue, optionLabel]) => (
            <SelectItem key={optionValue} value={optionValue}>
              {optionLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
