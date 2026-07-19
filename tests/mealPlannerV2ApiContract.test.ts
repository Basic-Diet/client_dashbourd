import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/lib/apis", () => ({ default: apiMock }));

import {
  createMealPlannerCard,
  getMealPlannerOptionsPicker,
  getMealPlannerProductsPicker,
  replaceMealPlannerCardItems,
  updateMealPlannerCard,
} from "../src/utils/fetchMealPlannerDashboard";

beforeEach(() => {
  Object.values(apiMock).forEach((mock) => mock.mockReset());
});

function actionEnvelope(
  contractVersion = "dashboard_meal_builder_card_action.v2"
) {
  return {
    status: true,
    data: {
      contractVersion,
      action: "created",
      sectionKey: "ready_meals",
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
        summary: { errors: 0, warnings: 0 },
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

describe("Meal Planner V2 API contract", () => {
  it("posts a canonical direct-product payload to sections", async () => {
    apiMock.post.mockResolvedValueOnce({ data: actionEnvelope() });
    const payload = {
      cardType: "direct_product" as const,
      key: "sandwiches",
      titleOverride: { ar: "ساندويتشات", en: "Sandwiches" },
      selectionType: "full_meal_product" as const,
      selectedProductIds: ["product-1"],
      visible: true,
    };

    await createMealPlannerCard(payload);

    expect(apiMock.post).toHaveBeenCalledWith(
      "/api/dashboard/meal-builder/sections",
      payload
    );
  });

  it("uses the target section and Arabic language for the product picker", async () => {
    apiMock.get.mockResolvedValueOnce({
      data: {
        status: true,
        data: {
          contractVersion: "dashboard_meal_builder_picker.v1",
          candidateType: "product",
          candidates: [],
        },
      },
    });

    await getMealPlannerProductsPicker({
      targetSectionKey: "ready_meals",
      q: "chocolate",
      includeUnavailable: true,
      unassignedOnly: true,
      page: 1,
      limit: 100,
    });

    expect(apiMock.get).toHaveBeenCalledWith(
      "/api/dashboard/meal-builder/pickers/products",
      {
        params: {
          targetSectionKey: "ready_meals",
          q: "chocolate",
          includeUnavailable: true,
          unassignedOnly: true,
          page: 1,
          limit: 100,
          lang: "ar",
        },
      }
    );
  });

  it("sends the complete Product + Group + Role context to the option picker", async () => {
    apiMock.get.mockResolvedValueOnce({
      data: {
        status: true,
        data: {
          contractVersion: "dashboard_meal_builder_picker.v2",
          candidateType: "option",
          candidates: [],
        },
      },
    });

    await getMealPlannerOptionsPicker({
      productContextId: "product-1",
      sourceGroupId: "group-1",
      optionRole: "protein",
      familyKey: "beef",
      unassignedOnly: true,
    });

    expect(apiMock.get).toHaveBeenCalledWith(
      "/api/dashboard/meal-builder/pickers/options",
      {
        params: {
          productContextId: "product-1",
          sourceGroupId: "group-1",
          optionRole: "protein",
          familyKey: "beef",
          unassignedOnly: true,
          lang: "ar",
        },
      }
    );
  });

  it("replaces direct products and options through PUT /items", async () => {
    apiMock.put.mockResolvedValue({ data: actionEnvelope() });

    await replaceMealPlannerCardItems({
      sectionKey: "ready meals",
      payload: { productIds: ["product-1", "product-2"] },
    });
    await replaceMealPlannerCardItems({
      sectionKey: "beef",
      payload: { optionIds: ["option-1"] },
    });

    expect(apiMock.put).toHaveBeenNthCalledWith(
      1,
      "/api/dashboard/meal-builder/sections/ready%20meals/items",
      { productIds: ["product-1", "product-2"] }
    );
    expect(apiMock.put).toHaveBeenNthCalledWith(
      2,
      "/api/dashboard/meal-builder/sections/beef/items",
      { optionIds: ["option-1"] }
    );
  });

  it("patches a renamed option card without allowing card type conversion", async () => {
    apiMock.patch.mockResolvedValueOnce({ data: actionEnvelope() });

    await updateMealPlannerCard({
      sectionKey: "old_beef",
      patch: {
        cardType: "option_family",
        key: "beef",
        selectionType: "standard_meal",
        optionRole: "protein",
        productContextId: "product-1",
        sourceGroupId: "group-1",
        selectedOptionIds: ["option-1"],
        visible: true,
      },
    });

    expect(apiMock.patch).toHaveBeenCalledWith(
      "/api/dashboard/meal-builder/sections/old_beef",
      expect.objectContaining({
        cardType: "option_family",
        key: "beef",
        selectionType: "standard_meal",
      })
    );
  });

  it.each([
    "dashboard_meal_builder_card_action.v1",
    "dashboard_meal_builder_card_action.v2",
  ])("accepts the supported %s action envelope", async (contractVersion) => {
    apiMock.post.mockResolvedValueOnce({
      data: actionEnvelope(contractVersion),
    });

    const response = await createMealPlannerCard({
      cardType: "direct_product",
      key: "ready_meals",
      titleOverride: { ar: "وجبات", en: "Meals" },
      selectionType: "full_meal_product",
      selectedProductIds: ["product-1"],
      visible: true,
    });

    expect(response.data.contractVersion).toBe(contractVersion);
  });

  it("rejects unsupported or incomplete action envelopes", async () => {
    apiMock.post.mockResolvedValueOnce({
      data: actionEnvelope("dashboard_meal_builder_card_action.v0"),
    });

    await expect(
      createMealPlannerCard({
        cardType: "direct_product",
        key: "ready_meals",
        titleOverride: { ar: "وجبات", en: "Meals" },
        selectionType: "full_meal_product",
        selectedProductIds: ["product-1"],
        visible: true,
      })
    ).rejects.toThrow("card action contract mismatch");
  });
});
