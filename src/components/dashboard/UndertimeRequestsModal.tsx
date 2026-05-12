import React, { useState } from "react";
import { Modal } from "../common/Modal";
import { UndertimeRequestModel } from "../../models/UndertimeRequest";
import { employeeService } from "../../services/EmployeeService";
import { Paperclip } from "lucide-react";
import { DataTable } from "../common/DataTable";
import { Button } from "../common/Button";

interface UndertimeRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: UndertimeRequestModel[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  title?: string;
}

export function UndertimeRequestsModal({ 
  isOpen, 
  onClose, 
  requests, 
  onApprove, 
  onReject,
  title = "Undertime & Leave Requests"
}: UndertimeRequestsModalProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredRequests = requests.filter(req => {
    const emp = employeeService.getEmployeeByIdSync(req.data.employeeId);
    const searchStr = searchTerm.toLowerCase();
    return (
      emp?.data.name.toLowerCase().includes(searchStr) ||
      req.data.type?.toLowerCase().includes(searchStr) ||
      req.data.status?.toLowerCase().includes(searchStr) ||
      req.data.date?.toLowerCase().includes(searchStr)
    );
  });

  const columns = [
    {
      header: 'Employee',
      accessor: (req: UndertimeRequestModel) => {
        const emp = employeeService.getEmployeeByIdSync(req.data.employeeId);
        return (
          <div className="flex items-center gap-3">
            <img
              src={emp?.data.avatar || `https://i.pravatar.cc/150?u=${req.data.employeeId}`}
              alt={emp?.data.name}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <div className="text-[16px] font-medium text-[#1a1a1a]">{emp?.data.name || 'Unknown'}</div>
              <div className="text-[14px] text-text-secondary">{emp?.data.department || '-'}</div>
            </div>
          </div>
        )
      },
    },
    {
      header: 'Date',
      accessor: (req: UndertimeRequestModel) => (
        <span className="text-[16px] text-text-secondary">
          {req.data.date}
        </span>
      ),
    },
    {
      header: 'Request Type',
      accessor: (req: UndertimeRequestModel) => (
        <div>
          <span className="px-2 py-1 bg-slate-100 rounded text-[14px] font-medium text-text-primary">
            {req.data.type}
          </span>
          {req.data.reason && (
            <div className="text-[12px] text-text-secondary pt-2 max-w-[220px] truncate">
              {req.data.reason}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Time',
      accessor: (req: UndertimeRequestModel) => (
        <div>
          <div className="text-[16px] text-text-secondary">{req.data.timeLost || '-'}</div>
          {(req.data.actualTimeOut || req.data.plannedTimeOut) && (
            <div className="text-[12px] text-text-muted pt-1">
              {req.data.actualTimeOut || "-"} of {req.data.plannedTimeOut || "-"}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Deduction',
      accessor: (req: UndertimeRequestModel) => (
        <span className="text-[16px] font-medium text-red-600">
          {req.data.deduction || '-'}
        </span>
      ),
    },
    {
      header: 'Attachment',
      accessor: (req: UndertimeRequestModel) => (
        req.data.attachments?.length ? (
          <div className="flex flex-col gap-2">
            {req.data.attachments.map((attachment) => (
              <a
                key={attachment.path}
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex max-w-[180px] items-center gap-1 rounded-lg border border-border bg-[#F8FAFC] px-2 py-1 text-[12px] font-medium text-primary hover:bg-primary/5"
              >
                <Paperclip size={12} className="shrink-0" />
                <span className="truncate">{attachment.name}</span>
              </a>
            ))}
          </div>
        ) : (
          <span className="text-[14px] text-text-muted">-</span>
        )
      ),
    },
    {
      header: 'Status',
      accessor: (req: UndertimeRequestModel) => (
        <span className={`px-2 py-1 rounded-lg text-[14px] font-medium uppercase tracking-wider ${
          req.data.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' :
          req.data.status === 'Pending Review' ? 'bg-amber-50 text-amber-600' :
          'bg-slate-100 text-slate-500'
        }`}>
          {req.data.status}
        </span>
      ),
    },
    ...(onApprove && onReject ? [{
      header: 'Actions',
      accessor: (req: UndertimeRequestModel) => (
        req.data.status === 'Pending Review' ? (
          <div className="flex items-center justify-end gap-2">
            <Button 
              variant="secondary"
              size="sm"
              onClick={() => onApprove?.(req.data.id)}
              className="px-3 text-emerald-700 hover:bg-emerald-50"
            >
              Approve
            </Button>
            <Button 
              variant="secondary"
              size="sm"
              onClick={() => onReject?.(req.data.id)}
              className="px-3 text-red-700 hover:bg-red-50"
            >
              Reject
            </Button>
          </div>
        ) : null
      ),
      className: 'text-right'
    }] : [])
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="max-w-5xl"
    >
      <div className="p-8 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Search by name, type, status, or date"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="control-field w-full"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredRequests}
          emptyMessage="No requests found."
          totalItems={filteredRequests.length}
          getRowKey={(req) => req.data.id}
          minHeight="50vh"
        />
      </div>
    </Modal>
  );
}
