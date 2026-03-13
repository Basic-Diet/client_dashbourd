import { z } from "zod";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "البريد الإلكتروني مطلوب")
    .email("عنوان البريد الإلكتروني غير صالح")
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, "يجب أن تكون كلمة المرور مكونة من 8 أحرف على الأقل")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&#^()_+=\-{}[\]:;"'<>,.?/\\|`~]{8,}$/,
      "يجب أن تحتوي كلمة المرور على حرف كبير واحد، حرف صغير واحد، ورقم واحد على الأقل (مثال: StrongPass123)"
    ),
});

export type LoginSchemaType = z.infer<typeof loginSchema>;
export default loginSchema;
