import { type QueryClient } from "@tanstack/react-query";
import { categoriesQueryOptions } from "@/hooks/useCategoriesQuery";
import { fetchUpdateCategory } from "@/utils/fetchUpdateCategory";
import type { CategorySchemaType } from "@/lib/validations/categorySchema";
import { ToastMessage } from "@/components/global/ToastMessage";

interface SubmitUpdateCategoryDeps {
  categoryId: string;
  queryClient: QueryClient;
  routerNavigate: (opts: { to: string }) => void;
  setIsSubmitting: (val: boolean) => void;
}

export const submitUpdateCategoryForm = async (
  data: CategorySchemaType,
  { categoryId, queryClient, routerNavigate, setIsSubmitting }: SubmitUpdateCategoryDeps
) => {
  setIsSubmitting(true);
  try {
    await fetchUpdateCategory(categoryId, {
      name: data.name,
      description: data.description,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
    });
    ToastMessage("تم تحديث التصنيف بنجاح! 🎉", "success");
    await queryClient.invalidateQueries(categoriesQueryOptions());
    await queryClient.invalidateQueries({ queryKey: ["meal-category", categoryId] });
    routerNavigate({ to: "/categories" });
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } };
    ToastMessage(
      err?.response?.data?.message || "حدث خطأ أثناء تحديث التصنيف",
      "error"
    );
  } finally {
    setIsSubmitting(false);
  }
};
