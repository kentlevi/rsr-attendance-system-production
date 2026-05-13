import React, { useState } from 'react';
import { cn } from "../../lib/utils";
import { Search, ChevronDown, Download, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useAttendanceLogsController } from '../../controllers/AttendanceLogsController';
import { employeeService } from '../../services/EmployeeService';
import { Select } from '../common/Select';
import { DatePicker } from '../common/DatePicker';
import { DataTable } from '../common/DataTable';
import { Button } from '../common/Button';
import { useToast } from '../../context/ToastContext';
import { getPayrollReviewExportStatus } from '../../lib/AttendanceApprovalRules';

export function LogsView({ isAssistant }: { isAssistant?: boolean }) {
  const { showToast } = useToast();
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const { logs } = useAttendanceLogsController();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [fromDate, setFromDate] = useState(isAssistant ? todayDateStr : "");
  const [toDate, setToDate] = useState(isAssistant ? todayDateStr : "");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredLogs = logs.filter(log => {
    const emp = employeeService.getEmployeeByIdSync(log.data.employeeId);
    const searchStr = searchQuery.toLowerCase();
    
    const matchesSearch = 
      emp?.data.name.toLowerCase().includes(searchStr) ||
      log.data.date.toLowerCase().includes(searchStr);
      
    const matchesStatus = statusFilter === "All" || log.data.status === statusFilter;
    
    let matchesDate = true;
    if (fromDate || toDate) {
      const logDate = new Date(log.data.date);
      if (fromDate) {
        const start = new Date(fromDate);
        matchesDate = matchesDate && logDate >= start;
      }
      if (toDate) {
        const end = new Date(toDate);
        matchesDate = matchesDate && logDate <= end;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  }).sort((a, b) => {
    // Primary sort: Date descending
    const dateA = new Date(a.data.date).getTime();
    const dateB = new Date(b.data.date).getTime();
    if (dateA !== dateB) return dateB - dateA;
    
    // Secondary sort: TimeIn descending
    const timeA = a.data.timeIn || '00:00';
    const timeB = b.data.timeIn || '00:00';
    return timeB.localeCompare(timeA);
  });

  const columns = [
    {
      header: "Photo",
      accessor: (log: any) => {
        const emp = employeeService.getEmployeeByIdSync(log.data.employeeId)?.data;
        return (
          <img 
            src={log.data.imageIn || emp?.avatar || `https://i.pravatar.cc/150?u=${log.id}`} 
            alt={emp?.name} 
            className="w-10 h-10 shrink-0 rounded-full object-cover border border-border" 
          />
        );
      },
      className: "w-[80px]"
    },
    {
      header: "Dept / ID",
      accessor: (log: any) => {
        const emp = employeeService.getEmployeeByIdSync(log.data.employeeId)?.data;
        return <span className="font-medium text-[#1a1a1a]">{emp?.department || log.data.employeeId}</span>;
      },
      className: "w-[120px]"
    },
    {
      header: "Name",
      accessor: (log: any) => {
        const emp = employeeService.getEmployeeByIdSync(log.data.employeeId)?.data;
        return <span className="font-medium text-[#1a1a1a]">{emp?.name || 'Unknown'}</span>;
      }
    },
    {
      header: "Department",
      accessor: (log: any) => {
        const emp = employeeService.getEmployeeByIdSync(log.data.employeeId)?.data;
        return <span className="text-text-secondary">{emp?.department || '-'}</span>;
      }
    },
    {
      header: "Date",
      accessor: (log: any) => <span className="font-medium text-[#1a1a1a]">{log.data.date}</span>
    },
    {
      header: "In",
      accessor: (log: any) => (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F8FAFC] border border-border/60">
          <Clock size={14} className="text-[#0B7A4B]" />
          <span className="font-medium text-[#1a1a1a]">{log.data.timeIn}</span>
        </div>
      )
    },
    {
      header: "Out",
      accessor: (log: any) => (
        log.data.timeOut !== '-' ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F8FAFC] border border-border/60">
            <Clock size={14} className="text-[#3B82F6]" />
            <span className="font-medium text-[#1a1a1a]">{log.data.timeOut}</span>
          </div>
        ) : <span className="text-text-secondary">-</span>
      )
    },
    {
      header: "Work Hours",
      accessor: (log: any) => (
        <span className={cn("font-medium", log.data.workHours !== '-' ? 'text-[#1a1a1a]' : 'text-text-secondary')}>
          {log.data.workHours}
        </span>
      )
    },
    {
      header: "OT Hours",
      accessor: (log: any) => (
        <span className={cn("font-medium", log.data.overtime !== '-' && log.data.overtime !== '0h 00m' ? 'text-green-600' : 'text-text-secondary')}>
          {log.data.overtime}
        </span>
      )
    },
    {
      header: "Status",
      accessor: (log: any) => (
        <div className="flex items-center gap-1.5">
          {log.data.status === 'Present' && <CheckCircle2 size={16} className="text-green-600" />}
          {log.data.status === 'Absent' && <XCircle size={16} className="text-red-600" />}
          {log.data.status === 'Late' && <Clock size={16} className="text-orange-600" />}
          <span className={cn("font-semibold", 
            log.data.status === 'Present' ? 'text-green-600' :
            log.data.status === 'Absent' ? 'text-red-600' :
            'text-orange-600'
          )}>
            {log.data.status}
          </span>
        </div>
      )
    },
    {
      header: "Location",
      accessor: (log: any) => (
         <div className="flex flex-col gap-0.5 min-w-[120px]">
           <span className="text-text-secondary font-medium">{log.data.location}</span>
           {log.data.geofenceDistance !== undefined && (
             <>
               <span className={cn("text-[11px] leading-tight", log.data.geofenceStatus === 'Inside' ? 'text-green-600' : 'text-red-600')}>
                 {log.data.geofenceStatus === 'Inside' ? 'Location Verified' : `Outside (${Math.round(log.data.geofenceDistance)}m away)`}
               </span>
               <a href={`https://www.google.com/maps/search/?api=1&query=${log.data.latitude},${log.data.longitude}`} target="_blank" rel="noreferrer" className="text-[11px] text-[#3B82F6] hover:underline cursor-pointer">
                 View Map Tracker
               </a>
             </>
           )}
         </div>
      )
    },
    {
      header: "Late",
      accessor: (log: any) => (
        <span className={cn("font-medium", log.data.lateMinutes ? "text-orange-600" : "text-text-secondary")}>
          {log.data.lateMinutes ? `${log.data.lateMinutes}m / ${log.data.lateDeduction || "₱0.00"}` : "-"}
        </span>
      )
    },
    {
      header: "Undertime",
      accessor: (log: any) => (
        <span className={cn("font-medium", log.data.undertimeMinutes ? "text-red-600" : "text-text-secondary")}>
          {log.data.undertimeMinutes ? `${log.data.undertimeMinutes}m / ${log.data.undertimeDeduction || "₱0.00"}` : "-"}
        </span>
      )
    },
    {
      header: "OT Pay",
      accessor: (log: any) => (
        <span className={cn("font-medium", log.data.overtimeMinutes ? "text-green-600" : "text-text-secondary")}>
          {log.data.overtimeMinutes ? `${log.data.overtimeMinutes}m / ${log.data.overtimePay || "₱0.00"}` : "-"}
        </span>
      )
    },
    {
      header: "OT Allowance",
      accessor: (log: any) => (
        <span className={cn("font-medium", log.data.flatOtAllowance && !log.data.flatOtAllowance.includes("0.00") ? "text-green-600" : "text-text-secondary")}>
          {log.data.flatOtAllowance || "-"}
        </span>
      )
    },
    {
      header: "Adjustment",
      accessor: (log: any) => (
        <span className="font-semibold text-[#1a1a1a]">
          {log.data.grossAdjustment || "-"}
        </span>
      )
    }
  ];

  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExportLogs = () => {
    if (filteredLogs.length === 0) {
      showToast("No attendance logs to export.", "warning");
      return;
    }

    const headers = [
      "Log ID",
      "Employee ID",
      "Dept / ID",
      "Name",
      "Department",
      "Date",
      "Time In",
      "Time Out",
      "Work Hours",
      "Overtime",
      "Status",
      "Location",
      "Scheduled Site",
      "Actual Site",
      "Late Minutes",
      "Late Deduction",
      "Undertime Minutes",
      "Undertime Deduction",
      "Overtime Minutes",
      "Overtime Pay",
      "Flat OT Allowance",
      "Away-site Allowance",
      "Gross Adjustment",
      // "Payroll Review Status",
      // "Payroll Notes",
    ];
    const escapeCSV = (value: string) => `"${String(value || "").replace(/"/g, '""')}"`;
    const rows = filteredLogs.map((log) => {
      const emp = employeeService.getEmployeeByIdSync(log.data.employeeId)?.data;
      return [
        log.data.id,
        log.data.employeeId,
        emp?.department || log.data.employeeId,
        emp?.name || "Unknown",
        emp?.department || "",
        log.data.date,
        log.data.timeIn,
        log.data.timeOut,
        log.data.workHours,
        log.data.overtime,
        log.data.status,
        log.data.location,
        log.data.scheduledSite || "",
        log.data.actualSite || "",
        String(log.data.lateMinutes || 0),
        log.data.lateDeduction || "",
        String(log.data.undertimeMinutes || 0),
        log.data.undertimeDeduction || "",
        String(log.data.overtimeMinutes || 0),
        log.data.overtimePay || "",
        log.data.flatOtAllowance || "",
        log.data.awaySiteAllowance || "",
        log.data.grossAdjustment || "",
        // getPayrollReviewExportStatus(log.data),
        // (log.data.payrollNotes || []).join("; "),
      ]
        .map(escapeCSV)
        .join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Attendance logs exported.", "success");
  };

  return (
    <div className="w-full flex flex-col h-full gap-6 animate-in fade-in duration-500">
      <div className="bg-white sm:rounded-2xl border-y sm:border border-border/60 shadow-sm flex flex-col overflow-hidden">
        {/* Filter Section */}
        <div className="px-2 py-4 sm:p-6 border-b border-border/60 flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex-1 max-w-[400px]">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input 
                  type="text" 
                  placeholder="Search by name, ID, or date" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="control-field pl-11 pr-4"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <DatePicker 
                  value={fromDate}
                  onChange={setFromDate}
                  placeholder="From date"
                  className="w-[170px]"
                  disabled={isAssistant}
                />
                <span className="text-text-muted font-medium">-</span>
                <DatePicker 
                  value={toDate}
                  onChange={setToDate}
                  placeholder="To date"
                  className="w-[170px]"
                  disabled={isAssistant}
                />
              </div>
              
              <Select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-11 min-w-[150px]"
              >
                <option value="All">Status: All</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Late">Late</option>
              </Select>

              <Button 
                variant="secondary"
                size="sm"
                onClick={handleExportLogs}
                leftIcon={<Download size={18} />}
              >
                Export
              </Button>
            </div>
          </div>
        </div>

        <DataTable
          columns={columns as any}
          data={paginatedLogs}
          totalItems={filteredLogs.length}
          pageSize={pageSize}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
          emptyMessage="No attendance logs found matching your criteria."
          className="border-none shadow-none rounded-none"
          minHeight="500px"
        />
      </div>
    </div>
  );
}
