import { Employee } from '../models/Employee';
import { SystemSettings } from '../services/SettingsService';

export type PayrollReviewStatus = 'Final' | 'Pending Review';
type BreakApprovalStatus = PayrollReviewStatus | 'Approved' | 'Rejected';

export interface PayrollFields {
  actualTimeIn?: string;
  adjustedTimeIn?: string;
  actualTimeOut?: string;
  adjustedTimeOut?: string;
  scheduledSite?: string;
  actualSite?: string;
  lunchOut?: string;
  lunchIn?: string;
  lunchMinutes?: number;
  lunchApprovalStatus?: BreakApprovalStatus;
  lateMinutes?: number;
  undertimeMinutes?: number;
  overtimeMinutes?: number;
  lateDeduction?: string;
  undertimeDeduction?: string;
  overtimePay?: string;
  flatOtAllowance?: string;
  awaySiteAllowance?: string;
  grossAdjustment?: string;
  payrollReviewStatus?: PayrollReviewStatus;
  payrollNotes?: string[];
}

interface TimeInInput {
  employee: Employee;
  actualSite: string;
  timeIn: string;
  settings: SystemSettings;
}

interface TimeOutInput {
  employee: Employee;
  actualSite: string;
  timeIn: string;
  timeOut: string;
  settings: SystemSettings;
  existingPayroll?: PayrollFields;
}

interface TimeInPayrollResult extends PayrollFields {
  status: 'Present' | 'Late' | 'Pending Approval';
}

interface TimeOutPayrollResult extends PayrollFields {
  requiresApproval: boolean;
  workHours: string;
  overtime: string;
}

export type BreakPunchAction = 'Lunch Out' | 'Lunch In' | 'PM Break Out' | 'PM Break In';

interface BreakPunchInput {
  action: BreakPunchAction;
  time: string;
  settings: SystemSettings;
  existingLog?: {
    timeIn?: string;
    lunchOut?: string;
    pmBreakOut?: string;
    payrollNotes?: string[];
  };
}

interface BreakPunchResult extends PayrollFields {
  requiresApproval: boolean;
  lunchOut?: string;
  lunchIn?: string;
  lunchMinutes?: number;
  lunchApprovalStatus?: PayrollReviewStatus;
  pmBreakOut?: string;
  pmBreakIn?: string;
  pmBreakMinutes?: number;
  pmBreakApprovalStatus?: PayrollReviewStatus;
}

export function getEmployeeShift(employee: Employee, settings: SystemSettings) {
    if (employee.shiftTemplateId && settings.shiftTemplates) {
        const customShift = settings.shiftTemplates.find(s => s.id === employee.shiftTemplateId);
        if (customShift) {
            return {
                shiftStartTime: customShift.startTime,
                shiftEndTime: customShift.endTime,
                gracePeriodMins: customShift.gracePeriodMins,
                isNightShift: customShift.isNightShift,
                nightDifferentialRate: customShift.nightDifferentialRate || 0,
            };
        }
    }
    // Default shift
    return {
        shiftStartTime: settings.shiftStartTime,
        shiftEndTime: settings.shiftEndTime,
        gracePeriodMins: settings.gracePeriodMins,
        isNightShift: false,
        nightDifferentialRate: 0,
    };
}

