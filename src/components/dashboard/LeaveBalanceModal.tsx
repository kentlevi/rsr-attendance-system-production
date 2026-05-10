import React, { useState } from "react";
import { Modal } from "../common/Modal";
import { EmployeeModel } from "../../models/Employee";
import { DataTable } from "../common/DataTable";

interface LeaveBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: EmployeeModel[];
}

export function LeaveBalanceModal({ isOpen, onClose, employees }: LeaveBalanceModalProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredEmployees = employees.filter(emp => 
    emp.data.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.data.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      header: 'Employee',
      accessor: (emp: EmployeeModel) => (
        <div className="flex items-center gap-3">
          <img
            src={emp.data.avatar || `https://i.pravatar.cc/150?u=${emp.data.id}`}
            alt={emp.data.name}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <div className="text-[16px] font-medium text-[#1a1a1a]">{emp.data.name}</div>
            <div className="text-[14px] text-text-secondary">{emp.data.department}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'VL',
      accessor: (emp: EmployeeModel) => (
        <span className="text-[16px] font-medium text-[#1a1a1a]">
          {(emp.data.vlBalance ?? 15).toFixed(1)}
        </span>
      ),
    },
    {
      header: 'SL',
      accessor: (emp: EmployeeModel) => (
        <span className="text-[16px] font-medium text-[#1a1a1a]">
          {(emp.data.slBalance ?? 10).toFixed(1)}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (emp: EmployeeModel) => (
        <span className={`px-2 py-1 rounded-lg text-[14px] font-medium uppercase tracking-wider ${
          emp.data.status === 'Active' ? 'bg-emerald-50 text-emerald-600' :
          emp.data.status === 'On Leave' ? 'bg-amber-50 text-amber-600' :
          'bg-slate-100 text-slate-500'
        }`}>
          {emp.data.status}
        </span>
      ),
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Leave Balance Snapshot"
      maxWidth="max-w-4xl"
    >
      <div className="p-8 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Search by name or department"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="control-field w-full"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredEmployees}
          emptyMessage="No employees found."
          totalItems={filteredEmployees.length}
          minHeight="50vh"
        />
      </div>
    </Modal>
  );
}
