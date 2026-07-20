from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    content = path.read_text(encoding="utf-8")
    count = content.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected one match, found {count}: {old[:140]!r}")
    path.write_text(content.replace(old, new, 1), encoding="utf-8")


workspace = Path("src/components/pages/menu/meal-builder/MealPlannerWorkspaceV2.tsx")
replace_once(
    workspace,
    '''const STATE_KEY = ["dashboard.meal-planner.v2.state"] as const;
const READINESS_KEY = ["dashboard.meal-planner.v2.readiness"] as const;''',
    '''const STATE_KEY = ["dashboard.meal-planner.v2.state"] as const;
const READINESS_KEY = ["dashboard.meal-planner.v2.readiness"] as const;
const PICKER_KEY = ["dashboard.meal-planner.v2.picker"] as const;''',
)
replace_once(
    workspace,
    '''    void queryClient.invalidateQueries({ queryKey: READINESS_KEY });
  }

  async function reloadAuthoritative(showToast = false) {
    setWorkspace(null);
    await Promise.all([stateQuery.refetch(), readinessQuery.refetch()]);''',
    '''    void queryClient.invalidateQueries({ queryKey: READINESS_KEY });
    void queryClient.invalidateQueries({ queryKey: PICKER_KEY });
  }

  async function reloadAuthoritative(showToast = false) {
    setWorkspace(null);
    await queryClient.invalidateQueries({ queryKey: PICKER_KEY });
    await Promise.all([stateQuery.refetch(), readinessQuery.refetch()]);''',
)

utils = Path("src/components/pages/menu/meal-builder/mealPlannerV2Utils.ts")
replace_once(
    utils,
    '''  MEAL_BUILDER_CARD_KEY_INVALID: "مفتاح الكارت غير صالح",
  MEAL_BUILDER_CARD_KEY_DUPLICATE: "يوجد كارت آخر بنفس المفتاح",''',
    '''  MEAL_BUILDER_CARD_KEY_INVALID: "مفتاح الكارت غير صالح",
  MEAL_BUILDER_CARD_NUMBER_INVALID: "قيمة الترتيب أو العدد غير صالحة",
  MEAL_BUILDER_CARD_KEY_DUPLICATE: "يوجد كارت آخر بنفس المفتاح",''',
)
replace_once(
    utils,
    '''  MEAL_BUILDER_CARD_PRODUCTS_REQUIRED: "اختر منتجًا واحدًا على الأقل",
  MEAL_BUILDER_PRODUCT_NOT_FOUND: "أحد المنتجات غير موجود",''',
    '''  MEAL_BUILDER_CARD_PRODUCTS_REQUIRED: "اختر منتجًا واحدًا على الأقل",
  MEAL_BUILDER_PRODUCT_IDS_INVALID: "قائمة المنتجات المرسلة غير صالحة",
  MEAL_BUILDER_PRODUCT_IDS_REQUIRED: "اختر منتجًا واحدًا على الأقل",
  MEAL_BUILDER_PRODUCT_NOT_FOUND: "أحد المنتجات غير موجود",''',
)
replace_once(
    utils,
    '''  MEAL_BUILDER_PRODUCT_UNAVAILABLE: "أحد المنتجات غير جاهز للاشتراكات",
  MEAL_BUILDER_PRODUCT_ALREADY_ASSIGNED: "المنتج موجود في كارت آخر",''',
    '''  MEAL_BUILDER_PRODUCT_UNAVAILABLE: "أحد المنتجات غير جاهز للاشتراكات",
  MEAL_BUILDER_PRODUCT_TYPE_INVALID: "نوع أحد المنتجات غير مدعوم في الكارت",
  MEAL_BUILDER_PRODUCT_ALREADY_ASSIGNED: "المنتج موجود في كارت آخر",''',
)
replace_once(
    utils,
    '''  MEAL_BUILDER_DRAFT_NOT_FOUND: "لا توجد تغييرات غير منشورة",
  MEAL_BUILDER_VALIDATION_FAILED: "لا يمكن النشر قبل إصلاح الأخطاء",''',
    '''  MEAL_BUILDER_DRAFT_NOT_FOUND: "لا توجد تغييرات غير منشورة",
  MEAL_BUILDER_VALIDATION_ERROR: "بيانات الكارت غير صالحة وتحتاج مراجعة",
  MEAL_BUILDER_VALIDATION_FAILED: "لا يمكن النشر قبل إصلاح الأخطاء",''',
)
replace_once(
    utils,
    '''  OPTION_UNPUBLISHED: "الخيار غير منشور",
  CATALOG_ITEM_UNAVAILABLE: "عنصر الكتالوج غير متاح",''',
    '''  OPTION_UNPUBLISHED: "الخيار غير منشور",
  OPTION_NOT_SUBSCRIPTION_ENABLED: "الخيار غير متاح للاشتراكات",
  CATALOG_ITEM_UNAVAILABLE: "عنصر الكتالوج غير متاح",''',
)
