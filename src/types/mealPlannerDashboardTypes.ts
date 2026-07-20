export type MealPlannerCardType =
  | "direct_product"
  | "option_family"
  | "system_premium";

export type MealPlannerSelectionType =
  | "full_meal_product"
  | "standard_meal";

export type MealPlannerOptionRole = "protein" | "carbs";

export interface LocalizedTextValue {
  ar: string;
  en: string;
}

export interface FlutterSlotContract {
  idField: "sandwichId" | "proteinId" | "carbs[].carbId" | string;
  requiresCompanionCard: boolean;
}

export interface MealPlannerSectionV2 {
  id?: string;
  key: string;
  sectionType?: string;
  sourceKind?: string;
  cardType?: MealPlannerCardType | string;
  optionRole?: MealPlannerOptionRole | null;
  titleOverride?: LocalizedTextValue;
  selectionType?: MealPlannerSelectionType | "sandwich" | string;
  selectedProductIds?: string[];
  selectedOptionIds?: string[];
  selectedProducts?: MealPlannerCatalogCandidate[];
  selectedOptions?: MealPlannerCatalogCandidate[];
  items?: MealPlannerCatalogCandidate[];
  productContextId?: string | null;
  sourceGroupId?: string | null;
  sortOrder?: number;
  visible?: boolean;
  required?: boolean;
  minSelections?: number;
  maxSelections?: number | null;
  multiSelect?: boolean;
  systemManaged?: boolean;
  itemEntity?: "MenuProduct" | "MenuOption" | "PremiumUpgradeConfig" | string;
  completeByItself?: boolean;
  flutterSlotContract?: FlutterSlotContract | null;
  metadata?: Record<string, unknown>;
  rules?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface MealPlannerConfigV2 {
  id?: string;
  versionId?: string;
  versionNumber?: number | string | null;
  mode?: "draft" | "published" | string;
  status?: string;
  isCurrent?: boolean;
  revisionHash?: string;
  notes?: string;
  hasUnpublishedChanges?: boolean;
  publishedAt?: string | null;
  publishedBy?: string | null;
  updatedAt?: string | null;
  sections: MealPlannerSectionV2[];
  [key: string]: unknown;
}

export interface MealPlannerValidationIssue {
  level?: "error" | "warning" | string;
  code?: string;
  message?: string;
  sectionKey?: string;
  productContextId?: string;
  groupId?: string;
  optionId?: string;
  productId?: string;
  field?: string;
  [key: string]: unknown;
}

export interface MealPlannerValidationV2 {
  status: "ok" | "warning" | "error" | string;
  ready: boolean;
  errors: MealPlannerValidationIssue[];
  warnings: MealPlannerValidationIssue[];
  checks: Array<Record<string, unknown>>;
  summary?: {
    sections?: number;
    errors?: number;
    warnings?: number;
    publishable?: boolean;
    [key: string]: unknown;
  };
}

export interface MealPlannerPremiumSectionV2 {
  automatic?: boolean;
  source?: string;
  title?: string;
  items?: MealPlannerCatalogCandidate[];
  diagnostics?: MealPlannerValidationIssue[];
  [key: string]: unknown;
}

export interface MealPlannerCardContractV2 {
  contractVersion?: string;
  canonicalSelectionTypes?: {
    directProduct?: "full_meal_product" | string;
    optionMeal?: "standard_meal" | string;
    deprecatedAliases?: string[];
  };
  premiumCard?: {
    cardType?: "system_premium" | string;
    fixed?: boolean;
    managedBy?: string;
    editable?: boolean;
    [key: string]: unknown;
  };
  dynamicCardTypes?: Array<{
    cardType?: MealPlannerCardType | string;
    entity?: string;
    completeByItself?: boolean;
    allowedSelectionTypes?: string[];
    deprecatedSelectionTypes?: string[];
    allowedOptionRoles?: string[];
    selectionType?: string;
    requiresBaseProduct?: boolean;
    requiresSourceGroup?: boolean;
    premiumManagedSeparately?: boolean;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export interface MealPlannerStateDataV2 {
  draft: MealPlannerConfigV2 | null;
  published: MealPlannerConfigV2 | null;
  preview?: { sections?: MealPlannerSectionV2[]; [key: string]: unknown } | null;
  premiumSection?: MealPlannerPremiumSectionV2 | null;
  validation?: {
    draft?: MealPlannerValidationV2 | null;
    published?: MealPlannerValidationV2 | null;
  };
  cardContract?: MealPlannerCardContractV2 | null;
  catalog?: MealPlannerCatalogV2 | null;
  metadata?: {
    hasDraft?: boolean;
    hasUnpublishedChanges?: boolean;
    versionNumber?: number | string | null;
    publishedAt?: string | null;
    updatedAt?: string | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface MealPlannerStateResponseV2 {
  status: true;
  data: MealPlannerStateDataV2;
}

export interface MealPlannerEntityStatus {
  active?: boolean;
  visible?: boolean;
  available?: boolean;
  published?: boolean;
  subscriptionEnabled?: boolean;
  catalogItemAvailable?: boolean;
  customerReady?: boolean;
  reasonCodes?: string[];
  [key: string]: unknown;
}

export interface MealPlannerCatalogCandidate {
  id: string;
  _id?: string;
  productId?: string;
  optionId?: string;
  key?: string;
  type?: "product" | "option" | string;
  itemType?: string;
  name?: Partial<LocalizedTextValue>;
  label?: string;
  labelAr?: string;
  labelEn?: string;
  imageUrl?: string | null;
  categoryId?: string | null;
  categoryKey?: string;
  groupId?: string | null;
  productContextId?: string | null;
  optionRole?: MealPlannerOptionRole | string;
  selectionType?: string;
  familyKey?: string;
  proteinFamilyKey?: string;
  displayCategoryKey?: string;
  isPremium?: boolean;
  priceHalala?: number | null;
  extraPriceHalala?: number | null;
  currency?: string | null;
  selected?: boolean;
  assigned?: boolean;
  assignedSectionKey?: string | null;
  assignable?: boolean;
  eligible?: boolean;
  relationStatus?: {
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
  status?: MealPlannerEntityStatus;
  reasonCodes?: string[];
  warnings?: MealPlannerValidationIssue[];
  errors?: MealPlannerValidationIssue[];
  state?: string;
  sortOrder?: number | null;
  optionGroups?: MealPlannerProductOptionGroup[];
  [key: string]: unknown;
}

export interface MealPlannerProductOptionGroup {
  id?: string;
  key?: string;
  name?: Partial<LocalizedTextValue>;
  group?: {
    id?: string;
    _id?: string;
    key?: string;
    name?: Partial<LocalizedTextValue>;
    [key: string]: unknown;
  };
  effectiveStatus?: MealPlannerEntityStatus;
  relationStatus?: {
    effective?: boolean;
    [key: string]: unknown;
  };
  options?: MealPlannerCatalogCandidate[];
  optionCount?: number;
  [key: string]: unknown;
}

export interface MealPlannerBuilderOption extends MealPlannerCatalogCandidate {
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
  builderGroups?: MealPlannerBuilderGroup[];
  generatedAt?: string;
  complete?: boolean;
  counts?: Record<string, number>;
  categories?: MealPlannerCatalogCandidate[];
  products?: MealPlannerCatalogCandidate[];
  optionGroups?: MealPlannerCatalogCandidate[];
  options?: MealPlannerCatalogCandidate[];
  relations?: {
    productOptionGroups?: Array<Record<string, unknown>>;
    productGroupOptions?: Array<Record<string, unknown>>;
    [key: string]: unknown;
  };
  diagnostics?: Record<string, unknown>;
  cardContract?: MealPlannerCardContractV2;
  searchFacets?: {
    productCategories?: MealPlannerCatalogCandidate[];
    productItemTypes?: string[];
    productCardVariants?: string[];
    optionGroups?: MealPlannerCatalogCandidate[];
    proteinFamilies?: string[];
    displayCategories?: string[];
    optionSelectionTypes?: string[];
    optionRoles?: MealPlannerOptionRole[];
    cardTypes?: MealPlannerCardType[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface MealPlannerPickerParamsV2 {
  targetSectionKey?: string;
  productContextId?: string;
  sourceGroupId?: string;
  optionRole?: MealPlannerOptionRole;
  familyKey?: string;
  q?: string;
  search?: string;
  includeUnavailable?: boolean;
  unassignedOnly?: boolean;
  page?: number;
  limit?: number;
  lang?: "ar" | "en";
}

export interface MealPlannerPickerDataV2 {
  contractVersion?: string;
  sectionKey?: string;
  targetSectionKey?: string | null;
  cardType?: MealPlannerCardType | string;
  candidateType?: "product" | "option" | string;
  context?: {
    product?: MealPlannerCatalogCandidate | null;
    group?: MealPlannerCatalogCandidate | null;
    relationStatus?: Record<string, unknown>;
    [key: string]: unknown;
  };
  rules?: Record<string, unknown>;
  candidates: MealPlannerCatalogCandidate[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    pages?: number;
    catalogTotal?: number;
    selectedInCurrentCard?: number;
    assignedToOtherCards?: number;
    unassigned?: number;
    unavailable?: number;
    [key: string]: unknown;
  };
}

export interface MealPlannerPickerResponseV2 {
  status: true;
  data: MealPlannerPickerDataV2;
}

export interface DirectProductCardPayloadV2 {
  cardType: "direct_product";
  key: string;
  titleOverride: LocalizedTextValue;
  selectionType: "full_meal_product";
  selectedProductIds: string[];
  sortOrder?: number;
  visible: boolean;
}

export interface OptionFamilyCardPayloadV2 {
  cardType: "option_family";
  key: string;
  titleOverride: LocalizedTextValue;
  optionRole: MealPlannerOptionRole;
  familyKey?: string;
  productContextId: string;
  sourceGroupId: string;
  selectedOptionIds: string[];
  selectionType: "standard_meal";
  sortOrder?: number;
  visible: boolean;
  required?: boolean;
  minSelections?: number;
  maxSelections?: number | null;
  multiSelect?: boolean;
}

export type MealPlannerCreatePayloadV2 =
  | DirectProductCardPayloadV2
  | OptionFamilyCardPayloadV2;

export type MealPlannerPatchPayloadV2 = Partial<
  DirectProductCardPayloadV2 | OptionFamilyCardPayloadV2
>;

export interface MealPlannerCardActionSummaryV2 {
  sectionCount?: number;
  selectedProductCount?: number;
  selectedOptionCount?: number;
  ready?: boolean;
  errorCount?: number;
  warningCount?: number;
}

export interface MealPlannerCardActionDataV2 {
  contractVersion: string;
  action: string;
  sectionKey: string | null;
  previousSectionKey: string | null;
  itemId?: string | null;
  productId?: string | null;
  section: MealPlannerSectionV2 | null;
  draft: MealPlannerConfigV2;
  validation: MealPlannerValidationV2;
  summary?: MealPlannerCardActionSummaryV2;
}

export interface MealPlannerCardActionResponseV2 {
  status: true;
  data: MealPlannerCardActionDataV2;
}

export interface MealPlannerLifecycleResponseV2 {
  status: true;
  data: {
    config?: MealPlannerConfigV2 | null;
    draft?: MealPlannerConfigV2 | null;
    published?: MealPlannerConfigV2 | null;
    contract?: Record<string, unknown> | null;
    premiumSection?: MealPlannerPremiumSectionV2 | null;
    validation?: MealPlannerValidationV2 | null;
    [key: string]: unknown;
  } | MealPlannerConfigV2 | null;
}

export interface MealPlannerBackendError {
  ok?: false;
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown> | unknown[] | null;
  };
}
