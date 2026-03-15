import { z } from "zod";

const mealOptionSchema = z.object({
  mealsPerDay: z.coerce
    .number({ message: "عدد الوجبات مطلوب" })
    .min(1, "يجب أن يكون عدد الوجبات 1 على الأقل"),
  sortOrder: z.coerce.number().min(0).default(0),
  isActive: z.boolean().default(true),
  priceHalala: z.coerce
    .number({ message: "السعر مطلوب" })
    .min(1, "يجب أن يكون السعر أكبر من 0"),
  compareAtHalala: z.coerce
    .number({ message: "سعر المقارنة يجب أن يكون رقم" })
    .min(0)
    .optional()
    .or(z.literal("")),
}).refine(
  (data) => {
    if (data.compareAtHalala && Number(data.compareAtHalala) > 0) {
      return Number(data.compareAtHalala) > Number(data.priceHalala);
    }
    return true;
  },
  {
    message: "سعر المقارنة يجب أن يكون أكبر من السعر الأساسي",
    path: ["compareAtHalala"],
  }
);

const gramOptionSchema = z.object({
  grams: z.coerce
    .number({ message: "عدد الجرامات مطلوب" })
    .min(1, "يجب أن يكون عدد الجرامات أكبر من 0"),
  sortOrder: z.coerce.number().min(0).default(0),
  isActive: z.boolean().default(true),
  mealsOptions: z
    .array(mealOptionSchema)
    .min(1, "يجب إضافة وجبة واحدة على الأقل لكل خيار جرام"),
});

const createPackageSchema = z.object({
  name: z.object({
    ar: z
      .string()
      .min(1, "اسم الباقة بالعربية مطلوب")
      .trim(),
    en: z
      .string()
      .min(1, "اسم الباقة بالإنجليزية مطلوب")
      .trim(),
  }),
  daysCount: z.coerce
    .number({ message: "عدد الأيام مطلوب" })
    .min(1, "يجب أن يكون عدد الأيام أكبر من 0"),
  currency: z.string().default("SAR"),
  sortOrder: z.coerce.number().min(0).default(1),
  isActive: z.boolean().default(true),
  skipAllowanceCompensatedDays: z.coerce.number().min(0).default(0),
  freezePolicy: z.object({
    enabled: z.boolean().default(false),
    maxDays: z.coerce.number().min(0).optional().default(0),
    maxTimes: z.coerce.number().min(0).optional().default(0),
  }),
  gramsOptions: z
    .array(gramOptionSchema)
    .min(1, "يجب إضافة خيار جرام واحد على الأقل"),
});

export type CreatePackageSchemaType = z.infer<typeof createPackageSchema>;
export type MealOptionType = z.infer<typeof mealOptionSchema>;
export type GramOptionType = z.infer<typeof gramOptionSchema>;
export default createPackageSchema;
