import type { ColumnDef } from "@tanstack/react-table";
import type { Subscription } from "@/types/subscriptionTypes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { EyeIcon } from "lucide-react";

export const subscriptionsColumns: ColumnDef<Subscription>[] = [
  {
    id: "index",
    header: "#",
    cell: ({ row }) => (
      <span className="font-medium text-muted-foreground">{row.index + 1}</span>
    ),
    enableHiding: false,
    size: 50,
  },
  {
    accessorKey: "displayId",
    header: "معرف الاشتراك",
    cell: ({ row }) => (
      <span className="font-semibold">{row.original.displayId}</span>
    ),
  },
  {
    accessorKey: "userName",
    header: "اسم المشترك",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.userName}</span>
    ),
  },
  {
    accessorKey: "planName",
    header: "اسم الباقة",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.planName || "بدون باقة"}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "الحالة",
    cell: ({ row }) => {
      const status = row.original.status;
      let label = status;
      let variant: React.ComponentProps<typeof Badge>["variant"] = "default";
      
      switch (status) {
        case "active":
          label = "نشط";
          variant = "default";
          break;
        case "pending":
          label = "قيد الانتظار";
          variant = "outline";
          break;
        case "canceled":
          label = "ملغى";
          variant = "destructive";
          break;
        case "expired":
        case "ended":
          label = "منتهي";
          variant = "secondary";
          break;
      }
      
      return <Badge variant={variant}>{label}</Badge>;
    },
  },
  {
    id: "meals",
    header: "الوجبات (متبقي/إجمالي)",
    cell: ({ row }) => (
      <span className="font-medium text-muted-foreground">
        {row.original.remainingMeals} / {row.original.totalMeals}
      </span>
    ),
  },
  {
    accessorKey: "startDate",
    header: "تاريخ البدء",
    cell: ({ row }) => {
      const date = new Date(row.original.startDate);
      return <span className="text-muted-foreground">{date.toLocaleDateString('ar-EG')}</span>;
    },
  },
  {
    accessorKey: "endDate",
    header: "تاريخ الانتهاء",
    cell: ({ row }) => {
      const date = new Date(row.original.endDate);
      return <span className="text-muted-foreground">{date.toLocaleDateString('ar-EG')}</span>;
    },
  },
  {
    id: "actions",
    header: "الإجراءات",
    cell: ({ row }) => (
      <Button variant="ghost" size="sm" asChild>
        <Link to="/subscriptions/$subscriptionId" params={{ subscriptionId: row.original._id }}>
          <EyeIcon className="ml-1 size-4" />
          عرض
        </Link>
      </Button>
    ),
    enableHiding: false,
  },
];
