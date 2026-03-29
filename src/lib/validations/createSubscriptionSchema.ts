import { z } from "zod";

const premiumItemSchema = z.object({
  premiumMealId: z.string().min(1, "معرف الوجبة المميزة مطلوب"),
  qty: z.number().min(1, "الكمية يجب أن تكون 1 على الأقل"),
});

const deliveryAddressSchema = z.object({
  label: z.string().min(1, "تصنيف العنوان مطلوب"),
  city: z.string().min(1, "المدينة مطلوبة"),
  district: z.string().min(1, "الحي مطلوب"),
  street: z.string().min(1, "الشارع مطلوب"),
  building: z.string().min(1, "رقم المبنى مطلوب"),
});

const deliverySlotSchema = z.object({
  type: z.string(),
  window: z.string().min(1, "فترة التوصيل مطلوبة"),
  slotId: z.string().optional(),
});

const deliverySchema = z.object({
  type: z.string(),
  zoneId: z.string().min(1, "منطقة التوصيل مطلوبة"),
  address: deliveryAddressSchema,
  slot: deliverySlotSchema,
});

const createSubscriptionSchema = z.object({
  userId: z.string().min(1, "معرف المستخدم مطلوب"),
  planId: z.string().min(1, "الباقة مطلوبة"),
  grams: z.number().min(1, "الجرامات مطلوبة"),
  mealsPerDay: z.number().min(1, "عدد الوجبات في اليوم مطلوب"),
  startDate: z.string().min(1, "تاريخ البداية مطلوب"),
  premiumItems: z.array(premiumItemSchema),
  addons: z.array(z.object({ value: z.string().min(1, "معرف الإضافة مطلوب") })),
  delivery: deliverySchema,
});

export type CreateSubscriptionSchemaType = z.infer<typeof createSubscriptionSchema>;
export default createSubscriptionSchema;
