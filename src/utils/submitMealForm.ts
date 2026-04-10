import { type QueryClient } from "@tanstack/react-query";
import { mealsQueryOptions } from "@/hooks/useMealsQuery";
import { fetchCreateMeal } from "@/utils/fetchCreateMeal";
import type { MealSchemaType } from "@/lib/validations/mealSchema";
import { ToastMessage } from "@/components/global/ToastMessage";

interface SubmitMealDeps {
  queryClient: QueryClient;
  routerNavigate: (opts: { to: string }) => void;
  setIsSubmitting: (val: boolean) => void;
}

export const submitMealForm = async (
  data: MealSchemaType,
  { queryClient, routerNavigate, setIsSubmitting }: SubmitMealDeps
) => {
  setIsSubmitting(true);
  try {
    const formData = new FormData();
    formData.append("name[ar]", data.name.ar);
    formData.append("name[en]", data.name.en);
    formData.append("description[ar]", data.description.ar);
    formData.append("description[en]", data.description.en);
    formData.append("categoryId", data.categoryId);
    formData.append("availableForOrder", String(data.availableForOrder));
    formData.append("availableForSubscription", String(data.availableForSubscription));
    formData.append("proteinGrams", data.proteinGrams.toString());
    formData.append("carbGrams", data.carbGrams.toString());
    formData.append("fatGrams", data.fatGrams.toString());
    formData.append("isActive", String(data.isActive));
    formData.append("sortOrder", data.sortOrder.toString());

    if (data.imageFile) {
      formData.append("image", data.imageFile);
    } else if (data.image) {
      formData.append("image", data.image);
    }

    await fetchCreateMeal(formData);
    ToastMessage("تم إنشاء الوجبة بنجاح! 🎉", "success");
    await queryClient.invalidateQueries(mealsQueryOptions());
    routerNavigate({ to: "/meals" });
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } };
    ToastMessage(
      err?.response?.data?.message || "حدث خطأ أثناء إنشاء الوجبة",
      "error"
    );
  } finally {
    setIsSubmitting(false);
  }
};
