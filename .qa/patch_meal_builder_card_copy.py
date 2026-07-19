from pathlib import Path


def replace_once(path: Path, old: str, new: str) -> None:
    content = path.read_text(encoding="utf-8")
    count = content.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected one match, found {count}: {old[:120]!r}")
    path.write_text(content.replace(old, new, 1), encoding="utf-8")


card_grid = Path("src/components/pages/menu/meal-builder/MealPlannerCardGridV2.tsx")
replace_once(
    card_grid,
    '''  candidateName,
  canonicalSelectionType,
  issueText,''',
    '''  candidateName,
  issueText,''',
)
replace_once(
    card_grid,
    '''          <p className="mt-2 text-xs text-muted-foreground">
            {items.length} {cardType === "direct_product" ? "منتجات" : "خيارات"} •{" "}
            {canonicalSelectionType(section)}
          </p>''',
    '''          <p className="mt-2 text-xs text-muted-foreground">
            عدد العناصر: {items.length} •{" "}
            {cardType === "direct_product"
              ? "يُحتسب كوجبة كاملة"
              : "يُستخدم ضمن وجبة مركبة"}
          </p>''',
)

components_test = Path("tests/mealPlannerV2Components.test.tsx")
replace_once(
    components_test,
    '''    expect(screen.getByText("يُدار من النظام")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "إدارة العناصر" })
    ).toBeInTheDocument();''',
    '''    expect(screen.getByText("يُدار من النظام")).toBeInTheDocument();
    expect(screen.getByText(/يُحتسب كوجبة كاملة/)).toBeInTheDocument();
    expect(screen.queryByText(/full_meal_product/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "إدارة العناصر" })
    ).toBeInTheDocument();''',
)

harness = Path(".qa/meal-builder-authenticated-qa.mjs")
content = harness.read_text(encoding="utf-8")
raw_assertion = '''  await card.getByText("full_meal_product", { exact: true }).waitFor();'''
if content.count(raw_assertion) != 2:
    raise RuntimeError(
        f"{harness}: expected two raw selection assertions, found {content.count(raw_assertion)}"
    )
content = content.replace(
    raw_assertion,
    '''  await card.getByText("وجبة كاملة", { exact: true }).waitFor();''',
)
old_response = '''    responseHasValidation: Boolean(createPayload?.data?.validation),
    errorCode: createPayload?.error?.code || null,
  });'''
new_response = '''    responseHasValidation: Boolean(createPayload?.data?.validation),
    section: createPayload?.data?.section
      ? {
          key: createPayload.data.section.key || null,
          cardType: createPayload.data.section.cardType || null,
          sectionType: createPayload.data.section.sectionType || null,
          selectionType: createPayload.data.section.selectionType || null,
          selectedProductCount:
            createPayload.data.section.selectedProductIds?.length || 0,
          selectedOptionCount:
            createPayload.data.section.selectedOptionIds?.length || 0,
        }
      : null,
    errorCode: createPayload?.error?.code || null,
  });'''
if content.count(old_response) != 1:
    raise RuntimeError(
        f"{harness}: expected one create response summary, found {content.count(old_response)}"
    )
content = content.replace(old_response, new_response, 1)
harness.write_text(content, encoding="utf-8")
