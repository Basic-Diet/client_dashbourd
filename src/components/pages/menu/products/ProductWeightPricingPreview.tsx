import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { halalaToRiyal } from "@/utils/price";
import type { WeightPricingDescriptor } from "@/types/menuTypes";

const formatSar = (halala: number) => `${halalaToRiyal(halala).toFixed(2)} ر.س`;

export function ProductWeightPricingPreview({
  weightPricing,
}: {
  weightPricing?: WeightPricingDescriptor | null;
}) {
  const choices = weightPricing?.choices ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>معاينة أسعار الوزن</CardTitle>
        <CardDescription>
          هذه المعاينة من الخادم مباشرة ولا يتم حسابها داخل المتصفح.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {choices.length ? (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="px-4 py-3 text-right font-semibold">الوزن</th>
                  <th className="px-4 py-3 text-right font-semibold">السعر</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {choices.map((choice) => (
                  <tr key={`${choice.weightGrams}-${choice.priceHalala}`}>
                    <td className="px-4 py-3">{choice.weightGrams} جم</td>
                    <td className="px-4 py-3" dir="ltr">
                      {formatSar(choice.priceHalala)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            ستظهر المعاينة المعتمدة بعد تأكيد إعداد الوزن من الخادم.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
