import { type QueryClient } from "@tanstack/react-query";
import { addonsQueryOptions, addonByIdQueryOptions } from "@/hooks/useAddonsQuery";
import { fetchUpdateAddon } from "@/utils/fetchUpdateAddon";
import type { AddonSchemaType } from "@/lib/validations/addonSchema";
import { ToastMessage } from "@/components/global/ToastMessage";

interface SubmitUpdateAddonDeps {
  addonId: string;
  queryClient: QueryClient;
  routerNavigate: (opts: { to: string }) => void;
  setIsSubmitting: (val: boolean) => void;
}

export const submitUpdateAddonForm = async (
  data: AddonSchemaType,
  { addonId, queryClient, routerNavigate, setIsSubmitting }: SubmitUpdateAddonDeps
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

    await fetchUpdateAddon(addonId, formData);
    ToastMessage("تم تحديث الإضافة بنجاح! 🎉", "success");
    await queryClient.invalidateQueries(addonsQueryOptions());
    await queryClient.invalidateQueries(addonByIdQueryOptions(addonId));
    routerNavigate({ to: "/addons" });
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } };
    ToastMessage(
      err?.response?.data?.message || "حدث خطأ أثناء تحديث الإضافة",
      "error"
    );
  } finally {
    setIsSubmitting(false);
  }
};
