import { type QueryClient } from "@tanstack/react-query";
import { premiumMealsQueryOptions } from "@/hooks/usePremiumMealsQuery";
import { fetchUpdatePremiumMeal } from "@/utils/fetchUpdatePremiumMeal";
import type { PremiumMealSchemaType } from "@/lib/validations/premiumMealSchema";
import { ToastMessage } from "@/components/global/ToastMessage";

interface SubmitUpdatePremiumMealDeps {
  mealId: string;
  queryClient: QueryClient;
  routerNavigate: (opts: { to: string }) => void;
  setIsSubmitting: (val: boolean) => void;
}

export const submitUpdatePremiumMealForm = async (
  data: PremiumMealSchemaType,
  { mealId, queryClient, routerNavigate, setIsSubmitting }: SubmitUpdatePremiumMealDeps
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
    formData.append("calories", data.calories.toString());
    formData.append("category", data.category);
    formData.append("isActive", String(data.isActive));
    formData.append("sortOrder", data.sortOrder.toString());

    if (data.imageFile) {
      formData.append("image", data.imageFile);
    } else if (data.imageUrl) {
      formData.append("imageUrl", data.imageUrl);
    }

    await fetchUpdatePremiumMeal(mealId, formData);
    ToastMessage("تم تحديث الوجبة المميزة بنجاح! 🎉", "success");
    await queryClient.invalidateQueries(premiumMealsQueryOptions());
    routerNavigate({ to: "/premium-meals" });
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } };
    ToastMessage(
      err?.response?.data?.message || "حدث خطأ أثناء تحديث الوجبة المميزة",
      "error"
    );
  } finally {
    setIsSubmitting(false);
  }
};
