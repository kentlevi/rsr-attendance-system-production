import React, { useState } from 'react';
import { FileSpreadsheet, Download, Search, Calendar, ChevronRight, Lock, Printer } from 'lucide-react';
import { DatePicker } from '../common/DatePicker';
import { DataTable } from '../common/DataTable';
import { employeeService } from '../../services/EmployeeService';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export function PayrollView() {
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [searchQuery, setSearchQuery] = useState('');
  
  const employees = employeeService.getAllEmployeesSync();
  const filteredEmployees = employees.filter(emp => emp.data.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const generatePayslip = (emp: any) => {
    const doc = new jsPDF() as any;
    
    // Add Company Header
    doc.setFontSize(20);
    doc.text('RSR Engineering Attendance', 14, 22);
    doc.setFontSize(12);
    doc.text('Payslip', 14, 30);
    
    // Add Employee Data
    doc.setFontSize(10);
    doc.text(`Employee Name: ${emp.data.name}`, 14, 40);
    doc.text(`Employee ID: ${emp.data.employeeId || emp.data.id}`, 14, 46);
    doc.text(`Department: ${emp.data.department}`, 14, 52);
    doc.text(`Position: ${emp.data.position}`, 14, 58);
    
    const startPeriod = dateRange.start || 'Start of Period';
    const endPeriod = dateRange.end || 'End of Period';
    doc.text(`Pay Period: ${startPeriod} to ${endPeriod}`, 120, 40);
    
    // Add Earnings & Deductions
    const baseDailyRate = parseFloat(emp.data.dailyRate || '750');
    const timeDiff = Math.abs(new Date(endPeriod).getTime() - new Date(startPeriod).getTime());
    const totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) || 15;
    // Calculate total days inside date range dynamically
    const basicPay = baseDailyRate * totalDays;
    
    const tax = basicPay * 0.1;
    const sss = 300;
    const philhealth = 150;
    const pagibig = 100;
    const totalDeductions = tax + sss + philhealth + pagibig;
    const netPay = basicPay - totalDeductions;
    
    doc.autoTable({
      startY: 70,
      head: [['Earnings', 'Amount', 'Deductions', 'Amount']],
      body: [
        ['Basic Pay', `P ${basicPay.toFixed(2)}`, 'Withholding Tax', `P ${tax.toFixed(2)}`],
        ['', '', 'SSS Contribution', `P ${sss.toFixed(2)}`],
        ['', '', 'PhilHealth', `P ${philhealth.toFixed(2)}`],
        ['', '', 'Pag-IBIG', `P ${pagibig.toFixed(2)}`],
      ],
      foot: [
        ['Total Earnings', `P ${basicPay.toFixed(2)}`, 'Total Deductions', `P ${totalDeductions.toFixed(2)}`]
      ]
    });
    
    const finalY = doc.previousAutoTable.finalY || 130;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Net Pay: P ${netPay.toFixed(2)}`, 14, finalY + 15);
    
    doc.save(`${emp.data.name.replace(/\s+/g, '_')}_Payslip.pdf`);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
      <div className="bg-white border text-[#1a1a1a] border-border rounded-2xl overflow-hidden shadow-sm flex flex-col items-center justify-start flex-1 shrink-0 pb-12 w-full h-[600px] overflow-y-auto">
         <div className="w-full flex flex-col md:flex-row items-start md:items-center justify-between p-6 bg-white border-b border-border/50 gap-4">
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
                       <button onClick={() => generatePayslip(emp)} className="btn-secondary btn-sm inline-flex items-center gap-2">
                         <Printer size={16} /> Generate PDF
                       </button>
                     </div>
                  )
                }
              ]}
              data={filteredEmployees}
              emptyMessage="No employees found for payroll."
              className="border-0 rounded-none h-full shadow-none"
              minHeight="400px"
            />
         </div>
      </div>
    </div>
  );
}
