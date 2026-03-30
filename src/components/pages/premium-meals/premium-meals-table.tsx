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
import { Button, buttonVariants } from "@/components/ui/button";
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
  PlusIcon,
  ChevronsRightIcon,
  ChevronsLeftIcon,
} from "lucide-react";
import type { PremiumMeal } from "@/types/premiumMealTypes";
import { premiumMealsColumns } from "./premium-meals-columns";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function PremiumMealsTable({ data: initialData }: { data: PremiumMeal[] }) {
  const [data, setData] = React.useState(initialData);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Extract unique categories for filter
  const categories = React.useMemo(() => {
    const cats = new Set(initialData.map((meal) => meal.category));
    return Array.from(cats);
  }, [initialData]);

  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const table = useReactTable({
    data,
    columns: premiumMealsColumns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const nameAr = row.original.name.ar.toLowerCase();
      const nameEn = row.original.name.en.toLowerCase();
      const search = filterValue.toLowerCase();
      return nameAr.includes(search) || nameEn.includes(search);
    },
    getRowId: (row) => row._id,
  });

  const totalFiltered = table.getFilteredRowModel().rows.length;

  return (
    <div className="w-full flex-col justify-start gap-6" dir="rtl">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Status filter */}
          <Select
            value={(table.getColumn("isActive")?.getFilterValue() as string) || "all"}
            onValueChange={(value) => {
              table
                .getColumn("isActive")
                ?.setFilterValue(value === "all" ? undefined : value);
            }}
          >
            <SelectTrigger className="w-32" size="sm">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectGroup>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="active">نشطة</SelectItem>
                <SelectItem value="inactive">غير نشطة</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          {/* Category filter */}
          <Select
            value={(table.getColumn("category")?.getFilterValue() as string) || "all"}
            onValueChange={(value) => {
              table
                .getColumn("category")
                ?.setFilterValue(value === "all" ? undefined : value);
            }}
          >
            <SelectTrigger className="w-40 capitalize" size="sm">
              <SelectValue placeholder="التصنيف" />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectGroup>
                <SelectItem value="all">كل التصنيفات</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          {/* Search box */}
          <div className="relative flex-1 min-w-50">
            <SearchIcon className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="البحث باسم الوجبة"
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pr-9"
            />
          </div>

          {/* action link */}
          <Link
            to="/premium-meals/create"
            className={cn(buttonVariants({ variant: "default" }), "bg-primary")}
          >
            <PlusIcon />
            إضافة وجبة جديدة
          </Link>

          {/* Column visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Columns3Icon
                  data-icon="inline-start"
                  className="ml-2 size-4"
                />
                الأعمدة
                <ChevronDownIcon
                  data-icon="inline-end"
                  className="mr-2 size-4"
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" &&
                    column.getCanHide()
                )
                .map((column) => {
                  return (
                     <DropdownMenuCheckboxItem
                       key={column.id}
                       className="text-right capitalize"
                       checked={column.getIsVisible()}
                       onCheckedChange={(value) =>
                         column.toggleVisibility(!!value)
                       }
                     >
                       {typeof column.columnDef.header === "string"
                         ? column.columnDef.header
                         : column.id}
                     </DropdownMenuCheckboxItem>
                   );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="relative mt-4 flex flex-col gap-4 overflow-auto px-4 lg:px-6">
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
             <TableHeader className="sticky top-0 z-10 bg-muted">
               {table.getHeaderGroups().map((headerGroup) => (
                 <TableRow
                   key={headerGroup.id}
                   className="border-b hover:bg-transparent"
                 >
                   {headerGroup.headers.map((header) => (
                     <TableHead
                       key={header.id}
                       className="py-4 text-right font-medium"
                       style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                     >
                       {header.isPlaceholder
                         ? null
                         : flexRender(
                             header.column.columnDef.header,
                             header.getContext()
                           )}
                     </TableHead>
                   ))}
                 </TableRow>
               ))}
             </TableHeader>
             <TableBody>
               {table.getRowModel().rows?.length ? (
                 table.getRowModel().rows.map((row) => (
                   <TableRow key={row.id} className="border-b last:border-0 hover:bg-muted/50 data-[state=selected]:bg-muted">
                     {row.getVisibleCells().map((cell) => (
                       <TableCell key={cell.id} className="py-4 text-right">
                         {flexRender(
                           cell.column.columnDef.cell,
                           cell.getContext()
                         )}
                       </TableCell>
                     ))}
                   </TableRow>
                 ))
               ) : (
                 <TableRow>
                   <TableCell
                     colSpan={premiumMealsColumns.length}
                     className="h-24 text-center"
                   >
                     لا توجد وجبات مميزة.
                   </TableCell>
                 </TableRow>
               )}
             </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 pb-4">
          <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
            اجمالي الوجبات ({totalFiltered})
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                الصفوف في الصفحة
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => table.setPageSize(Number(value))}
              >
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                  <SelectValue
                    placeholder={table.getState().pagination.pageSize}
                  />
                </SelectTrigger>
                <SelectContent side="top">
                  <SelectGroup>
                    {[10, 20, 30, 40, 50].map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="flex w-fit items-center justify-center text-sm font-medium">
              صفحة {table.getState().pagination.pageIndex + 1} من{" "}
              {table.getPageCount() || 1}
            </div>

            <div className="mr-auto flex items-center gap-1 lg:mr-0">
              <Button
                 variant="outline"
                 size="icon"
                 className="hidden size-8 lg:flex"
                 onClick={() => table.setPageIndex(0)}
                 disabled={!table.getCanPreviousPage()}
               >
                 <span className="sr-only">الصفحة الأولى</span>
                 <ChevronsRightIcon className="size-4" />
               </Button>
               <Button
                 variant="outline"
                 size="icon"
                 className="size-8"
                 onClick={() => table.previousPage()}
                 disabled={!table.getCanPreviousPage()}
               >
                 <span className="sr-only">الصفحة السابقة</span>
                 <ChevronRightIcon className="size-4" />
               </Button>
               <Button
                 variant="outline"
                 size="icon"
                 className="size-8"
                 onClick={() => table.nextPage()}
                 disabled={!table.getCanNextPage()}
               >
                 <span className="sr-only">الصفحة التالية</span>
                 <ChevronLeftIcon className="size-4" />
               </Button>
               <Button
                 variant="outline"
                 size="icon"
                 className="hidden size-8 lg:flex"
                 onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                 disabled={!table.getCanNextPage()}
               >
                 <span className="sr-only">الصفحة الأخيرة</span>
                 <ChevronsLeftIcon className="size-4" />
               </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
