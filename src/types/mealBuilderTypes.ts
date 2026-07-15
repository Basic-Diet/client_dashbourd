import type {
  LocalizedText,
  MenuCategory,
  MenuOption,
  MenuOptionGroup,
  MenuProduct,
  MenuProductComposer,
} from "@/types/menuTypes";
import type { MealPlannerMenuContract } from "@/types/mealPlannerMenuTypes";

export type MealBuilderSectionType =
  | "option_group"
  | "product_category"
  | "product_list";

export type MealBuilderSelectionType =
  | "standard_meal"
  | "premium_meal"
  | "premium_large_salad"
  | "sandwich"
  | string;

export interface MealBuilderSection {
  id?: string;
  key?: string;
  sectionType: MealBuilderSectionType;
  sourceKind?: string;
  productContextId?: string | null;
  sourceGroupId?: string | null;
  sourceCategoryId?: string | null;
  selectedOptionIds: string[];
  selectedProductIds: string[];
  includeMode: "all" | "selected";
  selectionType: MealBuilderSelectionType;
  titleOverride: LocalizedText;
  sortOrder: number;
  required: boolean;
  minSelections: number;
  maxSelections: number | null;
  multiSelect: boolean;
  visible: boolean;
  availableFor: string[];
  metadata?: Record<string, unknown>;
  rules?: Record<string, unknown>;
  selectedOptions?: MealBuilderHydratedItem[];
  selectedProducts?: MealBuilderHydratedItem[];
  items?: MealBuilderHydratedItem[];
  hydration?: {
    selectedOptionCount?: number;
    selectedProductCount?: number;
    errorCount?: number;
    warningCount?: number;
  };
}

export interface MealBuilderConfig {
  id: string;
  status: "draft" | "published" | "archived" | string;
  isCurrent: boolean;
  contractVersion: string;
  revisionHash: string;
  source: string;
  createdBySystem: boolean;
  bootstrapKey: string;
  publishedAt: string | null;
  publishedBy?: string | null;
  notes?: string;
  sections: MealBuilderSection[];
  createdAt?: string;
  updatedAt?: string;
}

export interface MealBuilderCheck {
  level?: "error" | "warning" | string;
  code?: string;
  message?: string;
  sectionIndex?: number;
  sectionType?: string;
  productId?: string | null;
  groupId?: string | null;
  optionId?: string | null;
  [key: string]: unknown;
}

export interface MealBuilderHydratedItem {
  id: string | null;
  optionId?: string | null;
  productId?: string | null;
  type: "option" | "product" | "missing_option" | "missing_product" | string;
  key?: string;
  name?: LocalizedText;
  label?: string;
  familyKey?: string;
  premiumKey?: string | null;
  itemType?: string;
  categoryId?: string | null;
  categoryKey?: string;
  selectionType?: string;
  configurable?: boolean;
  selected?: boolean;
  required?: boolean;
  eligible?: boolean;
  linked?: boolean;
  available?: boolean;
  active?: boolean;
  visible?: boolean;
  published?: boolean;
  subscriptionEnabled?: boolean;
  relationExists?: boolean;
  catalogItemAvailable?: boolean;
  reasonCodes?: string[];
  warnings?: MealBuilderCheck[];
  errors?: MealBuilderCheck[];
  state?: "selected" | "eligible" | "not_linked" | "unavailable" | "invalid" | string;
  includedVia?: string | null;
  automatic?: boolean;
  action?: {
    requiresBuilder?: boolean;
    treatAsFullMeal?: boolean;
    [key: string]: unknown;
  };
  pricing?: Record<string, unknown>;
  relation?: Record<string, unknown> | null;
  imageUrl?: string | null;
  kind?: string | null;
  currency?: string | null;
  priceHalala?: number | null;
  premiumPriceHalala?: number | null;
  upgradePriceHalala?: number | null;
  sortOrder?: number | null;
  health?: string | null;
  status?: string | null;
}

export interface MealBuilderValidation {
  status: "ok" | "warning" | "error" | string;
  ready: boolean;
  errors: MealBuilderCheck[];
  warnings: MealBuilderCheck[];
  checks: MealBuilderCheck[];
  summary?: Record<string, unknown>;
}

export interface MealBuilderContractItem {
  id: string;
  key?: string;
  type?: "option" | "product" | string;
  name?: string;
  nameI18n?: LocalizedText;
  imageUrl?: string;
  selectionType?: string;
  isPremium?: boolean;
  premiumKind?: string | null;
  premiumKey?: string | null;
  priceHalala?: number;
  premiumPriceHalala?: number;
  requiresPremiumBalance?: boolean;
  available?: boolean;
  sortOrder?: number;
  optionGroups?: Array<{
    id: string;
    key?: string;
    name?: string;
    items?: MealBuilderContractItem[];
    options?: MealBuilderContractItem[];
  }>;
}

