import React, { useState } from "react";
import { Modal } from "./Modal";
import { downloadCSV } from "../../lib/utils";
import { useToast } from "../../context/ToastContext";
import { attendanceService } from "../../services/AttendanceService";
import { employeeService } from "../../services/EmployeeService";
import { allowanceService } from "../../services/AllowanceService";
import { undertimeService } from "../../services/UndertimeService";
import { FileText, Download, Calendar } from "lucide-react";

interface ExportPayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportPayrollModal({ isOpen, onClose }: ExportPayrollModalProps) {
  const { showToast } = useToast();
  
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(1)).toISOString().split("T")[0] // 1st of month
  );
  
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0] // today
  );

  const getFilteredLogs = () => {
    const logs = attendanceService.getAllLogs();
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    
    return logs.filter(model => {
      const logDate = new Date(model.data.date).getTime();
      return logDate >= start && logDate <= end;
    });
  };

  const cleanNumber = (val: string | undefined): number => {
    if (!val) return 0;
    const num = Number(val.replace(/[^0-9.]/g, ""));
    return Number.isFinite(num) ? num : 0;
  };

  const handleExportCSV = (type: "attendance_recap" | "raw_timesheets" | "allowances_undertime") => {
    const employees = employeeService.getAllEmployeesSync();
    let exportData: any[] = [];
    let filename = "";

    const startStr = startDate.replace(/-/g, "");
    const endStr = endDate.replace(/-/g, "");

    if (type === "attendance_recap") {
      const logs = getFilteredLogs();
      exportData = employees.map(empModel => {
        const emp = empModel.data;
        const empLogs = logs.filter(l => l.data.employeeId === emp.id);
        const presentDays = empLogs.filter(l => l.data.status === "Present" || l.data.status === "Late").length;
        const totalLateMins = empLogs.reduce((sum, l) => sum + (l.data.lateMinutes || 0), 0);
        const totalUndertimeMins = empLogs.reduce((sum, l) => sum + (l.data.undertimeMinutes || 0), 0);
        
        return {
          "Employee ID": emp.id,
          "Full Name": emp.name,
          "Department": emp.department || "-",
          "Days Present": presentDays,
          "Late (Mins)": totalLateMins,
          "Undertime (Mins)": totalUndertimeMins,
          "Status": emp.status
        };
      });
      filename = `Attendance_Recap_${startStr}_to_${endStr}.csv`;
    } 
    else if (type === "raw_timesheets") {
      const logs = getFilteredLogs();
      logs.forEach(l => {
        const emp = employees.find(e => e.data.id === l.data.employeeId);
        exportData.push({
          "Date": l.data.date,
          "Employee ID": l.data.employeeId,
          "Name": emp?.data.name || "Unknown",
          "Time In": l.data.timeIn,
          "Time Out": l.data.timeOut,
          "Location": l.data.location || "-",
          "Status": l.data.status,
          "Late Mins": l.data.lateMinutes || 0,
          "Undertime Mins": l.data.undertimeMinutes || 0,
          "OT Hours": l.data.overtime || "0h"
        });
      });
      exportData.sort((a, b) => new Date(a["Date"]).getTime() - new Date(b["Date"]).getTime());
      filename = `Raw_Timesheets_${startStr}_to_${endStr}.csv`;
    }
    else if (type === "allowances_undertime") {
       const allowances = allowanceService.getAllRecords();
       const undertime = undertimeService.getAllRequests();
       const start = new Date(startDate).getTime();
       const end = new Date(endDate).getTime();

       exportData = employees.map(empModel => {
         const emp = empModel.data;
         
         // Allowances within range
         const empAllowances = allowances.filter(a => {
            if(a.data.employeeId !== emp.id) return false;
            const t = new Date(a.data.date).getTime();
            return t >= start && t <= end;
         });
         const totalAllowance = empAllowances.reduce((sum, a) => sum + cleanNumber(a.data.finalAmount), 0);

         // Undertime Deductions within range
         const empUndertimes = undertime.filter(u => {
            if(u.data.employeeId !== emp.id || u.data.status !== "Approved") return false;
            const t = new Date(u.data.date).getTime();
            return t >= start && t <= end;
         });
         const totalDeduction = empUndertimes.reduce((sum, u) => sum + cleanNumber(u.data.deduction), 0);

         return {
           "Employee ID": emp.id,
           "Full Name": emp.name,
           "Department": emp.department || "-",
           "Total Allowance (₱)": totalAllowance,
           "Total Undertime Deduction (₱)": totalDeduction,
           "Net Adj (₱)": totalAllowance - totalDeduction
         };
       });
       filename = `Payroll_Adjustments_${startStr}_to_${endStr}.csv`;
    }

    if (exportData.length === 0) {
      showToast("No data to export for this range.", "warning");
      return;
    }

    downloadCSV(exportData, filename);
    showToast(`Exported ${filename}`, "success");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export Payroll & Reports" maxWidth="max-w-xl">
      <div className="p-6 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-[14px] font-medium text-[#1a1a1a]">Select Date Range</label>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="control-field w-full" />
            </div>
            <span className="text-text-muted">to</span>
            <div className="flex-1">
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="control-field w-full" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-[14px] font-medium text-[#1a1a1a]">Available Export Formats</label>
          
          <button onClick={() => handleExportCSV("attendance_recap")} className="flex items-start text-left gap-4 p-4 border border-border rounded-xl hover:border-emerald-600 hover:bg-emerald-50 transition-colors">
            <div className="p-2 bg-white rounded-lg border border-border shadow-sm text-emerald-600">
              <Calendar size={20} />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-[#1a1a1a]">Attendance Recap (.csv)</span>
              <span className="text-[13px] text-text-secondary">Summary of total days present, total late minutes, and undertimes per employee.</span>
            </div>
          </button>

          <button onClick={() => handleExportCSV("raw_timesheets")} className="flex items-start text-left gap-4 p-4 border border-border rounded-xl hover:border-blue-600 hover:bg-blue-50 transition-colors">
            <div className="p-2 bg-white rounded-lg border border-border shadow-sm text-blue-600">
              <FileText size={20} />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-[#1a1a1a]">Raw Timesheets (.csv)</span>
              <span className="text-[13px] text-text-secondary">Detailed line-by-line logs of Time In/Out for every day and every employee.</span>
            </div>
          </button>

          <button onClick={() => handleExportCSV("allowances_undertime")} className="flex items-start text-left gap-4 p-4 border border-border rounded-xl hover:border-purple-600 hover:bg-purple-50 transition-colors">
            <div className="p-2 bg-white rounded-lg border border-border shadow-sm text-purple-600">
              <Download size={20} />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-[#1a1a1a]">Payroll Adjustments (.csv)</span>
              <span className="text-[13px] text-text-secondary">Calculated total allowances vs. total undertime deductions for payroll encoding.</span>
            </div>
          </button>
        </div>
      </div>
    </Modal>
  );
}
