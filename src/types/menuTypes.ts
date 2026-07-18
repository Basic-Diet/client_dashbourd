// ── One-Time Menu Management Types ──
// These types cover the one-time order menu system (§6–§15 of the API README).
// All prices are in halala (100 halala = 1 SAR).

// ── Shared ──

export interface LocalizedText {
  ar: string;
  en: string;
}

export type MenuCategoryCardVariant =
  | "meal_builder"
  | "light_collection"
  | "hero_builder_collection"
  | "compact_builder_collection"
  | "meal_collection"
  | "compact_product_collection"
  | "sandwich_collection"
  | "addon_collection";

export type MenuProductCardVariant =
  | "standard"
  | "premium"
  | "large_salad"
  | "addon"
  | "hero_builder"
  | "compact_builder"
  | "ready_meal"
  | "ready_meal_customizable"
  | "compact_product"
  | "sandwich_card"
  | "addon_card";

export type MenuProductCardSize = "large" | "medium" | "small";

export type MenuOptionGroupDisplayStyle =
  | "chips"
  | "radio_cards"
  | "checkbox_grid"
  | "dropdown"
  | "stepper";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedResponse<T> {
  status: boolean;
  data: {
    items: T[];
    pagination: PaginationMeta;
  };
}

// ── §6 Menu Categories ──

