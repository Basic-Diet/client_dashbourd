import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
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
import { usersColumns } from "./users-columns";
import { useUsersListQuery } from "@/hooks/useUsersQuery";
import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function UsersTable() {
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const { data: response, isLoading } = useUsersListQuery(
    pagination.pageIndex + 1,
    pagination.pageSize
  );

  const data = React.useMemo(() => response?.data || [], [response]);
  const meta = response?.meta || { total: 0, totalPages: 1 };

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns: usersColumns,
    state: {
      pagination,
      globalFilter,
    },
    pageCount: meta.totalPages,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true,
  });

  return (
    <div className="w-full flex-col justify-start gap-6" dir="rtl">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <SearchIcon className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="البحث باسم المستخدم"
              value={globalFilter}
              onChange={(e) => {
                setGlobalFilter(e.target.value);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
              className="max-w-lg pr-9"
            />
          </div>

          {/* Add user link */}
          <Link
            to="/users/create"
            className={cn(buttonVariants({ variant: "default" }), "bg-primary")}
          >
            <PlusIcon />
            إضافة مستخدم جديد
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
                    colSpan={usersColumns.length}
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
                    colSpan={usersColumns.length}
                    className="h-24 text-center"
                  >
                    لا يوجد مستخدمين.
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
          itemsLabel="مستخدمين"
        />
      </div>
    </div>
  );
}
