from pathlib import Path

path = Path("src/components/pages/menu/meal-builder/MealPlannerWorkspaceV2.tsx")
content = path.read_text(encoding="utf-8")
old = '''    const patch: MealPlannerPatchPayloadV2 = {
      cardType,
      selectionType:
        cardType === "direct_product" ? "full_meal_product" : "standard_meal",
      visible: section.visible === false,
    };'''
new = '''    const patch: MealPlannerPatchPayloadV2 =
      cardType === "direct_product"
        ? {
            cardType: "direct_product",
            selectionType: "full_meal_product",
            visible: section.visible === false,
          }
        : {
            cardType: "option_family",
            selectionType: "standard_meal",
            visible: section.visible === false,
          };'''
if content.count(old) != 1:
    raise RuntimeError(f"visibility payload block not found: {content.count(old)}")
path.write_text(content.replace(old, new, 1), encoding="utf-8")
