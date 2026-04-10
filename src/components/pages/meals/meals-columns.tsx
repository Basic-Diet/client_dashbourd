import type { ColumnDef } from "@tanstack/react-table";
import type { Meal } from "@/types/mealTypes";
import { PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { MealStatusBadge } from "./MealStatusBadge";
import { DeleteMealDialog } from "./DeleteMealDialog";
import { ToggleMealButton } from "./ToggleMealButton";

export const mealsColumns: ColumnDef<Meal>[] = [
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
    accessorKey: "image",
    header: "الصورة",
    cell: ({ row }) => (
      <div className="flex h-12 w-16 overflow-hidden rounded-md border bg-muted">
        <img
          src={row.original.imageUrl || undefined}
          alt={row.original.name.ar}
          className="h-full w-full object-cover"
        />
      </div>
    ),
    enableHiding: false,
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
    accessorKey: "macros",
    header: "الماكروز (P/C/F)",
    cell: ({ row }) => (
      <div className="flex flex-col text-xs text-muted-foreground">
        <span>بروتين: {row.original.proteinGrams}g</span>
        <span>كارب: {row.original.carbGrams}g</span>
        <span>دهون: {row.original.fatGrams}g</span>
      </div>
    ),
  },
  {
    accessorKey: "isActive",
    header: "الحالة",
    cell: ({ row }) => <MealStatusBadge meal={row.original} />,
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
        <ToggleMealButton meal={row.original} />
        <Button variant="ghost" size="sm" asChild>
          <Link
            to="/meals/$mealId/update"
            params={{ mealId: row.original._id }}
          >
            <PencilIcon className="ml-1 size-3.5" />
            تعديل
          </Link>
        </Button>
        <DeleteMealDialog
          mealId={row.original._id}
          mealName={row.original.name.ar}
        />
      </div>
    ),
    enableHiding: false,
  },
];
