import type { ColumnDef } from "@tanstack/react-table";
import type { Package } from "@/types/packageTypes";
import { Badge } from "@/components/ui/badge";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { StatusBadge } from "./StatusBadge";
import { fetchRemovePackage } from "@/utils/fetchRemovePackage";
import { ToastMessage } from "@/components/global/ToastMessage";
import { packageId } from "@/utils/packageAdapter";

async function removePackage(pkg: Package) {
  const id = packageId(pkg);
  if (!id) {
    ToastMessage("تعذر تحديد الباقة المطلوبة", "error");
    return;
  }

  const confirmed = window.confirm(
    `تأكيد إزالة الباقة: ${pkg.name.ar || pkg.name.en || "بدون اسم"}?\nقد يرفض النظام العملية إذا كانت الباقة مستخدمة في اشتراكات حالية.`
  );
  if (!confirmed) return;

  try {
    await fetchRemovePackage(id);
    ToastMessage("تمت إزالة الباقة بنجاح", "success");
    window.dispatchEvent(new CustomEvent("packages:refresh"));
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } };
    ToastMessage(
      err?.response?.data?.message || "تعذرت إزالة الباقة",
      "error"
    );
  }
}

const displayName = (value: string | null | undefined) => value?.trim() || "—";

const formatSar = (halala: number, currency = "SAR") =>
  `${(halala / 100).toLocaleString("ar-SA", { maximumFractionDigits: 2 })} ${currency}`;

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
    header: "اسم الباقة",
    cell: ({ row }) => (
      <div className="min-w-44">
        <p className="font-semibold">{displayName(row.original.name.ar)}</p>
        <p className="text-xs text-muted-foreground">{displayName(row.original.name.en)}</p>
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: "التصنيف",
    cell: ({ row }) => <span>{displayName(row.original.category)}</span>,
  },
  {
    accessorKey: "daysCount",
    header: "الأيام",
    cell: ({ row }) => <span>{row.original.daysCount ?? "—"}</span>,
  },
  {
    accessorKey: "isActive",
    header: "الحالة",
    cell: ({ row }) => <StatusBadge pkg={row.original} />,
    filterFn: (row, _columnId, filterValue) => {
      if (!filterValue || filterValue === "all") return true;
      return filterValue === "active" ? row.original.isActive : !row.original.isActive;
    },
  },
  {
    id: "gramsOptions",
    header: "الجرامات والأسعار",
    cell: ({ row }) => {
      const grams = row.original.gramsOptions ?? [];
      const mealOptions = grams.flatMap((tier) => tier.mealsOptions ?? []);
      return (
        <div className="min-w-56 space-y-1.5">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">{grams.length} مستويات جرام</Badge>
            <Badge variant="outline">{mealOptions.length} خيارات وجبات</Badge>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            {grams.slice(0, 2).map((tier, index) => (
              <p key={`${String(tier.grams)}-${index}`} className="truncate">
                {String(tier.grams)} جم: {tier.mealsOptions?.map((option) => `${option.mealsPerDay} وجبة · ${formatSar(option.priceHalala, row.original.currency)}`).join("، ") || "لا توجد أسعار"}
              </p>
            ))}
            {grams.length > 2 ? <p>+ {grams.length - 2} مستويات أخرى</p> : null}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "sortOrder",
    header: "الترتيب",
    cell: ({ row }) => <span>{row.original.sortOrder ?? "—"}</span>,
  },
  {
    accessorKey: "updatedAt",
    header: "آخر تحديث",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-xs text-muted-foreground">
        {row.original.updatedAt
          ? new Date(row.original.updatedAt).toLocaleString("ar-EG")
          : "—"}
      </span>
    ),
  },
  {
    id: "actions",
    header: "الإجراءات",
    cell: ({ row }) => {
      const id = packageId(row.original);
      return (
        <div className="flex flex-wrap items-center gap-1">
          <Button variant="ghost" size="sm" asChild disabled={!id}>
            <Link to="/packages/$planId/update" params={{ planId: id }}>
              <PencilIcon className="ml-1 size-3.5" />
              تعديل
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={!id}
            onClick={() => removePackage(row.original)}
          >
            <Trash2Icon className="ml-1 size-3.5" />
            إزالة
          </Button>
        </div>
      );
    },
    enableHiding: false,
  },
];
