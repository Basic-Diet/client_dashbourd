import type { CreateUserSchemaType } from "@/lib/validations/createUserSchema";
import createUserSchema from "@/lib/validations/createUserSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

const useCreateUserForm = () => {
  const form = useForm<CreateUserSchemaType>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      fullName: "",
      phoneE164: "+966",
      email: "",
      isActive: true,
    },
  });

  return form;
};

export default useCreateUserForm;