export function calculatePayrollForTimeIn({
  employee,
  actualSite,
  timeIn,
  settings,
}: TimeInInput): TimeInPayrollResult {
  const shift = getEmployeeShift(employee, settings);
  const shiftStart = parseTimeToMinutes(shift.shiftStartTime);
  const timeInMinutes = parseTimeToMinutes(timeIn);
  const graceCutoff = shiftStart + shift.gracePeriodMins;
  const approvalThreshold = parseTimeToMinutes(shift.shiftEndTime);
  const notes: string[] = [];
  const scheduledSite = getScheduledSite(employee);
  const requiresApproval = timeInMinutes > approvalThreshold;
  const adjustedTimeIn = timeInMinutes <= graceCutoff ? formatMinutesToTime(shiftStart) : timeIn;
  const lunchStart = parseTimeToMinutes(settings.lunchBreakStart);
  const lunchEnd = parseTimeToMinutes(settings.lunchBreakEnd);
  const shouldAutoDeductLunch = lunchEnd > lunchStart && timeInMinutes >= lunchEnd;
  const lateMinutes = Math.max(0, timeInMinutes - graceCutoff);
  const lateDeductionAmount = lateMinutes * getEmployeeMinuteRate(employee);
  const awaySiteAllowanceAmount = getAwaySiteAllowance(employee, actualSite, settings);

  if (requiresApproval) notes.push('Time In after dismissal requires approval.');
  if (lateMinutes > 0) notes.push(`Late by ${formatDuration(lateMinutes)}.`);
  if (shouldAutoDeductLunch) {
    notes.push(`Lunch automatically deducted from ${formatMinutesToTime(lunchStart)} to ${formatMinutesToTime(lunchEnd)}.`);
  }
  if (awaySiteAllowanceAmount > 0) notes.push(`Away-site allowance applied for ${actualSite}.`);

  return {
    actualTimeIn: timeIn,
    adjustedTimeIn,
    status: requiresApproval ? 'Pending Approval' : lateMinutes > 0 ? 'Late' : 'Present',
    scheduledSite,
    actualSite,
    ...(shouldAutoDeductLunch
      ? {
          lunchOut: formatMinutesToTime(lunchStart),
          lunchIn: formatMinutesToTime(lunchEnd),
          lunchMinutes: lunchEnd - lunchStart,
          lunchApprovalStatus: 'Final' as const,
        }
      : {}),
    lateMinutes,
    undertimeMinutes: 0,
    overtimeMinutes: 0,
    lateDeduction: formatPeso(lateDeductionAmount),
    undertimeDeduction: formatPeso(0),
    overtimePay: formatPeso(0),
    flatOtAllowance: formatPeso(0),
    awaySiteAllowance: formatPeso(awaySiteAllowanceAmount),
    grossAdjustment: formatAdjustment(awaySiteAllowanceAmount - lateDeductionAmount),
    payrollReviewStatus: requiresApproval ? 'Pending Review' : 'Final',
    payrollNotes: notes,
  };
}