export interface MealBuilderContractSection {
  id: string;
  sectionType: MealBuilderSectionType;
  title?: string;
  titleI18n?: LocalizedText;
  sortOrder: number;
  required: boolean;
  minSelections: number;
  maxSelections: number | null;
  multiSelect: boolean;
  selectionType: string;
  productContextId?: string;
  productKey?: string;
  sourceGroupId?: string;
  groupKey?: string;
  sourceCategoryId?: string | null;
  includeMode?: "all" | "selected";
  items: MealBuilderContractItem[];
}

export interface MealBuilderContract {
  contractVersion: string;
  revisionHash: string;
  publishedAt: string | null;
  sections: MealBuilderContractSection[];
  premiumSection?: MealBuilderPremiumSection | null;
}

export interface MealBuilderPremiumSection {
  automatic?: boolean;
  source?: string;
  title?: string;
  items?: MealBuilderHydratedItem[];
  diagnostics?: MealBuilderCheck[];
  excluded?: MealBuilderHydratedItem[];
  broken?: MealBuilderHydratedItem[];
  [key: string]: unknown;
}

export interface MealBuilderVersionMetadata {
  mode?: "published" | "draft" | string;
  versionId?: string | null;
  draftVersionId?: string | null;
  versionNumber?: number | string | null;
  basedOnPublishedVersionId?: string | null;
  hasDraft?: boolean;
  hasUnpublishedChanges?: boolean;
  publishedAt?: string | null;
  updatedAt?: string | null;
  status?: string | null;
}

export interface MealBuilderState {
  draft: MealBuilderConfig | null;
  published: MealBuilderConfig | null;
  preview: MealBuilderContract | null;
  contract?: MealBuilderContract | null;
  premiumSection?: MealBuilderPremiumSection | null;
  metadata?: MealBuilderVersionMetadata;
  plannerCatalog?: MealPlannerMenuContract | null;
  validation: {
    draft: MealBuilderValidation | null;
    published: MealBuilderValidation | null;
  };
}

export interface MealBuilderStateResponse {
  status: boolean;
  data: MealBuilderState;
}

export interface MealBuilderConfigResponse {
  status: boolean;
  data: MealBuilderConfig;
}

export interface MealBuilderLifecycleResponseData {
  config?: MealBuilderConfig | null;
  draft?: MealBuilderConfig | null;
  published?: MealBuilderConfig | null;
  contract?: MealBuilderContract | null;
  sections?: MealBuilderSection[];
  premiumSection?: MealBuilderPremiumSection | null;
  validation?: MealBuilderValidation | null;
  mode?: "published" | "draft" | string;
  versionId?: string | null;
  draftVersionId?: string | null;
  versionNumber?: number | string | null;
  basedOnPublishedVersionId?: string | null;
  hasDraft?: boolean;
  hasUnpublishedChanges?: boolean;
  publishedAt?: string | null;
  updatedAt?: string | null;
  status?: string | null;
  reset?: boolean;
  [key: string]: unknown;
}

export interface MealBuilderLifecycleResponse {
  status: boolean;
  data: MealBuilderLifecycleResponseData;
}

export interface MealBuilderValidationResponse {
  status: boolean;
  data: MealBuilderValidation;
}

export interface MealBuilderPublishResponse {
  status: boolean;
  data: {
    config: MealBuilderConfig;
    validation: MealBuilderValidation;
    contract: MealBuilderContract;
  };
}

export interface MealBuilderReadinessResponse {
  status: boolean;
  data: MealBuilderValidation;
}

export interface MealBuilderHydratedDraft {
  contractVersion: string;
  draft: MealBuilderConfig | null;
  mode?: "draft" | string;
  versionId?: string | null;
  versionNumber?: number | string | null;
  basedOnPublishedVersionId?: string | null;
  hasUnpublishedChanges?: boolean;
  updatedAt?: string | null;
  premiumSection?: MealBuilderPremiumSection | null;
  ready: boolean;
  errors: MealBuilderCheck[];
  warnings: MealBuilderCheck[];
  sections: MealBuilderSection[];
  validation?: MealBuilderValidation;
}

export interface MealBuilderHydratedDraftResponse {
  status: boolean;
  data: MealBuilderHydratedDraft;
}

export interface MealBuilderPickerParams {
  q?: string;
  includeUnavailable?: boolean;
  includeNotLinked?: boolean;
  page?: number;
  limit?: number;
}

export interface MealBuilderPickerResponseData {
  contractVersion: string;
  sectionKey: string;
  candidateType: "option" | "product" | "mixed" | string;
  product?: { id: string; key: string; name: LocalizedText } | null;
  group?: { id: string; key: string; name: LocalizedText } | null;
  category?: { id: string; key: string; name: LocalizedText } | null;
  rules?: Record<string, unknown>;
  candidates: MealBuilderHydratedItem[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface MealBuilderPickerResponse {
  status: boolean;
  data: MealBuilderPickerResponseData;
}

export interface MealBuilderDraftPayload {
  sections: MealBuilderSection[];
  notes?: string;
}

export interface MealBuilderCatalogData {
  products: MenuProduct[];
  categories: MenuCategory[];
  groups: MenuOptionGroup[];
  options: MenuOption[];
  composersByProductId: Map<string, MenuProductComposer>;
}
