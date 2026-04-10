import type { ColumnDef } from "@tanstack/react-table";
import type { MealCategory } from "@/types/categoryTypes";
import { PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { CategoryStatusBadge } from "./CategoryStatusBadge";
import { ToggleCategoryButton } from "./ToggleCategoryButton";

export const categoriesColumns: ColumnDef<MealCategory>[] = [
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
    accessorKey: "key",
    header: "المفتاح (Key)",
    cell: ({ row }) => (
      <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs">
        {row.original.key}
      </span>
    ),
  },
  {
    accessorKey: "name.ar",
    header: "الاسم بالعربي",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <span className="font-semibold">{row.original.name.ar}</span>
        <span className="line-clamp-1 max-w-50 text-xs text-muted-foreground">
          {row.original.description.ar}
        </span>
      </div>
    ),
    filterFn: (row, _columnId, filterValue) => {
      const nameAr = (row.original.name.ar || "").toLowerCase();
      const nameEn = (row.original.name.en || "").toLowerCase();
      const search = filterValue.toLowerCase();
      return nameAr.includes(search) || nameEn.includes(search);
    },
  },
  {
    accessorKey: "name.en",
    header: "Name [EN]",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <span className="font-semibold">{row.original.name.en}</span>
        <span className="line-clamp-1 max-w-50 text-xs text-muted-foreground">
          {row.original.description.en}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "isActive",
    header: "الحالة",
    cell: ({ row }) => <CategoryStatusBadge category={row.original} />,
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
    id: "actions",
    header: "الإجراءات",
    cell: ({ row }) => (
      <div className="flex items-center justify-center gap-2">
        <ToggleCategoryButton category={row.original} />
        <Button variant="ghost" size="sm" asChild>
          <Link
            to="/categories/$categoryId/update"
            params={{ categoryId: row.original._id }}
          >
            <PencilIcon className="ml-1 size-3.5" />
            تعديل
          </Link>
        </Button>
      </div>
    ),
    enableHiding: false,
  },
];
