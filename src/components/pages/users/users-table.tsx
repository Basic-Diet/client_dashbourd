import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Link } from "@tanstack/react-router";
import { PlusIcon, SearchIcon } from "lucide-react";

import { buttonVariants } from "@/components/custom/button-variants";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DataTableViewOptions } from "@/components/ui/data-table-view-options";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
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
import { useAuth } from "@/hooks/useAuth";
import {
  useFilteredUsersCatalogQuery,
  useUsersListQuery,
} from "@/hooks/useUsersQuery";
import { canManageCustomerLifecycle } from "@/lib/customerLifecyclePermissions";
import { cn } from "@/lib/utils";
import type { User } from "@/types/userTypes";
import type { AuthFilterValue } from "./user-auth-utils";
import { customerMatchesAuthFilter } from "./user-auth-utils";
import { usersColumns } from "./users-columns";

export function UsersTable() {
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [authFilter, setAuthFilter] = React.useState<AuthFilterValue>("all");
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const { user: sessionUser } = useAuth();
  const queryClient = useQueryClient();
  const canManageLifecycle = canManageCustomerLifecycle(sessionUser?.role);

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [search]);

  const filtersActive = Boolean(debouncedSearch) || authFilter !== "all";
  const serverQuery = useUsersListQuery(
    pagination.pageIndex + 1,
    pagination.pageSize,
    !filtersActive
  );
  const catalogQuery = useFilteredUsersCatalogQuery(filtersActive);

  React.useEffect(() => {
    if (filtersActive) return;
    queryClient.cancelQueries({ queryKey: ["users", "filtered-catalog"] });
  }, [filtersActive, queryClient]);

  const filteredCatalog = React.useMemo(() => {
    if (!filtersActive) return [];
    const query = normalizeSearchTerm(debouncedSearch);
    return dedupeUsers(catalogQuery.data?.data ?? []).filter((user) => {
      if (!customerMatchesAuthFilter(user, authFilter)) return false;
      if (!query) return true;
      return userSearchText(user).includes(query);
    });
  }, [authFilter, catalogQuery.data?.data, debouncedSearch, filtersActive]);

  const filteredPage = React.useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    return filteredCatalog.slice(start, start + pagination.pageSize);
  }, [filteredCatalog, pagination.pageIndex, pagination.pageSize]);

  const data = filtersActive ? filteredPage : serverQuery.data?.data ?? [];
  const meta = filtersActive
    ? {
        total: filteredCatalog.length,
        totalPages: Math.max(
          1,
          Math.ceil(filteredCatalog.length / pagination.pageSize)
        ),
      }
    : serverQuery.data?.meta || { total: 0, totalPages: 1 };
  const isLoading = filtersActive
    ? catalogQuery.isLoading
    : serverQuery.isLoading;
  const isFetching = filtersActive
    ? catalogQuery.isFetching
    : serverQuery.isFetching;
  const isError = filtersActive ? catalogQuery.isError : serverQuery.isError;
  const retry = filtersActive ? catalogQuery.refetch : serverQuery.refetch;

  const table = useReactTable({
    data,
    columns: usersColumns,
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
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative flex-1">
            <SearchIcon className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="البحث في كل المستخدمين بالاسم أو الهاتف"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
              className="max-w-lg pr-9"
            />
            {isFetching && filtersActive ? (
              <p className="mt-1 text-xs text-muted-foreground">
                جاري تحميل كل المستخدمين لتطبيق البحث والتصفية...
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={authFilter}
              onValueChange={(value) => {
                setAuthFilter(value as AuthFilterValue);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
            >
              <SelectTrigger className="min-w-52">
                <SelectValue placeholder="حالة الدخول" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="active">مفعل</SelectItem>
                <SelectItem value="temporary_password">
                  كلمة مرور مؤقتة
                </SelectItem>
                <SelectItem value="temporary_password_expired">
                  انتهت كلمة المرور المؤقتة
                </SelectItem>
                <SelectItem value="inactive">غير نشط</SelectItem>
              </SelectContent>
            </Select>

            {canManageLifecycle ? (
              <Link
                to="/users/create"
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "bg-primary"
                )}
              >
                <PlusIcon />
                إضافة مستخدم جديد
              </Link>
            ) : null}

            <DataTableViewOptions table={table} />
          </div>
        </div>
      </div>

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
              ) : isError ? (
                <TableRow>
                  <TableCell
                    colSpan={usersColumns.length}
                    className="h-24 text-center"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <span>تعذر تحميل المستخدمين.</span>
                      <button
                        type="button"
                        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                        onClick={() => retry()}
                      >
                        إعادة المحاولة
                      </button>
                    </div>
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

        <DataTablePagination
          table={table}
          totalItems={meta.total}
          itemsLabel="مستخدمين"
        />
      </div>
    </div>
  );
}

function dedupeUsers(users: User[]) {
  const map = new Map<string, User>();
  for (const user of users) {
    const key =
      user.id || user.appUserId || user.coreUserId || user.phoneE164 || user.phone;
    if (key) map.set(key, user);
  }
  return Array.from(map.values());
}

function userSearchText(user: User) {
  return normalizeSearchTerm(
    [user.fullName, user.phoneE164, user.phone, user.email]
      .filter(Boolean)
      .join(" ")
  );
}

function normalizeSearchTerm(value: string) {
  return value.toLowerCase().replace(/[\s()-]/g, "").trim();
}
