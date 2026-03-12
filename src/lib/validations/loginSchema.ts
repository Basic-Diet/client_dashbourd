import { z } from "zod";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address").toLowerCase().trim(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+=\-{}[\]:;"'<>,.?/\\|`~])[A-Za-z\d@$!%*?&#^()_+=\-{}[\]:;"'<>,.?/\\|`~]{8,}$/,
      "Password must contain uppercase, lowercase, number, and special character",
    ),
});

export type LoginSchemaType = z.infer<typeof loginSchema>;
export default loginSchema;
