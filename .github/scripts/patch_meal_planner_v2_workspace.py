from pathlib import Path

path = Path("src/components/pages/menu/meal-builder/MealPlannerWorkspaceV2.tsx")
content = path.read_text(encoding="utf-8")


def replace_once(old: str, new: str) -> None:
    global content
    count = content.count(old)
    if count != 1:
        raise RuntimeError(f"expected one match, found {count}: {old[:100]!r}")
    content = content.replace(old, new, 1)


replace_once(
    '''  getMealPlannerDashboardState,
  publishMealPlannerDraft,
  resetMealPlannerDraft,
  updateMealPlannerCard,''',
    '''  getMealPlannerDashboardState,
  getMealPlannerReadiness,
  publishMealPlannerDraft,
  replaceMealPlannerCardItems,
  resetMealPlannerDraft,
  updateMealPlannerCard,''',
)
replace_once(
    '''import { MealPlannerCardGridV2 } from "./MealPlannerCardGridV2";''',
    '''import { MealPlannerCardGridV2 } from "./MealPlannerCardGridV2";
import { MealPlannerItemsDialogV2 } from "./MealPlannerItemsDialogV2";''',
)
replace_once(
    '''  const [deleteTarget, setDeleteTarget] = useState<MealPlannerSectionV2 | null>(null);''',
    '''  const [deleteTarget, setDeleteTarget] = useState<MealPlannerSectionV2 | null>(null);
  const [manageTarget, setManageTarget] = useState<MealPlannerSectionV2 | null>(null);''',
)
replace_once(
    '''  const stateQuery = useQuery({
    queryKey: STATE_KEY,
    queryFn: getMealPlannerDashboardState,
    staleTime: 20_000,
  });''',
    '''  const stateQuery = useQuery({
    queryKey: STATE_KEY,
    queryFn: getMealPlannerDashboardState,
    staleTime: 20_000,
  });
  const readinessQuery = useQuery({
    queryKey: ["dashboard.meal-planner.v2.readiness"],
    queryFn: getMealPlannerReadiness,
    staleTime: 20_000,
  });''',
)
replace_once(
    '''  const deleteMutation = useMutation({ mutationFn: deleteMealPlannerCard });''',
    '''  const deleteMutation = useMutation({ mutationFn: deleteMealPlannerCard });
  const replaceItemsMutation = useMutation({
    mutationFn: replaceMealPlannerCardItems,
  });''',
)
replace_once(
    '''    cardMutation.isPending ||
    deleteMutation.isPending ||''',
    '''    cardMutation.isPending ||
    deleteMutation.isPending ||
    replaceItemsMutation.isPending ||''',
)
replace_once(
    '''  const dirty = editor !== null;''',
    '''  const dirty = editor !== null || manageTarget !== null;''',
)
replace_once(
    '''    await stateQuery.refetch();
    toast.success("تم تحديث بيانات منشئ الوجبات");''',
    '''    await Promise.all([stateQuery.refetch(), readinessQuery.refetch()]);
    toast.success("تم تحديث بيانات منشئ الوجبات");''',
)
replace_once(
    '''  async function toggleVisibility(section: MealPlannerSectionV2) {''',
    '''  async function saveItems(ids: string[]) {
    if (!manageTarget) return;
    const cardType = normalizeCardType(manageTarget);
    try {
      const response = await replaceItemsMutation.mutateAsync({
        sectionKey: manageTarget.key,
        payload:
          cardType === "direct_product"
            ? { productIds: ids }
            : { optionIds: ids },
      });
      applyAction(response);
      setManageTarget(null);
      await readinessQuery.refetch();
      toast.success("تم حفظ عناصر الكارت");
    } catch (error) {
      toast.error(mealPlannerErrorMessage(error, "تعذر حفظ عناصر الكارت"));
      throw error;
    }
  }

  async function toggleVisibility(section: MealPlannerSectionV2) {''',
)
replace_once(
    '''      await stateQuery.refetch();
      toast.success("تم نشر تغييرات منشئ الوجبات بنجاح");''',
    '''      await Promise.all([stateQuery.refetch(), readinessQuery.refetch()]);
      toast.success("تم نشر تغييرات منشئ الوجبات بنجاح");''',
)
replace_once(
    '''      setEditor(null);
      await stateQuery.refetch();
      toast.success("تم إلغاء التغييرات غير المنشورة");''',
    '''      setEditor(null);
      setManageTarget(null);
      await Promise.all([stateQuery.refetch(), readinessQuery.refetch()]);
      toast.success("تم إلغاء التغييرات غير المنشورة");''',
)
replace_once(
    '''        validation={validation}
        pending={pending}''',
    '''        validation={validation}
        readiness={readinessQuery.data?.data ?? null}
        pending={pending}''',
)
replace_once(
    '''          onEdit={setEditor}
          onToggleVisibility={(section) => void toggleVisibility(section)}''',
    '''          onEdit={setEditor}
          onManageItems={setManageTarget}
          onToggleVisibility={(section) => void toggleVisibility(section)}''',
)
replace_once(
    '''      {editor ? (
        <MealPlannerCardDialogV2''',
    '''      {manageTarget ? (
        <MealPlannerItemsDialogV2
          key={`items-${manageTarget.key}`}
          section={manageTarget}
          pending={replaceItemsMutation.isPending}
          onClose={() => setManageTarget(null)}
          onSave={saveItems}
          onDeleteCard={() => {
            setManageTarget(null);
            setDeleteTarget(manageTarget);
          }}
        />
      ) : null}

      {editor ? (
        <MealPlannerCardDialogV2''',
)
replace_once(
    '''  validation,
  pending,''',
    '''  validation,
  readiness,
  pending,''',
)
replace_once(
    '''  validation: MealPlannerValidationV2 | null;
  pending: boolean;''',
    '''  validation: MealPlannerValidationV2 | null;
  readiness: MealPlannerValidationV2 | null;
  pending: boolean;''',
)
replace_once(
    '''        <Metric
          title="حالة الفحص"
          value={
            validation?.ready
              ? "جاهزة للنشر"
              : validation
                ? `${validation.errors.length} أخطاء`
                : "لم تُفحص بعد"
          }
        />''',
    '''        <Metric
          title="حالة الجاهزية"
          value={
            readiness?.ready
              ? "جاهز"
              : readiness
                ? "يحتاج إصلاح"
                : validation?.ready
                  ? "جاهزة للنشر"
                  : "غير منشور"
          }
        />''',
)

path.write_text(content, encoding="utf-8")
