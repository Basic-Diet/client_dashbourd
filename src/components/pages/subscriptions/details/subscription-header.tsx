import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import {
  ArrowRightIcon,
  CalendarIcon,
  BanIcon,
  PlusIcon,
  PauseIcon,
  PlayIcon
} from "lucide-react";
import type { Subscription } from "@/types/subscriptionTypes";

interface SubscriptionHeaderProps {
  subscription: Subscription;
  onFreeze: () => void;
  onExtend: () => void;
  onCancel: () => void;
  onUnfreeze: () => void;
}

export function SubscriptionHeader({
  subscription,
  onFreeze,
  onExtend,
  onCancel,
  onUnfreeze
}: SubscriptionHeaderProps) {
  const isCanceled = subscription.status === "canceled";
  const isExpired = subscription.status === "expired" || subscription.status === "ended";

  let statusLabel = subscription.status;
  let variant: "default" | "secondary" | "destructive" | "outline" = "default";
  
  switch (subscription.status) {
    case "active":
      statusLabel = "نشط";
      break;
    case "pending":
      statusLabel = "قيد الانتظار";
      variant = "outline";
      break;
    case "canceled":
      statusLabel = "ملغى";
      variant = "destructive";
      break;
    case "expired":
    case "ended":
      statusLabel = "منتهي";
      variant = "secondary";
      break;
  }

  const badgeVariant = variant;

  return (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="shrink-0 rounded-full">
          <Link to="/subscriptions">
            <ArrowRightIcon className="size-5" />
          </Link>
        </Button>
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">الاشتراكات</h1>
            <h2 className="text-xl font-semibold text-muted-foreground mr-2">{subscription.displayId}</h2>
            <Badge variant={badgeVariant} className={variant === 'default' ? 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 border-emerald-500/20 shadow-none' : ''}>
              {statusLabel}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" className="bg-background">
          <CalendarIcon className="mr-2 ml-1 size-4" />
          الجدول الزمني
        </Button>
        
        {!isCanceled && !isExpired && (
          <>
            <Button variant="outline" size="sm" className="bg-background" onClick={onExtend}>
              <PlusIcon className="mr-2 ml-1 size-4" />
              تمديد
            </Button>
            
            {subscription.status === "frozen" ? (
              <Button variant="outline" size="sm" className="bg-background" onClick={onUnfreeze}>
                <PlayIcon className="mr-2 ml-1 size-4" />
                إلغاء التجميد
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="bg-background" onClick={onFreeze}>
                <PauseIcon className="mr-2 ml-1 size-4" />
                تجميد
              </Button>
            )}

            <Button variant="destructive" size="sm" onClick={onCancel}>
              <BanIcon className="mr-2 ml-1 size-4" />
              إلغاء الاشتراك
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
