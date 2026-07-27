import { z } from "zod";

import {
  isCompleteSaudiPhone,
  normalizeSaudiPhoneForSubmit,
} from "@/utils/saudiPhoneInput";

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
    .transform((value) => normalizeSaudiPhoneForSubmit(value))
    .refine((value) => isCompleteSaudiPhone(value), {
      message:
        "رقم الجوال غير صحيح. يجب أن يبدأ بـ +966 ويحتوي على 9 أرقام على الأقل بعد رمز الدولة.",
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