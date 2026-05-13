import React, { useMemo, useState } from 'react';
import { Check, Clock, Search, ShieldAlert, X } from 'lucide-react';
import { AttendanceLogModel } from '../../models/AttendanceLog';
import { LeaveRequestModel } from '../../models/LeaveRequest';
import { attendanceService } from '../../services/AttendanceService';
import { employeeService } from '../../services/EmployeeService';
import { leaveService } from '../../services/LeaveService';
import { applyAttendanceApprovalDecision, needsAttendanceApproval } from '../../lib/AttendanceApprovalRules';
import { applyLeaveApprovalDecision, calculateLeaveBalanceUpdate } from '../../lib/RequestApprovalRules';
import { cn } from '../../lib/utils';
import { DataTable } from '../common/DataTable';
import { TimePicker } from '../common/TimePicker';
import { Button } from '../common/Button';
import { useToast } from '../../context/ToastContext';
import { FileLeaveModal } from './common/FileLeaveModal';
import { notificationService } from '../../services/NotificationService';

function getApprovalReason(log: AttendanceLogModel) {
  const reasons = [
    log.data.lunchApprovalStatus === 'Pending Review' ? 'Lunch break review' : '',
    log.data.pmBreakApprovalStatus === 'Pending Review' ? 'PM break review' : '',
    (log.data.overtimeMinutes || 0) > 0 ? 'Overtime review' : '',
    (log.data.undertimeMinutes || 0) > 0 ? 'Undertime review' : '',
    log.data.timeOut === '-' ? 'Missing Time Out' : '',
    log.data.status === 'Pending Approval' ? 'Pending attendance approval' : '',
  ].filter(Boolean);

  return reasons.length ? reasons.join(', ') : 'Payroll review';
}

