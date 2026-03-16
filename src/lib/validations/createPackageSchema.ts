import { z } from "zod";

const mealOptionSchema = z.object({
  mealsPerDay: z.coerce
    .number({ message: "يجب أن يكون عدد الوجبات رقماً" })
    .int("يجب أن يكون عدد الوجبات رقماً صحيحاً")
    .min(1, "يجب أن يكون عدد الوجبات 1 على الأقل"),
  sortOrder: z.coerce
    .number({ message: "ترتيب العرض يجب أن يكون رقماً" })
    .int("ترتيب العرض يجب أن يكون رقماً صحيحاً")
    .min(0, "ترتيب العرض لا يمكن أن يكون أقل من 0")
    .default(0),
  isActive: z.boolean().default(true),
  priceHalala: z.coerce
    .number({ message: "السعر يجب أن يكون رقماً" })
    .int("السعر يجب أن يكون رقماً صحيحاً (بالهللة)")
    .min(1, "يجب أن يكون السعر أكبر من 0"),
  compareAtHalala: z.coerce
    .number({ message: "سعر المقارنة يجب أن يكون رقماً" })
    .int("سعر المقارنة يجب أن يكون رقماً صحيحاً (بالهللة)")
    .min(0, "سعر المقارنة لا يمكن أن يكون أقل من 0")
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
    .number({ message: "عدد الجرامات يجب أن يكون رقماً" })
    .int("عدد الجرامات يجب أن يكون رقماً صحيحاً")
    .min(1, "يجب أن يكون عدد الجرامات أكبر من 0"),
  sortOrder: z.coerce
    .number({ message: "ترتيب العرض يجب أن يكون رقماً" })
    .int("ترتيب العرض يجب أن يكون رقماً صحيحاً")
    .min(0, "ترتيب العرض لا يمكن أن يكون أقل من 0")
    .default(0),
  isActive: z.boolean().default(true),
  mealsOptions: z
    .array(mealOptionSchema)
    .min(1, "يجب إضافة وجبة واحدة على الأقل لكل خيار جرام"),
});

const createPackageSchema = z.object({
  name: z.object({
    ar: z
      .string({ message: "اسم الباقة بالعربية مطلوب" })
      .min(1, "اسم الباقة بالعربية مطلوب")
      .trim(),
    en: z
      .string({ message: "اسم الباقة بالإنجليزية مطلوب" })
      .min(1, "اسم الباقة بالإنجليزية مطلوب")
      .trim(),
  }),
  daysCount: z.coerce
    .number({ message: "عدد الأيام يجب أن يكون رقماً" })
    .int("عدد الأيام يجب أن يكون رقماً صحيحاً")
    .min(1, "يجب أن يكون عدد الأيام أكبر من 0"),
  currency: z.string().default("SAR"),
  sortOrder: z.coerce
    .number({ message: "ترتيب العرض يجب أن يكون رقماً" })
    .int("ترتيب العرض يجب أن يكون رقماً صحيحاً")
    .min(0, "ترتيب العرض لا يمكن أن يكون أقل من 0")
    .default(1),
  isActive: z.boolean().default(true),
  skipAllowanceCompensatedDays: z.coerce
    .number({ message: "أيام التعويض يجب أن تكون رقماً" })
    .int("أيام التعويض يجب أن تكون رقماً صحيحاً")
    .min(0, "أيام التعويض لا يمكن أن تكون أقل من 0")
    .default(0),
  freezePolicy: z.object({
    enabled: z.boolean().default(false),
    maxDays: z.coerce
      .number({ message: "الحد الأقصى للأيام يجب أن يكون رقماً" })
      .int("الحد الأقصى للأيام يجب أن يكون رقماً صحيحاً")
      .min(1, "الحد الأقصى للأيام يجب أن يكون 1 على الأقل")
      .optional(),
    maxTimes: z.coerce
      .number({ message: "الحد الأقصى للمرات يجب أن يكون رقماً" })
      .int("الحد الأقصى للمرات يجب أن يكون رقماً صحيحاً")
      .min(1, "الحد الأقصى لعدد المرات يجب أن يكون 1 على الأقل")
      .optional(),
  }),
  gramsOptions: z
    .array(gramOptionSchema)
    .min(1, "يجب إضافة خيار جرام واحد على الأقل"),
});

export type CreatePackageSchemaType = z.infer<typeof createPackageSchema>;
export type MealOptionType = z.infer<typeof mealOptionSchema>;
export type GramOptionType = z.infer<typeof gramOptionSchema>;
export default createPackageSchema;
