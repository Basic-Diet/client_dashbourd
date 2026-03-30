import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import addonSchema, { type AddonSchemaType } from "@/lib/validations/addonSchema";
import { type Addon } from "@/types/addonTypes";

export default function useCreateAddonForm(initialData?: Addon) {
  const defaultValues: AddonSchemaType = initialData
    ? {
        name: { ar: initialData.name.ar, en: initialData.name.en },
        description: { ar: initialData.description.ar, en: initialData.description.en },
        priceSar: initialData.price / 100,
        currency: initialData.currency,
        category: initialData.category,
        type: initialData.type,
        isActive: initialData.isActive,
        sortOrder: initialData.sortOrder,
        imageFile: undefined,
        imageUrl: initialData.imageUrl,
      }
    : {
        name: { ar: "", en: "" },
        description: { ar: "", en: "" },
        priceSar: 0,
        currency: "SAR",
        category: "",
        type: "subscription",
        isActive: true,
        sortOrder: 0,
        imageFile: undefined,
        imageUrl: undefined,
      };

  const form = useForm<AddonSchemaType>({
    resolver: zodResolver(addonSchema) as unknown as Resolver<AddonSchemaType>,
    defaultValues,
  });

  return { form };
}