function formatTimeInputToDisplay(value?: string) {
  if (!value) return undefined;
  const [hourValue, minuteValue] = value.split(':');
  const hours = Number(hourValue);
  const minutes = Number(minuteValue);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;

  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function ApprovalsView({ isAssistant }: { isAssistant?: boolean }) {
  const { showToast } = useToast();
  const [logs, setLogs] = useState(attendanceService.getAllLogs());
  const [leaveRequests, setLeaveRequests] = useState(leaveService.getAllRequests());
  const [searchQuery, setSearchQuery] = useState('');
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);
  const [officialTimeOutByLogId, setOfficialTimeOutByLogId] = useState<Record<string, string>>({});
  const [isFileLeaveModalOpen, setIsFileLeaveModalOpen] = useState(false);

  React.useEffect(() => {
    const unsubscribeAttendance = attendanceService.subscribe(() => {
      setLogs(attendanceService.getAllLogs());
    });
    const unsubscribeLeaves = leaveService.subscribe(() => {
      setLeaveRequests(leaveService.getAllRequests());
    });

    return () => {
      unsubscribeAttendance();
      unsubscribeLeaves();
    };
  }, []);

  const pendingLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return logs.filter((log) => {
      if (!needsAttendanceApproval(log)) return false;
      if (!query) return true;

      const employee = employeeService.getEmployeeByIdSync(log.data.employeeId)?.data;
      return (
        employee?.name.toLowerCase().includes(query) ||
        log.data.date.toLowerCase().includes(query) ||
        getApprovalReason(log).toLowerCase().includes(query)
      );
    });
  }, [logs, searchQuery]);

  const pendingLeaveRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    // Assistant sees all leave statuses, Admin sees only pending ones
    const allLeaves = isAssistant ? leaveRequests : leaveRequests.filter(r => r.data.status === 'Pending');
    return allLeaves.filter((request) => {
      if (!query) return true;

      const employee = employeeService.getEmployeeByIdSync(request.data.employeeId)?.data;
      return (
        employee?.name.toLowerCase().includes(query) ||
        request.data.type.toLowerCase().includes(query) ||
        request.data.startDate.toLowerCase().includes(query) ||
        request.data.endDate.toLowerCase().includes(query)
      );
    });
  }, [leaveRequests, searchQuery, isAssistant]);

  const handleDecision = async (
    log: AttendanceLogModel,
    decision: 'Approved' | 'Rejected',
  ) => {
    setIsUpdatingId(log.data.id);
    try {
      await attendanceService.updateLog(
        log.data.id,
        applyAttendanceApprovalDecision(log.data, {
          decision,
          decidedBy: 'Admin',
          officialTimeOut: decision === 'Approved'
            ? formatTimeInputToDisplay(officialTimeOutByLogId[log.data.id])
            : undefined,
        }),
      );

      // Notify via Telegram
      const employee = employeeService.getEmployeeByIdSync(log.data.employeeId)?.data;
      if (employee) {
        await notificationService.sendTelegramNotification(
          `<b>⚖️ Attendance Reviewed</b>\n\n` +
          `<b>Employee:</b> ${employee.name}\n` +
          `<b>Date:</b> ${log.data.date}\n` +
          `<b>Status:</b> ${decision}\n` +
          `<b>Reason:</b> ${getApprovalReason(log)}`
        );
      }

      showToast(`Attendance approval ${decision.toLowerCase()}.`, 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to update attendance approval.', 'error');
    } finally {
      setIsUpdatingId(null);
    }
  };

  const handleLeaveDecision = async (
    request: LeaveRequestModel,
    decision: 'Approved' | 'Rejected',
  ) => {
    setIsUpdatingId(request.data.id);
    try {
      const employee = employeeService.getEmployeeByIdSync(request.data.employeeId)?.data;
      if (!employee) {
        showToast('Employee record was not found for this leave request.', 'error');
        return;
      }

      if (decision === 'Approved') {
        const balanceResult = calculateLeaveBalanceUpdate(request.data, employee);
        if (!balanceResult.ok) {
          showToast(balanceResult.message || 'Insufficient leave balance.', 'warning');
          return;
        }

        if (Object.keys(balanceResult.update).length > 0) {
          await employeeService.updateEmployee(employee.id, balanceResult.update);
        }
      }

      await leaveService.updateRequest(
        request.data.id,
        applyLeaveApprovalDecision(request.data, {
          decision,
          decidedBy: 'Admin',
        }),
      );

      // Notify via Telegram
      await notificationService.sendTelegramNotification(
        `<b>📬 Leave Decision</b>\n\n` +
        `<b>Employee:</b> ${employee.name}\n` +
        `<b>Status:</b> ${decision}\n` +
        `<b>Type:</b> ${request.data.type}\n` +
        `<b>Period:</b> ${request.data.startDate} to ${request.data.endDate}`
      );

      const { awolService } = await import('../../services/AwolService');
      await awolService.processAwolAlerts();
      await leaveService.updateRequest(request.data.id, {
        absenceRecalculationRequired: false,
        absenceRecalculatedAt: new Date().toISOString(),
      });
      showToast(`Leave request ${decision.toLowerCase()}.`, 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to update leave request.', 'error');
    } finally {
      setIsUpdatingId(null);
    }
  };

  const columns = [
    {
      header: 'Employee',
      accessor: (log: AttendanceLogModel) => {
        const employee = employeeService.getEmployeeByIdSync(log.data.employeeId)?.data;
        return (
          <div className="flex items-center gap-3">
            <img
              src={employee?.avatar || `https://i.pravatar.cc/150?u=${log.data.employeeId}`}
              alt={employee?.name }
              className="h-10 w-10 shrink-0 rounded-full border border-border object-cover"
            />
            <div className="flex flex-col gap-1">
              <span className="text-[14px] font-semibold text-text-primary">
                {employee?.name || 'Unknown Employee'}
              </span>
              <span className="text-[12px] font-medium text-text-secondary">
                {employee?.department || 'Unknown Dept'}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Date',
      accessor: (log: AttendanceLogModel) => (
        <span className="text-[14px] font-medium text-text-primary">{log.data.date}</span>
      ),
    },
    {
      header: 'Punches',
      accessor: (log: AttendanceLogModel) => (
        <div className="grid min-w-[220px] grid-cols-2 gap-2 text-[12px] font-medium text-text-secondary">
          <span>In: {log.data.timeIn}</span>
          <span>Out: {log.data.timeOut}</span>
          <span>Lunch: {log.data.lunchOut || '-'} / {log.data.lunchIn || '-'}</span>
          <span>PM: {log.data.pmBreakOut || '-'} / {log.data.pmBreakIn || '-'}</span>
        </div>
      ),
    },
    {
      header: 'Reason',
      accessor: (log: AttendanceLogModel) => (
        <div className="flex max-w-[260px] flex-col gap-1">
          <span className="font-semibold text-amber-700">{getApprovalReason(log)}</span>
          {log.data.payrollNotes?.length ? (
            <span className="text-[12px] leading-5 text-text-secondary">
              {log.data.payrollNotes.join('; ')}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      header: 'Review',
      accessor: (log: AttendanceLogModel) => (
        <div className="flex flex-col gap-1 text-[12px] font-medium text-text-secondary">
          {/*<span>Payroll: {log.data.payrollReviewStatus || '-'}</span>*/}
          <span>Lunch: {log.data.lunchApprovalStatus || '-'}</span>
          <span>PM: {log.data.pmBreakApprovalStatus || '-'}</span>
        </div>
      ),
    },
    ...(isAssistant ? [] : [{
      header: 'Actions',
      accessor: (log: AttendanceLogModel) => {
        const isUpdating = isUpdatingId === log.data.id;
        const needsOfficialTimeOut = log.data.timeOut !== '-' && log.data.payrollReviewStatus === 'Pending Review';
        return (
          <div className="flex items-center justify-end gap-2 relative w-full">
            {needsOfficialTimeOut ? (
              <TimePicker
                value={officialTimeOutByLogId[log.data.id] || ''}
                onChange={(val) => setOfficialTimeOutByLogId((current) => ({
                  ...current,
                  [log.data.id]: val,
                }))}
                className="w-[125px]"
              />
            ) : null}
            <Button
              type="button"
              disabled={isUpdating || (needsOfficialTimeOut && !officialTimeOutByLogId[log.data.id])}
              onClick={() => handleDecision(log, 'Approved')}
              variant="secondary"
              size="sm"
              className="text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50"
              leftIcon={<Check size={16} />}
            >
              Approve
            </Button>
            <Button
              type="button"
              disabled={isUpdating}
              onClick={() => handleDecision(log, 'Rejected')}
              variant="secondary"
              size="sm"
              className="text-red-700 hover:border-red-200 hover:bg-red-50"
              leftIcon={<X size={16} />}
            >
              Reject
            </Button>
          </div>
        );
      },
      className: 'text-right',
    }]),
  ];

  const leaveColumns = [
    {
      header: 'Employee',
      accessor: (request: LeaveRequestModel) => {
        const employee = employeeService.getEmployeeByIdSync(request.data.employeeId)?.data;
        return (
          <div className="flex items-center gap-3">
            <img
              src={employee?.avatar || `https://i.pravatar.cc/150?u=${request.data.employeeId}`}
              alt={employee?.name || request.data.employeeId}
              className="h-10 w-10 shrink-0 rounded-full border border-border object-cover"
            />
            <div className="flex flex-col gap-1">
              <span className="text-[14px] font-semibold text-text-primary">
                {employee?.name || 'Unknown Employee'}
              </span>
              <span className="text-[12px] font-medium text-text-secondary">
                {employee?.department || request.data.employeeId}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Leave Type',
      accessor: (request: LeaveRequestModel) => (
        <span className="capitalize text-[14px] font-semibold text-text-primary">
          {request.data.type}
        </span>
      ),
    },
    {
      header: 'Dates',
      accessor: (request: LeaveRequestModel) => (
        <div className="flex flex-col gap-1 text-[13px] font-medium text-text-secondary">
          <span>{request.data.startDate}</span>
          <span>to {request.data.endDate}</span>
        </div>
      ),
    },
    {
      header: 'Reason',
      accessor: (request: LeaveRequestModel) => (
        <span className="block max-w-[320px] text-[13px] leading-5 text-text-secondary">
          {request.data.reason || '-'}
        </span>
      ),
    },
    ...(isAssistant ? [{
      header: 'Status',
      accessor: (request: LeaveRequestModel) => (
        <span className={cn(
          "px-2.5 py-1 rounded-md text-[13px] font-semibold",
          request.data.status === 'Approved' ? "bg-emerald-50 text-emerald-700" :
          request.data.status === 'Rejected' ? "bg-red-50 text-red-700" :
          "bg-amber-50 text-amber-700"
        )}>
          {request.data.status}
        </span>
      )
    }] : [{
      header: 'Actions',
      accessor: (request: LeaveRequestModel) => {
        const isUpdating = isUpdatingId === request.data.id;
        return (
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              type="button"
              disabled={isUpdating}
              onClick={() => handleLeaveDecision(request, 'Approved')}
              variant="secondary"
              size="sm"
              className="text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50"
              leftIcon={<Check size={15} />}
            >
              Approve
            </Button>
            <Button
              type="button"
              disabled={isUpdating}
              onClick={() => handleLeaveDecision(request, 'Rejected')}
              variant="secondary"
              size="sm"
              className="text-red-700 hover:border-red-200 hover:bg-red-50"
              leftIcon={<X size={15} />}
            >
              Reject
            </Button>
          </div>
        );
      },
      className: 'text-right',
    }]),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-border bg-white px-2 py-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <ShieldAlert size={20} />
            </div>
            <div>
              <div className="text-[24px] font-bold text-text-primary">{pendingLogs.length}</div>
              <div className="text-[13px] font-medium text-text-secondary">Pending attendance approvals</div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-white px-2 py-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Clock size={20} />
            </div>
            <div>
              <div className="text-[24px] font-bold text-text-primary">
                {pendingLogs.filter((log) => log.data.timeOut === '-').length}
              </div>
              <div className="text-[13px] font-medium text-text-secondary">Missing time out records</div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-white px-2 py-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Check size={20} />
            </div>
            <div>
              <div className="text-[24px] font-bold text-text-primary">
                {logs.filter((log) => log.data.attendanceApprovalStatus === 'Approved').length}
              </div>
              <div className="text-[13px] font-medium text-text-secondary">Approved attendance reviews</div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-white px-2 py-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <ShieldAlert size={20} />
            </div>
            <div>
              <div className="text-[24px] font-bold text-text-primary">{pendingLeaveRequests.length}</div>
              <div className="text-[13px] font-medium text-text-secondary">Pending leave requests</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-border bg-white px-2 py-3 sm:p-4">
        <Search size={18} className="shrink-0 text-text-muted" />
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search approvals by employee, ID, date, or reason"
          className="h-11 flex-1 bg-transparent text-[14px] font-medium text-text-primary outline-none placeholder:text-text-muted"
        />
      </div>

      <DataTable
        columns={columns}
        data={pendingLogs}
        emptyMessage="No attendance approvals pending."
        pageSize={10}
        totalItems={pendingLogs.length}
        className={cn('shadow-none')}
        dense
      />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-semibold text-text-primary">Leave Approvals</h2>
            <p className="text-[13px] font-medium text-text-secondary">
              Review pending leave requests submitted by employees.
            </p>
          </div>
          <Button 
            variant="primary"
            size="sm"
            onClick={() => setIsFileLeaveModalOpen(true)}
          >
            File Leave Request
          </Button>
        </div>
        <DataTable
          columns={leaveColumns}
          data={pendingLeaveRequests}
          emptyMessage="No leave approvals pending."
          pageSize={10}
          totalItems={pendingLeaveRequests.length}
          className={cn('shadow-none')}
          minHeight="320px"
          dense
        />
      </div>

      <FileLeaveModal 
        isOpen={isFileLeaveModalOpen}
        onClose={() => setIsFileLeaveModalOpen(false)}
      />
    </div>
  );
}
