import { toast } from "sonner";
import { type QueryClient } from "@tanstack/react-query";
import { packagesQueryOptions } from "@/hooks/usePackagesQuery";
import { fetchCreatePackage } from "@/utils/fetchCreatePackage";
import type { CreatePackageSchemaType } from "@/lib/validations/createPackageSchema";

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
        mealsOptions: gram.mealsOptions.map((meal, mi) => ({
          ...meal,
          sortOrder: mi,
          compareAtHalala:
            meal.compareAtHalala === "" || meal.compareAtHalala === undefined
              ? undefined
              : Number(meal.compareAtHalala),
          priceHalala: Number(meal.priceHalala),
          mealsPerDay: Number(meal.mealsPerDay),
        })),
      })),
      freezePolicy: data.freezePolicy.enabled
        ? data.freezePolicy
        : { enabled: false, maxDays: 0, maxTimes: 0 },
    };

    await fetchCreatePackage(payload as CreatePackageSchemaType);
    toast.success("تم إنشاء الباقة بنجاح! 🎉");
    await queryClient.invalidateQueries(packagesQueryOptions());
    routerNavigate({ to: "/packages" });
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } };
    toast.error(err?.response?.data?.message || "حدث خطأ أثناء إنشاء الباقة");
  } finally {
    setIsSubmitting(false);
  }
};
