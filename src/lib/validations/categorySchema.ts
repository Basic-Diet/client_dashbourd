import { z } from "zod";

const categorySchema = z.object({
  name: z.object({
    ar: z
      .string({ message: "اسم التصنيف بالعربية مطلوب" })
      .min(1, "اسم التصنيف بالعربية مطلوب")
      .trim(),
    en: z
      .string({ message: "اسم التصنيف بالإنجليزية مطلوب" })
      .min(1, "اسم التصنيف بالإنجليزية مطلوب")
      .trim(),
  }),
  description: z.object({
    ar: z
      .string({ message: "وصف التصنيف بالعربية مطلوب" })
      .min(1, "وصف التصنيف بالعربية مطلوب")
      .trim(),
    en: z
      .string({ message: "وصف التصنيف بالإنجليزية مطلوب" })
      .min(1, "وصف التصنيف بالإنجليزية مطلوب")
      .trim(),
  }),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce
    .number({ message: "ترتيب العرض يجب أن يكون رقماً" })
    .int("ترتيب العرض يجب أن يكون رقماً صحيحاً")
    .min(0, "ترتيب العرض لا يمكن أن يكون أقل من 0")
    .default(0),
});

export type CategorySchemaType = z.infer<typeof categorySchema>;
export default categorySchema;
