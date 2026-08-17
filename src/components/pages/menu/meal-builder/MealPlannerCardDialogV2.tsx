import { useId, useMemo, useState } from "react";
import { Check, Layers3, Package } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type {
  MealPlannerBuilderGroup,
  MealPlannerCardContractV2,
  MealPlannerCatalogV2,
  MealPlannerCreatePayloadV2,
  MealPlannerSectionV2,
} from "@/types/mealPlannerDashboardTypes";
import { MealPlannerBuilderGroupSelector } from "./MealPlannerBuilderGroupSelector";
import { MealPlannerCandidatePickerV2 } from "./MealPlannerCandidatePickerV2";
import { resolveMealBuilderAuthoringContexts } from "./mealPlannerAuthoringContexts";
import { optionRoleLabel } from "./mealPlannerOptionGroupFlow";
import { VISUAL_SECTION_LABELS } from "./mealBuilderConstants";
import {
  allowedOptionRoles,
  buildMealPlannerCreatePayload,
  creatableCardTypes,
  normalizeCardType,
  sectionOptionRole,
  selectedIdsForSection,
  type MealPlannerCardFormValue,
} from "./mealPlannerV2Utils";

export function MealPlannerCardDialogV2({
  section,
  catalog,
  cardContract,
  pending,
  onClose,
  onSubmit,
}: {
  section?: MealPlannerSectionV2 | null;
  catalog: MealPlannerCatalogV2;
  cardContract?: MealPlannerCardContractV2 | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (
    payload: MealPlannerCreatePayloadV2,
    previousKey?: string
  ) => Promise<void>;
}) {
  const editing = Boolean(section);
  const effectiveCardContract = cardContract ?? catalog.cardContract;
  const cardTypes = useMemo(
    () => creatableCardTypes(effectiveCardContract),
    [effectiveCardContract]
  );
  const initialCardType =
    section && normalizeCardType(section) === "option_family"
      ? "option_family"
      : section
        ? "direct_product"
        : cardTypes.includes("direct_product")
          ? "direct_product"
          : "option_family";
  const [initialValue] = useState<MealPlannerCardFormValue>(() =>
    buildInitialValue(section, catalog, initialCardType)
  );
  const [value, setValue] = useState<MealPlannerCardFormValue>(initialValue);
  const [formError, setFormError] = useState("");
  const [discardOpen, setDiscardOpen] = useState(false);

  const optionRoles = useMemo(
    () => allowedOptionRoles(effectiveCardContract),
    [effectiveCardContract]
  );
  const contexts = useMemo(
    () => resolveMealBuilderAuthoringContexts(catalog),
    [catalog]
  );
  const selectedContext = useMemo(
    () =>
      contexts.find(
        (context) =>
          String(context.sourceGroupId) === String(value.sourceGroupId || "") &&
          String(context.productContextId) === String(value.productContextId || "")
      ) || null,
    [contexts, value.productContextId, value.sourceGroupId]
  );
  const families = selectedContext?.families || [];
  const contextOptions = useMemo(() => {
    const options = selectedContext?.options || [];
    if (!value.familyKey) return options;
    return options.filter(
      (option) =>
        String(option.familyKey || option.proteinFamilyKey || "") ===
        value.familyKey
    );
  }, [selectedContext, value.familyKey]);

  const dirty = JSON.stringify(value) !== JSON.stringify(initialValue);
  const supportedContext = Boolean(
    selectedContext &&
      (selectedContext.optionRole === "protein" ||
        selectedContext.optionRole === "carbs") &&
      optionRoles.includes(selectedContext.optionRole)
  );
  const baseFieldsReady = Boolean(
    value.key.trim() &&
      value.titleAr.trim() &&
      value.titleEn.trim() &&
      value.selectedIds.length
  );
  const rulesReady =
    value.cardType === "direct_product" ||
    (Number.isInteger(Number(value.minSelections ?? 0)) &&
      Number(value.minSelections ?? 0) >= 0 &&
      (value.maxSelections === null ||
        (Number.isInteger(Number(value.maxSelections)) &&
          Number(value.maxSelections) >= Number(value.minSelections ?? 0))));
  const canSubmit =
    baseFieldsReady &&
    rulesReady &&
    (value.cardType === "direct_product" || supportedContext);

  function requestClose() {
    if (pending) return;
    if (dirty) return setDiscardOpen(true);
    onClose();
  }

  async function submit() {
    if (pending || !canSubmit) return;
    setFormError("");
    try {
      await onSubmit(buildMealPlannerCreatePayload(value), section?.key);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "تعذر حفظ الكارت");
    }
  }

  function changeType(cardType: "direct_product" | "option_family") {
    if (editing || cardType === value.cardType) return;
    setValue((current) => ({
      ...current,
      cardType,
      key: createInternalCardKey(cardType),
      selectedIds: [],
      optionRole: undefined,
      familyKey: "",
      productContextId: "",
      sourceGroupId: "",
      required: false,
      minSelections: 0,
      maxSelections: 1,
      multiSelect: false,
    }));
  }

  function applyContext(context: MealPlannerBuilderGroup | null) {
    if (!context) {
      setValue((current) => ({
        ...current,
        productContextId: "",
        optionRole: undefined,
        familyKey: "",
        selectedIds: [],
      }));
      return;
    }
    const minSelections = Number(context.rules?.minSelections ?? 0);
    const maxSelections =
      context.rules?.maxSelections === null
        ? null
        : Number(
            context.rules?.maxSelections ??
              (context.optionRole === "carbs" ? 2 : 1)
          );
    setValue((current) => ({
      ...current,
      productContextId: context.productContextId,
      sourceGroupId: context.sourceGroupId,
      optionRole:
        context.optionRole === "protein" || context.optionRole === "carbs"
          ? context.optionRole
          : undefined,
      familyKey: "",
      selectedIds: [],
      required: context.rules?.isRequired === true,
      minSelections,
      maxSelections,
      multiSelect: maxSelections === null || Number(maxSelections) > 1,
    }));
  }

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && requestClose()}>
        <DialogContent
          dir="rtl"
          className="max-h-[94dvh] w-[calc(100vw-1rem)] overflow-y-auto p-0 sm:max-w-4xl"
        >
          <div className="border-b bg-muted/25 p-4 sm:p-6">
            <DialogHeader className="text-right">
              <DialogTitle>
                {editing ? "تعديل كارت الوجبات" : "إضافة كارت جديد"}
              </DialogTitle>
              <DialogDescription className="text-right leading-6">
                المنتجات الكاملة تأتي من كتالوج المنيو، وخيارات الوجبة المركبة
                تُعرض فقط من العلاقات المرتبطة فعليًا بمنشئ الوجبات.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-6 p-4 sm:p-6">
            <section className="space-y-3">
              <FieldLabel>نوع الكارت</FieldLabel>
              <div className="grid gap-3 sm:grid-cols-2">
                {cardTypes.includes("direct_product") ||
                (editing && initialCardType === "direct_product") ? (
                  <TypeChoice
                    active={value.cardType === "direct_product"}
                    disabled={editing}
                    icon={Package}
                    title="منتجات كاملة"
                    description="يعرض كل منتجات المنيو مع البحث والتصفية حسب التصنيف"
                    onClick={() => changeType("direct_product")}
                  />
                ) : null}
                {cardTypes.includes("option_family") ||
                (editing && initialCardType === "option_family") ? (
                  <TypeChoice
                    active={value.cardType === "option_family"}
                    disabled={editing}
                    icon={Layers3}
                    title="خيارات وجبة مركبة"
                    description="اختر علاقة مجموعة مرتبطة بمنتج أساسي ثم اختر عناصرها"
                    onClick={() => changeType("option_family")}
                  />
                ) : null}
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-3">
              <TextField
                label="الاسم العربي"
                value={value.titleAr}
                onChange={(titleAr) =>
                  setValue((current) => ({ ...current, titleAr }))
                }
              />
              <TextField
                label="الاسم الإنجليزي"
                value={value.titleEn}
                dir="ltr"
                onChange={(titleEn) =>
                  setValue((current) => ({ ...current, titleEn }))
                }
              />
              <TextField
                label="الترتيب"
                value={String(value.sortOrder ?? 0)}
                type="number"
                min={0}
                onChange={(sortOrder) =>
                  setValue((current) => ({
                    ...current,
                    sortOrder: Number(sortOrder || 0),
                  }))
                }
              />
            </section>

            {value.cardType === "option_family" ? (
              <section className="space-y-4 rounded-2xl border bg-muted/15 p-4">
                <MealPlannerBuilderGroupSelector
                  groups={contexts}
                  selectedGroupId={selectedContext?.id}
                  disabled={editing}
                  onSelect={applyContext}
                />
                {selectedContext ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SelectField
                      label="نوع الخيارات"
                      value={selectedContext.optionRole || "unsupported"}
                      disabled
                      options={[
                        {
                          value: selectedContext.optionRole || "unsupported",
                          label: optionRoleLabel(selectedContext.optionRole),
                        },
                      ]}
                      onChange={() => undefined}
                    />
                    {selectedContext.optionRole === "protein" && families.length ? (
                      <FamilySelector
                        families={families}
                        value={value.familyKey || ""}
                        onChange={(familyKey) =>
                          setValue((current) => ({
                            ...current,
                            familyKey,
                            selectedIds: [],
                          }))
                        }
                      />
                    ) : null}
                  </div>
                ) : null}
              </section>
            ) : null}

            {value.cardType === "direct_product" ? (
              <MealPlannerCandidatePickerV2
                key={`direct:${section?.key || "new"}`}
                type="product"
                targetSectionKey={section?.key}
                selectedIds={value.selectedIds}
                seedCandidates={catalog.products || []}
                onChange={(selectedIds) =>
                  setValue((current) => ({ ...current, selectedIds }))
                }
              />
            ) : (
              <MealPlannerCandidatePickerV2
                key={`${selectedContext?.id || "none"}:${value.familyKey}`}
                type="option"
                targetSectionKey={section?.key}
                selectedIds={value.selectedIds}
                seedCandidates={contextOptions}
                productContextId={value.productContextId || undefined}
                sourceGroupId={value.sourceGroupId || undefined}
                optionRole={value.optionRole}
                familyKey={value.familyKey || undefined}
                disabled={!selectedContext}
                onChange={(selectedIds) =>
                  setValue((current) => ({ ...current, selectedIds }))
                }
              />
            )}

            {value.cardType === "option_family" ? (
              <section className="grid gap-4 rounded-2xl border bg-muted/20 p-4 sm:grid-cols-2">
                <TextField
                  label="الحد الأدنى"
                  value={String(value.minSelections ?? 0)}
                  type="number"
                  min={0}
                  onChange={(input) =>
                    setValue((current) => ({
                      ...current,
                      minSelections: Number(input || 0),
                    }))
                  }
                />
                <TextField
                  label="الحد الأقصى"
                  value={
                    value.maxSelections === null
                      ? ""
                      : String(value.maxSelections ?? 1)
                  }
                  type="number"
                  min={0}
                  onChange={(input) =>
                    setValue((current) => ({
                      ...current,
                      maxSelections: input === "" ? null : Number(input),
                    }))
                  }
                />
                <ToggleField
                  label="الاختيار مطلوب"
                  checked={value.required === true}
                  onChange={(required) =>
                    setValue((current) => ({ ...current, required }))
                  }
                />
                <ToggleField
                  label="اختيار متعدد"
                  checked={value.multiSelect === true}
                  onChange={(multiSelect) =>
                    setValue((current) => ({ ...current, multiSelect }))
                  }
                />
              </section>
            ) : null}

            <ToggleField
              label="إظهار الكارت"
              checked={value.visible}
              onChange={(visible) =>
                setValue((current) => ({ ...current, visible }))
              }
            />
            {formError ? (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {formError}
              </p>
            ) : null}
          </div>

          <DialogFooter className="sticky bottom-0 gap-2 border-t bg-background/95 p-4 backdrop-blur sm:justify-start sm:p-5">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={requestClose}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              disabled={pending || !canSubmit}
              onClick={() => void submit()}
            >
              <Check className="size-4" />
              {editing ? "حفظ التعديلات" : "إنشاء الكارت"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle>تجاهل التغييرات؟</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              توجد تغييرات لم يتم حفظها.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogCancel>متابعة التعديل</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onClose}>
              تجاهل وإغلاق
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function buildInitialValue(
  section: MealPlannerSectionV2 | null | undefined,
  catalog: MealPlannerCatalogV2,
  preferredCardType: "direct_product" | "option_family"
): MealPlannerCardFormValue {
  const cardType =
    section && normalizeCardType(section) === "option_family"
      ? "option_family"
      : section
        ? "direct_product"
        : preferredCardType;
  const optionRole = section ? sectionOptionRole(section) || undefined : undefined;
  return {
    cardType,
    key: section?.key || createInternalCardKey(cardType),
    titleAr: section?.titleOverride?.ar || "",
    titleEn: section?.titleOverride?.en || "",
    visible: section?.visible !== false,
    sortOrder: Number(section?.sortOrder ?? suggestedSortOrder(catalog)),
    selectedIds: section ? selectedIdsForSection(section) : [],
    optionRole,
    familyKey: String(
      section?.metadata?.familyKey || section?.metadata?.proteinFamilyKey || ""
    ),
    productContextId: String(section?.productContextId || ""),
    sourceGroupId: String(section?.sourceGroupId || ""),
    required: section?.required === true,
    minSelections: Number(section?.minSelections ?? 0),
    maxSelections:
      section?.maxSelections === null
        ? null
        : Number(section?.maxSelections ?? (optionRole === "carbs" ? 2 : 1)),
    multiSelect: section?.multiSelect === true,
  };
}

