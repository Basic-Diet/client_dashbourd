import type { MealSchemaType } from "@/lib/validations/mealSchema";
import mealSchema from "@/lib/validations/mealSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import type { Meal } from "@/types/mealTypes";

const EMPTY_DEFAULTS: MealSchemaType = {
  name: { ar: "", en: "" },
  description: { ar: "", en: "" },
  image: "",
  imageFile: undefined,
  categoryId: "",
  availableForOrder: true,
  availableForSubscription: true,
  proteinGrams: 0,
  carbGrams: 0,
  fatGrams: 0,
  isActive: true,
  sortOrder: 0,
};

const useCreateMealForm = (initialData?: Meal) => {
  const defaultValues: MealSchemaType = initialData
    ? {
        name: initialData.name,
        description: initialData.description,
        image: initialData.imageUrl,
        imageFile: undefined,
        categoryId: initialData.categoryId,
        availableForOrder: initialData.availableForOrder,
        availableForSubscription: initialData.availableForSubscription,
        proteinGrams: initialData.proteinGrams,
        carbGrams: initialData.carbGrams,
        fatGrams: initialData.fatGrams,
        isActive: initialData.isActive,
        sortOrder: initialData.sortOrder,
      }
    : EMPTY_DEFAULTS;

  const form = useForm<MealSchemaType>({
    resolver: zodResolver(mealSchema) as unknown as Resolver<MealSchemaType>,
    defaultValues,
  });

  return { form };
};

export default useCreateMealForm;
