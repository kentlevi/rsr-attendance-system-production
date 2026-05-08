import { describe, it, expect } from 'vitest';
import {
  applyAttendanceApprovalDecision,
  findBlockingIncompleteAttendance,
  getPayrollReviewExportStatus,
  needsAttendanceApproval,
} from './AttendanceApprovalRules';

describe('AttendanceApprovalRules', () => {
  it('should approve an attendance log correctly', () => {
    const approved = applyAttendanceApprovalDecision(
      {
        status: 'Pending Approval',
        lateMinutes: 12,
        payrollReviewStatus: 'Pending Review',
        lunchApprovalStatus: 'Pending Review',
        payrollNotes: ['Early Lunch Out requires approval.'],
      },
      {
        decision: 'Approved',
        decidedBy: 'Admin User',
        decidedAt: '2026-05-08T08:00:00.000Z',
        note: 'Approved after supervisor confirmation.',
      },
    );

    expect(approved.status).toBe('Late');
    expect(approved.payrollReviewStatus).toBe('Final');
    expect(approved.lunchApprovalStatus).toBe('Approved');
    expect(approved.attendanceApprovalStatus).toBe('Approved');
    expect(approved.approvalHistory?.length).toBe(1);
    expect(approved.approvalHistory?.[0].decision).toBe('Approved');
  });

  it('should approve an attendance log with an official time out', () => {
    const approvedWithOfficialTimeOut = applyAttendanceApprovalDecision(
      {
        status: 'Pending Approval',
        timeIn: '08:00 AM',
        timeOut: '08:45 PM',
        actualTimeOut: '08:45 PM',
        adjustedTimeOut: '08:45 PM',
        payrollReviewStatus: 'Pending Review',
        payrollNotes: ['Time Out requires admin-selected official time.'],
      },
      {
        decision: 'Approved',
        decidedBy: 'Admin User',
        decidedAt: '2026-05-08T08:30:00.000Z',
        officialTimeOut: '05:00 PM',
      },
    );

    expect(approvedWithOfficialTimeOut.timeOut).toBe('05:00 PM');
    expect(approvedWithOfficialTimeOut.adjustedTimeOut).toBe('05:00 PM');
    expect(approvedWithOfficialTimeOut.actualTimeOut).toBe('08:45 PM');
    expect(approvedWithOfficialTimeOut.payrollNotes?.some((note) => note.includes('Official Time Out selected by admin'))).toBe(true);
  });

  it('should reject an attendance log', () => {
    const rejected = applyAttendanceApprovalDecision(
      {
        status: 'Pending Approval',
        payrollReviewStatus: 'Pending Review',
        pmBreakApprovalStatus: 'Pending Review',
      },
      {
        decision: 'Rejected',
        decidedBy: 'Admin User',
        decidedAt: '2026-05-08T09:00:00.000Z',
      },
    );

    expect(rejected.status).toBe('Pending Approval');
    expect(rejected.payrollReviewStatus).toBe('Pending Review');
    expect(rejected.pmBreakApprovalStatus).toBe('Rejected');
    expect(rejected.attendanceApprovalStatus).toBe('Rejected');
    expect(rejected.approvalHistory?.[0].decision).toBe('Rejected');
  });

  it('should find blocking incomplete attendance logs', () => {
    const blockingIncomplete = findBlockingIncompleteAttendance(
      [
        {
          data: {
            id: 'log-1',
            employeeId: 'emp-1',
            date: 'May 7, 2026',
            timeIn: '08:00 AM',
            timeOut: '-',
            workHours: '-',
            overtime: '-',
            status: 'Present',
            location: 'Site A',
          } as any,
        },
        {
          data: {
            id: 'log-2',
            employeeId: 'emp-2',
            date: 'May 7, 2026',
            timeIn: '08:00 AM',
            timeOut: '-',
            workHours: '-',
            overtime: '-',
            status: 'Present',
            location: 'Site A',
          } as any,
        },
      ],
      'emp-1',
      'May 8, 2026',
    );

    expect(blockingIncomplete?.data.id).toBe('log-1');
    expect(needsAttendanceApproval(blockingIncomplete!)).toBe(true);
    expect(getPayrollReviewExportStatus(blockingIncomplete!.data)).toBe('PAYROLL REVIEW REQUIRED');
  });

  it('should not block if incomplete log is approved', () => {
    const approvedIncomplete = findBlockingIncompleteAttendance(
      [
        {
          data: {
            id: 'log-3',
            employeeId: 'emp-1',
            date: 'May 7, 2026',
            timeIn: '08:00 AM',
            timeOut: '-',
            workHours: '-',
            overtime: '-',
            status: 'Present',
            location: 'Site A',
            attendanceApprovalStatus: 'Approved',
          } as any,
        },
      ],
      'emp-1',
      'May 8, 2026',
    );

    expect(approvedIncomplete).toBeUndefined();
  });
});
