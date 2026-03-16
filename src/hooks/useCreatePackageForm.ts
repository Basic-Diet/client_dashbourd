import type { CreatePackageSchemaType } from "@/lib/validations/createPackageSchema";
import createPackageSchema from "@/lib/validations/createPackageSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";

export const DEFAULT_MEAL = {
  mealsPerDay: 1,
  sortOrder: 0,
  isActive: true,
  priceHalala: 0,
  compareAtHalala: undefined,
};

const DEFAULT_GRAM = {
  grams: 100,
  sortOrder: 0,
  isActive: true,
  mealsOptions: [{ ...DEFAULT_MEAL }],
};

const EMPTY_DEFAULTS: CreatePackageSchemaType = {
  name: { ar: "", en: "" },
  daysCount: 0,
  currency: "SAR",
  sortOrder: 1,
  isActive: true,
  skipAllowanceCompensatedDays: 0,
  freezePolicy: {
    enabled: false,
    maxDays: 1,
    maxTimes: 1,
  },
  gramsOptions: [{ ...DEFAULT_GRAM }],
};

const useCreatePackageForm = (initialData?: CreatePackageSchemaType) => {
  const form = useForm<CreatePackageSchemaType>({
    resolver: zodResolver(createPackageSchema) as unknown as Resolver<CreatePackageSchemaType>,
    defaultValues: initialData ?? EMPTY_DEFAULTS,
  });

  const gramsFieldArray = useFieldArray({
    control: form.control,
    name: "gramsOptions",
  });

  const addGram = () => {
    gramsFieldArray.append({
      ...DEFAULT_GRAM,
      sortOrder: gramsFieldArray.fields.length,
      mealsOptions: [{ ...DEFAULT_MEAL }],
    });
  };

  const removeGram = (index: number) => {
    if (gramsFieldArray.fields.length > 1) {
      gramsFieldArray.remove(index);
    }
  };

  return {
    form,
    gramsFieldArray,
    addGram,
    removeGram,
    DEFAULT_MEAL,
  };
};

export default useCreatePackageForm;
