export interface AttendanceLog {
  id: string;
  employeeId: string;
  date: string;
  /** Firestore serverTimestamp() value, stamped on every write so admins can
   *  detect clock drift on the punching device (compare to the device-time
   *  fields). Type is unknown because Firestore returns Timestamp on read but
   *  expects FieldValue on write. */
  serverReceivedAt?: unknown;
  actualTimeIn?: string;
  adjustedTimeIn?: string;
  actualTimeOut?: string;
  adjustedTimeOut?: string;
  timeIn: string;
  timeOut: string;
  workHours: string;
  overtime: string;
  status: 'Present' | 'Late' | 'Absent' | 'Pending Approval';
  location: string;
  latitude?: number;
  longitude?: number;
  geofenceDistance?: number;
  geofenceStatus?: 'Inside' | 'Outside';
  imageIn?: string;
  imageOut?: string;
  lunchOut?: string;
  lunchIn?: string;
  lunchMinutes?: number;
  lunchApprovalStatus?: 'Final' | 'Pending Review' | 'Approved' | 'Rejected';
  pmBreakOut?: string;
  pmBreakIn?: string;
  pmBreakMinutes?: number;
  pmBreakApprovalStatus?: 'Final' | 'Pending Review' | 'Approved' | 'Rejected';
  scheduledSite?: string;
  actualSite?: string;
  lateMinutes?: number;
  undertimeMinutes?: number;
  overtimeMinutes?: number;
  lateDeduction?: string;
  undertimeDeduction?: string;
  overtimePay?: string;
  flatOtAllowance?: string;
  awaySiteAllowance?: string;
  grossAdjustment?: string;
  payrollReviewStatus?: 'Final' | 'Pending Review';
  payrollNotes?: string[];
  attendanceApprovalStatus?: 'Pending Review' | 'Approved' | 'Rejected';
  attendanceApprovalNotes?: string;
  attendanceApprovalUpdatedAt?: string;
  attendanceApprovalUpdatedBy?: string;
  approvalHistory?: AttendanceApprovalHistoryItem[];
}

export interface AttendanceApprovalHistoryItem {
  decision: 'Approved' | 'Rejected';
  decidedBy: string;
  decidedAt: string;
  note?: string;
}

export class AttendanceLogModel {
  constructor(public data: AttendanceLog) {}
}
