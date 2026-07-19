import api from "@/lib/apis";
import type {
  MealPlannerCardActionResponseV2,
  MealPlannerCreatePayloadV2,
  MealPlannerCatalogV2,
  MealPlannerLifecycleResponseV2,
  MealPlannerPatchPayloadV2,
  MealPlannerPickerParamsV2,
  MealPlannerPickerResponseV2,
  MealPlannerStateResponseV2,
  MealPlannerValidationV2,
} from "@/types/mealPlannerDashboardTypes";

export const MEAL_PLANNER_DASHBOARD_ROUTE = "/api/dashboard/meal-builder";

export async function getMealPlannerDashboardState() {
  const response = await api.get(MEAL_PLANNER_DASHBOARD_ROUTE, {
    params: { lang: "ar" },
  });
  return assertStateResponse(response.data);
}

export async function getMealPlannerCatalog(): Promise<{
  status: true;
  data: MealPlannerCatalogV2;
}> {
  const response = await api.get(`${MEAL_PLANNER_DASHBOARD_ROUTE}/catalog`, {
    params: { lang: "ar" },
  });
  return response.data;
}

export async function getMealPlannerPublished(): Promise<MealPlannerLifecycleResponseV2> {
  const response = await api.get(`${MEAL_PLANNER_DASHBOARD_ROUTE}/published`, {
    params: { lang: "ar" },
  });
  return response.data;
}

export async function getMealPlannerReadiness() {
  const response = await api.get(`${MEAL_PLANNER_DASHBOARD_ROUTE}/readiness`);
  return response.data as { status: true; data: MealPlannerValidationV2 };
}

export async function getMealPlannerProductsPicker(
  params: MealPlannerPickerParamsV2,
  signal?: AbortSignal
): Promise<MealPlannerPickerResponseV2> {
  const response = await api.get(
    `${MEAL_PLANNER_DASHBOARD_ROUTE}/pickers/products`,
    {
      params: cleanParams({ ...params, lang: params.lang ?? "ar" }),
      signal,
    }
  );
  return assertPickerResponse(response.data, "product");
}

export async function getMealPlannerOptionsPicker(
  params: MealPlannerPickerParamsV2,
  signal?: AbortSignal
): Promise<MealPlannerPickerResponseV2> {
  const response = await api.get(
    `${MEAL_PLANNER_DASHBOARD_ROUTE}/pickers/options`,
    {
      params: cleanParams({ ...params, lang: params.lang ?? "ar" }),
      signal,
    }
  );
  return assertPickerResponse(response.data, "option");
}

export async function createMealPlannerCard(
  payload: MealPlannerCreatePayloadV2
): Promise<MealPlannerCardActionResponseV2> {
  const response = await api.post(
    `${MEAL_PLANNER_DASHBOARD_ROUTE}/sections`,
    payload
  );
  return assertCardActionResponse(response.data);
}

export async function updateMealPlannerCard({
  sectionKey,
  patch,
}: {
  sectionKey: string;
  patch: MealPlannerPatchPayloadV2;
}): Promise<MealPlannerCardActionResponseV2> {
  const response = await api.patch(
    `${MEAL_PLANNER_DASHBOARD_ROUTE}/sections/${encodeURIComponent(sectionKey)}`,
    patch
  );
  return assertCardActionResponse(response.data);
}

export async function replaceMealPlannerCardItems({
  sectionKey,
  payload,
}: {
  sectionKey: string;
  payload: { productIds?: string[]; optionIds?: string[] };
}): Promise<MealPlannerCardActionResponseV2> {
  const response = await api.put(
    `${MEAL_PLANNER_DASHBOARD_ROUTE}/sections/${encodeURIComponent(sectionKey)}/items`,
    payload
  );
  return assertCardActionResponse(response.data);
}

export async function deleteMealPlannerCard(
  sectionKey: string
): Promise<MealPlannerCardActionResponseV2> {
  const response = await api.delete(
    `${MEAL_PLANNER_DASHBOARD_ROUTE}/sections/${encodeURIComponent(sectionKey)}`
  );
  return assertCardActionResponse(response.data);
}

export async function validateMealPlannerDraft() {
  const response = await api.post(
    `${MEAL_PLANNER_DASHBOARD_ROUTE}/validate`,
    {}
  );
  return response.data as { status: true; data: MealPlannerValidationV2 };
}

export async function publishMealPlannerDraft(notes?: string) {
  const response = await api.post(`${MEAL_PLANNER_DASHBOARD_ROUTE}/publish`, {
    notes: notes?.trim() || undefined,
  });
  return response.data as MealPlannerLifecycleResponseV2;
}

export async function resetMealPlannerDraft() {
  const response = await api.post(
    `${MEAL_PLANNER_DASHBOARD_ROUTE}/draft/reset`,
    {}
  );
  return response.data as MealPlannerLifecycleResponseV2;
}

function cleanParams(params: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== ""
    )
  );
}

export function assertStateResponse(value: unknown): MealPlannerStateResponseV2 {
  if (!isRecord(value) || value.status !== true || !isRecord(value.data)) {
    throw new Error("Meal Planner dashboard state contract mismatch");
  }
  return value as unknown as MealPlannerStateResponseV2;
}

export function assertPickerResponse(
  value: unknown,
  candidateType: "product" | "option"
): MealPlannerPickerResponseV2 {
  if (!isRecord(value) || value.status !== true || !isRecord(value.data)) {
    throw new Error("Meal Planner picker contract mismatch");
  }
  const data = value.data;
  if (
    !Array.isArray(data.candidates) ||
    (typeof data.candidateType === "string" &&
      data.candidateType !== candidateType)
  ) {
    throw new Error("Meal Planner picker contract mismatch");
  }
  return value as unknown as MealPlannerPickerResponseV2;
}

export function assertCardActionResponse(
  value: unknown
): MealPlannerCardActionResponseV2 {
  if (!isRecord(value) || value.status !== true || !isRecord(value.data)) {
    throw new Error("Meal Planner card action response is invalid");
  }
  const data = value.data;
  const contractVersion = String(data.contractVersion || "");
  if (
    contractVersion !== "dashboard_meal_builder_card_action.v2" ||
    !isRecord(data.draft) ||
    !Array.isArray(data.draft.sections) ||
    !isRecord(data.validation)
  ) {
    throw new Error("Meal Planner card action v2 contract mismatch");
  }
  return value as unknown as MealPlannerCardActionResponseV2;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
