import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from "lucide-react"
import type { Table } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DataTablePaginationProps<TData> {
  table: Table<TData>
  totalItems?: number
  itemsLabel?: string
}

export function DataTablePagination<TData>({
  table,
  totalItems,
  itemsLabel = "عنصر",
}: DataTablePaginationProps<TData>) {
  return (
    <div className="flex items-center justify-between px-4 pb-4">
      <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
        اجمالي {itemsLabel} ({totalItems ?? table.getFilteredRowModel().rows.length})
      </div>
      <div className="flex w-full items-center gap-8 lg:w-fit">
        <div className="hidden items-center gap-2 lg:flex">
          <Label htmlFor="rows-per-page" className="text-sm font-medium">
            الصفوف في الصفحة
          </Label>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value))
              // If server-side, you might want it to reset page.
              table.setPageIndex(0) 
            }}
          >
            <SelectTrigger size="sm" className="w-20" id="rows-per-page">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
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
  )
}
