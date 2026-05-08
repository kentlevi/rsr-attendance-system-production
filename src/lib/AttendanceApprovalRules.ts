import { AttendanceLog } from '../models/AttendanceLog';

type AttendanceApprovalDecision = 'Approved' | 'Rejected';

interface ApprovalInput {
  decision: AttendanceApprovalDecision;
  decidedBy: string;
  decidedAt?: string;
  note?: string;
  officialTimeOut?: string;
}

type AttendanceApprovalUpdate = Partial<AttendanceLog>;

interface AttendanceLogLike {
  data: AttendanceLog;
}

export function applyAttendanceApprovalDecision(
  log: Partial<AttendanceLog>,
  approval: ApprovalInput,
): AttendanceApprovalUpdate {
  const decidedAt = approval.decidedAt || new Date().toISOString();
  const approvalHistory = [
    ...(log.approvalHistory || []),
    {
      decision: approval.decision,
      decidedBy: approval.decidedBy,
      decidedAt,
      ...(approval.note ? { note: approval.note } : {}),
    },
  ];

  const update: AttendanceApprovalUpdate = {
    attendanceApprovalStatus: approval.decision,
    attendanceApprovalNotes: approval.note || '',
    attendanceApprovalUpdatedAt: decidedAt,
    attendanceApprovalUpdatedBy: approval.decidedBy,
    approvalHistory,
  };

  if (log.lunchApprovalStatus === 'Pending Review') {
    update.lunchApprovalStatus = approval.decision;
  }

  if (log.pmBreakApprovalStatus === 'Pending Review') {
    update.pmBreakApprovalStatus = approval.decision;
  }

  if (approval.decision === 'Approved') {
    update.status = getApprovedAttendanceStatus(log);
    update.payrollReviewStatus = 'Final';
    if (approval.officialTimeOut) {
      update.timeOut = approval.officialTimeOut;
      update.adjustedTimeOut = approval.officialTimeOut;
      update.actualTimeOut = log.actualTimeOut || log.timeOut;
      update.payrollNotes = [
        ...(log.payrollNotes || []),
        `Official Time Out selected by admin: ${approval.officialTimeOut}.`,
      ];
    }
    return update;
  }

  update.status = 'Pending Approval';
  update.payrollReviewStatus = 'Pending Review';
  return update;
}

export function needsAttendanceApproval(log: AttendanceLogLike) {
  return (
    log.data.status === 'Pending Approval' ||
    log.data.payrollReviewStatus === 'Pending Review' ||
    log.data.lunchApprovalStatus === 'Pending Review' ||
    log.data.pmBreakApprovalStatus === 'Pending Review' ||
    isIncompleteAttendanceRecord(log.data)
  );
}

export function findBlockingIncompleteAttendance(
  logs: AttendanceLogLike[],
  employeeId: string,
  currentDate: string,
) {
  const currentDateMs = parseLogDate(currentDate);
  return logs
    .filter((log) => {
      if (log.data.employeeId !== employeeId) return false;
      if (!isIncompleteAttendanceRecord(log.data)) return false;
      if (log.data.attendanceApprovalStatus === 'Approved') return false;

      const logDateMs = parseLogDate(log.data.date);
      return Number.isFinite(logDateMs) && Number.isFinite(currentDateMs) && logDateMs < currentDateMs;
    })
    .sort((a, b) => parseLogDate(b.data.date) - parseLogDate(a.data.date))[0];
}

export function getPayrollReviewExportStatus(log: Partial<AttendanceLog>) {
  if (isIncompleteAttendanceRecord(log) && log.attendanceApprovalStatus !== 'Approved') {
    return 'PAYROLL REVIEW REQUIRED';
  }
  if (log.payrollReviewStatus === 'Pending Review') return 'PAYROLL REVIEW REQUIRED';
  return log.payrollReviewStatus || '';
}

export function getIncompleteAttendanceReviewUpdate(log: Partial<AttendanceLog>): AttendanceApprovalUpdate {
  const notes = [...(log.payrollNotes || [])];
  if (!notes.some((note) => note.includes('Missing Time Out'))) {
    notes.push('Missing Time Out requires admin approval.');
  }

  return {
    status: 'Pending Approval',
    payrollReviewStatus: 'Pending Review',
    attendanceApprovalStatus: 'Pending Review',
    payrollNotes: notes,
  };
}

function getApprovedAttendanceStatus(log: Partial<AttendanceLog>) {
  if ((log.lateMinutes || 0) > 0) return 'Late';
  if (log.timeIn && log.timeIn !== '-') return 'Present';
  return 'Pending Approval';
}

function isIncompleteAttendanceRecord(log: Partial<AttendanceLog>) {
  return Boolean(log.timeIn && log.timeIn !== '-' && (!log.timeOut || log.timeOut === '-'));
}

function parseLogDate(value: string) {
  return new Date(value).getTime();
}
