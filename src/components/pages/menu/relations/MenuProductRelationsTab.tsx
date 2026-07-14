import { useMemo, useReducer } from "react";
import { Link2, SlidersHorizontal, ToggleLeft, Unlink2 } from "lucide-react";

import {
  useLinkGroupsToProductMutation,
  useLinkOptionsToGroupMutation,
  useMenuOptionGroupsQuery,
  useMenuOptionsQuery,
  useMenuProductDetailQuery,
  useMenuProductsQuery,
  useUpdateOptionAvailabilityInProductMutation,
  useUpdateOptionOverrideMutation,
  useUpdateSelectionRulesMutation,
} from "@/hooks/useMenuQuery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  MenuEmptyState,
  MenuKeyBadge,
  MenuSectionCard,
} from "@/components/pages/menu/MenuTabScaffold";
import type {
  MenuProductLinkedGroup,
  ProductGroupOptionOverride,
  ProductGroupRule,
  MenuProduct,
  MenuOptionGroup,
  MenuOption,
} from "@/types/menuTypes";
import { parseOptionalSelectionLimit } from "@/utils/menuPayloadMappers";
import {
  halalaToRiyalInput,
  optionalRiyalToHalala,
  riyalToHalala,
} from "@/utils/price";

const toOptionalNumber = (value: string) =>
  value.trim() === "" ? undefined : Number(value);

const getLinkedGroups = (
  groups?: MenuProductLinkedGroup[],
  optionGroups?: MenuProductLinkedGroup[]
) => optionGroups ?? groups ?? [];

const normalizeGroupRule = (group: MenuProductLinkedGroup): ProductGroupRule => ({
  groupId: group.groupId || group.group?.id || "",
  minSelections: group.minSelections ?? 0,
  maxSelections: group.maxSelections ?? null,
  isRequired: group.isRequired ?? false,
  sortOrder: group.sortOrder ?? 0,
  isActive: group.isActive ?? true,
  isAvailable: group.isAvailable ?? true,
  isVisible: group.isVisible ?? true,
});

const normalizeOption = (
  option: ProductGroupOptionOverride
): ProductGroupOptionOverride => ({
  optionId: option.optionId,
  extraPriceHalala: option.extraPriceHalala,
  extraWeightUnitGrams: option.extraWeightUnitGrams,
  extraWeightPriceHalala: option.extraWeightPriceHalala,
  isActive: option.isActive ?? true,
  isAvailable: option.isAvailable ?? true,
  isVisible: option.isVisible ?? true,
  sortOrder: option.sortOrder ?? 0,
});

interface FormState {
  productId: string;
  groupId: string;
  optionId: string;
  minSelections: string;
  maxSelections: string;
  groupSortOrder: string;
  isRequired: boolean;
  extraPriceSar: string;
  extraWeightUnitGrams: string;
  extraWeightPriceSar: string;
  optionSortOrder: string;
  optionAvailable: boolean;
}

type FormAction =
  | { type: "SET_PRODUCT"; payload: string }
  | {
      type: "SET_GROUP";
      payload: { id: string; linkedGroup?: MenuProductLinkedGroup };
    }
  | {
      type: "SET_OPTION";
      payload: { id: string; linkedOption?: ProductGroupOptionOverride };
    }
  | {
      type: "UPDATE_GROUP_RULES";
      payload: Partial<Omit<FormState, "productId" | "groupId" | "optionId">>;
    }
  | { type: "UPDATE_OPTION_FIELDS"; payload: Partial<FormState> }
  | { type: "RESET_GROUP_FIELDS" }
  | { type: "RESET_OPTION_FIELDS" };

