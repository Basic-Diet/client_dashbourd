import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Link2,
  SlidersHorizontal,
  Unlink2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  MenuEmptyState,
  MenuKeyBadge,
  MenuSectionCard,
} from "@/components/pages/menu/MenuTabScaffold";
import {
  useLinkGroupsToProductMutation,
  useLinkOptionsToGroupMutation,
  useMenuOptionGroupsQuery,
  useMenuOptionsQuery,
  useUpdateOptionOverrideMutation,
  useUpdateSelectionRulesMutation,
} from "@/hooks/menu";
import type {
  LinkGroupsPayload,
  LinkOptionsPayload,
  MenuOption,
  MenuOptionGroup,
  MenuProductComposer,
  MenuProductLinkedGroup,
  MenuProductLinkedOption,
  ProductGroupOptionOverride,
  ProductGroupRule,
} from "@/types/menuTypes";
import { parseOptionalSelectionLimit } from "@/utils/menuPayloadMappers";
import {
  halalaToRiyalInput,
  optionalRiyalToHalala,
  riyalToHalala,
} from "@/utils/price";

type ProductComposerRelationsPanelProps = {
  composer: MenuProductComposer;
  productId: string;
};

const toOptionalNumber = (value: string) =>
  value.trim() === "" ? undefined : Number(value);

const issueMessage = (issue: string | { message?: string; code?: string }) =>
  typeof issue === "string" ? issue : issue.message || issue.code || "";

const groupRelationId = (group: MenuProductLinkedGroup) =>
  group.groupId || group.group?.id || "";

const optionRelationId = (option: MenuProductLinkedOption) =>
  option.optionId || option.option?.id || "";

const normalizeGroupRule = (group: MenuProductLinkedGroup): ProductGroupRule => ({
  groupId: groupRelationId(group),
  minSelections: group.minSelections ?? 0,
  maxSelections: group.maxSelections ?? null,
  isRequired: group.isRequired ?? false,
  sortOrder: group.sortOrder ?? 0,
  isActive: group.isActive ?? true,
  isAvailable: group.isAvailable ?? true,
  isVisible: group.isVisible ?? true,
});

const normalizeOption = (
  option: MenuProductLinkedOption
): ProductGroupOptionOverride => ({
  optionId: optionRelationId(option),
  extraPriceHalala: option.extraPriceHalala,
  extraWeightUnitGrams: option.extraWeightUnitGrams,
  extraWeightPriceHalala: option.extraWeightPriceHalala,
  isActive: option.isActive ?? true,
  isAvailable: option.isAvailable ?? true,
  isVisible: option.isVisible ?? true,
  sortOrder: option.sortOrder ?? 0,
});