export function calculateBreakPunchUpdate({
  action,
  time,
  settings,
  existingLog,
}: BreakPunchInput): BreakPunchResult {
  const punchMinutes = parseTimeToMinutes(time);
  const notes = [...(existingLog?.payrollNotes || [])];

  if (action === 'Lunch Out') {
    const lunchStart = parseTimeToMinutes(settings.lunchBreakStart);
    const latestLunchOut = lunchStart + 30;
    const timeInMinutes = parseTimeToMinutes(existingLog?.timeIn || '-');
    const hasLessThanTwoHoursWorked = timeInMinutes > 0 && punchMinutes - timeInMinutes < 120;
    const requiresApproval = punchMinutes < lunchStart || punchMinutes > latestLunchOut || hasLessThanTwoHoursWorked;

    if (punchMinutes < lunchStart) notes.push('Early Lunch Out requires approval.');
    if (punchMinutes > latestLunchOut) notes.push('Late Lunch Out requires approval.');
    if (hasLessThanTwoHoursWorked) notes.push('Lunch Out before 2 worked hours requires approval.');

    return {
      requiresApproval,
      lunchOut: time,
      lunchApprovalStatus: requiresApproval ? 'Pending Review' : 'Final',
      payrollReviewStatus: requiresApproval ? 'Pending Review' : undefined,
      payrollNotes: notes,
    };
  }

  if (action === 'Lunch In') {
    const lunchStart = parseTimeToMinutes(settings.lunchBreakStart);
    const earliestLunchIn = lunchStart + 40;
    const lunchOutMinutes = parseTimeToMinutes(existingLog?.lunchOut || settings.lunchBreakStart);
    const standardLunchIn = lunchOutMinutes + 60;
    const adjustedLunchIn = punchMinutes > standardLunchIn ? punchMinutes : standardLunchIn;
    const requiresApproval = punchMinutes < earliestLunchIn;

    if (requiresApproval) notes.push('Early Lunch In requires approval.');
    if (punchMinutes > standardLunchIn) notes.push(`Late Lunch return deducted as ${formatDuration(punchMinutes - lunchOutMinutes)}.`);

    return {
      requiresApproval,
      lunchIn: formatMinutesToTime(adjustedLunchIn),
      lunchMinutes: Math.max(0, adjustedLunchIn - lunchOutMinutes),
      lunchApprovalStatus: requiresApproval ? 'Pending Review' : 'Final',
      payrollReviewStatus: requiresApproval ? 'Pending Review' : undefined,
      payrollNotes: notes,
    };
  }

  if (action === 'PM Break Out') {
    const pmBreakStart = parseTimeToMinutes(settings.shiftEndTime);
    const latestPmBreakOut = pmBreakStart + 30;
    const requiresApproval = punchMinutes < pmBreakStart || punchMinutes > latestPmBreakOut;

    if (punchMinutes < pmBreakStart) notes.push('Early PM Break Out requires approval.');
    if (punchMinutes > latestPmBreakOut) notes.push('Late PM Break Out requires approval.');

    return {
      requiresApproval,
      pmBreakOut: time,
      pmBreakApprovalStatus: requiresApproval ? 'Pending Review' : 'Final',
      payrollReviewStatus: requiresApproval ? 'Pending Review' : undefined,
      payrollNotes: notes,
    };
  }

  const pmBreakStart = parseTimeToMinutes(settings.shiftEndTime);
  const earliestPmBreakIn = pmBreakStart + 40;
  const standardPmBreakIn = pmBreakStart + 60;
  const pmBreakOutMinutes = parseTimeToMinutes(existingLog?.pmBreakOut || settings.shiftEndTime);
  const adjustedPmBreakIn = punchMinutes > standardPmBreakIn ? punchMinutes : standardPmBreakIn;
  const requiresApproval = punchMinutes < earliestPmBreakIn;

  if (requiresApproval) notes.push('Early PM Break In requires approval.');
  if (punchMinutes > standardPmBreakIn) notes.push(`Late PM Break return recorded at ${time}.`);

  return {
    requiresApproval,
    pmBreakIn: formatMinutesToTime(adjustedPmBreakIn),
    pmBreakMinutes: Math.max(0, adjustedPmBreakIn - pmBreakOutMinutes),
    pmBreakApprovalStatus: requiresApproval ? 'Pending Review' : 'Final',
    payrollReviewStatus: requiresApproval ? 'Pending Review' : undefined,
    payrollNotes: notes,
  };
}

