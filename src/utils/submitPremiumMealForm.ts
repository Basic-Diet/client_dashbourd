import { type QueryClient } from "@tanstack/react-query";
import { premiumMealsQueryOptions } from "@/hooks/usePremiumMealsQuery";
import { fetchCreatePremiumMeal } from "@/utils/fetchCreatePremiumMeal";
import type { PremiumMealSchemaType } from "@/lib/validations/premiumMealSchema";
import { ToastMessage } from "@/components/global/ToastMessage";

interface SubmitPremiumMealDeps {
  queryClient: QueryClient;
  routerNavigate: (opts: { to: string }) => void;
  setIsSubmitting: (val: boolean) => void;
}

export const submitPremiumMealForm = async (
  data: PremiumMealSchemaType,
  { queryClient, routerNavigate, setIsSubmitting }: SubmitPremiumMealDeps
) => {
  setIsSubmitting(true);
  try {
    const formData = new FormData();
    formData.append("name[ar]", data.name.ar);
    formData.append("name[en]", data.name.en);
    formData.append("description[ar]", data.description.ar);
    formData.append("description[en]", data.description.en);
    formData.append("currency", data.currency);
    formData.append("extraFeeHalala", Math.round(Number(data.extraFeeSar) * 100).toString());
    formData.append("isActive", String(data.isActive));
    formData.append("sortOrder", data.sortOrder.toString());

    if (data.imageFile) {
      formData.append("image", data.imageFile);
    } else if (data.image) {
      formData.append("image", data.image);
    }

    await fetchCreatePremiumMeal(formData);
    ToastMessage("تم إنشاء الوجبة المميزة بنجاح! 🎉", "success");
    await queryClient.invalidateQueries(premiumMealsQueryOptions());
    routerNavigate({ to: "/premium-meals" });
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } };
    ToastMessage(
      err?.response?.data?.message || "حدث خطأ أثناء إنشاء الوجبة المميزة",
      "error"
    );
  } finally {
    setIsSubmitting(false);
  }
};
