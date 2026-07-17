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
      grams: 0,
      mealsPerDay: 0,
      startDate: "",
      premiumItems: [],
      addons: [],
      delivery: {
        type: "delivery",
        zoneId: "",
        pickupLocationId: "",
        address: {
          label: "",
          line1: "",
          line2: "",
          city: "",
          district: "",
          phone: "",
          notes: "",
        },
        slot: {
          type: "delivery",
          window: "",
          slotId: "",
        },
      },
      promoCode: "",
    },
  });

  return form;
};

export default useCreateSubscriptionForm;
