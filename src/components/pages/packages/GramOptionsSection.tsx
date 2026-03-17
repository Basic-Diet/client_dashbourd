import { Button } from "@/components/ui/button";
import { Plus, Weight } from "lucide-react";
import type { UseFormReturn, UseFieldArrayReturn } from "react-hook-form";
import type {
  CreatePackageSchemaType,
  MealOptionType,
} from "@/lib/validations/createPackageSchema";
import { GramCard } from "./GramCard";

interface GramOptionsSectionProps {
  form: UseFormReturn<CreatePackageSchemaType>;
  gramsFieldArray: UseFieldArrayReturn<
    CreatePackageSchemaType,
    "gramsOptions",
    "id"
  >;
  addGram: () => void;
  removeGram: (index: number) => void;
  defaultMeal: MealOptionType;
}

export function GramOptionsSection({
  form,
  gramsFieldArray,
  addGram,
  removeGram,
  defaultMeal,
}: GramOptionsSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Weight className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">خيارات الجرام</h2>
            <p className="text-sm text-muted-foreground">
              أضف خيارات الجرام والوجبات لكل خيار
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={addGram}
          className="gap-2"
        >
          <Plus className="size-4" />
          إضافة جرام
        </Button>
      </div>

      {form.formState.errors.gramsOptions?.root && (
        <p className="text-sm text-destructive">
          {form.formState.errors.gramsOptions.root.message}
        </p>
      )}

      <div className="space-y-4">
        {gramsFieldArray.fields.map((field, gramIndex) => (
          <GramCard
            key={field.id}
            gramIndex={gramIndex}
            form={form}
            onRemove={() => removeGram(gramIndex)}
            canRemove={gramsFieldArray.fields.length > 1}
            defaultMeal={defaultMeal}
          />
        ))}
      </div>
    </div>
  );
}