export function calculatePayrollForTimeOut({
  employee,
  actualSite,
  timeIn,
  timeOut,
  settings,
  existingPayroll,
}: TimeOutInput): TimeOutPayrollResult {
  if (!timeIn || timeIn === '-' || !timeOut || timeOut === '-') {
    return {
      actualTimeOut: timeOut,
      adjustedTimeOut: timeOut,
      requiresApproval: false,
      workHours: '-',
      overtime: '-',
      ...existingPayroll,
    };
  }

  const shift = getEmployeeShift(employee, settings);
  const timeInMinutes = parseTimeToMinutes(timeIn);
  const actualTimeOutMinutes = parseTimeToMinutes(timeOut);
  // Calculate potential night shift span (+24 hours if end time is before start time)
  let shiftEnd = parseTimeToMinutes(shift.shiftEndTime);
  let shiftStart = parseTimeToMinutes(shift.shiftStartTime);
  if (shift.isNightShift && shiftEnd < shiftStart) {
      shiftEnd += 24 * 60;
  }
  
  let effectiveTimeOutMinutes = actualTimeOutMinutes;
  if (shift.isNightShift && actualTimeOutMinutes < shiftStart) {
      effectiveTimeOutMinutes += 24 * 60;
  }

  const timeOutMinutes = effectiveTimeOutMinutes > shiftEnd && effectiveTimeOutMinutes <= shiftEnd + 60
    ? shiftEnd
    : effectiveTimeOutMinutes;
  const hasSuspiciousPunchSequence = timeOutMinutes < timeInMinutes;
  const standardWorkMinutes = Math.max(0, shiftEnd - shiftStart - getConfiguredBreakMinutes(settings));
  const breakMinutes = getBreakOverlapMinutes(settings, timeInMinutes, timeOutMinutes);
  const totalWorkedMinutes = Math.max(0, timeOutMinutes - timeInMinutes - breakMinutes);
  const undertimeMinutes = Math.max(0, standardWorkMinutes - totalWorkedMinutes);
  const overtimeMinutes = Math.max(0, totalWorkedMinutes - standardWorkMinutes);
  
  // Night differential (e.g. 10% bonus on hours worked inside night shift)
  let _ndAmount = 0;
  if (shift.isNightShift && shift.nightDifferentialRate) {
     const ndHours = Math.min(totalWorkedMinutes, standardWorkMinutes) / 60;
     const dailyRate = Number(String(employee.dailyRate || '').replace(/[^0-9.]/g, ''));
     const hourlyRate = (dailyRate || 0) / 8;
     _ndAmount = ndHours * hourlyRate * shift.nightDifferentialRate;
  }

  const minuteRate = getEmployeeMinuteRate(employee);
  const undertimeDeductionAmount = undertimeMinutes * minuteRate;
  const lateDeductionAmount = parsePeso(existingPayroll?.lateDeduction);
  const overtimePayAmount = (overtimeMinutes / 60) * settings.otAllowance;
  const flatOtAllowanceAmount = getFlatOtAllowanceAmount(timeInMinutes, timeOutMinutes, shiftStart);
  const awaySiteAllowanceAmount = getAwaySiteAllowance(employee, actualSite, settings);
  const grossAdjustment = awaySiteAllowanceAmount + overtimePayAmount + flatOtAllowanceAmount + _ndAmount - lateDeductionAmount - undertimeDeductionAmount;
  const requiresApproval = hasSuspiciousPunchSequence || effectiveTimeOutMinutes > shiftEnd + 60 || overtimeMinutes > 0 || undertimeMinutes > 0 || _ndAmount > 0;
  const notes = [...(existingPayroll?.payrollNotes || [])];

  if (hasSuspiciousPunchSequence) {
    notes.push('Suspicious punch sequence: Time Out is earlier than Time In.');
  }
  if (effectiveTimeOutMinutes > shiftEnd && effectiveTimeOutMinutes <= shiftEnd + 60) {
    notes.push(`Time Out snapped to ${formatMinutesToTime(shiftEnd % (24*60))}.`);
  }
  if (undertimeMinutes > 0) notes.push(`Undertime by ${formatDuration(undertimeMinutes)}.`);
  if (overtimeMinutes > 0) notes.push(`Overtime of ${formatDuration(overtimeMinutes)}.`);
  if (flatOtAllowanceAmount > 0) notes.push('Flat OT allowance applied.');
  if (_ndAmount > 0) notes.push(`Night differential added (${formatPeso(_ndAmount)}).`);
  if (awaySiteAllowanceAmount > 0 && !notes.some((note) => note.includes('Away-site allowance'))) {
    notes.push(`Away-site allowance applied for ${actualSite}.`);
  }

  return {
    actualTimeOut: timeOut,
    adjustedTimeOut: formatMinutesToTime(timeOutMinutes % (24*60)),
    requiresApproval,
    workHours: `${(Math.min(totalWorkedMinutes, standardWorkMinutes) / 60).toFixed(1)}h`,
    overtime: overtimeMinutes > 0 ? `${(overtimeMinutes / 60).toFixed(1)}h` : '-',
    scheduledSite: existingPayroll?.scheduledSite || getScheduledSite(employee),
    actualSite,
    lateMinutes: existingPayroll?.lateMinutes || 0,
    undertimeMinutes,
    overtimeMinutes,
    lateDeduction: existingPayroll?.lateDeduction || formatPeso(0),
    undertimeDeduction: formatPeso(undertimeDeductionAmount),
    overtimePay: formatPeso(overtimePayAmount),
    flatOtAllowance: formatPeso(flatOtAllowanceAmount),
    awaySiteAllowance: formatPeso(awaySiteAllowanceAmount),
    grossAdjustment: formatAdjustment(grossAdjustment),
    payrollReviewStatus: requiresApproval ? 'Pending Review' : 'Final',
    payrollNotes: notes,
  };
}