export function ProductComposerRelationsPanel({
  composer,
  productId,
}: ProductComposerRelationsPanelProps) {
  const linkedGroups = useMemo(
    () => composer.linkedOptionGroups || [],
    [composer.linkedOptionGroups]
  );
  const isCustomizable = Boolean(
    composer.availability?.isCustomizable ?? composer.product?.isCustomizable
  );
  const [groupId, setGroupId] = useState("");
  const [optionId, setOptionId] = useState("");
  const [minSelections, setMinSelections] = useState("0");
  const [maxSelections, setMaxSelections] = useState("1");
  const [isRequired, setIsRequired] = useState(false);
  const [groupSortOrder, setGroupSortOrder] = useState("0");
  const [extraPriceSar, setExtraPriceSar] = useState("0");
  const [extraWeightUnitGrams, setExtraWeightUnitGrams] = useState("");
  const [extraWeightPriceSar, setExtraWeightPriceSar] = useState("");
  const [optionSortOrder, setOptionSortOrder] = useState("0");
  const [optionAvailable, setOptionAvailable] = useState(true);

  const { data: groupsData } = useMenuOptionGroupsQuery({ limit: 100 });
  const { data: optionsData } = useMenuOptionsQuery({
    limit: 100,
    groupId: groupId || undefined,
  });
  const linkGroups = useLinkGroupsToProductMutation();
  const updateRules = useUpdateSelectionRulesMutation();
  const linkOptions = useLinkOptionsToGroupMutation();
  const updateOverride = useUpdateOptionOverrideMutation();

  const groups = (
    Array.isArray(groupsData?.data)
      ? groupsData?.data
      : groupsData?.data?.items || []
  ) as MenuOptionGroup[];

  const options = (
    Array.isArray(optionsData?.data)
      ? optionsData?.data
      : optionsData?.data?.items || []
  ) as MenuOption[];

  const selectedLinkedGroup = useMemo(
    () => linkedGroups.find((group) => groupRelationId(group) === groupId),
    [linkedGroups, groupId]
  );
  const linkedOptions = useMemo(
    () => selectedLinkedGroup?.options || [],
    [selectedLinkedGroup?.options]
  );
  const selectedLinkedOption = linkedOptions.find(
    (option) => optionRelationId(option) === optionId
  );

  const loadGroupDraft = (group: MenuProductLinkedGroup | undefined) => {
    setMinSelections(String(group?.minSelections ?? 0));
    setMaxSelections(
      group?.maxSelections == null ? "" : String(group.maxSelections)
    );
    setIsRequired(group?.isRequired ?? false);
    setGroupSortOrder(String(group?.sortOrder ?? 0));
    setOptionId("");
  };

  const loadOptionDraft = (option: MenuProductLinkedOption | undefined) => {
    setExtraPriceSar(
      halalaToRiyalInput(option?.extraPriceHalala) || "0"
    );
    setExtraWeightUnitGrams(
      option?.extraWeightUnitGrams === undefined
        ? ""
        : String(option.extraWeightUnitGrams)
    );
    setExtraWeightPriceSar(
      halalaToRiyalInput(option?.extraWeightPriceHalala)
    );
    setOptionSortOrder(String(option?.sortOrder ?? 0));
    setOptionAvailable(option?.isAvailable ?? true);
  };

  const handleGroupChange = (nextGroupId: string) => {
    setGroupId(nextGroupId);
    loadGroupDraft(
      linkedGroups.find((group) => groupRelationId(group) === nextGroupId)
    );
    loadOptionDraft(undefined);
  };

  const handleOptionChange = (nextOptionId: string) => {
    setOptionId(nextOptionId);
    loadOptionDraft(
      linkedOptions.find((option) => optionRelationId(option) === nextOptionId)
    );
  };

  const groupPayload = (): LinkGroupsPayload => ({
    groups: [
      ...linkedGroups
        .map(normalizeGroupRule)
        .filter((group) => group.groupId && group.groupId !== groupId),
      {
        groupId,
        minSelections: Number(minSelections) || 0,
        maxSelections: parseOptionalSelectionLimit(maxSelections),
        isRequired,
        sortOrder: Number(groupSortOrder) || 0,
        isActive: true,
        isAvailable: true,
        isVisible: true,
      },
    ],
  });

  const optionPayload = (): LinkOptionsPayload => ({
    options: [
      ...linkedOptions
        .map(normalizeOption)
        .filter((option) => option.optionId && option.optionId !== optionId),
      {
        optionId,
        extraPriceHalala: riyalToHalala(extraPriceSar || 0),
        extraWeightUnitGrams: toOptionalNumber(extraWeightUnitGrams),
        extraWeightPriceHalala: optionalRiyalToHalala(extraWeightPriceSar),
        isActive: true,
        isAvailable: optionAvailable,
        isVisible: true,
        sortOrder: Number(optionSortOrder) || 0,
      },
    ],
  });

  const unlinkGroup = () => {
    linkGroups.mutate({
      productId,
      data: {
        groups: linkedGroups
          .map(normalizeGroupRule)
          .filter((group) => group.groupId && group.groupId !== groupId),
      },
    });
    setGroupId("");
  };

  const unlinkOption = () => {
    linkOptions.mutate({
      productId,
      groupId,
      data: {
        options: linkedOptions
          .map(normalizeOption)
          .filter((option) => option.optionId && option.optionId !== optionId),
      },
    });
    setOptionId("");
  };

  return (
    <MenuSectionCard
      title="تخصيص المنتج"
      description="إدارة مجموعات الخيارات وخياراتها من عقد المنتج نفسه."
    >
      <ComposerStatus composer={composer} isCustomizable={isCustomizable} />

      {!isCustomizable ? (
        <MenuEmptyState
          title="منتج مباشر بدون تخصيص"
          description="هذا المنتج لا يحتاج مجموعات خيارات الآن. غيّر نوع المنتج أو التسعير إذا كان يجب أن يدخل في مسار التخصيص."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">مجموعات المنتج</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={groupId} onValueChange={handleGroupChange}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر مجموعة خيارات" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name.ar || group.name.en || group.key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="grid gap-3 sm:grid-cols-2">
                <NumberField
                  label="الحد الأدنى"
                  value={minSelections}
                  onChange={setMinSelections}
                />
                <NumberField
                  label="الحد الأقصى"
                  value={maxSelections}
                  onChange={setMaxSelections}
                  placeholder="بدون حد"
                />
                <NumberField
                  label="ترتيب المجموعة"
                  value={groupSortOrder}
                  onChange={setGroupSortOrder}
                />
                <SwitchField
                  label={isRequired ? "إجباري" : "اختياري"}
                  checked={isRequired}
                  onCheckedChange={setIsRequired}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={!groupId || linkGroups.isPending}
                  onClick={() =>
                    linkGroups.mutate({ productId, data: groupPayload() })
                  }
                >
                  <Link2 data-icon="inline-start" />
                  {selectedLinkedGroup ? "تحديث المجموعة" : "ربط المجموعة"}
                </Button>
                <Button
                  variant="outline"
                  disabled={!selectedLinkedGroup || updateRules.isPending}
                  onClick={() =>
                    updateRules.mutate({
                      productId,
                      groupId,
                      data: {
                        minSelections: Number(minSelections) || 0,
                        maxSelections: parseOptionalSelectionLimit(maxSelections),
                        isRequired,
                        sortOrder: Number(groupSortOrder) || 0,
                      },
                    })
                  }
                >
                  <SlidersHorizontal data-icon="inline-start" />
                  تحديث القواعد
                </Button>
                {selectedLinkedGroup ? (
                  <Button
                    variant="destructive"
                    disabled={linkGroups.isPending}
                    onClick={unlinkGroup}
                  >
                    <Unlink2 data-icon="inline-start" />
                    إلغاء الربط
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">خيارات المجموعة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={optionId}
                onValueChange={handleOptionChange}
                disabled={!groupId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر خيارا" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name.ar || option.name.en || option.key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="grid gap-3 sm:grid-cols-2">
                <NumberField
                  label="السعر الإضافي (ر.س)"
                  value={extraPriceSar}
                  onChange={setExtraPriceSar}
                  step="0.01"
                />
                <NumberField
                  label="وحدة الوزن"
                  value={extraWeightUnitGrams}
                  onChange={setExtraWeightUnitGrams}
                  placeholder="اختياري"
                />
                <NumberField
                  label="سعر الوزن (ر.س)"
                  value={extraWeightPriceSar}
                  onChange={setExtraWeightPriceSar}
                  step="0.01"
                  placeholder="اختياري"
                />
                <NumberField
                  label="ترتيب الخيار"
                  value={optionSortOrder}
                  onChange={setOptionSortOrder}
                />
                <SwitchField
                  label={optionAvailable ? "متوفر داخل المنتج" : "غير متوفر"}
                  checked={optionAvailable}
                  onCheckedChange={setOptionAvailable}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={!groupId || !optionId || linkOptions.isPending}
                  onClick={() =>
                    linkOptions.mutate({
                      productId,
                      groupId,
                      data: optionPayload(),
                    })
                  }
                >
                  <Link2 data-icon="inline-start" />
                  {selectedLinkedOption ? "تحديث الخيار" : "ربط الخيار"}
                </Button>
                <Button
                  variant="outline"
                  disabled={!selectedLinkedOption || updateOverride.isPending}
                  onClick={() =>
                    updateOverride.mutate({
                      productId,
                      groupId,
                      optionId,
                      data: optionPayload().options.at(-1) || {},
                    })
                  }
                >
                  <SlidersHorizontal data-icon="inline-start" />
                  تحديث التجاوز
                </Button>
                {selectedLinkedOption ? (
                  <Button
                    variant="destructive"
                    disabled={linkOptions.isPending}
                    onClick={unlinkOption}
                  >
                    <Unlink2 data-icon="inline-start" />
                    إلغاء الربط
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <LinkedGroupsOverview linkedGroups={linkedGroups} />
    </MenuSectionCard>
  );
}

function ComposerStatus({
  composer,
  isCustomizable,
}: {
  composer: MenuProductComposer;
  isCustomizable: boolean;
}) {
  const warningCount = composer.validation?.warnings?.length || 0;
  const errorCount = composer.validation?.errors?.length || 0;

  return (
    <div className="grid gap-3 md:grid-cols-4">
      <StatusTile
        label="نوع السلوك"
        value={isCustomizable ? "قابل للتخصيص" : "إضافة مباشرة"}
        tone={isCustomizable ? "default" : "secondary"}
      />
      <StatusTile
        label="النشر"
        value={composer.publishState?.isPublished ? "منشور" : "غير منشور"}
        tone={composer.publishState?.isPublished ? "secondary" : "outline"}
      />
      <StatusTile
        label="المجموعات"
        value={`${composer.linkedOptionGroups?.length || 0}`}
        tone="outline"
      />
      <StatusTile
        label="التحقق"
        value={
          errorCount
            ? `${errorCount} أخطاء`
            : warningCount
              ? `${warningCount} تنبيه`
              : "سليم"
        }
        tone={errorCount ? "destructive" : warningCount ? "outline" : "secondary"}
      />
      {composer.validation?.errors?.length ? (
        <IssueList
          icon={<AlertTriangle className="size-4 text-destructive" />}
          issues={composer.validation.errors}
        />
      ) : null}
      {composer.validation?.warnings?.length ? (
        <IssueList
          icon={<AlertTriangle className="size-4 text-amber-600" />}
          issues={composer.validation.warnings}
        />
      ) : null}
    </div>
  );
}

function StatusTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "default" | "secondary" | "outline" | "destructive";
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <p className="mb-2 text-xs text-muted-foreground">{label}</p>
      <Badge variant={tone}>
        {tone === "secondary" ? (
          <CheckCircle2 data-icon="inline-start" />
        ) : null}
        {value}
      </Badge>
    </div>
  );
}

function IssueList({
  icon,
  issues,
}: {
  icon: ReactNode;
  issues: Array<string | { message?: string; code?: string }>;
}) {
  return (
    <div className="rounded-lg border bg-background p-3 md:col-span-4">
      <div className="grid gap-2">
        {issues.map((issue, index) => (
          <div
            key={`${issueMessage(issue)}-${index}`}
            className="flex gap-2 text-sm"
          >
            {icon}
            <span>{issueMessage(issue)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LinkedGroupsOverview({
  linkedGroups,
}: {
  linkedGroups: MenuProductLinkedGroup[];
}) {
  if (!linkedGroups.length) return null;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {linkedGroups.map((group) => (
        <div
          key={groupRelationId(group)}
          className="rounded-lg border bg-background p-4"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {group.group?.name?.ar || group.group?.name?.en || group.groupId}
              </p>
              {group.group?.key ? (
                <MenuKeyBadge value={group.group.key} />
              ) : null}
            </div>
            <Badge variant={group.isRequired ? "default" : "outline"}>
              {group.isRequired ? "إجباري" : "اختياري"}
            </Badge>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            {group.minSelections ?? 0} - {group.maxSelections ?? "بدون حد"}{" "}
            اختيارات
          </p>
          {group.options?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {group.options.map((option) => (
                <Badge
                  key={optionRelationId(option)}
                  variant={
                    option.isAvailable === false ? "outline" : "secondary"
                  }
                >
                  {option.option?.name?.ar ||
                    option.option?.name?.en ||
                    option.optionId}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              لا توجد خيارات مرتبطة بهذه المجموعة.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  step?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        min="0"
        step={step}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function SwitchField({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2">
      <Label>{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
