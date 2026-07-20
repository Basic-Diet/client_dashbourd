from pathlib import Path
import re


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected one match, found {count}: {old[:140]!r}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


def regex_once(path: Path, pattern: str, replacement: str) -> None:
    text = path.read_text(encoding="utf-8")
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"{path}: regex expected one match, found {count}: {pattern[:140]!r}")
    path.write_text(updated, encoding="utf-8")


# ---------------------------------------------------------------------------
# TypeScript contracts
# ---------------------------------------------------------------------------
types = Path("src/types/mealPlannerDashboardTypes.ts")
replace_once(
    types,
    '''  proteinFamilyKey?: string;
  displayCategoryKey?: string;
  isPremium?: boolean;''',
    '''  familyKey?: string;
  proteinFamilyKey?: string;
  displayCategoryKey?: string;
  isPremium?: boolean;''',
)
replace_once(
    types,
    '''  relationStatus?: {
    exists?: boolean;
    active?: boolean;
    visible?: boolean;
    available?: boolean;
    effective?: boolean;
    [key: string]: unknown;
  };
  status?: MealPlannerEntityStatus;''',
    '''  relationStatus?: {
    exists?: boolean;
    active?: boolean;
    visible?: boolean;
    available?: boolean;
    effective?: boolean;
    [key: string]: unknown;
  };
  effectiveStatus?: MealPlannerEntityStatus;
  pricing?: Record<string, unknown> | null;
  linked?: boolean;
  relationExists?: boolean;
  status?: MealPlannerEntityStatus;''',
)
replace_once(
    types,
    '''export interface MealPlannerCatalogV2 {
  contractVersion?: string;''',
    '''export interface MealPlannerBuilderOption extends MealPlannerCatalogCandidate {
  id: string;
  _id: string;
  optionId: string;
  type: "option";
  key: string;
  name: LocalizedTextValue;
  familyKey: string;
  proteinFamilyKey: string;
  displayCategoryKey: string;
  selectionType: "standard_meal";
  isPremium: boolean;
  linked: boolean;
  relationExists: boolean;
  assignable: boolean;
  eligible: boolean;
  relationStatus: {
    exists?: boolean;
    active?: boolean;
    visible?: boolean;
    available?: boolean;
    effective?: boolean;
    [key: string]: unknown;
  };
  effectiveStatus: MealPlannerEntityStatus;
  pricing?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface MealPlannerBuilderGroup {
  id: string;
  cardType: "option_family";
  selectionType: "standard_meal";
  productContextId: string;
  sourceGroupId: string;
  optionRole: MealPlannerOptionRole | null;
  product: {
    id: string;
    key: string;
    name: LocalizedTextValue;
    label?: string;
    status: MealPlannerEntityStatus;
    mealPlanner?: Record<string, unknown>;
    [key: string]: unknown;
  };
  group: {
    id: string;
    _id: string;
    key: string;
    name: LocalizedTextValue;
    status: MealPlannerEntityStatus;
    [key: string]: unknown;
  };
  rules: {
    minSelections?: number;
    maxSelections?: number | null;
    isRequired?: boolean;
    [key: string]: unknown;
  };
  families: string[];
  options: MealPlannerBuilderOption[];
  optionCount: number;
  assignableOptionCount: number;
  compatible: boolean;
  eligible: boolean;
  reasonCodes: string[];
  sortOrder: number;
  [key: string]: unknown;
}

export interface MealPlannerAuthoringCatalogV1 {
  contractVersion: "dashboard_meal_builder_authoring.v1" | string;
  source?: "product_option_group_relations" | string;
  canonicalSelectionType?: "standard_meal" | string;
  cardType?: "option_family" | string;
  complete?: boolean;
  builderGroups: MealPlannerBuilderGroup[];
  counts?: {
    builderGroups?: number;
    eligibleBuilderGroups?: number;
    builderOptions?: number;
    assignableBuilderOptions?: number;
    [key: string]: number | undefined;
  };
  [key: string]: unknown;
}

export interface MealPlannerCatalogV2 {
  contractVersion?: string;
  authoringContractVersion?: "dashboard_meal_builder_authoring.v1" | string;
  authoring?: MealPlannerAuthoringCatalogV1;
  builderGroups?: MealPlannerBuilderGroup[];''',
)