const initialState: FormState = {
  productId: "",
  groupId: "",
  optionId: "",
  minSelections: "0",
  maxSelections: "1",
  groupSortOrder: "0",
  isRequired: false,
  extraPriceSar: "0",
  extraWeightUnitGrams: "",
  extraWeightPriceSar: "",
  optionSortOrder: "0",
  optionAvailable: true,
};

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "SET_PRODUCT":
      return {
        ...initialState,
        productId: action.payload,
      };
    case "SET_GROUP": {
      const { id, linkedGroup } = action.payload;
      if (linkedGroup) {
        return {
          ...state,
          groupId: id,
          optionId: "",
          minSelections: String(linkedGroup.minSelections ?? 0),
          maxSelections:
            linkedGroup.maxSelections === null
              ? ""
              : String(linkedGroup.maxSelections ?? ""),
          groupSortOrder: String(linkedGroup.sortOrder ?? 0),
          isRequired: linkedGroup.isRequired ?? false,
          extraPriceSar: "0",
          extraWeightUnitGrams: "",
          extraWeightPriceSar: "",
          optionSortOrder: "0",
          optionAvailable: true,
        };
      }
      return {
        ...initialState,
        productId: state.productId,
        groupId: id,
      };
    }
    case "SET_OPTION": {
      const { id, linkedOption } = action.payload;
      if (linkedOption) {
        return {
          ...state,
          optionId: id,
          extraPriceSar:
            halalaToRiyalInput(linkedOption.extraPriceHalala ?? 0) || "0",
          extraWeightUnitGrams:
            linkedOption.extraWeightUnitGrams !== undefined
              ? String(linkedOption.extraWeightUnitGrams)
              : "",
          extraWeightPriceSar: halalaToRiyalInput(
            linkedOption.extraWeightPriceHalala
          ),
          optionSortOrder: String(linkedOption.sortOrder ?? 0),
          optionAvailable: linkedOption.isAvailable ?? true,
        };
      }
      return {
        ...state,
        optionId: id,
        extraPriceSar: "0",
        extraWeightUnitGrams: "",
        extraWeightPriceSar: "",
        optionSortOrder: "0",
        optionAvailable: true,
      };
    }
    case "UPDATE_GROUP_RULES":
      return { ...state, ...action.payload };
    case "UPDATE_OPTION_FIELDS":
      return { ...state, ...action.payload };
    case "RESET_GROUP_FIELDS":
      return {
        ...state,
        minSelections: "0",
        maxSelections: "1",
        groupSortOrder: "0",
        isRequired: false,
      };
    case "RESET_OPTION_FIELDS":
      return {
        ...state,
        extraPriceSar: "0",
        extraWeightUnitGrams: "",
        extraWeightPriceSar: "",
        optionSortOrder: "0",
        optionAvailable: true,
      };
    default:
      return state;
  }
}

