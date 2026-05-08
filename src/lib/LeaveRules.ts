export type LeaveType = 'sick' | 'vacation' | 'unpaid' | string;

interface LeavePolicy {
  label: string;
  paidHoursPerDay: number;
  creditLimitDays: number | null;
  requiresAdvanceDays: number;
}

interface ValidateLeaveRequestInput {
  type: LeaveType;
  startDate: string;
  endDate: string;
  today?: string;
}

const leavePolicies: Record<string, LeavePolicy> = {
  sick: {
    label: 'Sick Leave',
    paidHoursPerDay: 8,
    creditLimitDays: 2,
    requiresAdvanceDays: 0,
  },
  vacation: {
    label: 'Vacation Leave',
    paidHoursPerDay: 8,
    creditLimitDays: 2,
    requiresAdvanceDays: 3,
  },
  unpaid: {
    label: 'Leave Without Pay',
    paidHoursPerDay: 0,
    creditLimitDays: null,
    requiresAdvanceDays: 0,
  },
};

export function getLeavePolicy(type: LeaveType): LeavePolicy {
  return leavePolicies[String(type).toLowerCase()] || {
    label: String(type || 'Leave'),
    paidHoursPerDay: 0,
    creditLimitDays: null,
    requiresAdvanceDays: 0,
  };
}

export function validateLeaveRequest({
  type,
  startDate,
  endDate,
  today,
}: ValidateLeaveRequestInput) {
  if (!type || !startDate || !endDate) {
    return { valid: false, message: 'Please complete all required leave fields.' };
  }

  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  const current = parseDateOnly(today || new Date().toISOString().slice(0, 10));

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return { valid: false, message: 'Please enter valid leave dates.' };
  }

  if (end < start) {
    return { valid: false, message: 'End date cannot be earlier than start date.' };
  }

  const policy = getLeavePolicy(type);
  const daysUntilStart = Math.floor((start - current) / 86400000);

  if (daysUntilStart < policy.requiresAdvanceDays) {
    return {
      valid: false,
      message: `${policy.label} must be filed at least ${policy.requiresAdvanceDays} days in advance.`,
    };
  }

  return { valid: true, message: '', policy };
}

function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00`).getTime();
}
