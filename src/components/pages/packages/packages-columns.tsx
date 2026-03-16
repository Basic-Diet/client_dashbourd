import type { ColumnDef } from "@tanstack/react-table";
import type { Package } from "@/types/packageTypes";
import { Badge } from "@/components/ui/badge";
import { PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { StatusBadge } from "./StatusBadge";

export const packagesColumns: ColumnDef<Package>[] = [
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
    accessorKey: "name.ar",
    header: "اسم الباقة بالعربي",
    cell: ({ row }) => (
      <span className="font-semibold">{row.original.name.ar}</span>
    ),
    filterFn: (row, _columnId, filterValue) => {
      const nameAr = row.original.name.ar.toLowerCase();
      const nameEn = row.original.name.en.toLowerCase();
      const search = filterValue.toLowerCase();
      return nameAr.includes(search) || nameEn.includes(search);
    },
  },
  {
    accessorKey: "name.en",
    header: "Name [EN]",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.name.en}</span>
    ),
  },
  {
    accessorKey: "daysCount",
    header: "عدد الأيام",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.daysCount}</span>
    ),
  },
  {
    accessorKey: "isActive",
    header: "الحالة",
    cell: ({ row }) => <StatusBadge pkg={row.original} />,
    filterFn: (row, _columnId, filterValue) => {
      if (filterValue === "all") return true;
      return filterValue === "active"
        ? row.original.isActive
        : !row.original.isActive;
    },
  },
  {
    accessorKey: "sortOrder",
    header: "الترتيب",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.sortOrder}</span>
    ),
  },
  {
    id: "gramsOptions",
    header: "خيارات الجرام",
    cell: ({ row }) => {
      const count = row.original.gramsOptions?.length || 0;
      return (
        <Badge variant="secondary" className="font-medium">
          {count} خيارات
        </Badge>
      );
    },
  },
  {
    id: "actions",
    header: "الإجراءات",
    cell: ({ row }) => (
      <Button variant="ghost" size="sm" asChild>
        <Link to="/packages/$planId/update" params={{ planId: row.original._id }}>
          <PencilIcon className="ml-1 size-3.5" />
          تعديل
        </Link>
      </Button>
    ),
    enableHiding: false,
  },
];
