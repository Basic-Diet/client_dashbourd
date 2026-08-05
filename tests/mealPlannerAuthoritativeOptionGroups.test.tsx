// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/lib/apis", () => ({ default: apiMock }));

vi.mock(
  "../src/components/pages/menu/meal-builder/MealPlannerCandidatePickerV2",
  () => ({
    MealPlannerCandidatePickerV2: ({
      type,
      targetSectionKey,
      seedCandidates = [],
      selectedIds,
      productContextId,
      sourceGroupId,
      optionRole,
      familyKey,
      onChange,
    }: {
      type: "product" | "option";
      targetSectionKey?: string;
      seedCandidates?: Array<{
        id: string;
        optionId?: string;
        productId?: string;
        name?: { ar?: string; en?: string };
        label?: string;
        assignable?: boolean;
      }>;
      selectedIds: string[];
      productContextId?: string;
      sourceGroupId?: string;
      optionRole?: "protein" | "carbs";
      familyKey?: string;
      onChange: (ids: string[]) => void;
    }) => (
      <section aria-label={type === "option" ? "خيارات المجموعة" : "المنتجات"}>
        <output data-testid="picker-context">
          {JSON.stringify({
            targetSectionKey: targetSectionKey || null,
            productContextId: productContextId || null,
            sourceGroupId: sourceGroupId || null,
            optionRole: optionRole || null,
            familyKey: familyKey || null,
          })}
        </output>
        {seedCandidates.map((candidate) => {
          const id = String(
            candidate.optionId || candidate.productId || candidate.id
          );
          const selected = selectedIds.includes(id);
          return (
            <button
              key={id}
              type="button"
              disabled={!selected && candidate.assignable !== true}
              aria-pressed={selected}
              onClick={() =>
                onChange(
                  selected
                    ? selectedIds.filter((item) => item !== id)
                    : [...selectedIds, id]
                )
              }
            >
              {candidate.name?.ar || candidate.label || id}
            </button>
          );
        })}
      </section>
    ),
  })
);

import { MealPlannerBuilderGroupSelector } from "../src/components/pages/menu/meal-builder/MealPlannerBuilderGroupSelector";
import { MealPlannerCardDialogV2 } from "../src/components/pages/menu/meal-builder/MealPlannerCardDialogV2";
import {
  authoritativeBuilderGroups,
  findBuilderGroup,
} from "../src/components/pages/menu/meal-builder/mealPlannerV2Utils";
import type {
  MealPlannerBuilderGroup,
  MealPlannerCatalogV2,
  MealPlannerCreatePayloadV2,
} from "../src/types/mealPlannerDashboardTypes";
import {
  addMealPlannerOptions,
  assertCatalogResponse,
  removeMealPlannerOption,
} from "../src/utils/fetchMealPlannerDashboard";

afterEach(() => cleanup());

beforeEach(() => {
  Object.values(apiMock).forEach((mock) => mock.mockReset());
});

const fishOption = builderOption({
  id: "option-fish",
  key: "fish_fillet",
  nameAr: "فيليه سمك",
  familyKey: "fish",
  assignable: true,
});
const beefOption = builderOption({
  id: "option-beef",
  key: "beef_strips",
  nameAr: "شرائح لحم",
  familyKey: "beef",
  assignable: true,
});
const unavailableOption = builderOption({
  id: "option-busy",
  key: "tuna",
  nameAr: "تونة مستخدمة",
  familyKey: "fish",
  assignable: false,
});

const proteinGroup = builderGroup({
  id: "builder-basic-proteins",
  productContextId: "product-basic",
  sourceGroupId: "group-proteins",
  productName: "وجبة بيسك",
  groupName: "البروتين",
  optionRole: "protein",
  families: ["fish", "beef"],
  options: [fishOption, beefOption, unavailableOption],
  eligible: true,
  rules: { minSelections: 1, maxSelections: 2, isRequired: true },
});

const carbsGroup = builderGroup({
  id: "builder-basic-carbs",
  productContextId: "product-basic",
  sourceGroupId: "group-carbs",
  productName: "وجبة بيسك",
  groupName: "النشويات",
  optionRole: "carbs",
  families: [],
  options: [
    builderOption({
      id: "option-rice",
      key: "white_rice",
      nameAr: "رز أبيض",
      familyKey: "",
      assignable: true,
    }),
  ],
  eligible: true,
  rules: { minSelections: 0, maxSelections: 2, isRequired: false },
});

const ineligibleGroup = builderGroup({
  id: "builder-disabled",
  productContextId: "product-disabled",
  sourceGroupId: "group-disabled",
  productName: "وجبة غير جاهزة",
  groupName: "البروتين",
  optionRole: "protein",
  families: ["fish"],
  options: [fishOption],
  eligible: false,
  reasonCodes: ["PRODUCT_NOT_READY"],
  rules: { minSelections: 1, maxSelections: 1, isRequired: true },
});

const catalog = authoringCatalog([proteinGroup, carbsGroup, ineligibleGroup]);

