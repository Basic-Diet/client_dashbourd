from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected one match, found {count}: {old[:140]!r}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


picker = Path("src/components/pages/menu/meal-builder/MealPlannerCandidatePickerV2.tsx")
replace_once(
    picker,
    '''  const fetchedCandidates = useMemo(
    () =>
      query.data?.pages.flatMap((page) => page.data.candidates) ?? [],
    [query.data?.pages]
  );
  const candidates = useMemo(''',
    '''  const fetchedCandidates = useMemo(
    () =>
      query.data?.pages.flatMap((page) => page.data.candidates) ?? [],
    [query.data?.pages]
  );

  useEffect(() => {
    if (!query.data || !selectedIds.length) return;
    const fetchedById = new Map(
      fetchedCandidates.map((candidate) => [candidateId(candidate), candidate])
    );
    const reconciled = selectedIds.filter((id) => {
      const candidate = fetchedById.get(id);
      if (!candidate) return true;
      return candidate.selected === true || candidate.assignable === true;
    });
    if (
      reconciled.length !== selectedIds.length ||
      reconciled.some((id, index) => id !== selectedIds[index])
    ) {
      onChange(reconciled);
    }
  }, [fetchedCandidates, onChange, query.data, selectedIds]);

  const candidates = useMemo(''',
)
replace_once(
    picker,
    '''        ? { ...candidate, selected: true, assignable: true }
        : {''',
    '''        ? { ...candidate, selected: true }
        : {''',
)

api = Path("src/utils/fetchMealPlannerDashboard.ts")
replace_once(
    api,
    '''  const data = value.data;
  const groups = Array.isArray(data.builderGroups)
    ? data.builderGroups
    : isRecord(data.authoring) && Array.isArray(data.authoring.builderGroups)
      ? data.authoring.builderGroups
      : null;
  if (groups === null) {
    throw new Error("Meal Planner authoring catalog is missing builderGroups");
  }
  return value as unknown as { status: true; data: MealPlannerCatalogV2 };''',
    '''  const data = value.data;
  const authoring = isRecord(data.authoring) ? data.authoring : null;
  const contractVersion = String(
    data.authoringContractVersion || authoring?.contractVersion || ""
  );
  const groups = Array.isArray(data.builderGroups)
    ? data.builderGroups
    : authoring && Array.isArray(authoring.builderGroups)
      ? authoring.builderGroups
      : null;
  if (contractVersion !== "dashboard_meal_builder_authoring.v1") {
    throw new Error("Meal Planner authoring catalog version mismatch");
  }
  if (!authoring || authoring.complete !== true) {
    throw new Error("Meal Planner authoring catalog is incomplete");
  }
  if (groups === null) {
    throw new Error("Meal Planner authoring catalog is missing builderGroups");
  }
  return value as unknown as { status: true; data: MealPlannerCatalogV2 };''',
)

utils = Path("src/components/pages/menu/meal-builder/mealPlannerV2Utils.ts")
replace_once(
    utils,
    '''  MEAL_BUILDER_OPTION_NOT_FOUND: "أحد الخيارات غير موجود",
  MEAL_BUILDER_OPTION_GROUP_NOT_FOUND:''',
    '''  MEAL_BUILDER_OPTION_NOT_FOUND: "أحد الخيارات غير موجود",
  MEAL_BUILDER_OPTION_NOT_IN_CARD: "الخيار غير موجود داخل هذا الكارت؛ تم طلب تحديث البيانات",
  MEAL_BUILDER_OPTION_GROUP_NOT_FOUND:''',
)