export interface MenuCategory {
  id: string;
  key: string;
  name: LocalizedText;
  description?: LocalizedText;
  imageUrl?: string;
  isActive: boolean;
  isAvailable: boolean;
  isVisible?: boolean;
  ui?: {
    cardVariant?: MenuCategoryCardVariant;
  };
  availability?: {
    branchIds?: string[];
  };
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export type MenuCategoriesResponse = PaginatedResponse<MenuCategory>;

// Subscription meal builder data now lives under /menu.

export interface MenuMealCategory {
  id: string;
  key: string;
  name: LocalizedText;
  description?: LocalizedText;
  imageUrl?: string;
  isActive: boolean;
  isAvailable: boolean;
  isVisible?: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export type MenuMealCategoriesResponse = PaginatedResponse<MenuMealCategory>;

export interface MenuMealCategoryDetailResponse {
  status: boolean;
  data: MenuMealCategory;
}

export interface CreateMenuMealCategoryPayload {
  key?: string;
  name: LocalizedText;
  description?: LocalizedText;
  imageUrl?: string;
  isActive?: boolean;
  isAvailable?: boolean;
  isVisible?: boolean;
  availableFor?: string[];
  availableForSubscription?: boolean;
  sortOrder?: number;
}

export interface UpdateMenuMealCategoryPayload {
  name?: LocalizedText;
  description?: LocalizedText;
  imageUrl?: string;
  isActive?: boolean;
  isAvailable?: boolean;
  isVisible?: boolean;
  availableFor?: string[];
  availableForSubscription?: boolean;
  sortOrder?: number;
}

export interface MenuProtein {
  id: string;
  name: LocalizedText;
  description?: LocalizedText;
  imageUrl?: string;
  categoryId: string;
  category?: MenuMealCategory;
  proteinGrams: number;
  carbGrams: number;
  fatGrams: number;
  isActive: boolean;
  isAvailable: boolean;
  isVisible?: boolean;
  availableForOrder?: boolean;
  availableForSubscription?: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export type MenuProteinsResponse = PaginatedResponse<MenuProtein>;

export interface MenuProteinDetailResponse {
  status: boolean;
  data: MenuProtein;
}

export interface CreateMenuProteinPayload {
  name: LocalizedText;
  description?: LocalizedText;
  imageUrl?: string;
  categoryId: string;
  proteinGrams?: number;
  carbGrams?: number;
  fatGrams?: number;
  isActive?: boolean;
  isAvailable?: boolean;
  isVisible?: boolean;
  availableForOrder?: boolean;
  availableForSubscription?: boolean;
  sortOrder?: number;
}

export interface UpdateMenuProteinPayload {
  name?: LocalizedText;
  description?: LocalizedText;
  imageUrl?: string;
  categoryId?: string;
  proteinGrams?: number;
  carbGrams?: number;
  fatGrams?: number;
  isActive?: boolean;
  isAvailable?: boolean;
  isVisible?: boolean;
  availableForOrder?: boolean;
  availableForSubscription?: boolean;
  sortOrder?: number;
}

export interface MenuPremiumProtein extends MenuProtein {
  extraFeeHalala: number;
  currency?: string;
}

export type MenuPremiumProteinsResponse = PaginatedResponse<MenuPremiumProtein>;

export interface MenuPremiumProteinDetailResponse {
  status: boolean;
  data: MenuPremiumProtein;
}

export interface CreateMenuPremiumProteinPayload extends CreateMenuProteinPayload {
  extraFeeHalala: number;
  currency?: string;
}

export interface UpdateMenuPremiumProteinPayload extends UpdateMenuProteinPayload {
  extraFeeHalala?: number;
  currency?: string;
}

export interface MenuCategoryDetailResponse {
  status: boolean;
  data: MenuCategoryDetail;
}

export interface MenuCategoryDetail extends MenuCategory {
  contractVersion?: "dashboard_category_detail.v3" | string;
  category?: MenuCategory;
  products?: MenuProduct[];
  assignment?: {
    relationOwner?: "product.categoryId" | string;
    bulkAssignmentEndpoint?: string;
  };
  actions?: {
    canBulkAssignProducts?: boolean;
    canReorderProducts?: boolean;
  };
}

export interface BulkAssignProductsToCategoryPayload {
  mode?: "assign";
  productIds: string[];
}

export interface CategoryProductAssignmentResult {
  contractVersion: "dashboard_category_product_assignment.v3" | string;
  category: MenuCategory;
  assignedCount: number;
  products: MenuProduct[];
  relationOwner: "product.categoryId" | string;
}

export interface CategoryProductAssignmentResponse {
  status: boolean;
  data: CategoryProductAssignmentResult;
}

export interface CreateMenuCategoryPayload {
  key?: string;
  name: LocalizedText;
  description?: LocalizedText;
  imageUrl?: string;
  isActive?: boolean;
  isAvailable?: boolean;
  isVisible?: boolean;
  availability?: {
    branchIds?: string[];
  };
  ui?: {
    cardVariant?: MenuCategoryCardVariant;
  };
  sortOrder?: number;
}

export interface UpdateMenuCategoryPayload {
  name?: LocalizedText;
  description?: LocalizedText;
  imageUrl?: string;
  isActive?: boolean;
  isAvailable?: boolean;
  isVisible?: boolean;
  availability?: {
    branchIds?: string[];
  };
  ui?: {
    cardVariant?: MenuCategoryCardVariant;
  };
  sortOrder?: number;
}

export interface ReorderItem {
  id: string;
  sortOrder: number;
}

// ── §7 Menu Products ──

export type PricingModel = "fixed" | "per_100g";

export type ItemType = string;

export type WeightPricingStrategy =
  | "base_plus_steps"
  | "legacy_per_unit"
  | "fixed"
  | string;

export interface WeightPricingChoice {
  weightGrams: number;
  priceHalala: number;
}

export interface WeightPricingDescriptor {
  contractVersion: "weight_pricing.v1" | string;
  strategy: WeightPricingStrategy;
  requiresWeightSelection: boolean;
  basePriceHalala: number;
  baseWeightGrams: number;
  defaultWeightGrams: number;
  minWeightGrams: number;
  maxWeightGrams: number;
  stepGrams: number;
  stepPriceHalala: number;
  choices: WeightPricingChoice[];
}

export interface MenuProduct {
  id: string;
  categoryId?: string;
  key: string;
  itemType: ItemType;
  name: LocalizedText;
  description?: LocalizedText;
  imageUrl?: string;
  pricingModel: PricingModel;
  priceHalala: number;
  baseUnitGrams?: number;
  defaultWeightGrams?: number;
  minWeightGrams?: number;
  maxWeightGrams?: number;
  weightStepGrams?: number;
  weightStepPriceHalala?: number | null;
  weightPricing?: WeightPricingDescriptor | null;
  isActive: boolean;
  isAvailable: boolean;
  isVisible?: boolean;
  isCustomizable?: boolean;
  availableFor?: string[];
  branchAvailability?: string[];
  catalogItemId?: string | null;
  ui?: {
    cardVariant?: MenuProductCardVariant;
    cardSize?: MenuProductCardSize;
    badge?: string;
    ctaLabel?: string;
    imageRatio?: string;
  };
  sortOrder: number;
  groups?: MenuProductLinkedGroup[];
  optionGroups?: MenuProductLinkedGroup[];
  createdAt?: string;
  updatedAt?: string;
}

export type MenuProductsResponse = PaginatedResponse<MenuProduct>;

export interface MenuProductMutationResponse {
  status: boolean;
  data: MenuProduct;
}

export interface UpdateWeightPricingPayload {
  priceHalala?: number;
  baseUnitGrams: number;
  defaultWeightGrams: number;
  minWeightGrams: number;
  maxWeightGrams: number;
  weightStepGrams: number;
  weightStepPriceHalala: number;
}

export interface DashboardWeightPricingResponse {
  status: true;
  data: {
    contractVersion: "dashboard_weight_pricing.v1" | string;
    product: MenuProduct;
    weightPricing: WeightPricingDescriptor;
  };
}

export interface MenuProductDetailResponse {
  status: boolean;
  data: MenuProductDetail;
}

export interface MenuProductDetail extends MenuProduct {
  contractVersion?: "dashboard_product_detail.v3" | string;
  product?: MenuProduct;
  category?: MenuCategory | null;
  groupSummary?: {
    linkedGroupCount: number;
    composerEndpoint: string;
    linkEndpoint: string;
  };
}

export interface BulkUpdateProductsPayload {
  action: "move_to_category";
  productIds: string[];
  categoryId: string;
}

export interface BulkUpdateProductsResult {
  action: "move_to_category" | string;
  category: MenuCategory;
  count: number;
  products: MenuProduct[];
  relationOwner: "product.categoryId" | string;
}

export interface BulkUpdateProductsResponse {
  status: boolean;
  data: BulkUpdateProductsResult;
}

export interface CreateMenuProductPayload {
  categoryId: string;
  key?: string;
  itemType: ItemType;
  name: LocalizedText;
  description?: LocalizedText;
  imageUrl?: string;
  pricingModel: PricingModel;
  priceHalala: number;
  baseUnitGrams?: number;
  defaultWeightGrams?: number;
  minWeightGrams?: number;
  maxWeightGrams?: number;
  weightStepGrams?: number;
  weightStepPriceHalala?: never;
  isActive?: boolean;
  isAvailable?: boolean;
  isVisible?: boolean;
  isCustomizable?: boolean;
  availableFor?: string[];
  branchAvailability?: string[];
  catalogItemId?: string | null;
  ui?: {
    cardVariant?: MenuProductCardVariant;
    cardSize?: MenuProductCardSize;
    badge?: string;
    ctaLabel?: string;
    imageRatio?: string;
  };
  sortOrder?: number;
}

export interface UpdateMenuProductPayload {
  categoryId?: string;
  itemType?: ItemType;
  name?: LocalizedText;
  description?: LocalizedText;
  imageUrl?: string;
  pricingModel?: PricingModel;
  priceHalala?: number;
  baseUnitGrams?: number;
  defaultWeightGrams?: number;
  minWeightGrams?: number;
  maxWeightGrams?: number;
  weightStepGrams?: number;
  weightStepPriceHalala?: never;
  isActive?: boolean;
  isAvailable?: boolean;
  isVisible?: boolean;
  isCustomizable?: boolean;
  availableFor?: string[];
  branchAvailability?: string[];
  catalogItemId?: string | null;
  ui?: {
    cardVariant?: MenuProductCardVariant;
    cardSize?: MenuProductCardSize;
    badge?: string;
    ctaLabel?: string;
    imageRatio?: string;
  };
  sortOrder?: number;
}

// ── §8 Option Groups ──

export interface MenuOptionGroup {
  id: string;
  key: string;
  name: LocalizedText;
  description?: LocalizedText;
  isActive: boolean;
  isAvailable: boolean;
  isVisible?: boolean;
  ui?: {
    displayStyle?: MenuOptionGroupDisplayStyle;
  };
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export type MenuOptionGroupsResponse = PaginatedResponse<MenuOptionGroup>;

export interface MenuOptionGroupDetailResponse {
  status: boolean;
  data: MenuOptionGroupDetail;
}

export interface MenuOptionGroupDetail extends MenuOptionGroup {
  contractVersion?: "dashboard_option_group_detail.v3" | string;
  optionGroup?: MenuOptionGroup;
  options?: MenuOption[];
  usage?: {
    linkedProductsCount?: number;
  };
  actions?: {
    canAddOptions?: boolean;
    canReorderOptions?: boolean;
  };
}

export interface CreateMenuOptionGroupPayload {
  key?: string;
  name: LocalizedText;
  description?: LocalizedText;
  isActive?: boolean;
  isAvailable?: boolean;
  isVisible?: boolean;
  ui?: {
    displayStyle?: MenuOptionGroupDisplayStyle;
  };
  sortOrder?: number;
}

export interface UpdateMenuOptionGroupPayload {
  name?: LocalizedText;
  description?: LocalizedText;
  isActive?: boolean;
  isAvailable?: boolean;
  isVisible?: boolean;
  ui?: {
    displayStyle?: MenuOptionGroupDisplayStyle;
  };
  sortOrder?: number;
}

// ── §9 Options ──

export interface MenuOption {
  id: string;
  groupId: string;
  key: string;
  name: LocalizedText;
  description?: LocalizedText;
  imageUrl?: string;
  extraPriceHalala: number;
  extraWeightUnitGrams?: number;
  extraWeightPriceHalala?: number;
  isActive: boolean;
  isAvailable: boolean;
  isVisible?: boolean;
  displayCategoryKey?: string;
  proteinFamilyKey?: string;
  premiumKey?: string;
  extraFeeHalala?: number;
  ruleTags?: string[];
  selectionType?: string;
  availableFor?: string[];
  availableForSubscription?: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export type MenuOptionsResponse = PaginatedResponse<MenuOption>;

export interface MenuOptionDetailResponse {
  status: boolean;
  data: MenuOptionDetail;
}

export interface MenuOptionDetail extends MenuOption {
  contractVersion?: "dashboard_option_detail.v3" | string;
  option?: MenuOption;
  optionGroup?: MenuOptionGroup | null;
}

export interface CreateMenuOptionPayload {
  groupId: string;
  key?: string;
  name: LocalizedText;
  description?: LocalizedText;
  imageUrl?: string;
  extraPriceHalala?: number;
  extraWeightUnitGrams?: number;
  extraWeightPriceHalala?: number;
  isActive?: boolean;
  isAvailable?: boolean;
  isVisible?: boolean;
  displayCategoryKey?: string;
  proteinFamilyKey?: string;
  premiumKey?: string;
  extraFeeHalala?: number;
  ruleTags?: string[];
  selectionType?: string;
  availableFor?: string[];
  availableForSubscription?: boolean;
  sortOrder?: number;
}

export interface UpdateMenuOptionPayload {
  groupId?: string;
  name?: LocalizedText;
  description?: LocalizedText;
  imageUrl?: string;
  extraPriceHalala?: number;
  extraWeightUnitGrams?: number;
  extraWeightPriceHalala?: number;
  isActive?: boolean;
  isAvailable?: boolean;
  isVisible?: boolean;
  displayCategoryKey?: string;
  proteinFamilyKey?: string;
  premiumKey?: string;
  extraFeeHalala?: number;
  ruleTags?: string[];
  selectionType?: string;
  availableFor?: string[];
  availableForSubscription?: boolean;
  sortOrder?: number;
}

// ── §10 Product Option Group Rules ──

export interface ProductGroupRule {
  groupId: string;
  minSelections: number;
  maxSelections: number | null;
  isRequired: boolean;
  sortOrder: number;
  isActive?: boolean;
  isAvailable?: boolean;
  isVisible?: boolean;
}

export interface MenuProductLinkedOption extends ProductGroupOptionOverride {
  id?: string;
  option?: MenuOption;
}

export interface MenuProductLinkedGroup extends ProductGroupRule {
  id?: string;
  group?: MenuOptionGroup;
  options?: MenuProductLinkedOption[];
}

export interface LinkGroupsPayload {
  groups: ProductGroupRule[];
}

export interface UpdateSelectionRulesPayload {
  minSelections?: number;
  maxSelections?: number | null;
  isRequired?: boolean;
  sortOrder?: number;
}

// ── §11 Product Group Option Overrides ──

export interface ProductGroupOptionOverride {
  optionId: string;
  extraPriceHalala?: number;
  extraWeightUnitGrams?: number;
  extraWeightPriceHalala?: number;
  isActive?: boolean;
  isAvailable?: boolean;
  isVisible?: boolean;
  sortOrder?: number;
}

export interface LinkOptionsPayload {
  options: ProductGroupOptionOverride[];
}

export interface UpdateOptionOverridePayload {
  extraPriceHalala?: number;
  extraWeightUnitGrams?: number;
  extraWeightPriceHalala?: number;
  isAvailable?: boolean;
  sortOrder?: number;
}

// ── §13 Menu Validation ──

export interface MenuValidationError {
  code: string;
  message: string;
}

export interface MenuValidationSummary {
  categories: number;
  products: number;
  groups: number;
  options: number;
  activeProducts: number;
}

export interface MenuValidationResult {
  status: boolean;
  ok: boolean;
  errors: MenuValidationError[];
  warnings: MenuValidationError[];
  summary?: MenuValidationSummary;
}

export interface MenuValidationResponse {
  status: boolean;
  data: MenuValidationResult;
}

// ── §14 Menu Publish ──

export interface MenuPublishResult {
  versionId: string;
  status: string;
  publishedAt: string;
}

export interface MenuPublishResponse {
  status: boolean;
  data: MenuPublishResult;
}

// ── §15 Menu Audit Logs ──

export interface MenuAuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  actorId: string;
  createdAt: string;
}

export type MenuAuditLogsResponse = PaginatedResponse<MenuAuditLog>;

// ── Query Params ──

export interface MenuListParams {
  page?: number;
  limit?: number;
  q?: string;
  isActive?: boolean;
  isVisible?: boolean;
  isAvailable?: boolean;
  includeInactive?: boolean;
}

export interface MenuProductListParams extends MenuListParams {
  categoryId?: string;
  pricingModel?: PricingModel;
  itemType?: string;
}

export interface MenuOptionListParams extends MenuListParams {
  groupId?: string;
}

export interface MenuAuditLogParams {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
  entityId?: string;
}

export interface MenuVersion {
  id: string;
  version?: string;
  status?: string;
  notes?: string;
  createdAt?: string;
  publishedAt?: string;
}

export interface MenuVersionListParams extends MenuListParams {
  status?: string;
}

export type MenuVersionsResponse = PaginatedResponse<MenuVersion>;

export interface MenuRollbackResponse {
  status?: boolean;
  ok?: boolean;
  data: {
    success?: boolean;
    restoredVersion?: string;
    backupVersion?: string;
    rollback?: Record<string, unknown>;
  };
}

export interface MenuProductComposerValidation {
  errors: Array<MenuValidationError | string>;
  warnings: Array<MenuValidationError | string>;
}

export interface MenuProductComposer {
  contractVersion: "dashboard_product_composer.v3" | string;
  product: MenuProduct;
  category: MenuCategory | null;
  publishState: {
    isPublished: boolean;
    publishedAt: string | null;
    versionId: string | null;
  };
  availability: {
    isCustomizable?: boolean;
    isActive: boolean;
    isVisible: boolean;
    isAvailable: boolean;
    availableFor: string[];
    branchAvailability: string[];
  };
  pricing: {
    pricingModel: PricingModel;
    priceHalala: number;
    baseUnitGrams: number;
    defaultWeightGrams: number;
    minWeightGrams: number;
    maxWeightGrams: number;
    weightStepGrams: number;
    weightStepPriceHalala?: number | null;
    currency: string;
  };
  ui: NonNullable<MenuProduct["ui"]>;
  linkedOptionGroups: MenuProductLinkedGroup[];
  customization?: {
    isCustomizable?: boolean;
    linkedGroups?: MenuProductLinkedGroup[];
  };
  availableActions?: {
    canAttachGroups?: boolean;
    canDetachGroups?: boolean;
    canEditRules?: boolean;
    canEditOptionOverrides?: boolean;
  };
  validation: MenuProductComposerValidation;
}

export interface MenuProductComposerResponse {
  status: boolean;
  data: MenuProductComposer;
}
