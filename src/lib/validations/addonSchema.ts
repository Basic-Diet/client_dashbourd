import { z } from "zod";

const addonSchema = z.object({
  name: z.object({
    ar: z
      .string({ message: "اسم الإضافة بالعربية مطلوب" })
      .min(1, "اسم الإضافة بالعربية مطلوب")
      .trim(),
    en: z
      .string({ message: "اسم الإضافة بالإنجليزية مطلوب" })
      .min(1, "اسم الإضافة بالإنجليزية مطلوب")
      .trim(),
  }),
  description: z.object({
    ar: z
      .string({ message: "وصف الإضافة بالعربية مطلوب" })
      .min(1, "وصف الإضافة بالعربية مطلوب")
      .trim(),
    en: z
      .string({ message: "وصف الإضافة بالإنجليزية مطلوب" })
      .min(1, "وصف الإضافة بالإنجليزية مطلوب")
      .trim(),
  }),
  imageFile: z.instanceof(File, { message: "الرجاء رفع ملف صورة صالح" }).optional(),
  imageUrl: z.string().optional(),
  currency: z.string().default("SAR"),
  priceSar: z.coerce
    .number({ message: "السعر يجب أن يكون رقماً" })
    .min(0, "يجب أن يكون السعر 0 أو أكبر")
    .multipleOf(0.01, "السعر يجب أن يكون بدقة هللتين كحد أقصى"),
  category: z
    .string({ message: "التصنيف مطلوب" })
    .min(1, "التصنيف مطلوب")
    .trim(),
  type: z.enum(["subscription", "one_time"], {
    message: "يجب اختيار نوع الإضافة بشكل صحيح",
  }).default("subscription"),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce
    .number({ message: "ترتيب العرض يجب أن يكون رقماً" })
    .int("ترتيب العرض يجب أن يكون رقماً صحيحاً")
    .min(0, "ترتيب العرض لا يمكن أن يكون أقل من 0")
    .default(0),
});

export type AddonSchemaType = z.infer<typeof addonSchema>;
export default addonSchema;
