from pathlib import Path

path = Path("src/components/pages/addons/AddonPlanDialog.tsx")
content = path.read_text(encoding="utf-8")

replacements = [
    (
        '''    case "SET_FIELD":
      return {
        form: { ...state.form, [action.field]: action.value },
        error: null,
      };''',
        '''    case "SET_FIELD":
      return {
        ...state,
        form: { ...state.form, [action.field]: action.value },
        error: null,
      };''',
    ),
    (
        '''    case "SET_PRODUCT_IDS":
      return {
        form: {
          ...state.form,
          menuProductIds: uniqueIds(action.productIds),
        },
        error: null,
      };''',
        '''    case "SET_PRODUCT_IDS":
      return {
        ...state,
        form: {
          ...state.form,
          menuProductIds: uniqueIds(action.productIds),
        },
        error: null,
      };''',
    ),
    (
        '''    case "UPDATE_PRICE":
      return {
        form: {
          ...state.form,
          prices: upsertPriceRow(''',
        '''    case "UPDATE_PRICE":
      return {
        ...state,
        form: {
          ...state.form,
          prices: upsertPriceRow(''',
    ),
]

for old, new in replacements:
    count = content.count(old)
    if count != 1:
        raise RuntimeError(f"expected one match, found {count}: {old[:100]!r}")
    content = content.replace(old, new, 1)

path.write_text(content, encoding="utf-8")
