import type { ColumnDef } from "@tanstack/react-table";
import type { Addon } from "@/types/addonTypes";
import { Badge } from "@/components/ui/badge";
import { PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { AddonStatusBadge } from "./AddonStatusBadge";
import { DeleteAddonDialog } from "./DeleteAddonDialog";

export const addonsColumns: ColumnDef<Addon>[] = [
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
    accessorKey: "imageUrl",
    header: "الصورة",
    cell: ({ row }) => (
      <div className="flex h-12 w-16 overflow-hidden rounded-md border bg-muted">
        <img
          src={row.original.imageUrl}
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
        <span className="text-xs text-muted-foreground line-clamp-1 max-w-50">
          {row.original.description.ar}
        </span>
      </div>
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
      <div className="flex flex-col gap-1">
        <span className="font-semibold">{row.original.name.en}</span>
        <span className="text-xs text-muted-foreground line-clamp-1 max-w-50">
          {row.original.description.en}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: "التصنيف",
    cell: ({ row }) => (
      <Badge variant="secondary" className="font-medium capitalize">
        {row.original.category}
      </Badge>
    ),
    filterFn: (row, _columnId, filterValue) => {
      if (filterValue === "all") return true;
      return row.original.category.toLowerCase() === filterValue.toLowerCase();
    },
  },
  {
    accessorKey: "type",
    header: "النوع",
    cell: ({ row }) => (
      <Badge variant="outline" className="font-medium capitalize">
        {row.original.type === "subscription" ? "اشتراك" : "مرة واحدة"}
      </Badge>
    ),
  },
  {
    accessorKey: "priceHalala",
    header: "السعر (ريال)",
    cell: ({ row }) => (
      <div className="flex flex-col text-sm">
        <span className="font-semibold text-primary">
          {(row.original.priceHalala / 100).toFixed(2)} {row.original.currency}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "isActive",
    header: "الحالة",
    cell: ({ row }) => <AddonStatusBadge addon={row.original} />,
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
      <div className="flex gap-2 items-center justify-end">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/addons/$addonId/update" params={{ addonId: row.original._id }}>
            <PencilIcon className="ml-1 size-3.5" />
            تعديل
          </Link>
        </Button>
        <DeleteAddonDialog addonId={row.original._id} addonName={row.original.name.ar} />
      </div>
    ),
    enableHiding: false,
  },
];
