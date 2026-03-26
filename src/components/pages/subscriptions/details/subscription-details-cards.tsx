import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Subscription } from "@/types/subscriptionTypes";
import { format } from "date-fns";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface CardProps {
  subscription: Subscription;
}

const InfoItem = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-medium">{value || "—"}</span>
  </div>
);

export function CustomerInfoCard({ subscription }: CardProps) {
  const { user } = subscription;
  return (
    <Card className="border shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          معلومات العميل
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
        <InfoItem
          label="الاسم"
          value={user?.fullName || subscription.userName}
        />
        <InfoItem
          label="رقم الجوال"
          value={<span dir="ltr">{user?.phone}</span>}
        />
        <InfoItem label="البريد الإلكتروني" value={user?.email} />
      </CardContent>
    </Card>
  );
}

export function SubscriptionContractCard({ subscription }: CardProps) {
  return (
    <Card className="border shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">عقد الاشتراك</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-2">
        <InfoItem label="الباقة" value={subscription.planName || "بدون باقة"} />
        <InfoItem
          label="الأيام"
          value={`${subscription.plan?.name || ""} (${subscription.totalMeals} يوم)`}
        />
        <InfoItem label="الجرامات" value={`${subscription.selectedGrams}g`} />
        <InfoItem
          label="وجبات في اليوم"
          value={subscription.selectedMealsPerDay}
        />
        <InfoItem
          label="تاريخ البدء"
          value={
            subscription.startDate
              ? format(new Date(subscription.startDate), "PPP")
              : ""
          }
        />
        <InfoItem
          label="تاريخ الانتهاء"
          value={
            subscription.endDate
              ? format(new Date(subscription.endDate), "PPP")
              : ""
          }
        />
        <InfoItem
          label="نهاية الصلاحية"
          value={
            subscription.validityEndDate
              ? format(new Date(subscription.validityEndDate), "PPP")
              : ""
          }
        />
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">
            الوجبات المتبقية
          </span>
          <span className="text-sm font-bold text-emerald-500">
            {subscription.remainingMeals}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function DeliveryInfoCard({ subscription }: CardProps) {
  const { deliveryAddress, deliverySlot, deliveryZoneName, deliveryMode } =
    subscription;

  const addressString = deliveryAddress
    ? [
        deliveryAddress.building,
        deliveryAddress.street,
        deliveryAddress.district,
        deliveryAddress.city,
      ]
        .filter(Boolean)
        .join(", ")
    : "لم يتم تحديد عنوان";

  return (
    <Card className="border shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          معلومات التوصيل
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-2">
        <InfoItem
          label="طريقة التوصيل"
          value={
            deliveryMode === "delivery"
              ? "توصيل"
              : deliveryMode === "pickup"
                ? "استلام"
                : deliveryMode
          }
        />
        <InfoItem
          label="المنطقة"
          value={deliveryZoneName || deliveryAddress?.district}
        />
        <InfoItem label="العنوان" value={addressString} />
        <InfoItem
          label="فترة التوصيل"
          value={deliverySlot?.window || subscription.deliveryWindow}
        />
      </CardContent>
    </Card>
  );
}

export function TechnicalDetailsAccordion({ subscription }: CardProps) {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem
        value="technical"
        className="rounded-lg border bg-card px-4 shadow-none"
      >
        <AccordionTrigger className="items-center gap-3 text-sm font-semibold hover:no-underline">
          التفاصيل الفنية
        </AccordionTrigger>
        <AccordionContent>
          <div className="grid gap-4 text-sm sm:grid-cols-2 md:grid-cols-3">
            <InfoItem label="معرف الاشتراك" value={subscription.id} />
            <InfoItem label="معرف المستخدم" value={subscription.userId} />
            <InfoItem
              label="تم الإنشاء"
              value={
                subscription.createdAt
                  ? format(new Date(subscription.createdAt), "PPP p")
                  : ""
              }
            />
            <InfoItem
              label="تم التحديث"
              value={
                subscription.updatedAt
                  ? format(new Date(subscription.updatedAt), "PPP p")
                  : ""
              }
            />
            <InfoItem
              label="السعر الأساسي"
              value={`${(subscription.basePlanPriceHalala / 100).toFixed(2)} ${subscription.checkoutCurrency || "SAR"}`}
            />
            <InfoItem
              label="النسخة"
              value={subscription.contractMeta?.version}
            />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export function PremiumMealsCard({ subscription }: CardProps) {
  const { premiumSummary } = subscription;

  if (!premiumSummary || premiumSummary.length === 0) return null;

  return (
    <Card className="border shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          الوجبات المميزة (Premium Meals)
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {premiumSummary.map((meal, index) => (
          <div key={index} className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">{meal.name}</span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-sm font-medium">
                الكمية: {meal.purchasedQtyTotal}
              </span>
              <span className="text-xs text-muted-foreground">
                {(meal.maxUnitPriceHalala / 100).toFixed(2)} SAR
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function AddonsCard({ subscription }: CardProps) {
  const { addonsSummary } = subscription;

  if (!addonsSummary || addonsSummary.length === 0) return null;

  return (
    <Card className="border shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          الإضافات (Add-ons)
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {addonsSummary.map((addon, index) => (
          <div
            key={index}
            className="flex items-start justify-between border-t pt-3 first:border-t-0 first:pt-0"
          >
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">{addon.name}</span>
              <span className="text-xs text-muted-foreground">
                متكرر (Recurring)
              </span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-sm text-muted-foreground">
                {(addon.maxUnitPriceHalala / 100).toFixed(2)} SAR
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
