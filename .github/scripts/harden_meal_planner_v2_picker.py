from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    content = path.read_text(encoding="utf-8")
    count = content.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected one match, found {count}: {old[:120]!r}")
    path.write_text(content.replace(old, new, 1), encoding="utf-8")


api_file = Path("src/utils/fetchMealPlannerDashboard.ts")
replace_once(
    api_file,
    '''export async function getMealPlannerProductsPicker(
  params: MealPlannerPickerParamsV2
): Promise<MealPlannerPickerResponseV2> {''',
    '''export async function getMealPlannerProductsPicker(
  params: MealPlannerPickerParamsV2,
  signal?: AbortSignal
): Promise<MealPlannerPickerResponseV2> {''',
)
replace_once(
    api_file,
    '''    `${MEAL_PLANNER_DASHBOARD_ROUTE}/pickers/products`,
    { params: cleanParams({ ...params, lang: params.lang ?? "ar" }) }
  );''',
    '''    `${MEAL_PLANNER_DASHBOARD_ROUTE}/pickers/products`,
    {
      params: cleanParams({ ...params, lang: params.lang ?? "ar" }),
      signal,
    }
  );''',
)
replace_once(
    api_file,
    '''export async function getMealPlannerOptionsPicker(
  params: MealPlannerPickerParamsV2
): Promise<MealPlannerPickerResponseV2> {''',
    '''export async function getMealPlannerOptionsPicker(
  params: MealPlannerPickerParamsV2,
  signal?: AbortSignal
): Promise<MealPlannerPickerResponseV2> {''',
)
replace_once(
    api_file,
    '''    `${MEAL_PLANNER_DASHBOARD_ROUTE}/pickers/options`,
    { params: cleanParams({ ...params, lang: params.lang ?? "ar" }) }
  );''',
    '''    `${MEAL_PLANNER_DASHBOARD_ROUTE}/pickers/options`,
    {
      params: cleanParams({ ...params, lang: params.lang ?? "ar" }),
      signal,
    }
  );''',
)

picker = Path("src/components/pages/menu/meal-builder/MealPlannerCandidatePickerV2.tsx")
replace_once(
    picker,
    '''    queryFn: ({ pageParam }) =>''',
    '''    queryFn: ({ pageParam, signal }) =>''',
)
replace_once(
    picker,
    '''            page: Number(pageParam),
            limit: 100,
          })
        : getMealPlannerOptionsPicker({''',
    '''            page: Number(pageParam),
            limit: 100,
          }, signal)
        : getMealPlannerOptionsPicker({''',
)
replace_once(
    picker,
    '''            page: Number(pageParam),
            limit: 100,
          }),''',
    '''            page: Number(pageParam),
            limit: 100,
          }, signal),''',
)
replace_once(
    picker,
    '''  for (const id of selectedIds) {
    if (!map.has(id)) {
      map.set(id, {
        id,
        label: id,
        selected: true,
        assignable: true,
      });
    }
  }''',
    '''  for (const id of selectedIds) {
    const candidate = map.get(id);
    map.set(
      id,
      candidate
        ? { ...candidate, selected: true, assignable: true }
        : {
            id,
            label: id,
            selected: true,
            assignable: true,
          }
    );
  }''',
)

grid = Path("src/components/pages/menu/meal-builder/MealPlannerCardGridV2.tsx")
replace_once(
    grid,
    '''        {sections.map((section) => (
          <DynamicCard''',
    '''        {sections.map((section) => (
          <DynamicCard''',
)
replace_once(
    grid,
    '''            onDelete={() => onDelete(section)}
          />
        ))}
      </div>''',
    '''            onDelete={() => onDelete(section)}
          />
        ))}
        {!sections.length ? (
          <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed bg-card p-6 text-center md:col-span-1 2xl:col-span-2">
            <div className="max-w-sm">
              <Package className="mx-auto size-8 text-muted-foreground" />
              <h3 className="mt-3 font-semibold">لا توجد كروت وجبات ديناميكية</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                ابدأ بإضافة كارت منتجات كاملة أو كارت خيارات بروتين أو كارب.
              </p>
            </div>
          </div>
        ) : null}
      </div>''',
)
