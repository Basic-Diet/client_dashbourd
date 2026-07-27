import { z } from "zod";

import { normalizePhoneE164 } from "@/utils/fetchUsersData";

const optionalTemporaryPassword = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine(
    (value) =>
      !value ||
      (/[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value)),
    {
      message:
        "كلمة المرور المؤقتة يجب أن تحتوي على حرف إنجليزي كبير وحرف إنجليزي صغير ورقم.",
    }
  );

const createUserSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "الاسم الكامل مطلوب")
    .min(3, "يجب أن يكون الاسم 3 أحرف على الأقل"),
  phoneE164: z
    .string()
    .trim()
    .min(1, "رقم الجوال مطلوب")
    .transform((value) => normalizePhoneE164(value))
    .refine((value) => /^\+9665\d{8}$/.test(value), {
      message:
        "رقم الجوال غير صحيح. استخدم رقمًا سعوديًا كاملًا مثل +966566796659.",
    }),
  email: z
    .string()
    .trim()
    .email("عنوان البريد الإلكتروني غير صالح")
    .optional()
    .or(z.literal("")),
  temporaryPassword: optionalTemporaryPassword,
  isActive: z.boolean(),
});

export type CreateUserSchemaType = z.infer<typeof createUserSchema>;
export default createUserSchema;