function createInternalCardKey(
  cardType: "direct_product" | "option_family"
) {
  const token =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${cardType}_${token}`.slice(0, 64);
}

function suggestedSortOrder(catalog: MealPlannerCatalogV2) {
  const sections = Array.isArray(catalog.sections) ? catalog.sections : [];
  return sections.length * 10 + 10;
}

function FamilySelector({
  families,
  value,
  onChange,
}: {
  families: string[];
  value: string;
  onChange: (family: string) => void;
}) {
  return (
    <fieldset className="space-y-2" aria-label="عائلة البروتين">
      <legend className="text-sm font-medium">عائلة البروتين</legend>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={!value}
          className="rounded-lg border px-3 py-2 text-sm aria-pressed:border-primary aria-pressed:bg-primary/5"
          onClick={() => onChange("")}
        >
          كل العائلات
        </button>
        {families.map((family) => (
          <button
            key={family}
            type="button"
            aria-pressed={value === family}
            className="rounded-lg border px-3 py-2 text-sm aria-pressed:border-primary aria-pressed:bg-primary/5"
            onClick={() => onChange(family)}
          >
            {VISUAL_SECTION_LABELS[family]?.ar || family}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function TypeChoice({
  active,
  disabled,
  icon: Icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  disabled: boolean;
  icon: typeof Package;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-24 items-start gap-3 rounded-2xl border p-4 text-right transition ${
        active
          ? "border-primary bg-primary/5 ring-2 ring-primary/15"
          : "hover:border-primary/40 hover:bg-muted/30"
      } disabled:cursor-default disabled:opacity-80`}
    >
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-xl ${
          active ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        <Icon className="size-5" />
      </span>
      <span>
        <span className="flex items-center gap-2 font-medium">
          {title}
          {active ? <Check className="size-4 text-primary" /> : null}
        </span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
          {description}
        </span>
      </span>
    </button>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  ...props
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type">) {
  const id = useId();
  return (
    <div className="space-y-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...props}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  placeholder,
  disabled,
  options,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <FieldLabel id={`${id}-label`}>{label}</FieldLabel>
      <Select
        value={value || undefined}
        disabled={disabled}
        onValueChange={onChange}
      >
        <SelectTrigger className="w-full" aria-labelledby={`${id}-label`}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent dir="rtl">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-background p-3">
      <FieldLabel>{label}</FieldLabel>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function FieldLabel(props: React.ComponentProps<"label">) {
  return <label className="text-sm font-medium" {...props} />;
}
