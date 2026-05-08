import React, { useState } from 'react';
import { X as XIcon, CheckCircle2, Clock, Briefcase, Wallet, User, Calendar, Building, Mail, Phone, Home, Edit, Lock, UserX, UserCheck, Trash2 } from 'lucide-react';
import { Modal } from '../../common/Modal';
import { settingsService } from '../../../services/SettingsService';

export function EmployeeDetailsModal({ employee, isOpen, onClose, onEdit, onResetPin, onToggleStatus, onDelete }: any) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!isOpen || !employee) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Employee Details"
      maxWidth="max-w-[700px]"
      footer={
        <div className="w-full flex justify-between items-center">
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="btn-secondary btn-sm"
            >
              <Edit size={16} className="text-text-muted" /> Edit Details
            </button>
            <button
              onClick={onToggleStatus}
              className={`btn-secondary btn-sm ${
                employee.status === "Active"
                  ? "border-[#DC2626]/30 text-[#DC2626] hover:bg-[#FEF2F2]"
                  : "border-[#0B7A4B]/30 text-[#0B7A4B] hover:bg-[#F0FDF4]"
              }`}
            >
              {employee.status === "Active" ? (
                <>
                  <UserX size={16} /> Deactivate Account
                </>
              ) : (
                <>
                  <UserCheck size={16} /> Activate Account
                </>
              )}
            </button>
            <button
              onClick={onDelete}
              className="btn-danger btn-sm"
            >
              <Trash2 size={16} /> Delete
            </button>
          </div>
          <button
            onClick={onClose}
            className="btn-secondary btn-sm"
          >
            Close
          </button>
        </div>
      }
    >
      <div className="p-6">
        {/* Header Profile */}
        <div className="flex items-start gap-5 mb-8">
          <img src={employee.avatar || undefined} alt={employee.name} className="w-[84px] h-[84px] rounded-xl object-cover border border-border/60" />
          <div className="flex flex-col gap-1 mt-1">
            <div className="flex items-center gap-3">
              <h3 className="text-[20px] font-bold text-[#1a1a1a] leading-none">{employee.name}</h3>
              {employee.status === 'Active' && <span className="px-2 py-0.5 rounded-md bg-[#E8F3EE] text-[#0B7A4B] text-[16px] font-medium tracking-wide uppercase">Active</span>}
              {employee.status === 'On Leave' && <span className="px-2 py-0.5 rounded-md bg-[#FFEDD5] text-[#EA580C] text-[16px] font-medium tracking-wide uppercase">On Leave</span>}
              {employee.status === 'Inactive' && <span className="px-2 py-0.5 rounded-md bg-[#FEE2E2] text-[#DC2626] text-[16px] font-medium tracking-wide uppercase">Inactive</span>}
            </div>
            <div className="flex items-center gap-2 mt-1 -mb-0.5">
              <span className="text-[16px] font-medium text-text-secondary">{employee.pin}</span>
              <div className="w-1 h-1 rounded-full bg-border" />
              <span className="text-[16px] font-medium text-text-secondary">{employee.position}</span>
            </div>
            <span className="text-[16px] font-medium text-[#1a1a1a] mb-2">{employee.department}</span>
            <div className="flex items-center gap-5 text-[16px] text-text-secondary">
              <div className="flex items-center gap-1.5"><Mail size={14} className="text-text-muted"/>{employee.email || 'N/A'}</div>
              <div className="flex items-center gap-1.5"><Phone size={14} className="text-text-muted"/>{employee.phone || 'N/A'}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center border-b border-border/60 mb-6 space-x-6">
           <button 
             onClick={() => setActiveTab('overview')}
             className={`text-[16px] font-medium pb-3 -mb-[2px] transition-colors ${activeTab === 'overview' ? 'text-[#0B7A4B] border-b-2 border-[#0B7A4B]' : 'text-[#64748B] hover:text-[#1a1a1a]'}`}>
             Overview
           </button>
           <button 
             onClick={() => setActiveTab('employment')}
             className={`text-[16px] font-medium pb-3 -mb-[2px] transition-colors ${activeTab === 'employment' ? 'text-[#0B7A4B] border-b-2 border-[#0B7A4B]' : 'text-[#64748B] hover:text-[#1a1a1a]'}`}>
             Employment
           </button>
           <button 
             onClick={() => setActiveTab('financial')}
             className={`text-[16px] font-medium pb-3 -mb-[2px] transition-colors ${activeTab === 'financial' ? 'text-[#0B7A4B] border-b-2 border-[#0B7A4B]' : 'text-[#64748B] hover:text-[#1a1a1a]'}`}>
             Financial
           </button>
           <button 
             onClick={() => setActiveTab('access')}
             className={`text-[16px] font-medium pb-3 -mb-[2px] transition-colors ${activeTab === 'access' ? 'text-[#0B7A4B] border-b-2 border-[#0B7A4B]' : 'text-[#64748B] hover:text-[#1a1a1a]'}`}>
             Access
           </button>
           <button 
             onClick={() => setActiveTab('logs')}
             className={`text-[16px] font-medium pb-3 -mb-[2px] transition-colors ${activeTab === 'logs' ? 'text-[#0B7A4B] border-b-2 border-[#0B7A4B]' : 'text-[#64748B] hover:text-[#1a1a1a]'}`}>
             Logs
           </button>
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
            <div className="flex items-center gap-4">
              <Home size={16} className="text-text-muted flex-shrink-0" />
              <div className="flex justify-between w-full text-[16px]">
                <span className="text-text-secondary">Home Site</span>
                <span className="font-medium text-[#1a1a1a]">{employee.workLocation || 'Head Office'}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <CheckCircle2 size={16} className="text-text-muted flex-shrink-0" />
              <div className="flex justify-between w-full text-[16px]">
                <span className="text-text-secondary">Status</span>
                {employee.status === 'Active' && <span className="font-medium text-[#0B7A4B] bg-[#E8F3EE] px-2 py-0.5 rounded text-[16px] uppercase tracking-wide">Active</span>}
                {employee.status === 'On Leave' && <span className="font-medium text-[#EA580C] bg-[#FFEDD5] px-2 py-0.5 rounded text-[16px] uppercase tracking-wide">On Leave</span>}
                {employee.status === 'Inactive' && <span className="font-medium text-[#DC2626] bg-[#FEE2E2] px-2 py-0.5 rounded text-[16px] uppercase tracking-wide">Inactive</span>}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Clock size={16} className="text-text-muted flex-shrink-0" />
              <div className="flex justify-between w-full text-[16px]">
                <span className="text-text-secondary">Shift</span>
                <span className="font-medium text-[#1a1a1a]">{employee.shift || '08:00 AM - 05:00 PM'}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Briefcase size={16} className="text-text-muted flex-shrink-0" />
              <div className="flex justify-between w-full text-[16px]">
                <span className="text-text-secondary">Employment Type</span>
                <span className="font-medium text-[#1a1a1a]">{employee.employmentType || 'Regular'}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Wallet size={16} className="text-text-muted flex-shrink-0" />
              <div className="flex justify-between w-full text-[16px]">
                <span className="text-text-secondary">Daily Rate</span>
                <span className="font-medium text-[#1a1a1a]">{employee.dailyRate ? `₱ ${employee.dailyRate}` : '₱ 750.00'}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <User size={16} className="text-text-muted flex-shrink-0" />
              <div className="flex justify-between w-full text-[16px]">
                <span className="text-text-secondary">Position</span>
                <span className="font-medium text-[#1a1a1a]">{employee.position}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Calendar size={16} className="text-text-muted flex-shrink-0" />
              <div className="flex justify-between w-full text-[16px]">
                <span className="text-text-secondary">Date Hired</span>
                <span className="font-medium text-[#1a1a1a]">Jan 15, 2023</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Building size={16} className="text-text-muted flex-shrink-0" />
              <div className="flex justify-between w-full text-[16px]">
                <span className="text-text-secondary">Department</span>
                <span className="font-medium text-[#1a1a1a]">{employee.department}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'employment' && (
          <div className="flex flex-col gap-6">
            <div className="bg-[#F8FAFC] rounded-xl p-5 border border-border">
              <h4 className="text-[16px] font-medium text-[#1a1a1a] mb-4">Job Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1 text-[16px]">
                  <span className="text-text-secondary">Position</span>
                  <span className="font-medium text-[#1a1a1a]">{employee.position}</span>
                </div>
                <div className="flex flex-col gap-1 text-[16px]">
                  <span className="text-text-secondary">Department</span>
                  <span className="font-medium text-[#1a1a1a]">{employee.department}</span>
                </div>
                <div className="flex flex-col gap-1 text-[16px]">
                  <span className="text-text-secondary">Manager</span>
                  <span className="font-medium text-[#1a1a1a]">{employee.supervisor || 'Robert Smith'}</span>
                </div>
                <div className="flex flex-col gap-1 text-[16px]">
                  <span className="text-text-secondary">Shift</span>
                  <span className="font-medium text-[#1a1a1a]">
                    {employee.shiftTemplateId 
                      ? settingsService.getSettings().shiftTemplates?.find(t => t.id === employee.shiftTemplateId)?.name || 'Default Shift'
                      : 'Default Shift'}
                  </span>
                </div>
                <div className="flex flex-col gap-1 text-[16px]">
                  <span className="text-text-secondary">Date Hired</span>
                  <span className="font-medium text-[#1a1a1a]">{employee.dateHired || 'Jan 15, 2023'}</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'financial' && (
          <div className="flex flex-col gap-6">
            <div className="bg-[#F8FAFC] rounded-xl p-5 border border-border">
              <h4 className="text-[16px] font-medium text-[#1a1a1a] mb-4">Compensation</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1 text-[16px]">
                  <span className="text-text-secondary">Daily Rate</span>
                  <span className="font-medium text-[#1a1a1a]">₱ {employee.dailyRate || '750.00'}</span>
                </div>
                <div className="flex flex-col gap-1 text-[16px]">
                  <span className="text-text-secondary">Pay Schedule</span>
                  <span className="font-medium text-[#1a1a1a] capitalize">{employee.payPeriodType || 'Bi-weekly'}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#F8FAFC] rounded-xl p-5 border border-border">
              <h4 className="text-[16px] font-medium text-[#1a1a1a] mb-4">Tax & Contributions</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1 text-[16px]">
                  <span className="text-text-secondary">TIN / Tax ID</span>
                  <span className="font-medium text-[#1a1a1a]">{employee.taxId || 'N/A'}</span>
                </div>
                <div className="flex flex-col gap-1 text-[16px]">
                  <span className="text-text-secondary">SSS Number</span>
                  <span className="font-medium text-[#1a1a1a]">{employee.sssNumber || 'N/A'}</span>
                </div>
                <div className="flex flex-col gap-1 text-[16px]">
                  <span className="text-text-secondary">Pag-IBIG Number</span>
                  <span className="font-medium text-[#1a1a1a]">{employee.pagibigNumber || 'N/A'}</span>
                </div>
                <div className="flex flex-col gap-1 text-[16px]">
                  <span className="text-text-secondary">PhilHealth Number</span>
                  <span className="font-medium text-[#1a1a1a]">{employee.philhealthNumber || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'access' && (
          <div className="flex flex-col gap-6">
            <div className="bg-[#F8FAFC] rounded-xl p-5 border border-border">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[16px] font-medium text-[#1a1a1a]">System Access</h4>
                <span className="px-2.5 py-1 rounded-md bg-[#E8F3EE] text-[#0B7A4B] text-[16px] font-medium">Enabled</span>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center justify-between text-[16px]">
                  <span className="text-text-secondary">Login PIN</span>
                  <span className="font-medium text-[#1a1a1a] tracking-wider">{employee.pin}</span>
                </div>
                <div className="flex items-center justify-between text-[16px]">
                  <span className="text-text-secondary">Last Login</span>
                  <span className="font-medium text-[#1a1a1a] whitespace-pre-line text-right">{employee.lastLogin}</span>
                </div>
                <div className="flex items-center justify-between text-[16px]">
                  <span className="text-text-secondary">Role</span>
                  <span className="font-medium text-[#1a1a1a]">Employee</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl border border-[#FEF2F2] bg-[#FFF5F5]">
              <div className="flex-1 flex flex-col gap-1 text-[16px]">
                <span className="font-medium text-[#DC2626]">Reset Access Credentials</span>
                <span className="text-[#DC2626]/80 text-[16px]">Resetting credentials will remove facial profile and require re-enrollment.</span>
              </div>
              <button onClick={onResetPin} className="btn-danger btn-xs">
                Reset Access
              </button>
            </div>
          </div>
        )}
        
        {activeTab === 'logs' && (
          <div className="flex flex-col items-center justify-center py-10">
            <Clock size={40} className="text-text-muted/50 mb-4" />
            <h4 className="text-[16px] font-medium text-[#1a1a1a] mb-1">Recent Activity Logs</h4>
            <p className="text-[16px] text-text-secondary text-center max-w-[300px]">View all attendance and system access logs for this employee in the Logs tab of the dashboard.</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
