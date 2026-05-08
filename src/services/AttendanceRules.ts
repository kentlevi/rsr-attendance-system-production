export class AttendanceRules {
  /**
   * Applies Time In rules:
   * - Before 8:00 AM -> counted from 8:00 AM
   * - 8:00–8:10 AM -> on-time
   * - After 8:10 AM -> late
   * - After 5:00 PM -> approval required
   */
  static processTimeIn(timeStr: string): { status: string, adjustedTime: string, requiresApproval: boolean } {
    // Basic implementation parsing HH:MM AM/PM
    const date = new Date(`1970/01/01 ${timeStr}`);
    const reqApprovalDate = new Date(`1970/01/01 05:00 PM`);
    const earlyMorningDate = new Date(`1970/01/01 08:00 AM`);
    const lateMorningDate = new Date(`1970/01/01 08:10 AM`);

    if (date > reqApprovalDate) {
      return { status: "Pending Approval", adjustedTime: timeStr, requiresApproval: true };
    }

    if (date < earlyMorningDate) {
      return { status: "Present", adjustedTime: "08:00 AM", requiresApproval: false };
    }

    if (date > lateMorningDate) {
      return { status: "Late", adjustedTime: timeStr, requiresApproval: false };
    }

    return { status: "Present", adjustedTime: timeStr, requiresApproval: false };
  }

  /**
   * Applies Time Out rules:
   * - Within 1 hour -> auto-snapped (e.g. 5:15 PM snapped to 5:00 PM)
   * - Beyond 1 hour -> approval required
   */
  static processTimeOut(timeOutStr: string): { adjustedTimeOut: string, requiresApproval: boolean } {
    const endShift = new Date(`1970/01/01 05:00 PM`);
    const endShiftBuffer = new Date(`1970/01/01 06:00 PM`);
    const timeOutDate = new Date(`1970/01/01 ${timeOutStr}`);

    if (timeOutDate > endShift && timeOutDate <= endShiftBuffer) {
      return { adjustedTimeOut: "05:00 PM", requiresApproval: false };
    }

    if (timeOutDate > endShiftBuffer) {
      return { adjustedTimeOut: timeOutStr, requiresApproval: true };
    }

    return { adjustedTimeOut: timeOutStr, requiresApproval: false };
  }
}
