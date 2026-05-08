import React from "react";
import { cn } from "../../lib/utils";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { Select } from "./Select";

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
  minHeight = "450px"
}: DataTableProps<T>) {
  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisible = 5;
    
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
    }

    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange?.(currentPage - 1)}
          disabled={currentPage === 1}
          className="btn-page text-text-secondary"
        >
          <ChevronLeft size={18} />
        </button>
        
        {startPage > 1 && (
          <>
            <button
              onClick={() => onPageChange?.(1)}
              className={cn(
                "btn-page",
                currentPage === 1 ? "bg-primary text-white" : "text-text-secondary hover:bg-slate-50"
              )}
            >
              1
            </button>
          </>
        )}

        {pages.map(page => (
            <button
              key={page}
              onClick={() => onPageChange?.(page)}
              className={cn(
                "btn-page",
                currentPage === page ? "bg-primary text-white" : "text-text-secondary hover:bg-slate-50"
              )}
            >
              {page}
            </button>
        ))}

        {endPage < totalPages && (
          <>
            <button
              onClick={() => onPageChange?.(totalPages)}
              className={cn(
                "btn-page",
                currentPage === totalPages ? "bg-primary text-white" : "text-text-secondary hover:bg-slate-50"
              )}
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          onClick={() => onPageChange?.(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="btn-page text-text-secondary"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    );
  };

  return (
    <div className={cn("bg-white rounded-2xl border border-border shadow-sm flex flex-col overflow-hidden", className)}>
      <div 
        className="w-full relative flex-1"
        style={{ minHeight }}
      >
        <div className="w-full h-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 z-10">
                <tr className="border-b border-border/60 bg-slate-50/80 backdrop-blur-sm">
                {columns.map((col, idx) => (
                    <th 
                        key={idx} 
                        className={cn(
                            "px-5 py-4 font-bold text-[12px] text-text-secondary uppercase tracking-wider whitespace-nowrap",
                            col.headerClassName
                        )}
                    >
                        {col.header}
                    </th>
                ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-[15px]">
                {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                    {columns.map((_, j) => (
                        <td key={j} className="px-5 py-5">
                        <div className="h-4 bg-slate-100 rounded w-full"></div>
                        </td>
                    ))}
                    </tr>
                ))
                ) : data.length === 0 ? (
                <tr>
                    <td colSpan={columns.length} className="p-0">
                      <div 
                        className="flex flex-col items-center justify-center gap-3 text-text-muted"
                        style={{ height: minHeight }}
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
                data.map((item, rowIdx) => (
                    <tr 
                        key={rowIdx} 
                        onClick={() => onRowClick?.(item)}
                        className={cn(
                            "hover:bg-slate-50/50 transition-colors group",
                            onRowClick && "cursor-pointer"
                        )}
                    >
                    {columns.map((col, colIdx) => (
                        <td key={colIdx} className={cn("px-5 py-4", col.className)}>
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

      <div className="p-5 border-t border-border/60 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-text-secondary font-medium">
          Showing <span className="text-text-primary">{startItem}</span> to <span className="text-text-primary">{endItem}</span> of <span className="text-text-primary">{totalItems}</span> entries
        </div>
        
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <span className="text-[13px] text-text-secondary font-medium whitespace-nowrap">Rows per page</span>
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
