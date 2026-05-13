import React, { useState } from 'react';
import { FileSpreadsheet, Download, Search, Calendar, ChevronRight, Lock, Printer } from 'lucide-react';
import { DatePicker } from '../common/DatePicker';
import { DataTable } from '../common/DataTable';
import { Button } from '../common/Button';
import { employeeService } from '../../services/EmployeeService';
import { attendanceService } from '../../services/AttendanceService';
import { leaveService } from '../../services/LeaveService';
import { incidentService } from '../../services/IncidentService';
import { calculateEmployeePayrollSummary } from '../../lib/PayrollCalculator';
import { useToast } from '../../context/ToastContext';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export function PayrollView() {
  const { showToast } = useToast();
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [searchQuery, setSearchQuery] = useState('');
  
  const employees = employeeService.getAllEmployeesSync();
  const filteredEmployees = employees.filter(emp => emp.data.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const generatePayslip = (employee: any) => {
    if (!dateRange.start || !dateRange.end) {
      showToast("Please select a date range first.", "warning");
      return;
    }

    const logs = attendanceService.getLogsByEmployeeId(employee.data.id);
    const leaves = leaveService.getRequestsByEmployee(employee.data.id);
    const incidents = incidentService.getIncidentsForEmployee(employee.data.id);
    
    const summary = calculateEmployeePayrollSummary(
      employee.data,
      logs,
      leaves,
      incidents,
      dateRange.start,
      dateRange.end
    );

    const doc = new jsPDF() as any;
    
    // Add Company Header
    doc.setFontSize(20);
    doc.text('RSR Engineering Attendance', 14, 22);
    doc.setFontSize(12);
    doc.text('Payslip', 14, 30);
    
    // Add Employee Data
    doc.setFontSize(10);
    doc.text(`Employee Name: ${summary.employeeName}`, 14, 40);
    doc.text(`Employee ID: ${employee.data.employeeId || employee.data.id}`, 14, 46);
    doc.text(`Department: ${employee.data.department}`, 14, 52);
    doc.text(`Position: ${employee.data.position}`, 14, 58);
    
    doc.text(`Pay Period: ${summary.startDate} to ${summary.endDate}`, 120, 40);
    
    // Calculate total earnings and deductions
    const totalEarnings = summary.basicPay + Math.max(0, summary.grossAdjustment);
    const baseDeductions = 550; // SSS, PH, PI
    const totalDeductions = Math.abs(Math.min(0, summary.grossAdjustment)) + baseDeductions + summary.violationDeduction;
    const netPay = summary.grossPay - baseDeductions;

    doc.autoTable({
      startY: 70,
      head: [['Earnings', 'Amount', 'Deductions', 'Amount']],
      body: [
        ['Basic Pay', `P ${summary.basicPay.toFixed(2)}`, 'SSS Contribution', `P 300.00`],
        ['Overtime Pay', `P ${summary.overtimePay.toFixed(2)}`, 'PhilHealth', `P 150.00`],
        ['Night Diff', `P ${summary.nightDifferential.toFixed(2)}`, 'Pag-IBIG', `P 100.00`],
        ['', '', 'Late/Undertime', `P ${(summary.lateDeduction + summary.undertimeDeduction).toFixed(2)}`],
        ['', '', 'Violation Fine', `P ${summary.violationDeduction.toFixed(2)}`],
      ],
      foot: [
        ['Total Earnings', `P ${totalEarnings.toFixed(2)}`, 'Total Deductions', `P ${totalDeductions.toFixed(2)}`]
      ]
    });
    
    const finalY = doc.previousAutoTable.finalY || 130;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Net Pay: P ${netPay.toFixed(2)}`, 14, finalY + 15);
    
    doc.save(`${summary.employeeName.replace(/\s+/g, '_')}_Payslip.pdf`);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-0 sm:px-0">
        <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-[#E8F3EE] flex items-center justify-center text-[#0B7A4B]">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <p className="text-[14px] text-text-secondary font-medium uppercase tracking-wider">Payroll Period</p>
              <h3 className="text-[24px] font-bold text-[#1a1a1a] leading-none mt-1">Active</h3>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <DatePicker 
              value={dateRange.start} 
              onChange={val => setDateRange({...dateRange, start: val})}
              placeholder="Start Date"
              className="w-full"
            />
            <DatePicker 
              value={dateRange.end} 
              onChange={val => setDateRange({...dateRange, end: val})}
              placeholder="End Date"
              className="w-full"
            />
          </div>
        </div>
      </div>
      
      {/* Table */}
      <div className="bg-white sm:rounded-2xl border-y sm:border border-border/60 shadow-sm flex flex-col min-w-0 overflow-hidden">
         <div className="w-full flex flex-col md:flex-row items-start md:items-center justify-between p-4 sm:p-6 bg-white border-b border-border/50 gap-4">
            <h2 className="text-[20px] font-bold text-[#1a1a1a]">Generate Payslips</h2>
            <div className="flex items-center gap-4 w-full md:w-auto">
               <div className="relative w-full md:w-[320px]">
                 <input
                   type="text"
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   className="control-field pl-10 h-10 w-full"
                   placeholder="Search employee..."
                 />
                 <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
               </div>
            </div>
         </div>
         <div className="w-full flex-1">
            <DataTable 
              columns={[
                {
                  header: "Employee",
                  accessor: (emp: any) => (
                    <div className="flex items-center gap-3">
                      <img src={emp.data.avatar || undefined} alt={emp.data.name} className="w-9 h-9 shrink-0 rounded-full object-cover border border-border" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-[#1a1a1a] truncate">{emp.data.name}</span>
                        <span className="text-[14px] text-text-secondary truncate">{emp.data.position}</span>
                      </div>
                    </div>
                  )
                },
                {
                  header: "Department",
                  accessor: (emp: any) => <span className="text-[15px]">{emp.data.department}</span>
                },
                {
                  header: "Daily Rate",
                  accessor: (emp: any) => <span className="text-[15px]">₱ {emp.data.dailyRate || '750.00'}</span>
                },
                {
                  header: "Actions",
                  className: "text-right",
                  headerClassName: "text-right",
                  accessor: (emp: any) => (
                      <div className="flex justify-end">
                        <Button 
                          variant="secondary"
                          size="sm"
                          onClick={() => generatePayslip(emp)} 
                          leftIcon={<Printer size={16} />}
                        >
                          Generate PDF
                        </Button>
                      </div>
                  )
                }
              ]}
              data={filteredEmployees}
              getRowKey={(emp: any) => emp.data.id}
              emptyMessage="No employees found for payroll."
              className="border-0 rounded-none h-full shadow-none"
              minHeight="400px"
            />
         </div>
      </div>
    </div>
  );
}