# ---------------------------------------------------------------------------
# Shared helpers and error mapping
# ---------------------------------------------------------------------------
utils = Path("src/components/pages/menu/meal-builder/mealPlannerV2Utils.ts")
replace_once(
    utils,
    '''  MealPlannerCardContractV2,
  MealPlannerCatalogCandidate,
  MealPlannerCreatePayloadV2,''',
    '''  MealPlannerBuilderGroup,
  MealPlannerCardContractV2,
  MealPlannerCatalogCandidate,
  MealPlannerCatalogV2,
  MealPlannerCreatePayloadV2,''',
)
replace_once(
    utils,
    '''export function canonicalSelectionType(section: MealPlannerSectionV2) {''',
    '''export function authoritativeBuilderGroups(
  catalog?: MealPlannerCatalogV2 | null
): MealPlannerBuilderGroup[] {
  const topLevel = catalog?.builderGroups;
  if (Array.isArray(topLevel)) return topLevel;
  const mirrored = catalog?.authoring?.builderGroups;
  return Array.isArray(mirrored) ? mirrored : [];
}

export function builderGroupIdentity(group: MealPlannerBuilderGroup) {
  return String(group.id || `${group.productContextId}:${group.sourceGroupId}`);
}

export function findBuilderGroup(
  catalog: MealPlannerCatalogV2 | null | undefined,
  productContextId?: string,
  sourceGroupId?: string
) {
  const productId = String(productContextId || "");
  const groupId = String(sourceGroupId || "");
  return authoritativeBuilderGroups(catalog).find(
    (group) =>
      String(group.productContextId) === productId &&
      String(group.sourceGroupId) === groupId
  );
}

export function canonicalSelectionType(section: MealPlannerSectionV2) {''',
)
replace_once(
    utils,
    '''  MEAL_BUILDER_CARD_NUMBER_INVALID: "قيمة الترتيب أو العدد غير صالحة",
  MEAL_BUILDER_CARD_KEY_DUPLICATE:''',
    '''  MEAL_BUILDER_CARD_NUMBER_INVALID: "قيمة الترتيب أو العدد غير صالحة",
  MEAL_BUILDER_INVALID_REFERENCE: "البيانات قديمة أو غير مرتبطة؛ تم طلب تحديث الكتالوج",
  MEAL_BUILDER_OPTION_IDS_INVALID: "قائمة الخيارات المرسلة غير صالحة",
  MEAL_BUILDER_CARD_KEY_DUPLICATE:''',
)
replace_once(
    utils,
    '''  PRODUCT_NOT_SUBSCRIPTION_ENABLED: "غير متاح للاشتراكات",
  OPTION_INACTIVE:''',
    '''  PRODUCT_NOT_SUBSCRIPTION_ENABLED: "غير متاح للاشتراكات",
  PRODUCT_NOT_READY: "المنتج غير جاهز للاشتراكات",
  OPTION_GROUP_NOT_READY: "مجموعة الخيارات غير جاهزة",
  PRODUCT_GROUP_RELATION_UNAVAILABLE: "العلاقة بين المنتج والمجموعة غير متاحة",
  UNSUPPORTED_OPTION_GROUP_ROLE: "دور مجموعة الخيارات غير مدعوم",
  NO_ASSIGNABLE_STANDARD_OPTIONS: "لا توجد خيارات عادية قابلة للاختيار",
  OPTION_INACTIVE:''',
)

# ---------------------------------------------------------------------------
# Candidate picker: immediate nested options + documented limits + richer copy
# ---------------------------------------------------------------------------
picker = Path("src/components/pages/menu/meal-builder/MealPlannerCandidatePickerV2.tsx")
text = picker.read_text(encoding="utf-8")
if text.count("limit: 100,") != 2:
    raise RuntimeError("Expected two picker limit=100 occurrences")
text = text.replace("limit: 100,", "limit: 1000,")
text = text.replace(
    "const initialLoading = query.isLoading && !query.data;",
    "const initialLoading = query.isLoading && !query.data && !seedCandidates.length;",
)
text = text.replace(
    '''                      {selectable
                         ? candidate.key || "جاهز للاختيار"
                         : candidateReason(candidate)}''',
    '''                      {selectable
                         ? candidateMeta(candidate)
                         : candidateReason(candidate)}''',
)
text += '''\nfunction candidateMeta(candidate: MealPlannerCatalogCandidate) {\n  const parts = [candidate.key];\n  const family = candidate.familyKey || candidate.proteinFamilyKey;\n  if (family) parts.push(`العائلة: ${family}`);\n  const price = candidate.extraPriceHalala ?? candidate.priceHalala;\n  if (typeof price === "number") {\n    parts.push(`${(price / 100).toFixed(2)} ${candidate.currency || "SAR"}`);\n  }\n  return parts.filter(Boolean).join(" • ") || "جاهز للاختيار";\n}\n'''
picker.write_text(text, encoding="utf-8")

