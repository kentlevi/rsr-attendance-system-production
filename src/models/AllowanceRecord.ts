export interface AllowanceRecord {
  id: string;
  employeeId: string;
  date: string;
  baseAllowance: string;
  otBonus: string;
  override: string;
  finalAmount: string;
  isOverride: boolean;
}

export class AllowanceRecordModel {
  constructor(public data: AllowanceRecord) {}
}
