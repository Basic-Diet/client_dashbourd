import runpy
from pathlib import Path

runpy.run_path('.github/scripts/meal_builder_family_tabs_repair.py', run_name='__main__')

path = Path('tests/mealPlannerAuthoritativeOptionGroups.test.tsx')
text = path.read_text()
old = '''    await user.click(
      screen.getByRole("combobox", { name: "عائلة البروتين" })
    );
    await user.click(screen.getByRole("button", { name: "سمك" }));'''
new = '''    await user.click(screen.getByRole("button", { name: "سمك" }));'''
if old not in text:
    raise SystemExit('Expected stale family combobox interaction not found')
text = text.replace(old, new, 1)
old = '''    expect(
      screen.queryByRole("combobox", { name: "عائلة البروتين" })
    ).not.toBeInTheDocument();'''
new = '''    expect(
      screen.queryByRole("group", { name: "عائلة البروتين" })
    ).not.toBeInTheDocument();'''
if old not in text:
    raise SystemExit('Expected carbs family control assertion not found')
path.write_text(text.replace(old, new, 1))

grid = Path('src/components/pages/menu/meal-builder/MealPlannerCardGridV2.tsx')
text = grid.read_text()
old = 'findBuilderGroup(catalog, section.productContextId, section.sourceGroupId)'
new = 'findBuilderGroup(\n          catalog,\n          section.productContextId ?? undefined,\n          section.sourceGroupId ?? undefined\n        )'
if old not in text:
    raise SystemExit('Expected nullable builder-group lookup not found')
grid.write_text(text.replace(old, new, 1))
