import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrendingUpIcon } from "@/components/ui/trending-up";
import { TrendingDownIcon } from "@/components/ui/trending-down";
import type { DashboardCardData } from "@/types/dashboardTypes";

export function SectionCards({
  cardsData,
}: {
  cardsData: DashboardCardData[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      {cardsData.map((card) => (
        <Card key={card.id} className="@container/card">
          <CardHeader>
            <CardDescription>{card.description}</CardDescription>
            <CardTitle className="mt-3 text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {card.value}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                {card.isPositive ? (
                  <TrendingUpIcon size={20} />
                ) : (
                  <TrendingDownIcon size={20} />
                )}
                {card.percentage}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex justify-end">{card.icon}</CardFooter>
        </Card>
      ))}
    </div>
  );
}