# ---------------------------------------------------------------------------
# API methods: authoritative catalog + incremental add/remove + reconciliation
# ---------------------------------------------------------------------------
api = Path("src/utils/fetchMealPlannerDashboard.ts")
replace_once(
    api,
    '''  const response = await api.get(`${MEAL_PLANNER_DASHBOARD_ROUTE}/catalog`, {
    params: { lang: "ar" },
  });
  return response.data;
}''',
    '''  const response = await api.get(`${MEAL_PLANNER_DASHBOARD_ROUTE}/catalog`, {
    params: { lang: "ar" },
  });
  return assertCatalogResponse(response.data);
}''',
)
replace_once(
    api,
    '''export async function deleteMealPlannerCard(
  sectionKey: string
): Promise<MealPlannerCardActionResponseV2> {''',
    '''export async function addMealPlannerOptions({
  sectionKey,
  optionIds,
}: {
  sectionKey: string;
  optionIds: string[];
}): Promise<MealPlannerCardActionResponseV2> {
  const response = await api.post(
    `${MEAL_PLANNER_DASHBOARD_ROUTE}/sections/${encodeURIComponent(sectionKey)}/options`,
    { optionIds }
  );
  return assertCardActionResponse(response.data);
}

export async function removeMealPlannerOption({
  sectionKey,
  optionId,
}: {
  sectionKey: string;
  optionId: string;
}): Promise<MealPlannerCardActionResponseV2> {
  const response = await api.delete(
    `${MEAL_PLANNER_DASHBOARD_ROUTE}/sections/${encodeURIComponent(sectionKey)}/options/${encodeURIComponent(optionId)}`
  );
  return assertCardActionResponse(response.data);
}

export async function deleteMealPlannerCard(
  sectionKey: string
): Promise<MealPlannerCardActionResponseV2> {''',
)
replace_once(
    api,
    '''export async function getMealPlannerReadiness() {
  const response = await api.get(`${MEAL_PLANNER_DASHBOARD_ROUTE}/readiness`);
  return response.data as { status: true; data: MealPlannerValidationV2 };
}''',
    '''export async function getMealPlannerReadiness() {
  const response = await api.get(`${MEAL_PLANNER_DASHBOARD_ROUTE}/readiness`);
  return response.data as { status: true; data: MealPlannerValidationV2 };
}

export async function getMealPlannerHydratedDraft() {
  const response = await api.get(`${MEAL_PLANNER_DASHBOARD_ROUTE}/draft/hydrated`, {
    params: { lang: "ar" },
  });
  return response.data as MealPlannerLifecycleResponseV2;
}

export async function getPublicMealPlannerMenu() {
  const response = await api.get("/api/subscriptions/meal-planner-menu", {
    params: { lang: "ar" },
  });
  return response.data as unknown;
}''',
)
replace_once(
    api,
    '''export function assertStateResponse(value: unknown): MealPlannerStateResponseV2 {''',
    '''export function assertCatalogResponse(value: unknown): {
  status: true;
  data: MealPlannerCatalogV2;
} {
  if (!isRecord(value) || value.status !== true || !isRecord(value.data)) {
    throw new Error("Meal Planner authoring catalog contract mismatch");
  }
  const data = value.data;
  const groups = Array.isArray(data.builderGroups)
    ? data.builderGroups
    : isRecord(data.authoring) && Array.isArray(data.authoring.builderGroups)
      ? data.authoring.builderGroups
      : null;
  if (groups === null) {
    throw new Error("Meal Planner authoring catalog is missing builderGroups");
  }
  return value as unknown as { status: true; data: MealPlannerCatalogV2 };
}

export function assertStateResponse(value: unknown): MealPlannerStateResponseV2 {''',
)

