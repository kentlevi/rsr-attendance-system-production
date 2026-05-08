interface AttendanceLogInput {
  employeeId: string;
  date: string;
  timeIn?: string;
}

interface LeaveRequestInput {
  employeeId: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface AbsenceStreakInput {
  employeeId: string;
  today?: string;
  attendanceLogs: AttendanceLogInput[];
  leaveRequests: LeaveRequestInput[];
  maxDays?: number;
}

export function calculateAbsenceStreak({
  employeeId,
  today = new Date().toISOString().slice(0, 10),
  attendanceLogs,
  leaveRequests,
  maxDays = 3,
}: AbsenceStreakInput) {
  let absentDays = 0;
  const todayDate = parseDateOnly(today);

  for (let offset = 0; offset < maxDays; offset += 1) {
    const day = addDays(todayDate, -offset);
    const isoDate = formatDateISO(day);

    if (isDateCoveredByApprovedLeave(employeeId, isoDate, leaveRequests)) {
      break;
    }

    if (hasAttendanceForDate(employeeId, isoDate, attendanceLogs)) {
      break;
    }

    absentDays += 1;
  }

  return {
    absentDays,
    alertDay: Math.min(absentDays, 3),
    shouldSendSms: absentDays > 0,
    shouldSuspend: absentDays >= 3,
  };
}

export function isDateCoveredByApprovedLeave(
  employeeId: string,
  isoDate: string,
  leaveRequests: LeaveRequestInput[],
) {
  const target = parseDateOnly(isoDate).getTime();

  return leaveRequests.some((request) => {
    if (request.employeeId !== employeeId || request.status !== 'Approved') return false;
    const start = parseDateOnly(request.startDate).getTime();
    const end = parseDateOnly(request.endDate).getTime();
    return target >= start && target <= end;
  });
}

function hasAttendanceForDate(
  employeeId: string,
  isoDate: string,
  attendanceLogs: AttendanceLogInput[],
) {
  return attendanceLogs.some((log) => {
    return (
      log.employeeId === employeeId &&
      normalizeToISO(log.date) === isoDate &&
      Boolean(log.timeIn && log.timeIn !== '-')
    );
  });
}

function normalizeToISO(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return formatDateISO(parseDateOnly(value));
}

function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00`);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDateISO(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
