import type { PremiumMealSchemaType } from "@/lib/validations/premiumMealSchema";
import premiumMealSchema from "@/lib/validations/premiumMealSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import type { PremiumMeal } from "@/types/premiumMealTypes";

const EMPTY_DEFAULTS: PremiumMealSchemaType = {
  name: { ar: "", en: "" },
  description: { ar: "", en: "" },
  image: "",
  imageFile: undefined,
  currency: "SAR",
  extraFeeSar: 0,
  isActive: true,
  sortOrder: 0,
};

const useCreatePremiumMealForm = (initialData?: PremiumMeal) => {
  const defaultValues: PremiumMealSchemaType = initialData
    ? {
        name: initialData.name,
        description: initialData.description,
        image: initialData.image,
        imageFile: undefined,
        currency: initialData.currency,
        extraFeeSar: initialData.extraFeeHalala / 100,
        isActive: initialData.isActive,
        sortOrder: initialData.sortOrder,
      }
    : EMPTY_DEFAULTS;

  const form = useForm<PremiumMealSchemaType>({
    resolver: zodResolver(premiumMealSchema) as unknown as Resolver<PremiumMealSchemaType>,
    defaultValues,
  });

  return { form };
};

export default useCreatePremiumMealForm;
