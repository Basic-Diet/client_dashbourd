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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from "@dnd-kit/modifiers";
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
import type { Package } from "@/types/packageTypes";
import { packagesColumns } from "./packages-columns";
import { DraggableRow } from "./draggable-row";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function PackagesTable({ data: initialData }: { data: Package[] }) {
  const [data, setData] = React.useState(initialData);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Update data when initialData changes
  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const table = useReactTable({
    data,
    columns: packagesColumns,
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

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor)
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setData((prev) => {
        const oldIndex = prev.findIndex((item) => item._id === active.id);
        const newIndex = prev.findIndex((item) => item._id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }

  const totalFiltered = table.getFilteredRowModel().rows.length;

  return (
    <div className="w-full flex-col justify-start gap-6" dir="rtl">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          {/* Status filter */}
          <Select
            value={
              (table.getColumn("isActive")?.getFilterValue() as string) || "all"
            }
            onValueChange={(value) => {
              table
                .getColumn("isActive")
                ?.setFilterValue(value === "all" ? undefined : value);
            }}
          >
            <SelectTrigger className="w-30" size="sm">
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

          {/* Search box */}
          <div className="relative flex-1">
            <SearchIcon className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="البحث باسم الباقة"
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="max-w-lg pr-9"
            />
          </div>

          {/* action link */}
          <Link
            to="/packages/create"
            className={cn(buttonVariants({ variant: "default" }), "bg-primary")}
          >
            <PlusIcon />
            إضافة باقة جديدة
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          >
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className="border-b hover:bg-transparent"
                  >
                    {/* Drag handle header */}
                    <TableHead className="w-8 py-4 text-right font-medium" />
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="py-4 text-right font-medium"
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
                <SortableContext
                  items={data.map((d) => d._id)}
                  strategy={verticalListSortingStrategy}
                >
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <DraggableRow key={row.id} row={row}>
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="py-4 text-right">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </td>
                        ))}
                      </DraggableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={packagesColumns.length + 1}
                        className="h-24 text-center"
                      >
                        لا توجد باقات.
                      </TableCell>
                    </TableRow>
                  )}
                </SortableContext>
              </TableBody>
            </Table>
          </DndContext>
        </div>

        {/* Pagination */}
        {/* Pagination */}
        <div className="flex items-center justify-between px-4 pb-4">
          <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
            اجمالي الباقات ({totalFiltered})
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
              {/* First page */}
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

              {/* Previous page */}
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

              {/* Next page */}
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

              {/* Last page */}
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
