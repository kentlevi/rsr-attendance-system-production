import React, { useState } from 'react';
import { Paperclip, X, Upload } from 'lucide-react';
import { leaveService } from '../../../services/LeaveService';
import { validateLeaveRequest } from '../../../lib/LeaveRules';
import { useToast } from '../../../context/ToastContext';
import { employeeService } from '../../../services/EmployeeService';
import { Modal } from '../../common/Modal';
import { Select } from '../../common/Select';
import { DatePicker } from '../../common/DatePicker';
import { Button } from '../../common/Button';
import { authenticatedFetch } from '../../../lib/api';

interface FileLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FileLeaveModal({ isOpen, onClose }: FileLeaveModalProps) {
  const { showToast } = useToast();
  const [employeeId, setEmployeeId] = useState('');
  const [leaveForm, setLeaveForm] = useState({
    type: 'vacation',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [leaveAiText, setLeaveAiText] = useState('');
  const [isParsingLeave, setIsParsingLeave] = useState(false);
  const [leaveAttachment, setLeaveAttachment] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const employees = employeeService.getAllEmployeesSync();

  const handleParseLeaveText = async () => {
    if (!leaveAiText.trim()) return;
    setIsParsingLeave(true);
    try {
      const response = await authenticatedFetch('/api/extract-leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: leaveAiText }),
      });
      const data = await response.json();
      if (data) {
        let type = 'vacation';
        if (data.type === 'Sick Leave') type = 'sick';
        else if (data.type === 'Leave Without Pay') type = 'unpaid';
        setLeaveForm({
          type,
          startDate: data.startDate || leaveForm.startDate,
          endDate: data.endDate || leaveForm.endDate,
          reason: data.reason || leaveForm.reason
        });
      }
    } catch (error) {
      console.error(error);
      showToast("Failed to parse leave using AI.", "error");
    } finally {
      setIsParsingLeave(false);
    }
  };

  const handleAttachmentSelect = (file: File | undefined) => {
    if (file) setLeaveAttachment(file);
  };

  const handleSubmit = async () => {
    if (!employeeId) {
      showToast("Please select an employee.", "warning");
      return;
    }
    const emp = employeeService.getEmployeeByIdSync(employeeId);
    if (!emp) {
      showToast("Employee not found.", "error");
      return;
    }
    
    const leaveValidation = validateLeaveRequest({
      ...leaveForm,
      vlBalance: emp.data.vlBalance,
      slBalance: emp.data.slBalance,
      today: new Date().toISOString().slice(0, 10)
    });

    if (!leaveValidation.valid) {
      showToast(leaveValidation.message || "Invalid leave request rules.", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      await leaveService.addRequest({
        employeeId,
        type: leaveForm.type,
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        reason: leaveForm.reason || '',
        status: 'Pending',
      });
      showToast("Leave request filed successfully!", "success");
      onClose();
    } catch (error) {
      console.error(error);
      showToast("Failed to file leave request.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="File Leave Request"
      maxWidth="max-w-2xl"
      footer={
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 w-full">
          <Button
            variant="secondary"
            className="w-full sm:w-auto text-text-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            className="w-full sm:w-auto"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={!employeeId || !leaveForm.startDate || !leaveForm.endDate}
          >
            {isSubmitting ? "Submitting" : "Submit Request"}
          </Button>
        </div>
      }
    >
      <div className="p-6 flex flex-col gap-4">
        {/* Employee Selector (admin-only) */}
        <Select
          label="Select Employee *"
          value={employeeId}
          onChange={e => setEmployeeId(e.target.value)}
          options={employees.map(emp => ({ value: emp.data.id, label: `${emp.data.name} (${emp.data.department || emp.data.id})` }))}
          placeholder="-- Choose an employee --"
        />

        {/* Smart Fill (AI) */}
        <div className="flex flex-col gap-1.5 p-4 bg-primary/5 rounded-xl border border-primary/20">
          <label className="block text-[12px] font-medium text-primary">
            Smart Fill (AI)
          </label>
          <p className="text-[12px] text-text-secondary leading-snug">
            Type a request naturally and our AI will fill out the form for you. (e.g., "Sick leave tomorrow because I have a fever")
          </p>
          <div className="flex gap-2">
            <textarea
              value={leaveAiText}
              onChange={(e) => setLeaveAiText(e.target.value)}
              placeholder="Describe the leave request"
              className="control-field flex-1 p-2.5 text-[14px] resize-none"
              rows={1}
            />
            <Button
              variant="primary"
              size="sm"
              onClick={handleParseLeaveText}
              isLoading={isParsingLeave}
              disabled={!leaveAiText.trim()}
              className="px-4 text-[12px] flex-shrink-0"
            >
              {isParsingLeave ? "Parsing" : "Auto-fill"}
            </Button>
          </div>
        </div>

        {/* Leave Type */}
        <div className="flex flex-col gap-1.5 pt-2 border-t border-border/50">
          <label className="block text-[16px] font-medium text-[#1a1a1a]">
            Leave Type <span className="text-[#DC2626]">*</span>
          </label>
          <Select
            value={leaveForm.type}
            onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}
            options={[
              { value: 'vacation', label: 'Vacation Leave' },
              { value: 'sick', label: 'Sick Leave' },
              { value: 'unpaid', label: 'Unpaid Leave' }
            ]}
            placeholder="Select Leave Type"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="block text-[16px] font-medium text-[#1a1a1a]">
              Start Date <span className="text-[#DC2626]">*</span>
            </label>
            <DatePicker
              value={leaveForm.startDate}
              onChange={(val) => setLeaveForm({ ...leaveForm, startDate: val })}
              placeholder="Start Date"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="block text-[16px] font-medium text-[#1a1a1a]">
              End Date <span className="text-[#DC2626]">*</span>
            </label>
            <DatePicker
              value={leaveForm.endDate}
              onChange={(val) => setLeaveForm({ ...leaveForm, endDate: val })}
              placeholder="End Date"
            />
          </div>
        </div>

        {/* Total Days */}
        <div className="flex flex-col gap-1.5">
          <label className="block text-[16px] font-medium text-[#1a1a1a]">
            Total Days
          </label>
          <input
            type="text"
            value={`${leaveForm.startDate && leaveForm.endDate ? Math.max(1, Math.ceil((new Date(leaveForm.endDate).getTime() - new Date(leaveForm.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1) : 0} day(s)`}
            readOnly
            className="control-field rounded-lg bg-[#F8FAFC] text-[#64748B] cursor-not-allowed"
          />
        </div>

        {/* Reason */}
        <div className="flex flex-col gap-1.5">
          <label className="block text-[16px] font-medium text-[#1a1a1a]">
            Reason <span className="text-[#DC2626]">*</span>
          </label>
          <textarea
            value={leaveForm.reason}
            onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
            placeholder="Enter reason for leave"
            className="control-field h-[100px] rounded-lg p-3 resize-none"
            maxLength={500}
          />
          <div className="text-right text-[12px] text-[#64748B] font-medium">
            {leaveForm.reason.length} / 500
          </div>
        </div>

        {/* Attachment */}
        <div className="flex flex-col gap-1.5">
          <label className="block text-[16px] font-medium text-[#1a1a1a]">
            Attachment{" "}
            <span className="text-[#64748B] font-normal">
              {leaveForm.type === 'sick' ? '(Medical Certificate, Optional)' : '(Optional)'}
            </span>
          </label>
          <label className="border border-dashed border-[#CBD5E1] rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-[#F8FAFC] hover:border-primary/50 transition-all cursor-pointer">
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              className="sr-only"
              onChange={(e) => handleAttachmentSelect(e.target.files?.[0])}
            />
            <div className="flex items-center justify-center text-[12px]">
              <Upload size={16} className="text-primary mr-2" />
              <span className="text-[#1a1a1a]">
                <span className="text-primary font-semibold">Click to upload</span>{" "}
                or drag and drop
              </span>
            </div>
            <span className="text-[12px] text-[#64748B]">
              JPG, PNG, PDF (Max. 5MB)
            </span>
          </label>
          {leaveAttachment && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-[#F8FAFC] px-3 py-2 text-[12px]">
              <div className="flex items-center gap-2 min-w-0 text-text-secondary">
                <Paperclip size={14} className="text-primary shrink-0" />
                <span className="truncate">{leaveAttachment.name}</span>
              </div>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setLeaveAttachment(null)}
                className="h-7 w-7 p-0 min-w-0"
                aria-label="Remove leave attachment"
              >
                <X size={14} />
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
