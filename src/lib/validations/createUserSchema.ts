import { z } from "zod";

const createUserSchema = z.object({
  fullName: z
    .string()
    .min(1, "الاسم الكامل مطلوب")
    .min(3, "يجب أن يكون الاسم 3 أحرف على الأقل"),
  phoneE164: z
    .string()
    .min(1, "رقم الهاتف مطلوب")
    .regex(
      /^\+\d{10,15}$/,
      "يجب أن يكون رقم الهاتف بصيغة دولية صحيحة (مثال: +966500000000)"
    ),
  email: z
    .string()
    .email("عنوان البريد الإلكتروني غير صالح")
    .optional()
    .or(z.literal("")),
  isActive: z.boolean(),
});

export type CreateUserSchemaType = z.infer<typeof createUserSchema>;
export default createUserSchema;
