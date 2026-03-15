import type { ColumnDef } from "@tanstack/react-table";
import type { Package } from "@/types/packageTypes";
import { Badge } from "@/components/ui/badge";
import { PencilIcon, CheckCircleIcon, XCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
    cell: ({ row }) => {
      const isActive = row.original.isActive;
      return (
        <Badge
          variant="outline"
          className={cn(
            "cursor-pointer",
            isActive
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
          )}
        >
          {isActive ? (
            <CheckCircleIcon className="ml-1 size-3.5" />
          ) : (
            <XCircleIcon className="ml-1 size-3.5" />
          )}
          {isActive ? "نشطة" : "غير نشطة"}
        </Badge>
      );
    },
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
        <a href={`/packages/${row.original._id}/update`}>
          <PencilIcon className="ml-1 size-3.5" />
          تعديل
        </a>
      </Button>
    ),
    enableHiding: false,
  },
];
