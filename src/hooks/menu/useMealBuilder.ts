import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { useMutationWithToast } from "@/hooks/useMutationWithToast";
import {
  createMealBuilderDraft,
  getMealBuilder,
  getMealBuilderDraft,
  getMealBuilderHydratedDraft,
  getMealBuilderPicker,
  getMealBuilderReadiness,
  getPublishedMealBuilder,
  publishMealBuilderDraft,
  resetMealBuilderDraft,
  updateMealBuilderDraft,
  validateMealBuilderDraft,
} from "@/utils/fetchMealBuilder";
import type {
  MealBuilderDraftPayload,
  MealBuilderPickerParams,
} from "@/types/mealBuilderTypes";
import { mealBuilderErrorMessage } from "@/components/pages/menu/meal-builder/mealBuilderFrontendUtils";

export const MEAL_BUILDER_KEY = "dashboard.meal-builder";
export const MEAL_BUILDER_PUBLISHED_KEY = "dashboard.meal-builder.published";
export const MEAL_BUILDER_DRAFT_KEY = "dashboard.meal-builder.draft";
export const MEAL_BUILDER_HYDRATED_KEY = "dashboard.meal-builder.hydrated";
export const MEAL_BUILDER_READINESS_KEY = "dashboard.meal-builder.readiness";
export const MEAL_BUILDER_PICKER_KEY = "dashboard.meal-builder.picker";

const mealBuilderInvalidateKeys = [
  [MEAL_BUILDER_KEY],
  [MEAL_BUILDER_PUBLISHED_KEY],
  [MEAL_BUILDER_DRAFT_KEY],
  [MEAL_BUILDER_HYDRATED_KEY],
  [MEAL_BUILDER_READINESS_KEY],
];

export const mealBuilderQueryOptions = () =>
  queryOptions({
    queryKey: [MEAL_BUILDER_KEY],
    queryFn: getMealBuilder,
    staleTime: 1000 * 30,
  });

export const mealBuilderPublishedQueryOptions = () =>
  queryOptions({
    queryKey: [MEAL_BUILDER_PUBLISHED_KEY],
    queryFn: getPublishedMealBuilder,
    staleTime: 1000 * 30,
  });

export const mealBuilderDraftQueryOptions = (enabled = true) =>
  queryOptions({
    queryKey: [MEAL_BUILDER_DRAFT_KEY],
    queryFn: getMealBuilderDraft,
    enabled,
    staleTime: 1000 * 20,
  });

export const mealBuilderReadinessQueryOptions = () =>
  queryOptions({
    queryKey: [MEAL_BUILDER_READINESS_KEY],
    queryFn: getMealBuilderReadiness,
    staleTime: 1000 * 30,
  });

export const mealBuilderHydratedQueryOptions = (enabled = true) =>
  queryOptions({
    queryKey: [MEAL_BUILDER_HYDRATED_KEY],
    queryFn: getMealBuilderHydratedDraft,
    enabled,
    staleTime: 1000 * 20,
  });

export const mealBuilderPickerQueryOptions = (
  sectionKey: string,
  params: MealBuilderPickerParams
) =>
  queryOptions({
    queryKey: [MEAL_BUILDER_PICKER_KEY, sectionKey, params],
    queryFn: () => getMealBuilderPicker(sectionKey, params),
    enabled: Boolean(sectionKey),
    staleTime: 1000 * 15,
  });

export const useMealBuilderQuery = () => useQuery(mealBuilderQueryOptions());

export const useMealBuilderPublishedQuery = () =>
  useQuery(mealBuilderPublishedQueryOptions());

export const useMealBuilderDraftQuery = (enabled = true) =>
  useQuery(mealBuilderDraftQueryOptions(enabled));

export const useMealBuilderHydratedQuery = (enabled = true) =>
  useQuery(mealBuilderHydratedQueryOptions(enabled));

export const useMealBuilderPickerQuery = (
  sectionKey: string,
  params: MealBuilderPickerParams
) => useQuery(mealBuilderPickerQueryOptions(sectionKey, params));

export const useMealBuilderReadinessQuery = () =>
  useQuery(mealBuilderReadinessQueryOptions());

export const useCreateMealBuilderDraftMutation = () =>
  useMutationWithToast({
    mutationFn: createMealBuilderDraft,
    successMessage: "تم إنشاء المسودة",
    errorMessage: (error) =>
      mealBuilderErrorMessage(error, "تعذر إنشاء مسودة منشئ الوجبات"),
    invalidateKeys: mealBuilderInvalidateKeys,
  });

export const useSaveMealBuilderDraftMutation = () =>
  useMutationWithToast({
    mutationFn: updateMealBuilderDraft,
    successMessage: "تم حفظ المسودة",
    errorMessage: (error) =>
      mealBuilderErrorMessage(error, "تعذر حفظ مسودة منشئ الوجبات"),
    invalidateKeys: mealBuilderInvalidateKeys,
  });

export const useResetMealBuilderDraftMutation = () =>
  useMutationWithToast({
    mutationFn: resetMealBuilderDraft,
    successMessage: "تمت إعادة المسودة لتطابق آخر نسخة منشورة",
    errorMessage: (error) =>
      mealBuilderErrorMessage(error, "تعذر إعادة المسودة"),
    invalidateKeys: mealBuilderInvalidateKeys,
  });

export const useValidateMealBuilderDraftMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload?: Partial<MealBuilderDraftPayload>) =>
      validateMealBuilderDraft(payload),
    onSuccess: (response) => {
      const validation = response.data;
      if (validation.ready && validation.errors.length === 0) {
        toast.success(
          validation.warnings.length
            ? "المسودة جاهزة للنشر مع وجود تنبيهات"
            : "المسودة جاهزة للنشر"
        );
      } else {
        toast.error("المسودة تحتوي على أخطاء ويجب إصلاحها قبل النشر");
      }
      invalidateMealBuilderQueries(queryClient);
    },
    onError: (error) => {
      toast.error(
        mealBuilderErrorMessage(error, "تعذر فحص مسودة منشئ الوجبات")
      );
    },
  });
};

export const usePublishMealBuilderDraftMutation = () =>
  useMutationWithToast({
    mutationFn: publishMealBuilderDraft,
    successMessage: "تم نشر المسودة",
    errorMessage: (error) =>
      mealBuilderErrorMessage(error, "تعذر نشر مسودة منشئ الوجبات"),
    invalidateKeys: [
      ...mealBuilderInvalidateKeys,
      ["menu.mealPlannerPreview"],
    ],
  });

function invalidateMealBuilderQueries(
  queryClient: ReturnType<typeof useQueryClient>
) {
  mealBuilderInvalidateKeys.forEach((queryKey) => {
    queryClient.invalidateQueries({ queryKey });
  });
}
