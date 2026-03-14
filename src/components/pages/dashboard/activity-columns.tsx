import type { ColumnDef } from "@tanstack/react-table";
import type { Subscription, Order } from "@/constants/recent-activity";
import { Badge } from "@/components/ui/badge";

export const subscriptionColumns: ColumnDef<Subscription>[] = [
  {
    accessorKey: "userName",
    header: "المستخدم",
  },
  {
    accessorKey: "planName",
    header: "الخطة",
  },
  {
    accessorKey: "status",
    header: "الحالة",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge
          className={
            status === "active"
              ? "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400"
          }
        >
          {status === "active" ? "نشط" : "غير نشط"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "startDate",
    header: "تاريخ البدء",
  },
  {
    accessorKey: "amountDisplay",
    header: "المبلغ",
  },
];

export const orderColumns: ColumnDef<Order>[] = [
  {
    accessorKey: "displayId",
    header: "ID",
  },
  {
    accessorKey: "userName",
    header: "المستخدم",
  },
  {
    accessorKey: "itemsSummary",
    header: "الوجبات",
  },
  {
    accessorKey: "status",
    header: "الحالة",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      let variantClass =
        "bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300";

      if (status === "قيد التوصيل")
        variantClass =
          "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400";
      if (status === "قيد التحضير")
        variantClass =
          "bg-orange-100 text-orange-800 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400";
      if (status === "مكتمل")
        variantClass =
          "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400";
      if (status === "معلق")
        variantClass =
          "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400";

      return <Badge className={variantClass}>{status}</Badge>;
    },
  },
  {
    accessorKey: "date",
    header: "التاريخ",
  },
];
