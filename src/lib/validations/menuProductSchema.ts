import { z } from "zod";
import {
  DEFAULT_MENU_AVAILABLE_FOR,
  MENU_AVAILABLE_CHANNELS,
  MENU_PRODUCT_CARD_SIZES,
} from "@/constants/menuCatalog";
import { riyalToHalala } from "@/utils/price";
import { isModernWeightPricingFormMode } from "@/utils/menuWeightPricingMode";

const optionalGeneratedKey = z
  .string()
  .trim()
  .regex(
    /^[a-z0-9_]+$/,
    "المفتاح يجب أن يحتوي فقط على حروف إنجليزية صغيرة وأرقام و _"
  )
  .or(z.literal(""))
  .optional()
  .default("");

const addIssue = (
  ctx: z.RefinementCtx,
  path: string,
  message: string
) => {
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message,
    path: [path],
  });
};

const menuProductSchema = z
  .object({
    categoryId: z
      .string({ message: "التصنيف مطلوب" })
      .min(1, "التصنيف مطلوب"),
    key: optionalGeneratedKey,
    itemType: z.string().trim().optional().default("product"),
    name: z.object({
      ar: z
        .string({ message: "الاسم بالعربية مطلوب" })
        .min(1, "الاسم بالعربية مطلوب")
        .trim(),
      en: z
        .string({ message: "الاسم بالإنجليزية مطلوب" })
        .min(1, "الاسم بالإنجليزية مطلوب")
        .trim(),
    }),
    description: z.object({
      ar: z.string().default(""),
      en: z.string().default(""),
    }),
    imageFile: z.unknown().optional(),
    imageUrl: z.string().trim().optional(),
    pricingModel: z.enum(["fixed", "per_100g"], {
      message: "نوع التسعير مطلوب",
    }),
    priceSar: z.coerce
      .number({ message: "السعر مطلوب" })
      .min(0, "السعر لا يمكن أن يكون أقل من 0"),
    baseUnitGrams: z.coerce.number().optional(),
    defaultWeightGrams: z.coerce.number().optional(),
    minWeightGrams: z.coerce.number().optional(),
    maxWeightGrams: z.coerce.number().optional(),
    weightStepGrams: z.coerce.number().optional(),
    weightStepPriceSar: z.coerce.number().optional(),
    useWeightStepPricing: z.boolean().default(false),
    weightPricingFormMode: z
      .enum([
        "fixed",
        "new_modern",
        "legacy",
        "legacy_migration",
        "existing_modern",
        "fixed_to_modern",
      ])
      .default("fixed"),
    isActive: z.boolean().default(true),
    isAvailable: z.boolean().default(true),
    isVisible: z.boolean().default(true),
    isCustomizable: z.boolean().default(false),
    availableFor: z
      .array(z.enum(MENU_AVAILABLE_CHANNELS))
      .default([...DEFAULT_MENU_AVAILABLE_FOR]),
    ui: z
      .object({
        cardSize: z.enum(MENU_PRODUCT_CARD_SIZES).default("medium"),
      })
      .default({ cardSize: "medium" }),
    sortOrder: z.coerce
      .number({ message: "ترتيب العرض يجب أن يكون رقما" })
      .int("ترتيب العرض يجب أن يكون رقما صحيحا")
      .min(0, "ترتيب العرض لا يمكن أن يكون أقل من 0")
      .default(0),
  })
  .superRefine((data, ctx) => {
    const priceHalala = riyalToHalala(data.priceSar);
    if (!Number.isInteger(priceHalala) || priceHalala < 0) {
      addIssue(ctx, "priceSar", "السعر يجب أن يكون قيمة صحيحة بالريال");
    }

    const requiresModernWeightPricing =
      data.pricingModel === "per_100g" &&
      (data.useWeightStepPricing ||
        isModernWeightPricingFormMode(data.weightPricingFormMode));

    if (!requiresModernWeightPricing) return;

    const positiveIntegerFields = [
      ["baseUnitGrams", data.baseUnitGrams, "وزن السعر الأساسي مطلوب"],
      ["defaultWeightGrams", data.defaultWeightGrams, "الوزن الافتراضي مطلوب"],
      ["minWeightGrams", data.minWeightGrams, "الحد الأدنى مطلوب"],
      ["maxWeightGrams", data.maxWeightGrams, "الحد الأقصى مطلوب"],
      ["weightStepGrams", data.weightStepGrams, "خطوة الوزن مطلوبة"],
    ] as const;

    for (const [path, value, message] of positiveIntegerFields) {
      if (!Number.isInteger(value) || (value ?? 0) <= 0) {
        addIssue(ctx, path, message);
      }
    }

    const stepPriceHalala = riyalToHalala(data.weightStepPriceSar);
    if (!Number.isInteger(stepPriceHalala) || stepPriceHalala < 0) {
      addIssue(
        ctx,
        "weightStepPriceSar",
        "سعر خطوة الوزن يجب أن يكون قيمة صحيحة بالريال"
      );
    }

    const base = data.baseUnitGrams ?? 0;
    const defaultWeight = data.defaultWeightGrams ?? 0;
    const min = data.minWeightGrams ?? 0;
    const max = data.maxWeightGrams ?? 0;
    const step = data.weightStepGrams ?? 0;
    const hasPositiveWeights =
      base > 0 && defaultWeight > 0 && min > 0 && max > 0 && step > 0;

    if (!hasPositiveWeights) return;

    if (min !== base) {
      addIssue(ctx, "minWeightGrams", "الحد الأدنى يجب أن يساوي وزن السعر الأساسي");
    }

    if (max < min) {
      addIssue(
        ctx,
        "maxWeightGrams",
        "الحد الأقصى يجب أن يكون أكبر من الحد الأدنى أو يساويه"
      );
    }

    if (defaultWeight < min || defaultWeight > max) {
      addIssue(
        ctx,
        "defaultWeightGrams",
        "الوزن الافتراضي يجب أن يكون بين الحد الأدنى والأقصى"
      );
    }

    if ((max - min) % step !== 0) {
      addIssue(
        ctx,
        "maxWeightGrams",
        "مدى الأوزان يجب أن يقبل القسمة على خطوة الوزن"
      );
    }

    if ((defaultWeight - min) % step !== 0) {
      addIssue(
        ctx,
        "defaultWeightGrams",
        "الوزن الافتراضي يجب أن يوافق خطوة الوزن"
      );
    }

    if (base % step !== 0) {
      addIssue(
        ctx,
        "baseUnitGrams",
        "وزن السعر الأساسي يجب أن يقبل القسمة على خطوة الوزن"
      );
    }
  });

export type MenuProductSchemaInput = z.input<typeof menuProductSchema>;
export type MenuProductSchemaType = z.output<typeof menuProductSchema>;
export default menuProductSchema;
