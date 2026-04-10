import type { CategorySchemaType } from "@/lib/validations/categorySchema";
import categorySchema from "@/lib/validations/categorySchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import type { MealCategory } from "@/types/categoryTypes";

const EMPTY_DEFAULTS: CategorySchemaType = {
  name: { ar: "", en: "" },
  description: { ar: "", en: "" },
  isActive: true,
  sortOrder: 0,
};

const useCreateCategoryForm = (initialData?: MealCategory) => {
  const defaultValues: CategorySchemaType = initialData
    ? {
        name: initialData.name,
        description: initialData.description,
        isActive: initialData.isActive,
        sortOrder: initialData.sortOrder,
      }
    : EMPTY_DEFAULTS;

  const form = useForm<CategorySchemaType>({
    resolver: zodResolver(categorySchema) as unknown as Resolver<CategorySchemaType>,
    defaultValues,
  });

  return { form };
};

export default useCreateCategoryForm;
