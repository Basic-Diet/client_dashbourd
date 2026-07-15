export type PremiumUpgradeKind = "product" | "option";
export type PremiumUpgradeStatus =
  | "active"
  | "hidden"
  | "disabled"
  | "archived";
export type PremiumUpgradeHealth = "ready" | "broken";
export type PremiumUpgradeFilterValue = "all" | string;

export type PremiumUpgradeLocalizedName = {
  ar?: string | null;
  en?: string | null;
};

export type PremiumUpgradeConfigDto = {
  id: string;
  key?: string | null;
  name?: string | PremiumUpgradeLocalizedName | null;
  kind?: PremiumUpgradeKind | string | null;
  sourceId?: string | null;
  priceHalala?: number | null;
  priceSar?: number | null;
  currency?: "SAR" | string | null;
  status?: PremiumUpgradeStatus | string | null;
  health?:
    | PremiumUpgradeHealth
    | string
    | {
        status?: PremiumUpgradeHealth | string | null;
        code?: string | null;
        message?: string | null;
      }
    | null;
  issueCode?: string | null;
  sortOrder?: number | null;

  revision?: number;
  source?: unknown;
  pricing?: unknown;
  display?: unknown;
  behavior?: unknown;
  compatibility?: unknown;
  repair?: {
    currentPremiumKey?: string | null;
    missingSourceId?: string | null;
    expectedKind?: PremiumUpgradeKind | string | null;
    compatibleReplacementCount?: number | null;
    compatibleSourceSuggestions?: PremiumUpgradeSourceDto[];
    canRelink?: boolean;
    blockingIssueCode?: string | null;
  } | null;

  sourceType?: "menu_option" | "menu_product" | string;
  sourceProductId?: string | null;
  sourceGroupId?: string | null;
  sourceGroupKey?: string | null;
  sourceName?: PremiumUpgradeLocalizedName | null;
  sourceKey?: string | null;
  premiumKey?: string | null;
  upgradeDeltaHalala?: number | null;
  upgradeDeltaSar?: number | null;
  isEnabled?: boolean;
  isVisible?: boolean;
  displayGroup?: { key?: string | null; id?: string | null } | null;
  validation?: {
    valid?: boolean;
    errors?: string[];
    warnings?: string[];
  } | null;
  sourceStatus?: {
    exists?: boolean;
    active?: boolean;
    visible?: boolean;
    available?: boolean;
    published?: boolean;
    subscriptionEnabled?: boolean;
    relationValid?: boolean;
  } | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  archivedAt?: string | null;
};

export type PremiumUpgradeSourceDto = {
  id: string;
  sourceId: string;
  kind: PremiumUpgradeKind | string;
  sourceProductId?: string | null;
  sourceGroupId?: string | null;
  sourceProductKey?: string | null;
  sourceGroupKey?: string | null;
  relationId: string;
  key?: string | null;
  name?: string | PremiumUpgradeLocalizedName | null;
  imageUrl?: string | null;
  group?: string | PremiumUpgradeLocalizedName | { key?: string | null; name?: string | PremiumUpgradeLocalizedName | null } | null;
  product?: string | PremiumUpgradeLocalizedName | { key?: string | null; name?: string | PremiumUpgradeLocalizedName | null } | null;
  supportedSelectionType?: "premium_meal" | "premium_large_salad" | string | null;
  premiumCompatibilityKeys?: string[];
  compatibilityKeys?: string[];
  selectable?: boolean;
  linked?: boolean;
  linkedConfigId?: string | null;
  conflictReason?: string | null;
};

export type PremiumUpgradeListResponse<T> = {
  data: T[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    pages?: number;
  };
  status?: boolean;
};

export type PremiumUpgradeSingleResponse<T> = {
  data: T;
  status?: boolean;
};

export type PremiumUpgradeReadinessResponse = {
  isReady: boolean;
  diagnostics: {
    totalConfigs?: number;
    activeConfigs?: number;
    missingSources?: number;
    invalidRelations?: number;
    duplicateKeys?: number;
    priceMismatches?: unknown[];
    legacyChecks?: {
      builderProteinsCount?: number;
      fallbackActive?: boolean;
    };
    configState?: {
      isEmpty?: boolean;
      legacyFallbackActive?: boolean;
      configsAuthoritative?: boolean;
      backfillStatus?: string;
      partialConfigRisk?: boolean;
      knownKeys?: string[];
      configuredKnownKeys?: string[];
      missingConfigKeys?: string[];
    };
    knownSources?: Array<{
      premiumKey?: string;
      resolvable?: boolean;
      sourceType?: string;
      sourceId?: string;
      sourceProductId?: string | null;
      sourceGroupId?: string | null;
      issues?: string[];
    }>;
    unresolvedSourceKeys?: string[];
  };
  status?: boolean;
};

export type PremiumUpgradeListFilters = {
  q: string;
  kind: PremiumUpgradeFilterValue;
  status: PremiumUpgradeFilterValue;
  health: PremiumUpgradeFilterValue;
  page: number;
  limit: number;
};

export type PremiumUpgradeSourceFilters = {
  q: string;
  kind: PremiumUpgradeFilterValue;
  status: "active" | "all";
  page: number;
  limit: number;
  excludeConfigId?: string;
};

export type PremiumUpgradeCreatePayload = {
  kind: PremiumUpgradeKind;
  sourceId: string;
  relationId?: string;
  upgradeDeltaHalala: number;
  currency: "SAR";
  isActive: boolean;
  isVisible: boolean;
  sortOrder: number;
};

export type PremiumUpgradeUpdatePayload = {
  expectedRevision?: number;
  kind?: PremiumUpgradeKind;
  sourceId?: string;
  relationId?: string;
  upgradeDeltaHalala?: number;
  currency?: "SAR";
  isActive?: boolean;
  isVisible?: boolean;
  sortOrder?: number;
};

export type PremiumUpgradeArchivePayload = {
  expectedRevision?: number;
  reason: string;
};