function ProductSelect({
  value,
  onChange,
  products,
}: {
  value: string;
  onChange: (value: string) => void;
  products: MenuProduct[];
}) {
  return (
    <div className="space-y-1.5">
      <Label>المنتج</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="اختر المنتج" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {products.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name.ar}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

function GroupSelect({
  value,
  onChange,
  groups,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  groups: MenuOptionGroup[];
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>مجموعة الخيارات</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="اختر المجموعة" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {groups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name.ar}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

function OptionSelect({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  options: MenuOption[];
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>الخيار</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="اختر الخيار" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.name.ar}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

function GroupRuleFields({
  state,
  dispatch,
}: {
  state: FormState;
  dispatch: React.Dispatch<FormAction>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-4">
      <div className="space-y-1.5">
        <Label>الحد الأدنى</Label>
        <Input
          type="number"
          min="0"
          value={state.minSelections}
          onChange={(event) =>
            dispatch({
              type: "UPDATE_GROUP_RULES",
              payload: { minSelections: event.target.value },
            })
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label>الحد الأقصى</Label>
        <Input
          type="number"
          min="0"
          value={state.maxSelections}
          onChange={(event) =>
            dispatch({
              type: "UPDATE_GROUP_RULES",
              payload: { maxSelections: event.target.value },
            })
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label>الترتيب</Label>
        <Input
          type="number"
          min="0"
          value={state.groupSortOrder}
          onChange={(event) =>
            dispatch({
              type: "UPDATE_GROUP_RULES",
              payload: { groupSortOrder: event.target.value },
            })
          }
        />
      </div>
      <div className="flex items-end gap-3 pb-2">
        <Switch
          checked={state.isRequired}
          onCheckedChange={(checked) =>
            dispatch({
              type: "UPDATE_GROUP_RULES",
              payload: { isRequired: checked },
            })
          }
        />
        <span className="text-sm font-medium">
          {state.isRequired ? "إجباري" : "اختياري"}
        </span>
      </div>
    </div>
  );
}

function OptionOverrideFields({
  state,
  dispatch,
}: {
  state: FormState;
  dispatch: React.Dispatch<FormAction>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-4">
      <div className="space-y-1.5">
        <Label>وحدة الوزن</Label>
        <Input
          type="number"
          min="0"
          value={state.extraWeightUnitGrams}
          onChange={(event) =>
            dispatch({
              type: "UPDATE_OPTION_FIELDS",
              payload: { extraWeightUnitGrams: event.target.value },
            })
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label>سعر الوزن (ر.س)</Label>
        <Input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          dir="ltr"
          value={state.extraWeightPriceSar}
          onChange={(event) =>
            dispatch({
              type: "UPDATE_OPTION_FIELDS",
              payload: { extraWeightPriceSar: event.target.value },
            })
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label>الترتيب</Label>
        <Input
          type="number"
          min="0"
          value={state.optionSortOrder}
          onChange={(event) =>
            dispatch({
              type: "UPDATE_OPTION_FIELDS",
              payload: { optionSortOrder: event.target.value },
            })
          }
        />
      </div>
      <div className="flex items-end gap-3 pb-2">
        <Switch
          checked={state.optionAvailable}
          onCheckedChange={(checked) =>
            dispatch({
              type: "UPDATE_OPTION_FIELDS",
              payload: { optionAvailable: checked },
            })
          }
        />
        <span className="text-sm font-medium">
          {state.optionAvailable ? "متوفر" : "غير متوفر"}
        </span>
      </div>
    </div>
  );
}

function LinkedGroupsPreview({
  product,
  linkedGroups,
}: {
  product?: MenuProduct;
  linkedGroups: MenuProductLinkedGroup[];
}) {
  if (!product) return null;

  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">المجموعات المرتبطة</span>
        <MenuKeyBadge value={product.key} />
      </div>
      {linkedGroups.length === 0 ? (
        <MenuEmptyState
          title="لا توجد مجموعات مرتبطة"
          description="اختر مجموعة واضبط قواعدها ثم احفظ الربط لهذا المنتج."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {linkedGroups.map((group) => (
            <div
              key={group.groupId || group.group?.id}
              className="rounded-md border bg-muted/20 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {group.group?.name?.ar || group.groupId}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {group.minSelections ?? 0} -{" "}
                    {group.maxSelections ?? "غير محدود"} اختيارات
                  </p>
                </div>
                <Badge variant={group.isRequired ? "default" : "outline"}>
                  {group.isRequired ? "إجباري" : "اختياري"}
                </Badge>
              </div>
              {group.options?.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {group.options.map((option) => (
                    <Badge
                      key={option.optionId || option.option?.id}
                      variant={
                        option.isAvailable === false ? "outline" : "secondary"
                      }
                    >
                      {option.option?.name?.ar || option.optionId}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MenuProductRelationsTab() {
  const [state, dispatch] = useReducer(formReducer, initialState);

  const { data: productsData } = useMenuProductsQuery({ limit: 100 });
  const { data: groupsData } = useMenuOptionGroupsQuery({ limit: 100 });
  const { data: optionsData } = useMenuOptionsQuery({
    limit: 100,
    groupId: state.groupId || undefined,
  });
  const { data: productData } = useMenuProductDetailQuery(state.productId);

  const linkGroups = useLinkGroupsToProductMutation();
  const updateRules = useUpdateSelectionRulesMutation();
  const linkOptions = useLinkOptionsToGroupMutation();
  const updateOverride = useUpdateOptionOverrideMutation();
  const updateAvailability = useUpdateOptionAvailabilityInProductMutation();

  const products = (
    Array.isArray(productsData?.data)
      ? productsData?.data
      : productsData?.data?.items || []
  ) as MenuProduct[];

  const groups = (
    Array.isArray(groupsData?.data)
      ? groupsData?.data
      : groupsData?.data?.items || []
  ) as MenuOptionGroup[];

  const options = (
    Array.isArray(optionsData?.data)
      ? optionsData?.data
      : optionsData?.data?.items || []
  ) as MenuOption[];

  const product = productData?.data;
  const linkedGroups = useMemo(
    () => getLinkedGroups(product?.groups, product?.optionGroups),
    [product]
  );

  const selectedLinkedGroup = linkedGroups.find(
    (group) => (group.groupId || group.group?.id) === state.groupId
  );
  const linkedOptions = selectedLinkedGroup?.options || [];
  const selectedLinkedOption = linkedOptions.find(
    (option) => (option.optionId || option.option?.id) === state.optionId
  );

  const isGroupAlreadyLinked = Boolean(selectedLinkedGroup);
  const isOptionAlreadyLinked = Boolean(selectedLinkedOption);
  const canSaveGroup = Boolean(state.productId && state.groupId);
  const canSaveOption = Boolean(
    state.productId && state.groupId && state.optionId
  );

  const handleProductChange = (value: string) => {
    dispatch({ type: "SET_PRODUCT", payload: value });
  };

  const handleGroupChange = (value: string) => {
    const linkedGroup = linkedGroups.find(
      (group) => (group.groupId || group.group?.id) === value
    );
    dispatch({ type: "SET_GROUP", payload: { id: value, linkedGroup } });
  };

  const handleOptionChange = (value: string) => {
    const linkedOption = linkedOptions.find(
      (option) => (option.optionId || option.option?.id) === value
    );
    dispatch({ type: "SET_OPTION", payload: { id: value, linkedOption } });
  };

  const buildGroupPayload = (): { groups: ProductGroupRule[] } => {
    const nextRule: ProductGroupRule = {
      groupId: state.groupId,
      minSelections: Number(state.minSelections) || 0,
      maxSelections: parseOptionalSelectionLimit(state.maxSelections),
      isRequired: state.isRequired,
      sortOrder: Number(state.groupSortOrder) || 0,
      isActive: true,
      isAvailable: true,
      isVisible: true,
    };
    const existing = linkedGroups
      .map(normalizeGroupRule)
      .filter((group) => group.groupId && group.groupId !== state.groupId);
    return { groups: [...existing, nextRule] };
  };

  const buildOptionPayload = (): {
    options: ProductGroupOptionOverride[];
  } => {
    const nextOption: ProductGroupOptionOverride = {
      optionId: state.optionId,
      extraPriceHalala: riyalToHalala(state.extraPriceSar || 0),
      extraWeightUnitGrams: toOptionalNumber(state.extraWeightUnitGrams),
      extraWeightPriceHalala: optionalRiyalToHalala(
        state.extraWeightPriceSar
      ),
      isActive: true,
      isAvailable: state.optionAvailable,
      isVisible: true,
      sortOrder: Number(state.optionSortOrder) || 0,
    };
    const existing = linkedOptions
      .map((option) =>
        normalizeOption({
          ...option,
          optionId: option.optionId || option.option?.id || "",
        })
      )
      .filter(
        (option) => option.optionId && option.optionId !== state.optionId
      );
    return { options: [...existing, nextOption] };
  };

  const handleUnlinkGroup = () => {
    const existing = linkedGroups
      .map(normalizeGroupRule)
      .filter((group) => group.groupId && group.groupId !== state.groupId);
    linkGroups.mutate({
      productId: state.productId,
      data: { groups: existing },
    });
    dispatch({ type: "SET_GROUP", payload: { id: "" } });
  };

  const handleUnlinkOption = () => {
    const existing = linkedOptions
      .map((option) =>
        normalizeOption({
          ...option,
          optionId: option.optionId || option.option?.id || "",
        })
      )
      .filter(
        (option) => option.optionId && option.optionId !== state.optionId
      );
    linkOptions.mutate({
      productId: state.productId,
      groupId: state.groupId,
      data: { options: existing },
    });
    dispatch({ type: "SET_OPTION", payload: { id: "" } });
  };

  return (
    <MenuSectionCard
      title="ربط دورة المنيو"
      description="اربط المنتجات بمجموعات الخيارات واضبط قواعد الاختيار والتجاوزات الأسبوعية."
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
        <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <ProductSelect
              value={state.productId}
              onChange={handleProductChange}
              products={products}
            />
            <GroupSelect
              value={state.groupId}
              onChange={handleGroupChange}
              groups={groups}
              disabled={!state.productId}
            />
          </div>

          <GroupRuleFields state={state} dispatch={dispatch} />

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!canSaveGroup || linkGroups.isPending}
              onClick={() =>
                linkGroups.mutate({
                  productId: state.productId,
                  data: buildGroupPayload(),
                })
              }
            >
              <Link2 data-icon="inline-start" />
              {isGroupAlreadyLinked ? "تحديث الربط" : "ربط المجموعة"}
            </Button>
            <Button
              variant="outline"
              disabled={!isGroupAlreadyLinked || updateRules.isPending}
              onClick={() =>
                updateRules.mutate({
                  productId: state.productId,
                  groupId: state.groupId,
                  data: {
                    minSelections: Number(state.minSelections) || 0,
                    maxSelections: parseOptionalSelectionLimit(
                      state.maxSelections
                    ),
                    isRequired: state.isRequired,
                  },
                })
              }
            >
              <SlidersHorizontal data-icon="inline-start" />
              تحديث القواعد
            </Button>
            {isGroupAlreadyLinked && (
              <Button
                variant="destructive"
                disabled={linkGroups.isPending}
                onClick={handleUnlinkGroup}
              >
                <Unlink2 data-icon="inline-start" />
                إلغاء الربط
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <OptionSelect
              value={state.optionId}
              onChange={handleOptionChange}
              options={options}
              disabled={!state.groupId}
            />
            <div className="space-y-1.5">
              <Label>السعر الإضافي (ر.س)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                dir="ltr"
                value={state.extraPriceSar}
                onChange={(event) =>
                  dispatch({
                    type: "UPDATE_OPTION_FIELDS",
                    payload: { extraPriceSar: event.target.value },
                  })
                }
              />
            </div>
          </div>

          <OptionOverrideFields state={state} dispatch={dispatch} />

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!canSaveOption || linkOptions.isPending}
              onClick={() =>
                linkOptions.mutate({
                  productId: state.productId,
                  groupId: state.groupId,
                  data: buildOptionPayload(),
                })
              }
            >
              <Link2 data-icon="inline-start" />
              {isOptionAlreadyLinked ? "تحديث ربط الخيار" : "ربط الخيار"}
            </Button>
            <Button
              variant="outline"
              disabled={!isOptionAlreadyLinked || updateOverride.isPending}
              onClick={() =>
                updateOverride.mutate({
                  productId: state.productId,
                  groupId: state.groupId,
                  optionId: state.optionId,
                  data: buildOptionPayload().options.at(-1) || {},
                })
              }
            >
              <SlidersHorizontal data-icon="inline-start" />
              تحديث التجاوز
            </Button>
            <Button
              variant="outline"
              disabled={!isOptionAlreadyLinked || updateAvailability.isPending}
              onClick={() =>
                updateAvailability.mutate({
                  productId: state.productId,
                  groupId: state.groupId,
                  optionId: state.optionId,
                  isAvailable: state.optionAvailable,
                })
              }
            >
              <ToggleLeft data-icon="inline-start" />
              تحديث التوفر
            </Button>
            {isOptionAlreadyLinked && (
              <Button
                variant="destructive"
                disabled={linkOptions.isPending}
                onClick={handleUnlinkOption}
              >
                <Unlink2 data-icon="inline-start" />
                إلغاء الربط
              </Button>
            )}
          </div>
        </div>
      </div>

      <LinkedGroupsPreview product={product} linkedGroups={linkedGroups} />
    </MenuSectionCard>
  );
}