describe("authoritative builderGroups helpers", () => {
  it("reads the top-level list and the mirrored authoring list without joining globals", () => {
    expect(authoritativeBuilderGroups(catalog)).toBe(catalog.builderGroups);

    const mirroredOnly: MealPlannerCatalogV2 = {
      authoringContractVersion: "dashboard_meal_builder_authoring.v1",
      authoring: catalog.authoring,
    };
    expect(authoritativeBuilderGroups(mirroredOnly)).toEqual([
      proteinGroup,
      carbsGroup,
      ineligibleGroup,
    ]);
    expect(
      findBuilderGroup(mirroredOnly, "product-basic", "group-proteins")
    ).toBe(proteinGroup);
  });

  it("accepts complete v1 catalogs, preserves unknown fields, and rejects incomplete catalogs", () => {
    const response = {
      status: true as const,
      data: {
        ...catalog,
        futureBackendField: { enabled: true },
      },
    };

    expect(assertCatalogResponse(response)).toBe(response);
    expect(assertCatalogResponse(response).data.futureBackendField).toEqual({
      enabled: true,
    });

    expect(() =>
      assertCatalogResponse({
        status: true,
        data: {
          ...catalog,
          authoring: { ...catalog.authoring, complete: false },
        },
      })
    ).toThrow("catalog is incomplete");

    expect(() =>
      assertCatalogResponse({
        status: true,
        data: {
          ...catalog,
          authoringContractVersion: "dashboard_meal_builder_authoring.v0",
          authoring: {
            ...catalog.authoring,
            contractVersion: "dashboard_meal_builder_authoring.v0",
          },
        },
      })
    ).toThrow("version mismatch");
  });
});

describe("MealPlannerBuilderGroupSelector", () => {
  it("renders Product → Group details and disables Backend-ineligible groups", () => {
    render(
      <MealPlannerBuilderGroupSelector
        groups={[proteinGroup, ineligibleGroup]}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText("وجبة بيسك ← البروتين")).toBeInTheDocument();
    expect(screen.getByText(/3 خيارات/)).toBeInTheDocument();
    expect(screen.getByText(/2 قابلة للاختيار/)).toBeInTheDocument();

    const disabled = screen.getByRole("button", {
      name: /وجبة غير جاهزة ← البروتين/,
    });
    expect(disabled).toBeDisabled();
    expect(screen.getByText("المنتج غير جاهز للاشتراكات")).toBeInTheDocument();
  });
});

describe("authoritative option-family create dialog", () => {
  it("renders nested Options immediately and submits Product + Group + rules from the selected builderGroup", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async (payload: MealPlannerCreatePayloadV2) => {
      void payload;
    });

    render(
      <MealPlannerCardDialogV2
        catalog={catalog}
        pending={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    await user.click(
      screen.getByRole("button", { name: /خيارات وجبة مركبة/ })
    );
    await user.click(
      screen.getByRole("button", { name: /وجبة بيسك ← البروتين/ })
    );

    expect(screen.getByRole("button", { name: "فيليه سمك" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "شرائح لحم" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "تونة مستخدمة" })
    ).toBeDisabled();
    expect(screen.getByTestId("picker-context")).toHaveTextContent(
      '"productContextId":"product-basic"'
    );
    expect(screen.getByTestId("picker-context")).toHaveTextContent(
      '"sourceGroupId":"group-proteins"'
    );

    await user.type(screen.getByLabelText("الاسم العربي"), "سمك");
    await user.type(screen.getByLabelText("الاسم الإنجليزي"), "Fish");
    await user.click(screen.getByRole("button", { name: "فيليه سمك" }));
    await user.click(screen.getByRole("button", { name: "إنشاء الكارت" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        cardType: "option_family",
        selectionType: "standard_meal",
        optionRole: "protein",
        productContextId: "product-basic",
        sourceGroupId: "group-proteins",
        selectedOptionIds: ["option-fish"],
        required: true,
        minSelections: 1,
        maxSelections: 2,
        multiSelect: true,
      })
    );
  });

  it("filters presentation by the Backend familyKey and does not require a family for carbs", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <MealPlannerCardDialogV2
        catalog={catalog}
        pending={false}
        onClose={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
      />
    );

    await user.click(
      screen.getByRole("button", { name: /خيارات وجبة مركبة/ })
    );
    await user.click(
      screen.getByRole("button", { name: /وجبة بيسك ← البروتين/ })
    );
    await user.click(screen.getByRole("button", { name: "سمك" }));

    expect(screen.getByRole("button", { name: "فيليه سمك" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "شرائح لحم" })).not.toBeInTheDocument();
    expect(screen.getByTestId("picker-context")).toHaveTextContent(
      '"familyKey":"fish"'
    );

    unmount();

    render(
      <MealPlannerCardDialogV2
        catalog={authoringCatalog([carbsGroup])}
        cardContract={{
          dynamicCardTypes: [
            { cardType: "option_family", allowedOptionRoles: ["carbs"] },
          ],
        }}
        pending={false}
        onClose={vi.fn()}
        onSubmit={vi.fn(async () => undefined)}
      />
    );
    await user.click(
      screen.getByRole("button", { name: /وجبة بيسك ← النشويات/ })
    );

    expect(
      screen.queryByRole("group", { name: "عائلة البروتين" })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "رز أبيض" })).toBeEnabled();
  });
});

