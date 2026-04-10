import { type QueryClient } from "@tanstack/react-query";
import { categoriesQueryOptions } from "@/hooks/useCategoriesQuery";
import { fetchCreateCategory } from "@/utils/fetchCreateCategory";
import type { CategorySchemaType } from "@/lib/validations/categorySchema";
import { ToastMessage } from "@/components/global/ToastMessage";

interface SubmitCategoryDeps {
  queryClient: QueryClient;
  routerNavigate: (opts: { to: string }) => void;
  setIsSubmitting: (val: boolean) => void;
}

export const submitCategoryForm = async (
  data: CategorySchemaType,
  { queryClient, routerNavigate, setIsSubmitting }: SubmitCategoryDeps
) => {
  setIsSubmitting(true);
  try {
    await fetchCreateCategory({
      name: data.name,
      description: data.description,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
    });
    ToastMessage("تم إنشاء التصنيف بنجاح! 🎉", "success");
    await queryClient.invalidateQueries(categoriesQueryOptions());
    routerNavigate({ to: "/categories" });
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } };
    ToastMessage(
      err?.response?.data?.message || "حدث خطأ أثناء إنشاء التصنيف",
      "error"
    );
  } finally {
    setIsSubmitting(false);
  }
};
