from pathlib import Path

path = Path("src/components/pages/addons/AddonPlanDialog.tsx")
text = path.read_text(encoding="utf-8")


def replace_once(old: str, new: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected one match, found {count}: {old[:120]!r}")
    text = text.replace(old, new, 1)


replace_once(
    '''  useReducer,
  useRef,
  useState,
  type FormEvent,''',
    '''  useReducer,
  useRef,
  type FormEvent,''',
)
replace_once(
    '''type DialogFormState = {
  form: PlanFormState;
  error: string | null;
};''',
    '''type DialogFormState = {
  form: PlanFormState;
  error: string | null;
  productSearch: string;
  productCategoryFilter: string;
};''',
)
replace_once(
    '''  | { type: "SET_PRODUCT_IDS"; productIds: string[] }
  | {''',
    '''  | { type: "SET_PRODUCT_IDS"; productIds: string[] }
  | { type: "SET_PRODUCT_SEARCH"; value: string }
  | { type: "SET_PRODUCT_CATEGORY_FILTER"; value: string }
  | { type: "RESET_PRODUCT_FILTERS" }
  | {''',
)
replace_once(
    '''    case "RESET_FROM_PLAN":
      return { form: action.form, error: null };''',
    '''    case "RESET_FROM_PLAN":
      return {
        form: action.form,
        error: null,
        productSearch: "",
        productCategoryFilter: "all",
      };''',
)
replace_once(
    '''    case "SET_FIELD":
      return {
        form: { ...state.form, [action.field]: action.value },''',
    '''    case "SET_FIELD":
      return {
        ...state,
        form: { ...state.form, [action.field]: action.value },''',
)
replace_once(
    '''    case "SET_PRODUCT_IDS":
      return {
        form: {''',
    '''    case "SET_PRODUCT_IDS":
      return {
        ...state,
        form: {''',
)
replace_once(
    '''    case "UPDATE_PRICE":
      return {
        form: {''',
    '''    case "SET_PRODUCT_SEARCH":
      return { ...state, productSearch: action.value };
    case "SET_PRODUCT_CATEGORY_FILTER":
      return { ...state, productCategoryFilter: action.value };
    case "RESET_PRODUCT_FILTERS":
      return {
        ...state,
        productSearch: "",
        productCategoryFilter: "all",
      };
    case "UPDATE_PRICE":
      return {
        ...state,
        form: {''',
)
replace_once(
    '''  const [state, dispatch] = useReducer(dialogFormReducer, null, () => ({
    form: planToForm(plan, basePlans),
    error: null,
  }));
  const { form } = state;
  const [productSearch, setProductSearch] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");''',
    '''  const [state, dispatch] = useReducer(dialogFormReducer, null, () => ({
    form: planToForm(plan, basePlans),
    error: null,
    productSearch: "",
    productCategoryFilter: "all",
  }));
  const { form, productSearch, productCategoryFilter } = state;''',
)
replace_once(
    '''    setProductSearch("");
    setProductCategoryFilter("all");
    lastResetKeyRef.current = resetKey;''',
    '''    lastResetKeyRef.current = resetKey;''',
)
replace_once(
    '''                        onChange={(event) => setProductSearch(event.target.value)}''',
    '''                        onChange={(event) =>
                          dispatch({
                            type: "SET_PRODUCT_SEARCH",
                            value: event.target.value,
                          })
                        }''',
)
replace_once(
    '''                      onValueChange={setProductCategoryFilter}''',
    '''                      onValueChange={(value) =>
                        dispatch({
                          type: "SET_PRODUCT_CATEGORY_FILTER",
                          value,
                        })
                      }''',
)
replace_once(
    '''                        onClick={() => {
                          setProductSearch("");
                          setProductCategoryFilter("all");
                        }}''',
    '''                        onClick={() =>
                          dispatch({ type: "RESET_PRODUCT_FILTERS" })
                        }''',
)

path.write_text(text, encoding="utf-8")
