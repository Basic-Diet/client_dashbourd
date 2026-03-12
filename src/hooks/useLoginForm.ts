import type { LoginSchemaType } from "@/lib/validations/loginSchema"
import loginSchema from "@/lib/validations/loginSchema"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

const useLoginForm = () => {
  const form = useForm<LoginSchemaType>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  return form
}

export default useLoginForm
