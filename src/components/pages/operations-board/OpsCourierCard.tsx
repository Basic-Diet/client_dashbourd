import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Truck,
  MapPin,
  Phone,
  CheckCircle2,
  FileText,
  Clock,
} from "lucide-react";
import type { UnifiedQueueItem } from "@/types/dashboardOpsTypes";

interface OpsCourierCardProps {
  task: UnifiedQueueItem;
  onAction: (
    item: UnifiedQueueItem,
    action: string,
    actionLabel: string,
    isDangerous?: boolean
  ) => void;
  isPending: boolean;
}

export const OpsCourierCard: React.FC<OpsCourierCardProps> = ({
  task,
  onAction,
  isPending,
}) => {
  const customer = task.customer;
  const reference = task.reference || task.orderNumber || "بدون مرجع";

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="bg-muted/30 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base font-bold">
              {customer?.name || "Unknown"}
            </CardTitle>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            #{reference}
          </Badge>
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <Phone className="h-3 w-3" />
          <span dir="ltr" className="font-mono">
            {customer?.phone || "No phone"}
          </span>
          {task.type && (
            <Badge variant="secondary" className="text-[10px]">
              {task.type === "subscription" ? "اشتراك" : "طلب لمرة واحدة"}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-3">
        {task.context?.addressSummary && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{task.context.addressSummary}</span>
          </div>
        )}

        {task.context?.window && (
          <div className="flex items-center gap-2 text-sm text-orange-600">
            <Clock className="h-4 w-4 shrink-0" />
            <span className="font-semibold">{task.context.window}</span>
          </div>
        )}

        {task.notes && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <FileText className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="break-words">{task.notes}</span>
          </div>
        )}



        <div className="flex flex-wrap gap-2 pt-2">
          {task.allowedActions && task.allowedActions.length > 0 ? (
            task.allowedActions.map((action) => (
              <Button
                key={action.id}
                variant={action.color === "danger" ? "destructive" : "default"}
                size="sm"
                className="h-9 flex-1 rounded-lg text-xs font-bold"
                disabled={isPending}
                onClick={() =>
                  onAction(task, action.id, action.label, action.color === "danger")
                }
              >
                {action.label}
              </Button>
            ))
          ) : (
            <div className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/20 py-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" />
              لا توجد إجراءات متاحة
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default OpsCourierCard;
