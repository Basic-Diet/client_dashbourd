import type { ColumnDef } from "@tanstack/react-table";
import type { User } from "@/types/userTypes";
import { Badge } from "@/components/ui/badge";
import { UserActionsCell } from "./user-actions-cell";

export const usersColumns: ColumnDef<User>[] = [
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
    accessorKey: "fullName",
    header: "اسم المستخدم",
    cell: ({ row }) => (
      <span className="font-semibold">{row.original.fullName}</span>
    ),
  },
  {
    accessorKey: "phone",
    header: "رقم الهاتف",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.phone}</span>
    ),
  },
  {
    accessorKey: "email",
    header: "البريد الإلكتروني",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.email || "غير متوفر"}</span>
    ),
  },
  {
    accessorKey: "isActive",
    header: "حالة الحساب",
    cell: ({ row }) => {
      const isActive = row.original.isActive;
      return (
        <Badge variant={isActive ? "default" : "destructive"}>
          {isActive ? "نشط" : "غير نشط"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "activeSubscriptionsCount",
    header: "اشتراكات (نشطة / إجمالي)",
    cell: ({ row }) => (
      <span className="font-medium text-muted-foreground">
        {row.original.activeSubscriptionsCount} / {row.original.subscriptionsCount}
      </span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "تاريخ الانضمام",
    cell: ({ row }) => {
      const date = new Date(row.original.createdAt);
      return <span className="text-muted-foreground">{date.toLocaleDateString('ar-EG')}</span>;
    },
  },
  {
    id: "actions",
    header: "إجراءات",
    cell: ({ row }) => <UserActionsCell user={row.original} />,
    enableHiding: false,
    size: 80,
  },
];