export function parseTimeToMinutes(value: string): number {
  if (!value || value === '-') return 0;
  const normalized = value.trim();
  const amPmMatch = normalized.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
  if (amPmMatch) {
    let hours = Number(amPmMatch[1]);
    const minutes = Number(amPmMatch[2]);
    const period = amPmMatch[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  const twentyFourHourMatch = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourHourMatch) {
    return Number(twentyFourHourMatch[1]) * 60 + Number(twentyFourHourMatch[2]);
  }

  return 0;
}

function getRequiredWorkMinutes(settings: SystemSettings) {
  const shiftStart = parseTimeToMinutes(settings.shiftStartTime);
  const shiftEnd = parseTimeToMinutes(settings.shiftEndTime);
  return Math.max(0, shiftEnd - shiftStart - getConfiguredBreakMinutes(settings));
}

function getConfiguredBreakMinutes(settings: SystemSettings) {
  return Math.max(0, parseTimeToMinutes(settings.lunchBreakEnd) - parseTimeToMinutes(settings.lunchBreakStart)) +
    Math.max(0, parseTimeToMinutes(settings.pmBreakEnd) - parseTimeToMinutes(settings.pmBreakStart));
}

function getBreakOverlapMinutes(settings: SystemSettings, timeInMinutes: number, timeOutMinutes: number) {
  return getOverlapMinutes(timeInMinutes, timeOutMinutes, parseTimeToMinutes(settings.lunchBreakStart), parseTimeToMinutes(settings.lunchBreakEnd)) +
    getOverlapMinutes(timeInMinutes, timeOutMinutes, parseTimeToMinutes(settings.pmBreakStart), parseTimeToMinutes(settings.pmBreakEnd));
}

function getOverlapMinutes(start: number, end: number, breakStart: number, breakEnd: number) {
  return Math.max(0, Math.min(end, breakEnd) - Math.max(start, breakStart));
}

function getEmployeeMinuteRate(employee: Employee) {
  const dailyRate = Number(String(employee.dailyRate || '').replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(dailyRate) || dailyRate <= 0) return 0;
  return dailyRate / 8 / 60;
}

function getScheduledSite(employee: Employee) {
  return employee.workLocation || 'Head Office';
}

function getAwaySiteAllowance(employee: Employee, actualSite: string, settings: SystemSettings) {
  const scheduledSite = getScheduledSite(employee);
  if (!actualSite || actualSite === '-' || actualSite === scheduledSite) return 0;
  return settings.awaySiteAllowance || 0;
}

function getFlatOtAllowanceAmount(timeInMinutes: number, actualTimeOutMinutes: number, shiftStart: number) {
  const onTimeThreshold = 21 * 60;
  const lateThreshold = 22 * 60;
  const wasLate = timeInMinutes > shiftStart + 10;
  const threshold = wasLate ? lateThreshold : onTimeThreshold;
  return actualTimeOutMinutes >= threshold ? 50 : 0;
}

function formatMinutesToTime(totalMinutes: number) {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hour12 = hours24 % 12 || 12;
  return `${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function formatDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function formatPeso(value: number) {
  return `₱${Math.max(0, value).toFixed(2)}`;
}

function formatAdjustment(value: number) {
  const amount = Math.abs(value).toFixed(2);
  if (value < 0) return `-₱${amount}`;
  return `₱${amount}`;
}

function parsePeso(value?: string) {
  if (!value) return 0;
  const sign = value.trim().startsWith('-') ? -1 : 1;
  const amount = Number(value.replace(/[^0-9.]/g, ''));
  return Number.isFinite(amount) ? sign * amount : 0;
}
