import React from "react";
import { cn } from "../../lib/utils";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { Select } from "./Select";
import { Button } from "./Button";

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  pageSize?: number;
  currentPage?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onRowClick?: (item: T) => void;
  className?: string;
  minHeight?: string;
  getRowKey?: (item: T) => string | number;
  dense?: boolean;
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyMessage = "No records found.",
  pageSize = 10,
  currentPage = 1,
  totalItems = 0,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  className,
  minHeight,
  getRowKey,
  dense = false
}: DataTableProps<T>) {
  const [internalPage, setInternalPage] = React.useState(1);
  const activePage = onPageChange ? currentPage : internalPage;

  const handlePageChange = (page: number) => {
    if (onPageChange) {
      onPageChange(page);
    } else {
      setInternalPage(page);
    }
  };

  const displayData = React.useMemo(() => {
    // If onPageChange is provided, we assume the parent handles slicing/fetching
    if (onPageChange) return data;
    
    // Otherwise, handle internal slicing
    const start = (activePage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, activePage, pageSize, onPageChange]);

  const finalMinHeight = minHeight || (dense ? "250px" : "450px");
  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = totalItems === 0 ? 0 : (activePage - 1) * pageSize + 1;
  const endItem = Math.min(activePage * pageSize, totalItems);

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisible = 3; 
    
    let startPage = Math.max(1, activePage - 1);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
    }

    return (
      <div className="flex items-center gap-1">
        <Button
          onClick={() => handlePageChange(activePage - 1)}
          disabled={activePage === 1}
          variant="page"
          className="text-text-secondary"
        >
          <ChevronLeft size={18} />
        </Button>
        
        {startPage > 1 && (
          <>
            <Button
              onClick={() => handlePageChange(1)}
              variant="page"
              className={cn(
                activePage === 1 ? "bg-primary text-white" : "text-text-secondary hover:bg-slate-50"
              )}
            >
              1
            </Button>
          </>
        )}

        {pages.map(page => (
            <Button
              key={page}
              onClick={() => handlePageChange(page)}
              variant="page"
              className={cn(
                activePage === page ? "bg-primary text-white" : "text-text-secondary hover:bg-slate-50"
              )}
            >
              {page}
            </Button>
        ))}

        {endPage < totalPages && (
          <>
            <Button
              onClick={() => handlePageChange(totalPages)}
              variant="page"
              className={cn(
                activePage === totalPages ? "bg-primary text-white" : "text-text-secondary hover:bg-slate-50"
              )}
            >
              {totalPages}
            </Button>
          </>
        )}

        <Button
          onClick={() => handlePageChange(activePage + 1)}
          disabled={activePage === totalPages}
          variant="page"
          className="text-text-secondary"
        >
          <ChevronRight size={18} />
        </Button>
      </div>
    );
  };

  return (
    <div className={cn("bg-white rounded-2xl border border-border shadow-sm flex flex-col overflow-hidden", className)}>
      <div 
        className="w-full relative flex-1"
        style={{ minHeight }}
      >
        <div className="w-full h-full">
          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-border/60">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 space-y-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                      <div className="h-3 bg-slate-100 rounded w-1/3"></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-3 bg-slate-100 rounded"></div>
                    <div className="h-3 bg-slate-100 rounded"></div>
                  </div>
                </div>
              ))
            ) : displayData.length === 0 ? (
              <div 
                className="flex flex-col items-center justify-center gap-3 text-text-muted px-4"
                style={{ height: finalMinHeight }}
              >
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-1">
                  <Inbox size={32} strokeWidth={1.5} className="text-slate-300" />
                </div>
                <p className="font-semibold text-lg text-text-secondary tracking-tight">{emptyMessage}</p>
                <p className="text-sm text-text-muted text-center leading-relaxed">
                  Try adjusting your filters or search terms.
                </p>
              </div>
            ) : (
              displayData.map((item, rowIdx) => (
                <div 
                  key={getRowKey ? getRowKey(item) : rowIdx}
                  onClick={() => onRowClick?.(item)}
                  className={cn(
                    dense ? "p-3 gap-1.5" : "p-4 gap-5",
                    "flex flex-col active:bg-slate-50 transition-colors border-b border-border/40",
                    onRowClick && "cursor-pointer"
                  )}
                >
                  {/* Primary Header - Full Width */}
                  <div className="w-full flex items-start justify-between gap-3">
                    <div className="flex-1">
                      {typeof columns[0].accessor === "function" 
                        ? columns[0].accessor(item) 
                        : (item[columns[0].accessor] as React.ReactNode)}
                    </div>
                    {/* Actions - Move to Top Right */}
                    {(() => {
                      const lastCol = columns[columns.length - 1];
                      if (lastCol.header !== "Actions") return null;
                      return (
                        <div
                          className="shrink-0 pt-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {typeof lastCol.accessor === "function"
                            ? lastCol.accessor(item)
                            : (item[lastCol.accessor] as React.ReactNode)}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Data Grid - Middle */}
                  <div className={cn(
                    "grid grid-cols-2 gap-x-4",
                    dense ? "gap-y-1" : "gap-y-3"
                  )}>
                    {columns.slice(1, columns[columns.length - 1].header === "Actions" ? -1 : undefined).map((col, colIdx) => (
                      <div key={colIdx} className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                          {col.header}
                        </span>
                        <div className="text-[13px] text-text-secondary font-medium truncate">
                          {typeof col.accessor === "function" 
                            ? col.accessor(item) 
                            : (item[col.accessor] as React.ReactNode)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block w-full overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="sticky top-0 z-10">
                  <tr className="border-b border-border/60 bg-slate-50/80 backdrop-blur-sm">
                  {columns.map((col, idx) => (
                      <th 
                          key={idx} 
                          className={cn(
                              dense ? "px-3 py-2" : "px-5 py-4",
                              "font-bold text-[11px] text-text-secondary uppercase tracking-wider whitespace-nowrap",
                              col.headerClassName
                          )}
                      >
                          {col.header}
                      </th>
                  ))}
                  </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-[14px]">
                  {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                      {columns.map((_, j) => (
                          <td key={j} className={cn(dense ? "px-3 py-2.5" : "px-5 py-5")}>
                          <div className="h-4 bg-slate-100 rounded w-full"></div>
                          </td>
                      ))}
                      </tr>
                  ))
                  ) : displayData.length === 0 ? (
                  <tr>
                      <td colSpan={columns.length} className="p-0">
                        <div 
                          className="flex flex-col items-center justify-center gap-3 text-text-muted"
                          style={{ height: finalMinHeight }}
                        >
                          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-1">
                            <Inbox size={32} strokeWidth={1.5} className="text-slate-300" />
                          </div>
                          <p className="font-semibold text-lg text-text-secondary tracking-tight">{emptyMessage}</p>
                          <p className="text-sm text-text-muted max-w-[280px] text-center leading-relaxed">
                            Try adjusting your filters or search terms to find what you're looking for.
                          </p>
                        </div>
                      </td>
                  </tr>
                  ) : (
                  displayData.map((item, rowIdx) => (
                      <tr 
                          key={getRowKey ? getRowKey(item) : rowIdx} 
                          onClick={() => onRowClick?.(item)}
                          className={cn(
                              "hover:bg-slate-50/50 transition-colors group",
                              onRowClick && "cursor-pointer"
                          )}
                      >
                      {columns.map((col, colIdx) => (
                          <td key={colIdx} className={cn(dense ? "px-3 py-2" : "px-5 py-4", "whitespace-nowrap", col.className)}>
                          {typeof col.accessor === "function" 
                              ? col.accessor(item) 
                              : (item[col.accessor] as React.ReactNode)}
                          </td>
                      ))}
                      </tr>
                  ))
                  )}
              </tbody>
              </table>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4 border-t border-border/60 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-text-secondary font-medium order-2 sm:order-1">
          Showing <span className="text-text-primary">{startItem}</span> to <span className="text-text-primary">{endItem}</span> of <span className="text-text-primary">{totalItems}</span> entries
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-3 w-full sm:w-auto order-1 sm:order-2">
            <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-[13px] text-text-secondary font-medium whitespace-nowrap">Rows per page</span>
                <Select 
                    value={String(pageSize)}
                    onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
                    className="h-9 min-w-[70px] text-sm !rounded-lg shadow-none"
                    containerClassName="min-w-[70px]"
                    openDirection="up"
                >
                    {[5, 10, 20, 50, 100].map(size => (
                        <option key={size} value={size}>{size}</option>
                    ))}
                </Select>
            </div>
            {renderPagination()}
        </div>
      </div>
    </div>
  );
}
