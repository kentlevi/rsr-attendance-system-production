import React, { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { employeeService } from '../../services/EmployeeService';
import { DataTable } from '../common/DataTable';
import { Modal } from '../common/Modal';
import { Select } from '../common/Select';
import { DatePicker } from '../common/DatePicker';
import { Button } from '../common/Button';
import { cn } from '../../lib/utils';
import { Check, X } from 'lucide-react';

export function StraightDutyView({ isAssistant }: { isAssistant?: boolean }) {
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [records, setRecords] = useState<{id: string, empName: string, date: string, reason: string, status: string}[]>([]); 
  const [searchQuery, setSearchQuery] = useState('');

  const employees = employeeService.getAllEmployeesSync();

  const handleFile = () => {
    if (!employeeId || !date) {
      showToast("Employee and date are required.", "warning");
      return;
    }
    const emp = employees.find(e => e.data.id === employeeId);
    setRecords(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      empName: emp?.data.name || 'Unknown',
      date,
      reason,
      status: 'Pending'
    }]);
    showToast("Straight duty request submitted pending approval.", "success");
    setIsModalOpen(false);
    setEmployeeId('');
    setDate('');
    setReason('');
  };

  const approveRecord = (id: string) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status: 'Approved' } : r));
    showToast("Request approved.", "success");
  }

  const rejectRecord = (id: string) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, status: 'Rejected' } : r));
    showToast("Request rejected.", "success");
  }

  const filteredRecords = records.filter(r => 
    !searchQuery || 
    r.empName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.reason.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    {
      header: 'Employee',
      accessor: (record: typeof records[0]) => (
        <span className="font-semibold text-[#1a1a1a]">{record.empName}</span>
      ),
    },
    {
      header: 'Date',
      accessor: (record: typeof records[0]) => (
        <span className="font-medium text-text-secondary">{record.date}</span>
      ),
    },
    {
      header: 'Reason',
      accessor: (record: typeof records[0]) => (
        <span className="text-sm text-text-secondary max-w-[200px] truncate block">{record.reason}</span>
      ),
    },
    {
      header: 'Status',
      accessor: (record: typeof records[0]) => (
        <span className={cn(
          "px-2.5 py-1 rounded-md text-[13px] font-semibold",
          record.status === 'Approved' ? "bg-emerald-50 text-emerald-700" :
          record.status === 'Rejected' ? "bg-red-50 text-red-700" :
          "bg-amber-50 text-amber-700"
        )}>
          {record.status}
        </span>
      ),
    },
    ...(!isAssistant ? [{
      header: 'Actions',
      accessor: (record: typeof records[0]) => (
        record.status === 'Pending' ? (
          <div className="flex justify-end gap-2">
            <Button 
              onClick={() => approveRecord(record.id)} 
              variant="secondary"
              size="sm"
              className="px-3 text-emerald-700 hover:bg-emerald-50"
              leftIcon={<Check size={14} />}
            >
              Approve
            </Button>
            <Button 
              onClick={() => rejectRecord(record.id)} 
              variant="secondary"
              size="sm"
              className="px-3 text-red-700 hover:bg-red-50"
              leftIcon={<X size={14} />}
            >
              Reject
            </Button>
          </div>
        ) : null
      ),
      className: 'text-right',
    }] : []),
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="bg-white sm:rounded-2xl border-y sm:border border-border/60 overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-72">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search records..." 
              className="control-field pl-10 w-full"
            />
          </div>
          {isAssistant && (
            <Button 
              onClick={() => setIsModalOpen(true)}
              variant="primary"
              size="sm"
              className="w-full sm:w-auto"
              leftIcon={<Plus size={18} />}
            >
              File Straight Duty
            </Button>
          )}
        </div>
        
        <DataTable
          columns={columns}
          data={filteredRecords}
          emptyMessage="No straight duty records found."
          totalItems={filteredRecords.length}
          minHeight="400px"
          className="border-none rounded-none shadow-none"
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="File Straight Duty"
        maxWidth="max-w-md"
        footer={
          <div className="flex gap-3 w-full">
            <Button onClick={() => setIsModalOpen(false)} variant="secondary" className="flex-1">Cancel</Button>
            <Button onClick={handleFile} variant="primary" className="flex-1">Submit Request</Button>
          </div>
        }
      >
        <div className="p-6 flex flex-col gap-6">
          <Select
            label="Select Employee"
            value={employeeId}
            onChange={e => setEmployeeId(e.target.value)}
            options={employees.map(emp => ({ value: emp.data.id, label: emp.data.name }))}
            placeholder="-- Choose --"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-label pl-1">Date</label>
            <DatePicker 
              value={date} 
              onChange={setDate} 
              placeholder="Select date" 
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-label pl-1">Reason</label>
            <textarea 
              className="control-field py-3 resize-none" 
              rows={3} 
              value={reason} 
              onChange={e => setReason(e.target.value)} 
              placeholder="Provide context..." 
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
