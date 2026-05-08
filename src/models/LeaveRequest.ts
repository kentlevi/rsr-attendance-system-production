import { RequestAttachment } from './RequestAttachment';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  type: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reason: string;
  attachments?: RequestAttachment[];
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  absenceRecalculationRequired?: boolean;
  absenceRecalculationReason?: string;
  absenceRecalculatedAt?: string;
  approvalHistory?: LeaveApprovalHistoryItem[];
}

export interface LeaveApprovalHistoryItem {
  decision: 'Approved' | 'Rejected';
  decidedBy: string;
  decidedAt: string;
  note?: string;
}

export class LeaveRequestModel {
  constructor(public data: LeaveRequest) {}
}
