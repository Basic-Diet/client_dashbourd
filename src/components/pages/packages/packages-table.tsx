import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Columns3Icon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
  ChevronsRightIcon,
  ChevronsLeftIcon,
  PlusIcon,
} from "lucide-react";
import type { Package } from "@/types/packageTypes";
import { packageId } from "@/utils/packageAdapter";
import { packagesQueryOptions } from "@/hooks/usePackagesQuery";
import { packagesColumns } from "./packages-columns";

export function PackagesTable({ data: initialData }: { data: Package[] }) {
  const queryClient = useQueryClient();
  const [data, setData] = React.useState(initialData);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });

  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);

  React.useEffect(() => {
    const refresh = () => queryClient.invalidateQueries(packagesQueryOptions());
    window.addEventListener("packages:refresh", refresh);
    return () => window.removeEventListener("packages:refresh", refresh);
  }, [queryClient]);

  const table = useReactTable({
    data,
    columns: packagesColumns,
    state: { sorting, columnFilters, globalFilter, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = String(filterValue ?? "").trim().toLowerCase();
      if (!search) return true;
      const values = [
        row.original.name?.ar,
        row.original.name?.en,
        row.original.category,
        row.original.key,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return values.some((value) => value.includes(search));
    },
    getRowId: (row, index) => packageId(row) || `package-${index}`,
  });

  const totalFiltered = table.getFilteredRowModel().rows.length;
  const hasAnyData = data.length > 0;
  const hasFilteredData = table.getRowModel().rows.length > 0;

  return (
    <section className="w-full space-y-4" dir="rtl">
      <div className="flex flex-col gap-3 px-4 lg:flex-row lg:items-center lg:px-6">
        <Select
          value={(table.getColumn("isActive")?.getFilterValue() as string) || "all"}
          onValueChange={(value) =>
            table.getColumn("isActive")?.setFilterValue(value === "all" ? undefined : value)
          }
        >
          <SelectTrigger className="w-full lg:w-36" size="sm">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectGroup>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="active">نشطة</SelectItem>
              <SelectItem value="inactive">غير نشطة</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <div className="relative min-w-0 flex-1">
          <SearchIcon className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="ابحث بالاسم أو التصنيف أو المفتاح"
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="w-full pr-9 lg:max-w-xl"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" className="min-w-0 flex-1 gap-2 sm:flex-none">
            <Link to="/packages/create">
              <PlusIcon className="size-4" />
              إضافة باقة
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                <Columns3Icon className="ml-2 size-4" />
                الأعمدة
                <ChevronDownIcon className="mr-2 size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {table
                .getAllColumns()
                .filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {typeof column.columnDef.header === "string" ? column.columnDef.header : column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="px-4 lg:px-6">
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table className="min-w-[1080px]">
            <TableHeader className="sticky top-0 z-10 bg-muted">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="whitespace-nowrap py-4 text-right">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {hasFilteredData ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="align-top py-4 text-right">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={packagesColumns.length} className="h-32 text-center">
                    {hasAnyData
                      ? "لا توجد باقات تطابق البحث أو الفلتر الحالي."
                      : "لا توجد باقات مرجعة من الخادم."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
        <div className="text-sm text-muted-foreground">
          إجمالي النتائج الظاهرة: {totalFiltered} من {data.length}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden items-center gap-2 md:flex">
            <Label htmlFor="rows-per-page">الصفوف</Label>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>{pageSize}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm font-medium">
            صفحة {table.getState().pagination.pageIndex + 1} من {table.getPageCount() || 1}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="hidden size-8 lg:flex" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} aria-label="الصفحة الأولى">
              <ChevronsRightIcon />
            </Button>
            <Button variant="outline" size="icon" className="size-8" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label="الصفحة السابقة">
              <ChevronRightIcon />
            </Button>
            <Button variant="outline" size="icon" className="size-8" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="الصفحة التالية">
              <ChevronLeftIcon />
            </Button>
            <Button variant="outline" size="icon" className="hidden size-8 lg:flex" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()} aria-label="الصفحة الأخيرة">
              <ChevronsLeftIcon />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
