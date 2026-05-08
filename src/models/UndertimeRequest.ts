import { RequestAttachment } from './RequestAttachment';

export interface UndertimeRequest {
  id: string;
  employeeId: string;
  date: string;
  type: 'Early Out' | 'Short Hours' | 'Missing Time Out' | 'Half Day' | 'Long Break' | 'Missing Break Out';
  timeLost: string;
  plannedTimeOut?: string;
  actualTimeOut?: string;
  reason?: string;
  duration?: string;
  deduction: string;
  attachments?: RequestAttachment[];
  status: 'Pending Review' | 'Approved' | 'Rejected' | 'Resolved';
}

export class UndertimeRequestModel {
  constructor(public data: UndertimeRequest) {}
}
