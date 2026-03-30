import { type QueryClient } from "@tanstack/react-query";
import { packagesQueryOptions } from "@/hooks/usePackagesQuery";
import { fetchCreatePackage } from "@/utils/fetchCreatePackage";
import type { CreatePackageSchemaType } from "@/lib/validations/createPackageSchema";
import { ToastMessage } from "@/components/global/ToastMessage";

interface SubmitPackageDeps {
  queryClient: QueryClient;
  routerNavigate: (opts: { to: string }) => void;
  setIsSubmitting: (val: boolean) => void;
}

export const submitPackageForm = async (
  data: CreatePackageSchemaType,
  { queryClient, routerNavigate, setIsSubmitting }: SubmitPackageDeps
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

    await fetchCreatePackage(payload as unknown as CreatePackageSchemaType);
    ToastMessage("تم إنشاء الباقة بنجاح! 🎉", "success");
    await queryClient.invalidateQueries(packagesQueryOptions());
    routerNavigate({ to: "/packages" });
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } };
    ToastMessage(
      err?.response?.data?.message || "حدث خطأ أثناء إنشاء الباقة",
      "error"
    );
  } finally {
    setIsSubmitting(false);
  }
};
