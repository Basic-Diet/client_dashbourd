import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Snowflake } from "lucide-react";
import { Controller } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import type { CreatePackageSchemaType } from "@/lib/validations/createPackageSchema";

interface FreezePolicySectionProps {
  form: UseFormReturn<CreatePackageSchemaType>;
}

export function FreezePolicySection({ form }: FreezePolicySectionProps) {
  const freezeEnabled = form.watch("freezePolicy.enabled");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <Snowflake className="size-4" />
            </div>
            سياسة التجميد
          </CardTitle>
          <label className="flex cursor-pointer items-center gap-2">
            <span className="text-sm">
              {freezeEnabled ? "مفعّلة" : "معطّلة"}
            </span>
            <Controller
              control={form.control}
              name="freezePolicy.enabled"
              render={({ field }) => (
                <Switch
                  type="button"
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </label>
        </div>
        <CardDescription>
          عند التفعيل، يمكن للمشترك تجميد الباقة
        </CardDescription>
      </CardHeader>

      {freezeEnabled && (
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">الحد الأقصى للأيام</Label>
              <Input
                type="number"
                min="1"
                placeholder="31"
                {...form.register("freezePolicy.maxDays")}
                aria-invalid={!!form.formState.errors.freezePolicy?.maxDays}
              />
              {form.formState.errors.freezePolicy?.maxDays && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.freezePolicy.maxDays.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                الحد الأقصى لعدد مرات التجميد
              </Label>
              <Input
                type="number"
                min="1"
                placeholder="1"
                {...form.register("freezePolicy.maxTimes")}
                aria-invalid={!!form.formState.errors.freezePolicy?.maxTimes}
              />
              {form.formState.errors.freezePolicy?.maxTimes && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.freezePolicy.maxTimes.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
