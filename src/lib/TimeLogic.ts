export function calculateAttendanceStatus(timeInStr: string): 'Present' | 'Late' | 'Pending Approval' {
  const timeInMins = parseTimeString(timeInStr);
  const lateThreshold = 8 * 60 + 10; // 8:10 AM
  const approvalThreshold = 17 * 60; // 5:00 PM

  if (timeInMins > approvalThreshold) {
    return 'Pending Approval';
  }

  return timeInMins > lateThreshold ? 'Late' : 'Present';
}

export function adjustTimeIn(timeInStr: string): string {
  const timeInMins = parseTimeString(timeInStr);
  const earlyThreshold = 8 * 60; // 8:00 AM

  if (timeInMins < earlyThreshold) {
    return "08:00 AM";
  }
  return timeInStr;
}

export function calculateWorkHours(timeInStr: string, timeOutStr: string): { workHours: string, overtime: string } {
  if (!timeInStr || timeInStr === '-' || !timeOutStr || timeOutStr === '-') {
    return { workHours: '-', overtime: '-' };
  }

  const timeInMins = parseTimeString(timeInStr);
  const timeOutMins = parseTimeString(timeOutStr);

  let totalMinutes = timeOutMins - timeInMins;
  
  // Subtract 1 hour for lunch if they worked more than 5 hours
  if (totalMinutes >= 5 * 60) {
    totalMinutes -= 60;
  }

  const standardDayMins = 8 * 60;
  
  let otMinutes = 0;
  if (totalMinutes > standardDayMins) {
     otMinutes = totalMinutes - standardDayMins;
     totalMinutes = standardDayMins; // cap normal work hours to 8
  }

  const workHrsNum = (totalMinutes / 60).toFixed(1);
  const otHrsNum = otMinutes > 0 ? (otMinutes / 60).toFixed(1) + 'h' : '-';

  return {
    workHours: `${workHrsNum}h`,
    overtime: otHrsNum
  };
}

export function adjustTimeOut(timeOutStr: string): { adjustedTime: string, requiresApproval: boolean } {
  const timeOutMins = parseTimeString(timeOutStr);
  const endShiftMins = 17 * 60; // 5:00 PM
  const endShiftBufferMins = 18 * 60; // 6:00 PM

  if (timeOutMins > endShiftMins && timeOutMins <= endShiftBufferMins) {
    return { adjustedTime: "05:00 PM", requiresApproval: false };
  }

  if (timeOutMins > endShiftBufferMins) {
    return { adjustedTime: timeOutStr, requiresApproval: true };
  }

  return { adjustedTime: timeOutStr, requiresApproval: false };
}

// "08:30 AM" -> minutes from midnight
function parseTimeString(timeStr: string): number {
  if (!timeStr || timeStr === '-') return 0;
  
  const [time, period] = timeStr.split(' ');
  if (!time || !period) return 0;

  let [hours, minutes] = time.split(':').map(Number);
  
  if (period.toUpperCase() === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period.toUpperCase() === 'AM' && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
}
