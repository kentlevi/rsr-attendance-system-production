import React, { useState } from 'react';
import { Wand2, Paperclip, Loader2, X } from 'lucide-react';
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
      employeeId,
      requestDate: new Date().toISOString()
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
        <div className="flex gap-3 w-full">
          <Button variant="secondary" className="px-8 flex-1" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            variant="primary"
            className="px-10 flex-1" 
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={!employeeId || !leaveForm.startDate || !leaveForm.endDate}
          >
            File Request
          </Button>
        </div>
      }
    >
      <div className="p-6 md:p-8 flex flex-col gap-8">
        <Select
          label="Select Employee *"
          value={employeeId}
          onChange={e => setEmployeeId(e.target.value)}
          options={employees.map(emp => ({ value: emp.data.id, label: `${emp.data.name} (${emp.data.department || emp.data.id})` }))}
          placeholder="-- Choose an employee --"
        />

        <div className="bg-indigo-50/50 rounded-2xl border border-indigo-100 p-5 flex flex-col gap-3">
          <label className="text-[13px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-2">
            <Wand2 size={16} /> Optional: Try AI Leave Writer
          </label>
          <div className="flex flex-col md:flex-row gap-3">
            <input 
              type="text" 
              placeholder="e.g., Sick leave tomorrow having a fever" 
              className="flex-1 control-field border-indigo-200 focus:ring-indigo-500 text-[16px]"
              value={leaveAiText}
              onChange={(e) => setLeaveAiText(e.target.value)}
            />
            <Button 
              variant="secondary"
              className="bg-indigo-50 border-indigo-200"
              onClick={handleParseLeaveText}
              isLoading={isParsingLeave}
              disabled={!leaveAiText.trim()}
              leftIcon={!isParsingLeave && <Wand2 size={18} className="text-indigo-600" />}
            >
              <span className="font-semibold text-indigo-700">{isParsingLeave ? "Parsing..." : "Auto-fill"}</span>
            </Button>
          </div>
          <p className="text-[14px] text-indigo-700/80 font-medium">Type a natural sentence and the AI will try to populate the form below.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="Leave Type *"
            value={leaveForm.type}
            onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}
            options={[
              { value: 'vacation', label: 'Vacation Leave' },
              { value: 'sick', label: 'Sick Leave' },
              { value: 'unpaid', label: 'Unpaid Leave' }
            ]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-label pl-1">Start Date <span className="text-[#DC2626]">*</span></label>
            <DatePicker 
              value={leaveForm.startDate}
              onChange={(val) => setLeaveForm({ ...leaveForm, startDate: val })}
              placeholder="Select date"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-label pl-1">End Date <span className="text-[#DC2626]">*</span></label>
            <DatePicker 
              value={leaveForm.endDate}
              onChange={(val) => setLeaveForm({ ...leaveForm, endDate: val })}
              placeholder="Select date"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-label pl-1">Reason</label>
          <textarea 
            rows={3} 
            className="control-field py-3 text-[16px] resize-none"
            placeholder="Provide a brief explanation for your leave request..."
            value={leaveForm.reason}
            onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
          />
        </div>

        {leaveForm.type === 'sick' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-label pl-1">Medical Certificate (Optional)</label>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center">
                <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => handleAttachmentSelect(e.target.files?.[0])} />
                <Button 
                  as="div" 
                  variant="secondary" 
                  className="h-12 cursor-pointer"
                  leftIcon={<Paperclip size={18} />}
                >
                  Choose File
                </Button>
              </label>
              {leaveAttachment && (
                <div className="flex items-center gap-2 bg-[#F8FAFC] px-4 py-2 rounded-xl border border-border">
                  <span className="text-sm font-medium text-[#1a1a1a] truncate max-w-[200px]">{leaveAttachment.name}</span>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setLeaveAttachment(null)}
                    className="text-text-muted hover:text-red-500 p-1 h-auto w-auto"
                  >
                    <X size={16} />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