# ---------------------------------------------------------------------------
# Card dialog: consume builderGroups directly; never reconstruct product/group links
# ---------------------------------------------------------------------------
dialog = Path("src/components/pages/menu/meal-builder/MealPlannerCardDialogV2.tsx")
replace_once(
    dialog,
    '''  MealPlannerCardContractV2,
  MealPlannerCatalogCandidate,
  MealPlannerCatalogV2,
  MealPlannerCreatePayloadV2,
  MealPlannerOptionRole,
  MealPlannerProductOptionGroup,
  MealPlannerSectionV2,''',
    '''  MealPlannerBuilderGroup,
  MealPlannerCardContractV2,
  MealPlannerCatalogV2,
  MealPlannerCreatePayloadV2,
  MealPlannerSectionV2,''',
)
replace_once(
    dialog,
    '''import { MealPlannerCandidatePickerV2 } from "./MealPlannerCandidatePickerV2";
import {
  allowedOptionRoles,
  buildMealPlannerCreatePayload,
  candidateId,
  creatableCardTypes,
  candidateName,
  normalizeCardType,''',
    '''import { MealPlannerBuilderGroupSelector } from "./MealPlannerBuilderGroupSelector";
import { MealPlannerCandidatePickerV2 } from "./MealPlannerCandidatePickerV2";
import {
  allowedOptionRoles,
  authoritativeBuilderGroups,
  buildMealPlannerCreatePayload,
  builderGroupIdentity,
  candidateId,
  creatableCardTypes,
  findBuilderGroup,
  normalizeCardType,''',
)
replace_once(
    dialog,
    '''  const selectedProduct = findProduct(catalog, value.productContextId);
  const groups = groupsForProduct(selectedProduct, catalog).filter((group) =>
    groupMatchesRole(group, value.optionRole)
  );
  const families = catalog.searchFacets?.proteinFamilies || [];
  const baseFieldsReady = Boolean(''',
    '''  const builderGroups = authoritativeBuilderGroups(catalog);
  const selectedBuilderGroup = findBuilderGroup(
    catalog,
    value.productContextId,
    value.sourceGroupId
  );
  const selectedBuilderGroupId = selectedBuilderGroup
    ? builderGroupIdentity(selectedBuilderGroup)
    : "";
  const families = selectedBuilderGroup?.families || [];
  const nestedOptions = (selectedBuilderGroup?.options || []).filter(
    (option) =>
      !value.familyKey ||
      String(option.familyKey || option.proteinFamilyKey || "") === value.familyKey
  );
  const originalSelectedIds = section ? selectedIdsForSection(section) : [];
  const selectedOptionsValid =
    value.cardType === "direct_product" ||
    value.selectedIds.every((id) => {
      if (originalSelectedIds.includes(id)) return true;
      return nestedOptions.some(
        (option) => candidateId(option) === id && option.assignable === true
      );
    });
  const baseFieldsReady = Boolean(''',
)
replace_once(
    dialog,
    '''  const optionContextReady =
    value.cardType === "direct_product" ||
    Boolean(
      (value.optionRole === "protein" || value.optionRole === "carbs") &&
        value.productContextId?.trim() &&
        value.sourceGroupId?.trim()
    );
  const canSubmit = baseFieldsReady && optionContextReady;''',
    '''  const optionContextReady =
    value.cardType === "direct_product" ||
    Boolean(
      selectedBuilderGroup &&
        (editing || selectedBuilderGroup.eligible === true) &&
        (value.optionRole === "protein" || value.optionRole === "carbs") &&
        value.productContextId?.trim() &&
        value.sourceGroupId?.trim()
    );
  const minSelections = Number(value.minSelections ?? 0);
  const maxSelections = value.maxSelections;
  const rulesReady =
    value.cardType === "direct_product" ||
    (Number.isInteger(minSelections) &&
      minSelections >= 0 &&
      (maxSelections === null ||
        (Number.isInteger(maxSelections) && maxSelections >= minSelections)));
  const canSubmit =
    baseFieldsReady && optionContextReady && selectedOptionsValid && rulesReady;''',
)
regex_once(
    dialog,
    r'''\n  function changeRole\(optionRole: MealPlannerOptionRole\) \{.*?\n  \}\n\n  return \(''',
    '''
  function selectBuilderGroup(group: MealPlannerBuilderGroup) {
    if (editing || group.eligible !== true) return;
    if (group.optionRole !== "protein" && group.optionRole !== "carbs") return;
    const minSelections = Number(group.rules?.minSelections ?? 0);
    const maxSelections =
      group.rules?.maxSelections === null
        ? null
        : Number(group.rules?.maxSelections ?? (group.optionRole === "carbs" ? 2 : 1));
    setValue((current) => ({
      ...current,
      optionRole: group.optionRole as "protein" | "carbs",
      productContextId: group.productContextId,
      sourceGroupId: group.sourceGroupId,
      familyKey: "",
      selectedIds: [],
      required: group.rules?.isRequired === true,
      minSelections,
      maxSelections,
      multiSelect: maxSelections === null || Number(maxSelections) > 1,
    }));
  }

  return (''',
)
regex_once(
    dialog,
    r'''            \{value\.cardType === "option_family" \? \(\n              <section className="space-y-4 rounded-2xl border bg-muted/15 p-4">.*?\n              </section>\n            \) : null\}\n\n            <MealPlannerCandidatePickerV2.*?\n            />''',
    '''            {value.cardType === "option_family" ? (
              <section className="space-y-4 rounded-2xl border bg-muted/15 p-4">
                <MealPlannerBuilderGroupSelector
                  groups={builderGroups}
                  selectedId={selectedBuilderGroupId}
                  disabled={editing}
                  onSelect={selectBuilderGroup}
                />
                {editing && !selectedBuilderGroup ? (
                  <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs leading-5 text-destructive">
                    تعذر العثور على علاقة المنتج والمجموعة الحالية داخل الكتالوج الموثق. حدّث الصفحة قبل الحفظ.
                  </p>
                ) : null}
                {selectedBuilderGroup ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SelectField
                      label="نوع الخيارات"
                      value={selectedBuilderGroup.optionRole || ""}
                      disabled
                      options={[
                        {
                          value: selectedBuilderGroup.optionRole || "unsupported",
                          label:
                            selectedBuilderGroup.optionRole === "carbs"
                              ? "خيارات كارب"
                              : "خيارات بروتين",
                        },
                      ]}
                      onChange={() => undefined}
                    />
                    {selectedBuilderGroup.optionRole === "protein" && families.length ? (
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
                ) : null}
              </section>
            ) : null}

            {value.cardType === "direct_product" ? (
              <MealPlannerCandidatePickerV2
                type="product"
                targetSectionKey={section?.key}
                selectedIds={value.selectedIds}
                seedCandidates={section ? sectionItems(section) : []}
                onChange={(selectedIds) =>
                  setValue((current) => ({ ...current, selectedIds }))
                }
              />
            ) : (
              <MealPlannerCandidatePickerV2
                type="option"
                targetSectionKey={section?.key}
                selectedIds={value.selectedIds}
                seedCandidates={[
                  ...nestedOptions,
                  ...(section ? sectionItems(section) : []),
                ]}
                productContextId={value.productContextId}
                sourceGroupId={value.sourceGroupId}
                optionRole={value.optionRole}
                familyKey={value.familyKey}
                disabled={!selectedBuilderGroup}
                onChange={(selectedIds) =>
                  setValue((current) => ({ ...current, selectedIds }))
                }
              />
            )}''',
)
replace_once(
    dialog,
    '''            <section className="grid gap-3 rounded-2xl border bg-muted/20 p-4 sm:grid-cols-2">
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
            </section>''',
    '''            {value.cardType === "option_family" ? (
              <section className="grid gap-4 rounded-2xl border bg-muted/20 p-4 sm:grid-cols-2">
                <TextField
                  label="الحد الأدنى للاختيارات"
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
                  label="الحد الأقصى للاختيارات"
                  value={value.maxSelections === null ? "" : String(value.maxSelections ?? 1)}
                  type="number"
                  min={0}
                  placeholder="بدون حد"
                  onChange={(input) =>
                    setValue((current) => ({
                      ...current,
                      maxSelections: input === "" ? null : Number(input),
                    }))
                  }
                />
                <ToggleField
                  label="الاختيار مطلوب"
                  description="استخدم القيمة التي يرسلها الـBackend ويمكن تعديلها قبل الحفظ."
                  checked={value.required === true}
                  onChange={(required) =>
                    setValue((current) => ({ ...current, required }))
                  }
                />
                <ToggleField
                  label="اختيار متعدد"
                  description="اسمح بأكثر من اختيار حسب الحد الأقصى."
                  checked={value.multiSelect === true}
                  onChange={(multiSelect) =>
                    setValue((current) => ({ ...current, multiSelect }))
                  }
                />
              </section>
            ) : null}

            <section className="rounded-2xl border bg-muted/20 p-4">
              <ToggleField
                label="إظهار الكارت"
                description="الكارت المخفي لا يظهر للعميل بعد النشر."
                checked={value.visible}
                onChange={(visible) =>
                  setValue((current) => ({ ...current, visible }))
                }
              />
            </section>''',
)
regex_once(
    dialog,
    r'''\nfunction findProduct\(catalog: MealPlannerCatalogV2, id\?: string\) \{.*?\nfunction familyLabel\(family: string\) \{''',
    '''
function familyLabel(family: string) {''',
)

