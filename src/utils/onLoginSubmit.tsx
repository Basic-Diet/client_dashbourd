import { ToastMessage } from "@/components/global/ToastMessage"
import type { LoginSchemaType } from "@/lib/validations/loginSchema"

export const onLoginSubmit = (formData: LoginSchemaType) => {
  console.log(formData)
  ToastMessage("Login successful", "success")
}
