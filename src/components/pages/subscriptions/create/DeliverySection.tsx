import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDeliveryOptionsQuery } from "@/hooks/useDeliveryOptionsQuery";
import { Truck, MapPin, Store } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import type { CreateSubscriptionSchemaType } from "@/lib/validations/createSubscriptionSchema";
import type { DeliveryMethod, DeliveryArea, DeliverySlotOption } from "@/types/deliveryTypes";

interface DeliverySectionProps {
  form: UseFormReturn<CreateSubscriptionSchemaType>;
}

export function DeliverySection({ form }: DeliverySectionProps) {
  const { data: deliveryResponse, isLoading } = useDeliveryOptionsQuery();
  const deliveryData = deliveryResponse?.data;

  const methods = deliveryData?.methods || [];
  const areas = deliveryData?.areas?.filter((a) => a.isActive) || [];

  const selectedMethodId = form.watch("delivery.type");
  const selectedMethod = methods.find((m: DeliveryMethod) => m.id === selectedMethodId);

  const isDelivery = selectedMethodId === "delivery";
  const isPickup = selectedMethodId === "pickup";
  const slots = selectedMethod?.slots || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
            <Truck className="size-4" />
          </div>
          معلومات التوصيل
        </CardTitle>
        <CardDescription>اختر طريقة التوصيل وحدد التفاصيل</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Method selection */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {methods.map((method: DeliveryMethod) => {
                const isSelected = selectedMethodId === method.id;
                const Icon = method.type === "delivery" ? Truck : Store;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => {
                      form.setValue("delivery.type", method.id, { shouldValidate: true });
                      form.setValue("delivery.slot.type", method.type);
                      form.setValue("delivery.slot.window", "");
                      form.setValue("delivery.slot.slotId", "");
                      if (method.type === "pickup") {
                        form.setValue("delivery.zoneId", "");
                      }
                    }}
                    className={`flex items-start gap-3 rounded-xl border p-4 text-right transition-all ${
                      isSelected
                        ? "border-primary/40 bg-primary/5 shadow-sm ring-1 ring-primary/20"
                        : "border-border/50 hover:border-border hover:bg-muted/30"
                    }`}
                  >
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
                        isSelected
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{method.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{method.subtitle}</p>
                      <span className="mt-1.5 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {method.feeLabel}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Delivery Zone selection */}
            {isDelivery && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  <MapPin className="ml-1 inline size-3.5" />
                  منطقة التوصيل
                </Label>
                <Select
                  value={form.watch("delivery.zoneId")}
                  onValueChange={(value) =>
                    form.setValue("delivery.zoneId", value, { shouldValidate: true })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المنطقة" />
                  </SelectTrigger>
                  <SelectContent>
                    {areas.map((area: DeliveryArea) => (
                      <SelectItem key={area.zoneId} value={area.zoneId}>
                        <span className="flex items-center gap-2">
                          {area.name}
                          <span className="text-xs text-muted-foreground">
                            ({area.feeLabel})
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.delivery?.zoneId && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.delivery.zoneId.message}
                  </p>
                )}
              </div>
            )}

            {/* Time slot selection */}
            {slots.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">فترة التوصيل</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {slots.map((slot: DeliverySlotOption) => {
                    const isSelected =
                      form.watch("delivery.slot.slotId") === slot.id;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => {
                          form.setValue("delivery.slot.slotId", slot.id);
                          form.setValue("delivery.slot.window", slot.window);
                          form.setValue("delivery.slot.type", slot.type);
                        }}
                        className={`rounded-lg border px-4 py-3 text-center text-sm font-medium transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/50 hover:border-border hover:bg-muted/30"
                        }`}
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                </div>
                {form.formState.errors.delivery?.slot?.window && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.delivery.slot.window.message}
                  </p>
                )}
              </div>
            )}

            {/* Address fields (delivery only) */}
            {isDelivery && (
              <div className="space-y-4 rounded-xl border border-dashed border-border/50 p-4">
                <h4 className="text-sm font-semibold text-foreground">عنوان التوصيل</h4>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">تصنيف العنوان</Label>
                  <Input
                    placeholder="مثال: المنزل، العمل"
                    {...form.register("delivery.address.label")}
                  />
                  {form.formState.errors.delivery?.address?.label && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.delivery.address.label.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">المدينة</Label>
                    <Input
                      placeholder="أدخل المدينة"
                      {...form.register("delivery.address.city")}
                    />
                    {form.formState.errors.delivery?.address?.city && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.delivery.address.city.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">الحي</Label>
                    <Input
                      placeholder="أدخل الحي"
                      {...form.register("delivery.address.district")}
                    />
                    {form.formState.errors.delivery?.address?.district && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.delivery.address.district.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">الشارع</Label>
                    <Input
                      placeholder="أدخل اسم الشارع"
                      {...form.register("delivery.address.street")}
                    />
                    {form.formState.errors.delivery?.address?.street && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.delivery.address.street.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">رقم المبنى</Label>
                    <Input
                      placeholder="أدخل رقم المبنى"
                      {...form.register("delivery.address.building")}
                    />
                    {form.formState.errors.delivery?.address?.building && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.delivery.address.building.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Pickup info */}
            {isPickup && deliveryData?.pickupLocations?.[0] && (
              <div className="rounded-xl border border-dashed border-border/50 bg-muted/20 p-4">
                <div className="flex items-start gap-3">
                  <Store className="mt-0.5 size-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-semibold">
                      {deliveryData.pickupLocations[0].name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {deliveryData.pickupLocations[0].address.line1}
                    </p>
                    {deliveryData.pickupLocations[0].address.notes && (
                      <p className="mt-1 text-xs text-muted-foreground/70">
                        {deliveryData.pickupLocations[0].address.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
