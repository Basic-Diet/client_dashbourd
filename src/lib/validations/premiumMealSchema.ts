import { z } from "zod";

const premiumMealSchema = z.object({
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
  imageFile: z.instanceof(File, { message: "الرجاء رفع ملف صورة صالح" }).optional(),
  imageUrl: z.string().optional(),
  currency: z.string().default("SAR"),
  extraFeeSar: z.coerce
    .number({ message: "الرسوم الإضافية يجب أن تكون رقماً" })
    .min(0.01, "يجب أن تكون الرسوم الإضافية أكبر من 0")
    .multipleOf(0.01, "الرسوم يجب أن تكون بدقة هللتين كحد أقصى"),
  calories: z.coerce
    .number({ message: "السعرات الحرارية يجب أن تكون رقماً" })
    .int("السعرات الحرارية يجب أن تكون رقماً صحيحاً")
    .min(1, "يجب أن تكون السعرات الحرارية أكبر من 0"),
  category: z
    .string({ message: "التصنيف مطلوب" })
    .min(1, "التصنيف مطلوب")
    .trim(),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce
    .number({ message: "ترتيب العرض يجب أن يكون رقماً" })
    .int("ترتيب العرض يجب أن يكون رقماً صحيحاً")
    .min(0, "ترتيب العرض لا يمكن أن يكون أقل من 0")
    .default(0),
});

export type PremiumMealSchemaType = z.infer<typeof premiumMealSchema>;
export default premiumMealSchema;