# ---------------------------------------------------------------------------
# Workspace: catalog query, incremental option lifecycle, cache reconciliation, roles
# ---------------------------------------------------------------------------
workspace = Path("src/components/pages/menu/meal-builder/MealPlannerWorkspaceV2.tsx")
replace_once(
    workspace,
    '''import { toast } from "sonner";
''',
    '''import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
''',
)
replace_once(
    workspace,
    '''  createMealPlannerCard,
  deleteMealPlannerCard,
  getMealPlannerDashboardState,
  getMealPlannerReadiness,
  publishMealPlannerDraft,
  replaceMealPlannerCardItems,
  resetMealPlannerDraft,
  updateMealPlannerCard,
  validateMealPlannerDraft,''',
    '''  addMealPlannerOptions,
  createMealPlannerCard,
  deleteMealPlannerCard,
  getMealPlannerCatalog,
  getMealPlannerDashboardState,
  getMealPlannerHydratedDraft,
  getMealPlannerPublished,
  getMealPlannerReadiness,
  getPublicMealPlannerMenu,
  publishMealPlannerDraft,
  removeMealPlannerOption,
  replaceMealPlannerCardItems,
  resetMealPlannerDraft,
  updateMealPlannerCard,
  validateMealPlannerDraft,''',
)
replace_once(
    workspace,
    '''  sectionOptionRole,
  sectionTitle,
} from "./mealPlannerV2Utils";''',
    '''  sectionOptionRole,
  sectionTitle,
  selectedIdsForSection,
} from "./mealPlannerV2Utils";''',
)
replace_once(
    workspace,
    '''const STATE_KEY = ["dashboard.meal-planner.v2.state"] as const;
const READINESS_KEY = ["dashboard.meal-planner.v2.readiness"] as const;
const PICKER_KEY = ["dashboard.meal-planner.v2.picker"] as const;''',
    '''const STATE_KEY = ["dashboard.meal-planner.v2.state"] as const;
const CATALOG_KEY = ["dashboard.meal-planner.v2.catalog"] as const;
const READINESS_KEY = ["dashboard.meal-planner.v2.readiness"] as const;
const PICKER_KEY = ["dashboard.meal-planner.v2.picker"] as const;''',
)
replace_once(
    workspace,
    '''  const queryClient = useQueryClient();
  const [workspace, setWorkspace]''',
    '''  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canWrite = user?.role === "admin" || user?.role === "superadmin";
  const [workspace, setWorkspace]''',
)
replace_once(
    workspace,
    '''  const readinessQuery = useQuery({
    queryKey: READINESS_KEY,
    queryFn: getMealPlannerReadiness,
    staleTime: 20_000,
  });''',
    '''  const catalogQuery = useQuery({
    queryKey: CATALOG_KEY,
    queryFn: getMealPlannerCatalog,
    staleTime: 20_000,
  });
  const readinessQuery = useQuery({
    queryKey: READINESS_KEY,
    queryFn: getMealPlannerReadiness,
    staleTime: 20_000,
  });''',
)
replace_once(
    workspace,
    '''  const itemsMutation = useMutation({ mutationFn: replaceMealPlannerCardItems });
  const deleteMutation = useMutation''',
    '''  const itemsMutation = useMutation({ mutationFn: replaceMealPlannerCardItems });
  const addOptionsMutation = useMutation({ mutationFn: addMealPlannerOptions });
  const removeOptionMutation = useMutation({ mutationFn: removeMealPlannerOption });
  const deleteMutation = useMutation''',
)
replace_once(
    workspace,
    '''    itemsMutation.isPending ||
    deleteMutation.isPending ||''',
    '''    itemsMutation.isPending ||
    addOptionsMutation.isPending ||
    removeOptionMutation.isPending ||
    deleteMutation.isPending ||''',
)
replace_once(
    workspace,
    '''  const catalog = state?.catalog ?? { products: [], optionGroups: [], options: [] };''',
    '''  const catalog =
    catalogQuery.data?.data ??
    state?.catalog ??
    { products: [], optionGroups: [], options: [], builderGroups: [] };''',
)
replace_once(
    workspace,
    '''    void queryClient.invalidateQueries({ queryKey: READINESS_KEY });
    void queryClient.invalidateQueries({ queryKey: PICKER_KEY });''',
    '''    void Promise.all([
      queryClient.invalidateQueries({ queryKey: STATE_KEY }),
      queryClient.invalidateQueries({ queryKey: CATALOG_KEY }),
      queryClient.invalidateQueries({ queryKey: READINESS_KEY }),
      queryClient.invalidateQueries({ queryKey: PICKER_KEY }),
    ]);''',
)
replace_once(
    workspace,
    '''    await queryClient.invalidateQueries({ queryKey: PICKER_KEY });
    await Promise.all([stateQuery.refetch(), readinessQuery.refetch()]);''',
    '''    await queryClient.invalidateQueries({ queryKey: PICKER_KEY });
    await Promise.all([
      stateQuery.refetch(),
      catalogQuery.refetch(),
      readinessQuery.refetch(),
    ]);''',
)
replace_once(
    workspace,
    '''  async function saveCard(
    payload: MealPlannerCreatePayloadV2,
    previousKey?: string
  ) {
    try {''',
    '''  async function saveCard(
    payload: MealPlannerCreatePayloadV2,
    previousKey?: string
  ) {
    if (!canWrite) throw new Error("ليست لديك صلاحية تعديل منشئ الوجبات");
    try {''',
)
replace_once(
    workspace,
    '''  async function saveItems(ids: string[]) {
    if (!manageTarget) return;
    const cardType = normalizeCardType(manageTarget);
    try {
      const response = await itemsMutation.mutateAsync({
        sectionKey: manageTarget.key,
        payload:
          cardType === "direct_product"
            ? { productIds: ids }
            : { optionIds: ids },
      });''',
    '''  async function saveItems(ids: string[]) {
    if (!manageTarget) return;
    if (!canWrite) throw new Error("ليست لديك صلاحية تعديل منشئ الوجبات");
    const cardType = normalizeCardType(manageTarget);
    const originalIds = selectedIdsForSection(manageTarget);
    const added = ids.filter((id) => !originalIds.includes(id));
    const removed = originalIds.filter((id) => !ids.includes(id));
    try {
      let response: MealPlannerCardActionResponseV2;
      if (cardType === "option_family" && added.length && !removed.length) {
        response = await addOptionsMutation.mutateAsync({
          sectionKey: manageTarget.key,
          optionIds: added,
        });
      } else if (
        cardType === "option_family" &&
        removed.length === 1 &&
        !added.length
      ) {
        response = await removeOptionMutation.mutateAsync({
          sectionKey: manageTarget.key,
          optionId: removed[0],
        });
      } else {
        response = await itemsMutation.mutateAsync({
          sectionKey: manageTarget.key,
          payload:
            cardType === "direct_product"
              ? { productIds: ids }
              : { optionIds: ids },
        });
      }''',
)
replace_once(
    workspace,
    '''      await publishMutation.mutateAsync(publishNotes);
      setPublishOpen(false);''',
    '''      await publishMutation.mutateAsync(publishNotes);
      await Promise.allSettled([
        getMealPlannerPublished(),
        getMealPlannerHydratedDraft(),
        getPublicMealPlannerMenu(),
      ]);
      setPublishOpen(false);''',
)
replace_once(
    workspace,
    '''        pending={pending}
        onAdd={() => setEditor("create")}''',
    '''        pending={pending}
        canWrite={canWrite}
        onAdd={() => setEditor("create")}''',
)
replace_once(
    workspace,
    '''      <StatusPanel
        validation={validation}''',
    '''      {!canWrite ? (
        <p className="rounded-2xl border border-amber-300/50 bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
          حسابك يمكنه عرض منشئ الوجبات فقط. الكتابة متاحة لحسابات Admin وSuperadmin.
        </p>
      ) : null}

      <StatusPanel
        validation={validation}''',
)
replace_once(
    workspace,
    '''          pending={pending}
          onEdit={setEditor}''',
    '''          pending={pending}
          readOnly={!canWrite}
          onEdit={setEditor}''',
)
replace_once(
    workspace,
    '''      {manageTarget ? (
        <MealPlannerItemsDialogV2''',
    '''      {canWrite && manageTarget ? (
        <MealPlannerItemsDialogV2''',
)
replace_once(
    workspace,
    '''          pending={itemsMutation.isPending}''',
    '''          pending={
            itemsMutation.isPending ||
            addOptionsMutation.isPending ||
            removeOptionMutation.isPending
          }''',
)
replace_once(
    workspace,
    '''      {editor ? (
        <MealPlannerCardDialogV2''',
    '''      {canWrite && editor ? (
        <MealPlannerCardDialogV2''',
)
replace_once(
    workspace,
    '''  pending,
  onAdd,''',
    '''  pending,
  canWrite,
  onAdd,''',
)
replace_once(
    workspace,
    '''  pending: boolean;
  onAdd: () => void;''',
    '''  pending: boolean;
  canWrite: boolean;
  onAdd: () => void;''',
)
replace_once(
    workspace,
    '''          <Button type="button" disabled={pending} onClick={onAdd}>''',
    '''          {canWrite ? (
          <Button type="button" disabled={pending} onClick={onAdd}>''',
)
replace_once(
    workspace,
    '''            <Plus className="size-4" /> إضافة كارت
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending || !hasUnpublishedChanges}''',
    '''            <Plus className="size-4" /> إضافة كارت
          </Button>
          ) : null}
          {canWrite ? (
          <Button
            type="button"
            variant="outline"
            disabled={pending || !hasUnpublishedChanges}''',
)
replace_once(
    workspace,
    '''            مراجعة ونشر
          </Button>
          <Button type="button" variant="ghost" onClick={onPublished}>''',
    '''            مراجعة ونشر
          </Button>
          ) : null}
          <Button type="button" variant="ghost" onClick={onPublished}>''',
)
replace_once(
    workspace,
    '''          <Button
            type="button"
            variant="ghost"
            disabled={pending || !hasUnpublishedChanges}
            onClick={onReset}
            className="text-destructive hover:text-destructive"
          >
            <RotateCcw className="size-4" /> إلغاء التغييرات
          </Button>''',
    '''          {canWrite ? (
          <Button
            type="button"
            variant="ghost"
            disabled={pending || !hasUnpublishedChanges}
            onClick={onReset}
            className="text-destructive hover:text-destructive"
          >
            <RotateCcw className="size-4" /> إلغاء التغييرات
          </Button>
          ) : null}''',
)

