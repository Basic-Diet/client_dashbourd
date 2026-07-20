from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected one match, found {count}: {old!r}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


selector = Path("src/components/pages/menu/meal-builder/MealPlannerBuilderGroupSelector.tsx")
replace_once(selector, "export function builderGroupLabel", "function builderGroupLabel")
replace_once(selector, "export function builderGroupReason", "function builderGroupReason")

picker = Path("src/components/pages/menu/meal-builder/MealPlannerCandidatePickerV2.tsx")
replace_once(
    picker,
    '''                      {selectable
                        ? candidate.key || "جاهز للاختيار"
                        : candidateReason(candidate)}''',
    '''                      {selectable
                        ? candidateMeta(candidate)
                        : candidateReason(candidate)}''',
)

test_file = Path("tests/mealPlannerAuthoritativeOptionGroups.test.tsx")
replace_once(
    test_file,
    '''    const onSubmit = vi.fn(async (_payload: MealPlannerCreatePayloadV2) => undefined);''',
    '''    const onSubmit = vi.fn(async (payload: MealPlannerCreatePayloadV2) => {
      void payload;
    });''',
)
