import { z } from "zod";

const mealSchema = z
  .object({
    name: z.object({
      ar: z
        .string({ message: "اسم الوجبة بالعربية مطلوب" })
        .min(1, "اسم الوجبة بالعربية مطلوب")
        .trim(),
      en: z
        .string({ message: "اسم الوجبة بالإنجليزية مطلوب" })
        .min(1, "اسم الوجبة بالإنجليزية مطلوب")
        .trim(),
    }),
    description: z.object({
      ar: z
        .string({ message: "وصف الوجبة بالعربية مطلوب" })
        .min(1, "وصف الوجبة بالعربية مطلوب")
        .trim(),
      en: z
        .string({ message: "وصف الوجبة بالإنجليزية مطلوب" })
        .min(1, "وصف الوجبة بالإنجليزية مطلوب")
        .trim(),
    }),
    image: z.string().optional(),
    imageFile: z.instanceof(File, { message: "يرجى رفع صورة" }).optional(),
    categoryId: z
      .string({ message: "التصنيف مطلوب" })
      .min(1, "التصنيف مطلوب")
      .trim(),
    availableForOrder: z.boolean().default(true),
    availableForSubscription: z.boolean().default(true),
    proteinGrams: z.coerce
      .number({ message: "غرامات البروتين يجب أن تكون رقماً" })
      .min(0, "غرامات البروتين لا يمكن أن تكون أقل من 0")
      .default(0),
    carbGrams: z.coerce
      .number({ message: "غرامات الكربوهيدرات يجب أن تكون رقماً" })
      .min(0, "غرامات الكربوهيدرات لا يمكن أن تكون أقل من 0")
      .default(0),
    fatGrams: z.coerce
      .number({ message: "غرامات الدهون يجب أن تكون رقماً" })
      .min(0, "غرامات الدهون لا يمكن أن تكون أقل من 0")
      .default(0),
    isActive: z.boolean().default(true),
    sortOrder: z.coerce
      .number({ message: "ترتيب العرض يجب أن يكون رقماً" })
      .int("ترتيب العرض يجب أن يكون رقماً صحيحاً")
      .min(0, "ترتيب العرض لا يمكن أن يكون أقل من 0")
      .default(0),
  })
  .refine((data) => data.image || data.imageFile, {
    message: "يرجى رفع صورة للوجبة",
    path: ["imageFile"],
  });

export type MealSchemaType = z.infer<typeof mealSchema>;
export default mealSchema;
