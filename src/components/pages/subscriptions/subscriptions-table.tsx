import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusIcon, SearchIcon } from "lucide-react";
import { DataTableViewOptions } from "@/components/ui/data-table-view-options";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { subscriptionsColumns } from "./subscriptions-columns";
import { useSubscriptionsListQuery } from "@/hooks/useSubscriptionsQuery";
import { useDebounce } from "@/hooks/useDebounce";
import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SubscriptionsTable() {
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [globalFilter, setGlobalFilter] = React.useState("");
  const debouncedSearch = useDebounce(globalFilter, 500);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const { data: response, isLoading } = useSubscriptionsListQuery(
    statusFilter === "all" ? null : statusFilter,
    pagination.pageIndex + 1,
    pagination.pageSize,
    debouncedSearch
  );

  const data = React.useMemo(() => response?.data || [], [response]);
  const meta = response?.meta || { total: 0, totalPages: 1 };

  const table = useReactTable({
    data,
    columns: subscriptionsColumns,
    state: {
      pagination,
    },
    pageCount: meta.totalPages,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  return (
    <div className="w-full flex-col justify-start gap-6" dir="rtl">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          {/* Status filter */}
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
          >
            <SelectTrigger className="w-40" size="sm">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectGroup>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="pending">قيد الانتظار</SelectItem>
                <SelectItem value="expired">منتهي</SelectItem>
                <SelectItem value="canceled">ملغى</SelectItem>
                <SelectItem value="ended">انتهى</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          {/* Search box */}
          <div className="relative flex-1">
            <SearchIcon className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="البحث باسم المشترك"
              value={globalFilter}
              onChange={(e) => {
                setGlobalFilter(e.target.value);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
              className="max-w-lg pr-9"
            />
          </div>

          {/* action link */}
          <Link
            to="/subscriptions/create"
            className={cn(buttonVariants({ variant: "default" }), "bg-primary")}
          >
            <PlusIcon />
            إضافة اشتراك جديد
          </Link>

          {/* Column visibility */}
          <DataTableViewOptions table={table} />
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
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={subscriptionsColumns.length}
                    className="h-24 text-center"
                  >
                    جاري التحميل...
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-4 text-right">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={subscriptionsColumns.length}
                    className="h-24 text-center"
                  >
                    لا توجد اشتراكات.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <DataTablePagination
          table={table}
          totalItems={meta.total}
          itemsLabel="الاشتراكات"
        />
      </div>
    </div>
  );
}
