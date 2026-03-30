import { type QueryClient } from "@tanstack/react-query";
import { addonsQueryOptions } from "@/hooks/useAddonsQuery";
import { fetchCreateAddon } from "@/utils/fetchCreateAddon";
import type { AddonSchemaType } from "@/lib/validations/addonSchema";
import { ToastMessage } from "@/components/global/ToastMessage";

interface SubmitAddonDeps {
  queryClient: QueryClient;
  routerNavigate: (opts: { to: string }) => void;
  setIsSubmitting: (val: boolean) => void;
}

export const submitAddonForm = async (
  data: AddonSchemaType,
  { queryClient, routerNavigate, setIsSubmitting }: SubmitAddonDeps
) => {
  setIsSubmitting(true);
  try {
    const formData = new FormData();
    formData.append("name[ar]", data.name.ar);
    formData.append("name[en]", data.name.en);
    formData.append("description[ar]", data.description.ar);
    formData.append("description[en]", data.description.en);
    formData.append("currency", data.currency);
    formData.append("priceHalala", Math.round(Number(data.priceSar) * 100).toString());
    formData.append("category", data.category);
    formData.append("type", data.type);
    formData.append("isActive", String(data.isActive));
    formData.append("sortOrder", data.sortOrder.toString());

    if (data.imageFile) {
      formData.append("image", data.imageFile);
    } else if (data.imageUrl) {
      formData.append("imageUrl", data.imageUrl);
    }

    await fetchCreateAddon(formData);
    ToastMessage("تم إنشاء الإضافة بنجاح! 🎉", "success");
    await queryClient.invalidateQueries(addonsQueryOptions());
    routerNavigate({ to: "/addons" });
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } };
    ToastMessage(
      err?.response?.data?.message || "حدث خطأ أثناء إنشاء الإضافة",
      "error"
    );
  } finally {
    setIsSubmitting(false);
  }
};
