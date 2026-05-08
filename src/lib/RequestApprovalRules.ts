import { LeaveRequest } from '../models/LeaveRequest';
import { Employee } from '../models/Employee';

type RequestApprovalDecision = 'Approved' | 'Rejected';

interface RequestApprovalInput {
  decision: RequestApprovalDecision;
  decidedBy: string;
  decidedAt?: string;
  note?: string;
}

export function applyLeaveApprovalDecision(
  request: Partial<LeaveRequest>,
  approval: RequestApprovalInput,
): Partial<LeaveRequest> {
  const decidedAt = approval.decidedAt || new Date().toISOString();
  const approvalHistory = [
    ...(request.approvalHistory || []),
    {
      decision: approval.decision,
      decidedBy: approval.decidedBy,
      decidedAt,
      ...(approval.note ? { note: approval.note } : {}),
    },
  ];

  return {
    status: approval.decision,
    reviewedBy: approval.decidedBy,
    reviewedAt: decidedAt,
    reviewNote: approval.note || '',
    absenceRecalculationRequired: true,
    absenceRecalculationReason: `Leave ${approval.decision} affects absence streaks.`,
    approvalHistory,
  };
}

export function calculateLeaveBalanceUpdate(
  request: Pick<LeaveRequest, 'type' | 'startDate' | 'endDate'>,
  employee: Pick<Employee, 'vlBalance' | 'slBalance'>,
) {
  const requestedDays = getInclusiveLeaveDays(request.startDate, request.endDate);
  const type = String(request.type).toLowerCase();

  if (type === 'vacation') {
    const available = employee.vlBalance || 0;
    if (available < requestedDays) {
      return {
        ok: false,
        message: `Insufficient Vacation Leave balance. Required ${requestedDays} day(s), available ${available}.`,
      };
    }

    return { ok: true, update: { vlBalance: available - requestedDays } };
  }

  if (type === 'sick') {
    const available = employee.slBalance || 0;
    if (available < requestedDays) {
      return {
        ok: false,
        message: `Insufficient Sick Leave balance. Required ${requestedDays} day(s), available ${available}.`,
      };
    }

    return { ok: true, update: { slBalance: available - requestedDays } };
  }

  return { ok: true, update: {} };
}

function getInclusiveLeaveDays(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`).getTime();
  const end = new Date(`${endDate}T00:00:00`).getTime();
  return Math.max(1, Math.floor((end - start) / 86400000) + 1);
}
