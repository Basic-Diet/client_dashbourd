import { z } from "zod";

const premiumItemSchema = z.object({
  premiumKey: z.string().min(1, "معرف الوجبة المميزة مطلوب"),
  qty: z
    .number()
    .int("الكمية يجب أن تكون رقماً صحيحاً")
    .min(1, "الكمية يجب أن تكون 1 على الأقل"),
});

const deliveryAddressSchema = z.object({
  label: z.string(),
  line1: z.string(),
  line2: z.string().optional(),
  city: z.string(),
  district: z.string(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

const deliverySlotSchema = z.object({
  type: z.string(),
  window: z.string(),
  slotId: z.string(),
});

const deliverySchema = z.object({
  type: z.string().min(1, "طريقة التوصيل مطلوبة"),
  zoneId: z.string(),
  pickupLocationId: z.string().optional(),
  address: deliveryAddressSchema,
  slot: deliverySlotSchema,
});

const createSubscriptionSchema = z
  .object({
    userId: z.string().min(1, "معرف المستخدم مطلوب"),
    planId: z.string().min(1, "الباقة مطلوبة"),
    grams: z.number().min(1, "الجرامات مطلوبة"),
    mealsPerDay: z.number().min(1, "عدد الوجبات في اليوم مطلوب"),
    startDate: z.string().min(1, "تاريخ البداية مطلوب"),
    premiumItems: z.array(premiumItemSchema),
    addons: z.array(
      z.object({
        addonId: z.string().min(1, "معرف الإضافة مطلوب"),
        qty: z
          .number()
          .int("الكمية يجب أن تكون رقماً صحيحاً")
          .min(1, "الكمية يجب أن تكون 1 على الأقل"),
      })
    ),
    promoCode: z.string().optional(),
    delivery: deliverySchema,
  })
  .superRefine((data, ctx) => {
    if (data.delivery.type === "delivery") {
      if (!data.delivery.zoneId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "منطقة التوصيل مطلوبة",
          path: ["delivery", "zoneId"],
        });
      }
      if (!data.delivery.address.label) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "تصنيف العنوان مطلوب",
          path: ["delivery", "address", "label"],
        });
      }
      if (!data.delivery.address.city) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "المدينة مطلوبة",
          path: ["delivery", "address", "city"],
        });
      }
      if (!data.delivery.address.district) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "الحي مطلوب",
          path: ["delivery", "address", "district"],
        });
      }
      if (!data.delivery.address.line1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "العنوان مطلوب",
          path: ["delivery", "address", "line1"],
        });
      }
    }

    if (data.delivery.type === "pickup" && !data.delivery.pickupLocationId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "فرع الاستلام مطلوب",
        path: ["delivery", "pickupLocationId"],
      });
    }
  });

export type CreateSubscriptionSchemaType = z.infer<
  typeof createSubscriptionSchema
>;
export default createSubscriptionSchema;
