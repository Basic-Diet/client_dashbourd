import { z } from "zod";

const premiumMealSchema = z
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
    // The current image URL (used when editing)
    image: z.string().optional(),
    // The new image file (used when selected)
    imageFile: z.instanceof(File, { message: "يرجى رفع صورة" }).optional(),
    currency: z.string().default("SAR"),
    extraFeeSar: z.coerce
      .number({ message: "الرسوم الإضافية يجب أن تكون رقماً" })
      .min(0, "يجب أن تكون الرسوم الإضافية أكبر من أو تساوي 0")
      .multipleOf(0.01, "الرسوم يجب أن تكون بدقة هللتين كحد أقصى"),
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

export type PremiumMealSchemaType = z.infer<typeof premiumMealSchema>;
export default premiumMealSchema;
