from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    content = path.read_text(encoding="utf-8")
    count = content.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected one match, found {count}: {old[:120]!r}")
    path.write_text(content.replace(old, new, 1), encoding="utf-8")


card_dialog = Path("src/components/pages/menu/meal-builder/MealPlannerCardDialogV2.tsx")
replace_once(
    card_dialog,
    '''  const families = catalog.searchFacets?.proteinFamilies || [];

  function requestClose() {''',
    '''  const families = catalog.searchFacets?.proteinFamilies || [];
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

  function requestClose() {''',
)
replace_once(
    card_dialog,
    '''  async function submit() {
    if (pending) return;''',
    '''  async function submit() {
    if (pending || !canSubmit) return;''',
)
replace_once(
    card_dialog,
    '''            <Button type="button" disabled={pending} onClick={() => void submit()}>
              <Check className="size-4" />''',
    '''            <Button
              type="button"
              disabled={pending || !canSubmit}
              onClick={() => void submit()}
            >
              <Check className="size-4" />''',
)

api_file = Path("src/utils/fetchMealPlannerDashboard.ts")
replace_once(
    api_file,
    '''  MealPlannerLifecycleResponseV2,
  MealPlannerPatchPayloadV2,''',
    '''  MealPlannerCatalogV2,
  MealPlannerLifecycleResponseV2,
  MealPlannerPatchPayloadV2,''',
)
replace_once(
    api_file,
    '''export async function getMealPlannerCatalog() {
  const response = await api.get(`${MEAL_PLANNER_DASHBOARD_ROUTE}/catalog`, {
    params: { lang: "ar" },
  });
  return response.data as MealPlannerStateResponseV2;
}''',
    '''export async function getMealPlannerCatalog(): Promise<{
  status: true;
  data: MealPlannerCatalogV2;
}> {
  const response = await api.get(`${MEAL_PLANNER_DASHBOARD_ROUTE}/catalog`, {
    params: { lang: "ar" },
  });
  return response.data;
}''',
)
