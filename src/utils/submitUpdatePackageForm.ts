import { type QueryClient } from "@tanstack/react-query";
import { packagesQueryOptions } from "@/hooks/usePackagesQuery";
import { fetchUpdatePackage } from "@/utils/fetchUpdatePackage";
import type { CreatePackageSchemaType } from "@/lib/validations/createPackageSchema";
import { ToastMessage } from "@/components/global/ToastMessage";

interface SubmitUpdateDeps {
  planId: string;
  queryClient: QueryClient;
  routerNavigate: (opts: { to: string }) => void;
  setIsSubmitting: (val: boolean) => void;
}

export const submitUpdatePackageForm = async (
  data: CreatePackageSchemaType,
  { planId, queryClient, routerNavigate, setIsSubmitting }: SubmitUpdateDeps
) => {
  setIsSubmitting(true);
  try {
    const payload = {
      ...data,
      gramsOptions: data.gramsOptions.map((gram, gi) => ({
        ...gram,
        sortOrder: gi,
        mealsOptions: gram.mealsOptions.map((meal, mi) => {
          const { priceSar, compareAtSar, ...rest } = meal;
          return {
            ...rest,
            sortOrder: mi,
            priceHalala: Math.round(Number(priceSar) * 100),
            compareAtHalala:
              compareAtSar === "" || compareAtSar === undefined
                ? undefined
                : Math.round(Number(compareAtSar) * 100),
            mealsPerDay: Number(meal.mealsPerDay),
          };
        }),
      })),
      freezePolicy: data.freezePolicy,
    };

    await fetchUpdatePackage(planId, payload as unknown as CreatePackageSchemaType);
    ToastMessage("تم تحديث الباقة بنجاح! 🎉", "success");
    await queryClient.invalidateQueries(packagesQueryOptions());
    routerNavigate({ to: "/packages" });
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } };
    ToastMessage(
      err?.response?.data?.message || "حدث خطأ أثناء تحديث الباقة",
      "error"
    );
  } finally {
    setIsSubmitting(false);
  }
};
