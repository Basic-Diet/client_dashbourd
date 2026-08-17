import type {
  MealPlannerBuilderGroup,
  MealPlannerBuilderOption,
  MealPlannerCatalogCandidate,
  MealPlannerCatalogV2,
  MealPlannerEntityStatus,
  MealPlannerOptionRole,
  MealPlannerProductOptionGroup,
} from "@/types/mealPlannerDashboardTypes";

function asId(value: unknown) {
  return String(value ?? "").trim();
}

function optionRoleFromGroupKey(key: unknown): MealPlannerOptionRole | null {
  const normalized = String(key ?? "").trim().toLowerCase();
  if (normalized === "protein" || normalized === "proteins") return "protein";
  if (normalized === "carb" || normalized === "carbs") return "carbs";
  return null;
}

function toBuilderOption(
  row: MealPlannerCatalogCandidate,
  groupId: string
): MealPlannerBuilderOption | null {
  const option = (row.option && typeof row.option === "object"
    ? row.option
    : row) as MealPlannerCatalogCandidate;
  const id = asId(option.id || option._id || option.optionId);
  if (!id) return null;
  const relationStatus =
    row.relationStatus && typeof row.relationStatus === "object"
      ? row.relationStatus
      : undefined;
  const optionStatus =
    option.status && typeof option.status === "object" ? option.status : undefined;
  const assignable =
    relationStatus?.effective !== false &&
    optionStatus?.customerReady !== false;

  return {
    ...option,
    id,
    _id: asId(option._id || id),
    optionId: id,
    groupId,
    type: "option",
    key: String(option.key || id),
    name: {
      ar: String(option.name?.ar || option.labelAr || option.label || option.key || ""),
      en: String(option.name?.en || option.labelEn || option.label || option.key || ""),
    },
    familyKey: String(option.proteinFamilyKey || option.displayCategoryKey || ""),
    proteinFamilyKey: String(option.proteinFamilyKey || ""),
    displayCategoryKey: String(option.displayCategoryKey || ""),
    selectionType: "standard_meal",
    isPremium: option.isPremium === true,
    linked: true,
    relationExists: true,
    assignable,
    eligible: assignable,
    relationStatus: relationStatus || {},
    effectiveStatus: (optionStatus || {}) as MealPlannerEntityStatus,
  };
}

function deriveFromProductRelations(catalog: MealPlannerCatalogV2) {
  const groups: MealPlannerBuilderGroup[] = [];
  for (const product of catalog.products || []) {
    const productId = asId(product.id || product._id || product.productId);
    if (!productId) continue;

    for (const node of product.optionGroups || []) {
      const relationNode = node as MealPlannerProductOptionGroup & {
        relation?: Record<string, unknown>;
        groupStatus?: Record<string, unknown>;
        rules?: {
          minSelections?: number;
          maxSelections?: number | null;
          isRequired?: boolean;
        };
        sortOrder?: number;
      };
      const group = relationNode.group || relationNode;
      const sourceGroupId = asId(group.id || group._id);
      const role = optionRoleFromGroupKey(group.key);
      if (!sourceGroupId || !role) continue;

      const options = (relationNode.options || [])
        .map((option) => toBuilderOption(option, sourceGroupId))
        .filter((option): option is MealPlannerBuilderOption => Boolean(option));
      const relationReady = relationNode.relationStatus?.effective !== false;
      const groupReady = relationNode.effectiveStatus?.customerReady !== false;
      const productReady = product.status?.customerReady !== false;
      const eligible = relationReady && groupReady && productReady;

      groups.push({
        id: asId(relationNode.id || relationNode.relation?.id) || `${productId}:${sourceGroupId}`,
        cardType: "option_family",
        selectionType: "standard_meal",
        productContextId: productId,
        sourceGroupId,
        optionRole: role,
        product: {
          id: productId,
          key: String(product.key || productId),
          name: {
            ar: String(product.name?.ar || product.labelAr || product.label || product.key || ""),
            en: String(product.name?.en || product.labelEn || product.label || product.key || ""),
          },
          status: (product.status || {}) as MealPlannerEntityStatus,
        },
        group: {
          id: sourceGroupId,
          _id: asId(group._id || sourceGroupId),
          key: String(group.key || sourceGroupId),
          name: {
            ar: String(group.name?.ar || group.key || ""),
            en: String(group.name?.en || group.key || ""),
          },
          status: (
            group.status && typeof group.status === "object" ? group.status : {}
          ) as MealPlannerEntityStatus,
        },
        rules: {
          minSelections: Number(relationNode.rules?.minSelections ?? 0),
          maxSelections:
            relationNode.rules?.maxSelections === null
              ? null
              : Number(relationNode.rules?.maxSelections ?? 1),
          isRequired: relationNode.rules?.isRequired === true,
        },
        families: Array.from(
          new Set(
            options
              .map((option) => option.proteinFamilyKey || option.displayCategoryKey)
              .filter(Boolean)
          )
        ),
        options,
        optionCount: options.length,
        assignableOptionCount: options.filter((option) => option.assignable).length,
        compatible: true,
        eligible,
        reasonCodes: eligible ? [] : ["MEAL_BUILDER_RELATION_NOT_READY"],
        sortOrder: Number(relationNode.sortOrder ?? 0),
      });
    }
  }
  return groups;
}

export function resolveMealBuilderAuthoringContexts(
  catalog?: MealPlannerCatalogV2 | null
): MealPlannerBuilderGroup[] {
  if (!catalog) return [];
  const explicit = Array.isArray(catalog.builderGroups)
    ? catalog.builderGroups
    : Array.isArray(catalog.authoring?.builderGroups)
      ? catalog.authoring.builderGroups
      : [];
  const source = explicit.length ? explicit : deriveFromProductRelations(catalog);

  return source
    .filter(
      (group) =>
        Boolean(group.productContextId && group.sourceGroupId) &&
        (group.optionRole === "protein" || group.optionRole === "carbs")
    )
    .sort(
      (left, right) =>
        Number(right.eligible === true) - Number(left.eligible === true) ||
        Number(left.sortOrder || 0) - Number(right.sortOrder || 0)
    );
}
