import { AttendanceLogModel } from '../models/AttendanceLog';
import { LeaveRequestModel } from '../models/LeaveRequest';
import { Employee } from '../models/Employee';
import { IncidentReport } from '../services/IncidentService';

export interface PayrollSummary {
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  totalDaysPresent: number;
  totalPaidLeaves: number;
  basicPay: number;
  overtimePay: number;
  nightDifferential: number;
  lateDeduction: number;
  undertimeDeduction: number;
  violationDeduction: number;
  grossAdjustment: number;
  grossPay: number;
}

export function calculateEmployeePayrollSummary(
  employee: Employee,
  logs: AttendanceLogModel[],
  leaves: LeaveRequestModel[],
  incidents: IncidentReport[],
  startDate: string,
  endDate: string
): PayrollSummary {
  const start = new Date(`${startDate}T00:00:00`).getTime();
  const end = new Date(`${endDate}T00:00:00`).getTime();

  // Filter relevant logs
  const periodLogs = logs.filter(log => {
    const logTime = new Date(`${log.data.date}T00:00:00`).getTime();
    return logTime >= start && logTime <= end;
  });

  // Filter approved paid leaves
  const periodLeaves = leaves.filter(leave => {
    if (leave.data.status !== 'Approved') return false;
    if (leave.data.type === 'unpaid') return false;
    
    const leaveStart = new Date(`${leave.data.startDate}T00:00:00`).getTime();
    const leaveEnd = new Date(`${leave.data.endDate}T00:00:00`).getTime();
    
    // Overlap with period
    return leaveStart <= end && leaveEnd >= start;
  });

  // Filter relevant infractions
  const periodIncidents = incidents.filter(i => {
    const incidentTime = new Date(`${i.data.date}T00:00:00`).getTime();
    return i.data.type === 'Infraction' && incidentTime >= start && incidentTime <= end;
  });

  let totalDaysPresent = 0;
  let totalOT = 0;
  let totalND = 0;
  let totalLate = 0;
  let totalUndertime = 0;
  let awaySiteAllowance = 0;

  periodLogs.forEach(log => {
    if (log.data.timeIn && log.data.timeIn !== '-') {
      totalDaysPresent++;
    }
    totalOT += parsePeso(log.data.overtimePay) + parsePeso(log.data.flatOtAllowance);
    totalND += parseNightDiff(log.data.payrollNotes);
    totalLate += parsePeso(log.data.lateDeduction);
    totalUndertime += parsePeso(log.data.undertimeDeduction);
    awaySiteAllowance += parsePeso(log.data.awaySiteAllowance);
  });

  // Calculate leave days within period
  let totalPaidLeaves = 0;
  periodLeaves.forEach(leave => {
    const lStart = Math.max(start, new Date(`${leave.data.startDate}T00:00:00`).getTime());
    const lEnd = Math.min(end, new Date(`${leave.data.endDate}T00:00:00`).getTime());
    const days = Math.round((lEnd - lStart) / 86400000) + 1;
    totalPaidLeaves += days;
  });

  // Calculate violation deductions
  let violationDeduction = 0;
  periodIncidents.forEach(incident => {
    if (incident.data.severity === 'High') violationDeduction += 500;
    else if (incident.data.severity === 'Medium') violationDeduction += 200;
  });

  const dailyRate = Number(String(employee.dailyRate || '0').replace(/[^0-9.]/g, '')) || 750;
  const basicPay = (totalDaysPresent + totalPaidLeaves) * dailyRate;
  const grossAdjustment = totalOT + totalND + awaySiteAllowance - totalLate - totalUndertime - violationDeduction;
  const grossPay = basicPay + grossAdjustment;

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    startDate,
    endDate,
    totalDaysPresent,
    totalPaidLeaves,
    basicPay,
    overtimePay: totalOT,
    nightDifferential: totalND,
    lateDeduction: totalLate,
    undertimeDeduction: totalUndertime,
    violationDeduction,
    grossAdjustment,
    grossPay
  };
}

function parsePeso(value?: string): number {
  if (!value) return 0;
  const num = parseFloat(value.replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? 0 : num;
}

function parseNightDiff(notes?: string[]): number {
  if (!notes) return 0;
  const ndNote = notes.find(n => n.includes('Night differential added'));
  if (!ndNote) return 0;
  const match = ndNote.match(/₱([0-9.]+)/);
  return match ? parseFloat(match[1]) : 0;
}
