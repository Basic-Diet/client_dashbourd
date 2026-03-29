import type { CreateSubscriptionSchemaType } from "@/lib/validations/createSubscriptionSchema";
import createSubscriptionSchema from "@/lib/validations/createSubscriptionSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

const useCreateSubscriptionForm = (userId: string) => {
  const form = useForm<CreateSubscriptionSchemaType>({
    resolver: zodResolver(createSubscriptionSchema),
    defaultValues: {
      userId,
      planId: "",
      grams: 350,
      mealsPerDay: 2,
      startDate: "",
      premiumItems: [],
      addons: [],
      delivery: {
        type: "delivery",
        zoneId: "",
        address: {
          label: "",
          city: "",
          district: "",
          street: "",
          building: "",
        },
        slot: {
          type: "delivery",
          window: "",
          slotId: "",
        },
      },
    },
  });

  return form;
};

export default useCreateSubscriptionForm;
