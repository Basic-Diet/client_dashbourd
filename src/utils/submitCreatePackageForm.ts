import type { QueryClient } from "@tanstack/react-query";
import { packagesQueryOptions } from "@/hooks/usePackagesQuery";
import type { CreatePackageSchemaType } from "@/lib/validations/createPackageSchema";
import { ToastMessage } from "@/components/global/ToastMessage";
import { fetchCreatePackage } from "@/utils/fetchCreatePackage";
import { optionalRiyalToHalala, riyalToHalala } from "@/utils/price";

interface SubmitCreateDeps {
  queryClient: QueryClient;
  routerNavigate: (opts: { to: string }) => void;
  setIsSubmitting: (val: boolean) => void;
}

export const buildPackagePayload = (data: CreatePackageSchemaType) => ({
  ...data,
  gramsOptions: data.gramsOptions.map((gram, gi) => ({
    ...gram,
    sortOrder: gi,
    mealsOptions: gram.mealsOptions.map((meal, mi) => {
      const { priceSar, compareAtSar, ...rest } = meal;
      return {
        ...rest,
        sortOrder: mi,
        priceHalala: riyalToHalala(priceSar),
        compareAtHalala: optionalRiyalToHalala(compareAtSar),
        mealsPerDay: Number(meal.mealsPerDay),
      };
    }),
  })),
  freezePolicy: data.freezePolicy,
});

export const submitCreatePackageForm = async (
  data: CreatePackageSchemaType,
  { queryClient, routerNavigate, setIsSubmitting }: SubmitCreateDeps
) => {
  setIsSubmitting(true);
  try {
    await fetchCreatePackage(buildPackagePayload(data));
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