describe("incremental option lifecycle API", () => {
  it("posts optionIds for incremental add and encodes option removal", async () => {
    apiMock.post.mockResolvedValueOnce({ data: actionEnvelope("options_added") });
    apiMock.delete.mockResolvedValueOnce({ data: actionEnvelope("option_removed") });

    await addMealPlannerOptions({
      sectionKey: "fish choices",
      optionIds: ["option-fish", "option-tuna"],
    });
    await removeMealPlannerOption({
      sectionKey: "fish choices",
      optionId: "option/tuna",
    });

    expect(apiMock.post).toHaveBeenCalledWith(
      "/api/dashboard/meal-builder/sections/fish%20choices/options",
      { optionIds: ["option-fish", "option-tuna"] }
    );
    expect(apiMock.delete).toHaveBeenCalledWith(
      "/api/dashboard/meal-builder/sections/fish%20choices/options/option%2Ftuna"
    );
  });
});

function builderOption({
  id,
  key,
  nameAr,
  familyKey,
  assignable,
}: {
  id: string;
  key: string;
  nameAr: string;
  familyKey: string;
  assignable: boolean;
}) {
  return {
    id,
    _id: id,
    optionId: id,
    type: "option" as const,
    key,
    name: { ar: nameAr, en: key },
    familyKey,
    proteinFamilyKey: familyKey,
    displayCategoryKey: familyKey,
    selectionType: "standard_meal" as const,
    isPremium: false,
    linked: true,
    relationExists: true,
    assignable,
    eligible: true,
    relationStatus: {
      exists: true,
      active: true,
      visible: true,
      available: true,
      effective: true,
    },
    effectiveStatus: {
      active: true,
      visible: true,
      available: true,
      customerReady: true,
    },
  };
}

function builderGroup({
  id,
  productContextId,
  sourceGroupId,
  productName,
  groupName,
  optionRole,
  families,
  options,
  eligible,
  reasonCodes = [],
  rules,
}: {
  id: string;
  productContextId: string;
  sourceGroupId: string;
  productName: string;
  groupName: string;
  optionRole: "protein" | "carbs";
  families: string[];
  options: ReturnType<typeof builderOption>[];
  eligible: boolean;
  reasonCodes?: string[];
  rules: {
    minSelections: number;
    maxSelections: number | null;
    isRequired: boolean;
  };
}): MealPlannerBuilderGroup {
  return {
    id,
    cardType: "option_family",
    selectionType: "standard_meal",
    productContextId,
    sourceGroupId,
    optionRole,
    product: {
      id: productContextId,
      key: productContextId,
      name: { ar: productName, en: productName },
      status: { customerReady: eligible },
    },
    group: {
      id: sourceGroupId,
      _id: sourceGroupId,
      key: sourceGroupId,
      name: { ar: groupName, en: groupName },
      status: { customerReady: eligible },
    },
    rules,
    families,
    options,
    optionCount: options.length,
    assignableOptionCount: options.filter((option) => option.assignable).length,
    compatible: true,
    eligible,
    reasonCodes,
    sortOrder: 10,
  };
}

function authoringCatalog(
  groups: MealPlannerBuilderGroup[]
): MealPlannerCatalogV2 {
  return {
    authoringContractVersion: "dashboard_meal_builder_authoring.v1",
    builderGroups: groups,
    authoring: {
      contractVersion: "dashboard_meal_builder_authoring.v1",
      source: "product_option_group_relations",
      canonicalSelectionType: "standard_meal",
      cardType: "option_family",
      complete: true,
      builderGroups: groups,
      counts: {
        builderGroups: groups.length,
        eligibleBuilderGroups: groups.filter((group) => group.eligible).length,
        builderOptions: groups.reduce(
          (total, group) => total + group.options.length,
          0
        ),
        assignableBuilderOptions: groups.reduce(
          (total, group) => total + group.assignableOptionCount,
          0
        ),
      },
    },
    products: [],
    optionGroups: [],
    options: [],
  };
}

function actionEnvelope(action: string) {
  return {
    status: true,
    data: {
      contractVersion: "dashboard_meal_builder_card_action.v2",
      action,
      sectionKey: "fish_options",
      previousSectionKey: null,
      itemId: null,
      section: null,
      draft: { sections: [] },
      validation: {
        status: "ok",
        ready: true,
        errors: [],
        warnings: [],
        checks: [],
      },
      summary: {
        sectionCount: 0,
        selectedProductCount: 0,
        selectedOptionCount: 0,
        ready: true,
        errorCount: 0,
        warningCount: 0,
      },
    },
  };
}
