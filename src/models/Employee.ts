export interface Employee {
  id: string;
  pin: string;
  name: string;
  email: string;
  department: string;
  position: string;
  status: "Active" | "On Leave" | "Inactive";
  lastLogin?: string;
  avatar: string;
  facialRecognitionProfileId?: string;
  employeeId?: string; // Company / Login ID
  facialDataImage?: string; // Reference image for registration
  phone?: string;
  dob?: string;
  gender?: string;
  civilStatus?: string;
  address?: string;
  rfid?: string;
  employmentType?: string;
  workLocation?: string;
  supervisor?: string;
  shift?: string;
  shiftTemplateId?: string; // Foreign key to custom shift Template ID
  dateHired?: string;
  dailyRate?: string;
  payPeriodType?: "monthly" | "bi-weekly";
  taxId?: string;
  sssNumber?: string;
  pagibigNumber?: string;
  philhealthNumber?: string;
  allowanceType?: string;
  notes?: string;
  suspensionReason?: string;
  suspendedAt?: string;
  suspendedBy?: string;
  reinstatementReason?: string;
  reinstatedAt?: string;
  reinstatedBy?: string;
  statusHistory?: EmployeeStatusHistoryItem[];
  vlBalance?: number;
  slBalance?: number;
  lastLeaveReplenishmentCycle?: number;
  lastLeaveReplenishmentAt?: string;
  leaveReplenishmentHistory?: LeaveReplenishmentHistoryItem[];
}

export interface EmployeeStatusHistoryItem {
  previousStatus: Employee["status"];
  nextStatus: Employee["status"];
  reason: string;
  actor: string;
  decidedAt: string;
}

export interface LeaveReplenishmentHistoryItem {
  cycle: number;
  date: string;
  vlAdded: number;
  slAdded: number;
}

export class EmployeeModel {
  constructor(public data: Employee) {}

  get isActive() {
    return this.data.status === "Active";
  }
}