# ---------------------------------------------------------------------------
# Card grid read-only mode for non-admin roles
# ---------------------------------------------------------------------------
grid = Path("src/components/pages/menu/meal-builder/MealPlannerCardGridV2.tsx")
replace_once(
    grid,
    '''  issues,
  pending,
  onEdit,''',
    '''  issues,
  pending,
  readOnly = false,
  onEdit,''',
)
replace_once(
    grid,
    '''  pending: boolean;
  onEdit: (section: MealPlannerSectionV2) => void;''',
    '''  pending: boolean;
  readOnly?: boolean;
  onEdit: (section: MealPlannerSectionV2) => void;''',
)
replace_once(
    grid,
    '''            pending={pending}
            onEdit={() => onEdit(section)}''',
    '''            pending={pending}
            readOnly={readOnly}
            onEdit={() => onEdit(section)}''',
)
replace_once(
    grid,
    '''  issues,
  pending,
  onEdit,
  onManageItems,''',
    '''  issues,
  pending,
  readOnly,
  onEdit,
  onManageItems,''',
)
replace_once(
    grid,
    '''  pending: boolean;
  onEdit: () => void;''',
    '''  pending: boolean;
  readOnly: boolean;
  onEdit: () => void;''',
)
replace_once(
    grid,
    '''      <div className="mt-auto grid gap-2 pt-5 sm:grid-cols-2">''',
    '''      {!readOnly ? (
      <div className="mt-auto grid gap-2 pt-5 sm:grid-cols-2">''',
)
replace_once(
    grid,
    '''        </Button>
      </div>
    </article>''',
    '''        </Button>
      </div>
      ) : (
        <p className="mt-auto rounded-xl bg-muted/50 p-3 pt-3 text-xs leading-5 text-muted-foreground">
          عرض فقط — التعديل متاح لحسابات Admin وSuperadmin.
        </p>
      )}
    </article>''',
)
