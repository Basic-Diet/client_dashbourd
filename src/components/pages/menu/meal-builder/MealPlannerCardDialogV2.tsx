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
  MealPlannerCardContractV2,
  MealPlannerCatalogCandidate,
  MealPlannerCatalogV2,
  MealPlannerCreatePayloadV2,
  MealPlannerOptionRole,
  MealPlannerProductOptionGroup,
  MealPlannerSectionV2,
} from "@/types/mealPlannerDashboardTypes";
import { MealPlannerCandidatePickerV2 } from "./MealPlannerCandidatePickerV2";
import {
  allowedOptionRoles,
  buildMealPlannerCreatePayload,
  candidateId,
  creatableCardTypes,
  candidateName,
  normalizeCardType,
  sectionItems,
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
  const cardTypes = useMemo(
    () => creatableCardTypes(cardContract),
    [cardContract]
  );
  const optionRoles = useMemo(
    () => allowedOptionRoles(cardContract),
    [cardContract]
  );
  const initialValue = useMemo(() => {
    const initial = buildInitialValue(section, catalog);
    if (section || cardTypes.includes(initial.cardType)) return initial;
    const cardType = cardTypes[0] || "direct_product";
    return {
      ...initial,
      cardType,
      optionRole: optionRoles[0] || "protein",
    };
  }, [cardTypes, catalog, optionRoles, section]);
  const [value, setValue] = useState<MealPlannerCardFormValue>(initialValue);
  const [formError, setFormError] = useState("");
  const [discardOpen, setDiscardOpen] = useState(false);
  const dirty = JSON.stringify(value) !== JSON.stringify(initialValue);

  const selectedProduct = findProduct(catalog, value.productContextId);
  const groups = groupsForProduct(selectedProduct, catalog).filter((group) =>
    groupMatchesRole(group, value.optionRole)
  );
  const families = catalog.searchFacets?.proteinFamilies || [];
  const baseFieldsReady = Boolean(
    value.key.trim() &&
      value.titleAr.trim() &&
      value.titleEn.trim() &&
      value.selectedIds.length > 0
  );
  const optionContextReady =
    value.cardType === "direct_product" ||
    Boolean(
      (value.optionRole === "protein" || value.optionRole === "carbs") &&
        value.productContextId?.trim() &&
        value.sourceGroupId?.trim()
    );
  const canSubmit = baseFieldsReady && optionContextReady;

  function requestClose() {
    if (pending) return;
    if (dirty) {
      setDiscardOpen(true);
      return;
    }
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
    const defaultRole = optionRoles[0] || "protein";
    setValue((current) => ({
      ...current,
      cardType,
      selectedIds: [],
      optionRole: defaultRole,
      familyKey: "",
      productContextId: "",
      sourceGroupId: "",
      maxSelections: defaultRole === "carbs" ? 2 : 1,
      multiSelect: defaultRole === "carbs",
    }));
  }

  function changeRole(optionRole: MealPlannerOptionRole) {
    setValue((current) => ({
      ...current,
      optionRole,
      familyKey: optionRole === "carbs" ? "" : current.familyKey,
      sourceGroupId: "",
      selectedIds: [],
      maxSelections: optionRole === "carbs" ? 2 : 1,
      multiSelect: optionRole === "carbs",
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
                {editing
                  ? "نوع الكارت ثابت بعد الإنشاء. عدّل البيانات والعناصر ثم احفظ."
                  : "اختر نوع الكارت، أكمل بياناته، ثم اختر العناصر الجاهزة من الـBackend."}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-6 p-4 sm:p-6">
            <section className="space-y-3">
              <FieldLabel>نوع الكارت</FieldLabel>
              <div className="grid gap-3 sm:grid-cols-2">
                {cardTypes.includes("direct_product") ? (
                  <TypeChoice
                    active={value.cardType === "direct_product"}
                    disabled={editing}
                    icon={Package}
                    title="منتجات كاملة"
                    description="منتجات تُضاف مباشرة وتستهلك وجبة كاملة"
                    onClick={() => changeType("direct_product")}
                  />
                ) : null}
                {cardTypes.includes("option_family") ? (
                  <TypeChoice
                    active={value.cardType === "option_family"}
                    disabled={editing}
                    icon={Layers3}
                    title="خيارات وجبة مركبة"
                    description="خيارات بروتين أو كارب تحتاج كارتًا مكملًا"
                    onClick={() => changeType("option_family")}
                  />
                ) : null}
              </div>
              {editing ? (
                <p className="text-xs text-muted-foreground">
                  لتغيير النوع احذف الكارت وأنشئ كارتًا جديدًا.
                </p>
              ) : null}
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="الاسم العربي"
                value={value.titleAr}
                placeholder="مثال: وجبات جاهزة"
                onChange={(titleAr) =>
                  setValue((current) => ({ ...current, titleAr }))
                }
              />
              <TextField
                label="الاسم الإنجليزي"
                value={value.titleEn}
                placeholder="Example: Ready Meals"
                dir="ltr"
                onChange={(titleEn) =>
                  setValue((current) => ({ ...current, titleEn }))
                }
              />
              <TextField
                label="مفتاح الكارت"
                value={value.key}
                placeholder="ready_meals"
                dir="ltr"
                onChange={(key) =>
                  setValue((current) => ({
                    ...current,
                    key: key.toLowerCase().replace(/\s+/g, "_"),
                  }))
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
                <div>
                  <FieldLabel>تكوين كارت الخيارات</FieldLabel>
                  <p className="mt-1 text-xs text-muted-foreground">
                    اختر النوع، المنتج الأساسي، المجموعة، ثم العناصر المرتبطة فعليًا.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField
                    label="نوع الخيارات"
                    value={value.optionRole || "protein"}
                    onChange={(role) => changeRole(role as MealPlannerOptionRole)}
                    options={optionRoles.map((role) => ({
                      value: role,
                      label: role === "protein" ? "خيارات بروتين" : "خيارات كارب",
                    }))}
                  />
                  <SelectField
                    label="المنتج الأساسي"
                    value={value.productContextId || ""}
                    placeholder="اختر المنتج"
                    onChange={(productContextId) =>
                      setValue((current) => ({
                        ...current,
                        productContextId,
                        sourceGroupId: "",
                        selectedIds: [],
                      }))
                    }
                    options={(catalog.products || [])
                      .filter(composedProductEligible)
                      .map((product) => ({
                        value: candidateId(product),
                        label: candidateName(product),
                      }))}
                  />
                  <SelectField
                    label="مجموعة الخيارات"
                    value={value.sourceGroupId || ""}
                    placeholder="اختر المجموعة"
                    disabled={!value.productContextId}
                    onChange={(sourceGroupId) =>
                      setValue((current) => ({
                        ...current,
                        sourceGroupId,
                        selectedIds: [],
                      }))
                    }
                    options={groups.map((group) => ({
                      value: groupId(group),
                      label: groupName(group),
                    }))}
                  />
                  {value.optionRole === "protein" ? (
                    <SelectField
                      label="عائلة البروتين"
                      value={value.familyKey || "all"}
                      onChange={(familyKey) =>
                        setValue((current) => ({
                          ...current,
                          familyKey: familyKey === "all" ? "" : familyKey,
                          selectedIds: [],
                        }))
                      }
                      options={[
                        { value: "all", label: "كل العائلات المتاحة" },
                        ...families.map((family) => ({
                          value: family,
                          label: familyLabel(family),
                        })),
                      ]}
                    />
                  ) : null}
                </div>
                {value.productContextId && !groups.length ? (
                  <p className="text-xs text-destructive">
                    لا توجد مجموعة فعالة تناسب نوع الكارت لهذا المنتج.
                  </p>
                ) : null}
              </section>
            ) : null}

            <MealPlannerCandidatePickerV2
              type={value.cardType === "direct_product" ? "product" : "option"}
              targetSectionKey={section?.key}
              selectedIds={value.selectedIds}
              seedCandidates={section ? sectionItems(section) : []}
              productContextId={value.productContextId}
              sourceGroupId={value.sourceGroupId}
              optionRole={value.optionRole}
              familyKey={value.familyKey}
              onChange={(selectedIds) =>
                setValue((current) => ({ ...current, selectedIds }))
              }
            />

            <section className="grid gap-3 rounded-2xl border bg-muted/20 p-4 sm:grid-cols-2">
              <ToggleField
                label="إظهار الكارت"
                description="الكارت المخفي لا يظهر للعميل بعد النشر."
                checked={value.visible}
                onChange={(visible) =>
                  setValue((current) => ({ ...current, visible }))
                }
              />
              {value.cardType === "option_family" ? (
                <ToggleField
                  label="اختيار متعدد"
                  description="اسمح بأكثر من اختيار حسب الحد الأقصى."
                  checked={value.multiSelect === true}
                  onChange={(multiSelect) =>
                    setValue((current) => ({ ...current, multiSelect }))
                  }
                />
              ) : null}
            </section>

            {formError ? (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {formError}
              </p>
            ) : null}
          </div>

          <DialogFooter className="sticky bottom-0 gap-2 border-t bg-background/95 p-4 backdrop-blur sm:justify-start sm:p-5">
            <Button type="button" variant="outline" disabled={pending} onClick={requestClose}>
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
            <AlertDialogTitle>تجاهل التغييرات غير المحفوظة؟</AlertDialogTitle>
            <AlertDialogDescription className="text-right leading-6">
              توجد تغييرات داخل النموذج لم تُحفظ بعد.
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
  catalog: MealPlannerCatalogV2
): MealPlannerCardFormValue {
  const cardType = section && normalizeCardType(section) === "option_family"
    ? "option_family"
    : "direct_product";
  const optionRole = section ? sectionOptionRole(section) || "protein" : "protein";
  return {
    cardType,
    key: section?.key || "",
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
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${active ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
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
  const labelId = `${id}-label`;
  return (
    <div className="space-y-2">
      <FieldLabel id={labelId}>{label}</FieldLabel>
      <Select value={value || undefined} disabled={disabled} onValueChange={onChange}>
        <SelectTrigger className="w-full" aria-labelledby={labelId}>
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
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl bg-background p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function FieldLabel({
  children,
  htmlFor,
  id,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  id?: string;
}) {
  return (
    <label id={id} htmlFor={htmlFor} className="text-sm font-medium">
      {children}
    </label>
  );
}

function suggestedSortOrder(catalog: MealPlannerCatalogV2) {
  const count = Number(catalog.counts?.products || 0);
  return Math.max(10, Math.ceil(count / 10) * 10);
}

function findProduct(catalog: MealPlannerCatalogV2, id?: string) {
  return (catalog.products || []).find((product) => candidateId(product) === id);
}

function composedProductEligible(product: MealPlannerCatalogCandidate) {
  const mealPlanner = product.mealPlanner as
    | { composedMeal?: { eligible?: boolean } }
    | undefined;
  return (
    mealPlanner?.composedMeal?.eligible === true ||
    Boolean(product.optionGroups?.length)
  );
}

function groupsForProduct(
  product: MealPlannerCatalogCandidate | undefined,
  catalog: MealPlannerCatalogV2
): MealPlannerProductOptionGroup[] {
  if (!product) return [];
  if (Array.isArray(product.optionGroups)) return product.optionGroups;
  const productId = candidateId(product);
  return (catalog.relations?.productOptionGroups || [])
    .filter((relation) => String(relation.productId || "") === productId)
    .map((relation) => {
      const relationGroupId = String(
        relation.groupId || relation.optionGroupId || ""
      );
      const group = (catalog.optionGroups || []).find(
        (item) => candidateId(item) === relationGroupId
      );
      return {
        id: relationGroupId,
        group: group
          ? { id: candidateId(group), key: group.key, name: group.name }
          : { id: relationGroupId, key: String(relation.groupKey || "") },
        relationStatus: relation.relationStatus as Record<string, unknown>,
      };
    });
}

function groupId(group: MealPlannerProductOptionGroup) {
  return String(group.group?.id || group.group?._id || group.id || "");
}

function groupKey(group: MealPlannerProductOptionGroup) {
  return String(group.group?.key || group.key || "").toLowerCase();
}

function groupName(group: MealPlannerProductOptionGroup) {
  return (
    group.group?.name?.ar ||
    group.name?.ar ||
    group.group?.name?.en ||
    group.name?.en ||
    groupKey(group) ||
    "مجموعة خيارات"
  );
}

function groupMatchesRole(
  group: MealPlannerProductOptionGroup,
  role?: MealPlannerOptionRole
) {
  const ready =
    (group.effectiveStatus as { customerReady?: boolean } | undefined)
      ?.customerReady !== false && group.relationStatus?.effective !== false;
  if (!ready) return false;
  const key = groupKey(group);
  return role === "carbs"
    ? ["carb", "carbs"].includes(key)
    : ["protein", "proteins"].includes(key);
}

function familyLabel(family: string) {
  const labels: Record<string, string> = {
    chicken: "دجاج",
    beef: "لحمة",
    fish: "سمك",
    eggs: "بيض",
  };
  return labels[family] || family;
}
