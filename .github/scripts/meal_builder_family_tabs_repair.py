import runpy
from pathlib import Path

runpy.run_path('.github/scripts/meal_builder_card_visibility_repair.py', run_name='__main__')


def replace_once(path: str, old: str, new: str, label: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"Expected {label} not found in {path}")
    file.write_text(text.replace(old, new, 1))


replace_once(
    'tests/mealPlannerAuthoritativeOptionGroups.test.tsx',
    'await user.keyboard("{ArrowDown}{Enter}");',
    'await user.click(screen.getByRole("button", { name: "سمك" }));',
    'family keyboard interaction',
)

replace_once(
    'src/components/pages/menu/meal-builder/MealPlannerCardDialogV2.tsx',
    '''                    {selectedBuilderGroup.optionRole === "protein" && families.length ? (
                      <SelectField
                        label="عائلة البروتين"
                        value={value.familyKey || "all"}
                        onChange={(familyKey) =>
                          setValue((current) => ({
                            ...current,
                            familyKey: familyKey === "all" ? "" : familyKey,
                            selectedIds: [],
                          }))
                        }
                        options={[
                          { value: "all", label: "كل العائلات المتاحة" },
                          ...families.map((family) => ({
                            value: family,
                            label: familyLabel(family),
                          })),
                        ]}
                      />
                    ) : null}''',
    '''                    {selectedBuilderGroup.optionRole === "protein" && families.length ? (
                      <div className="space-y-2 sm:col-span-2">
                        <FieldLabel>عائلة البروتين</FieldLabel>
                        <div
                          role="group"
                          aria-label="عائلة البروتين"
                          className="flex flex-wrap gap-2 rounded-xl border bg-background p-2"
                        >
                          <Button
                            type="button"
                            size="sm"
                            variant={!value.familyKey ? "default" : "outline"}
                            aria-pressed={!value.familyKey}
                            onClick={() =>
                              setValue((current) => ({
                                ...current,
                                familyKey: "",
                                selectedIds: [],
                              }))
                            }
                          >
                            كل العائلات
                          </Button>
                          {families.map((family) => (
                            <Button
                              key={family}
                              type="button"
                              size="sm"
                              variant={value.familyKey === family ? "default" : "outline"}
                              aria-pressed={value.familyKey === family}
                              onClick={() =>
                                setValue((current) => ({
                                  ...current,
                                  familyKey: family,
                                  selectedIds: [],
                                }))
                              }
                            >
                              {familyLabel(family)}
                            </Button>
                          ))}
                        </div>
                        <p className="text-xs leading-5 text-muted-foreground">
                          اختر عائلة لعرض خياراتها فقط، أو اعرض كل العائلات المتاحة من الـBackend.
                        </p>
                      </div>
                    ) : null}''',
    'protein family select block',
)
