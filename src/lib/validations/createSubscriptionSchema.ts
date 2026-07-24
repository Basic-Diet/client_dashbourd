import { z } from "zod";

const premiumItemSchema = z.object({
  premiumKey: z.string().trim().min(1, "معرف الوجبة المميزة مطلوب"),
  qty: z
    .number()
    .int("الكمية يجب أن تكون رقماً صحيحاً")
    .min(1, "الكمية يجب أن تكون 1 على الأقل"),
});

const addonSelectionSchema = z.object({
  addonPlanId: z.string().trim().min(1, "معرف الإضافة مطلوب"),
  quantityPerDay: z
    .number()
    .int("الكمية اليومية يجب أن تكون رقماً صحيحاً")
    .min(1, "الكمية اليومية يجب أن تكون 1 على الأقل"),
});

const deliveryAddressSchema = z.object({
  label: z.string(),
  city: z.string(),
  district: z.string(),
  street: z.string(),
  building: z.string(),
});

const deliverySlotSchema = z.object({
  type: z.string(),
  window: z.string(),
  slotId: z.string(),
});

export const DELIVERY_SLOT_REQUIRED_MESSAGE = "فترة التوصيل مطلوبة";

const deliverySchema = z.object({
  type: z.enum(["delivery", "pickup"]),
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
    addons: z.array(addonSelectionSchema),
    delivery: deliverySchema,
    paymentMethod: z.enum(["cash", "visa"], {
      message: "يرجى اختيار طريقة الدفع",
    }),
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
      if (!data.delivery.slot.slotId.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: DELIVERY_SLOT_REQUIRED_MESSAGE,
          path: ["delivery", "slot", "slotId"],
        });
      }
      if (!data.delivery.slot.window.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: DELIVERY_SLOT_REQUIRED_MESSAGE,
          path: ["delivery", "slot", "window"],
        });
      }
      if (data.delivery.slot.type !== "delivery") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: DELIVERY_SLOT_REQUIRED_MESSAGE,
          path: ["delivery", "slot", "slotId"],
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
      if (!data.delivery.address.street) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "الشارع مطلوب",
          path: ["delivery", "address", "street"],
        });
      }
      if (!data.delivery.address.building) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "رقم المبنى مطلوب",
          path: ["delivery", "address", "building"],
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
