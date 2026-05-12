import React, { useState } from 'react';
import { X as XIcon, CheckCircle2, Clock, Briefcase, Wallet, User, Calendar, Building, Mail, Phone, Home, Edit, Lock, UserX, UserCheck, Trash2 } from 'lucide-react';
import { Modal } from '../../common/Modal';
import { settingsService } from '../../../services/SettingsService';
import { cn, formatISOToDisplay, formatTimeTo12h } from '../../../lib/utils';
import { Button } from '../../common/Button';

export function EmployeeDetailsModal({ employee, isOpen, onClose, onEdit, onResetPin, onToggleStatus, onDelete }: any) {
  const [activeTab, setActiveTab] = useState('overview');
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (contentRef.current) {
      const scrollParent = contentRef.current.closest('.custom-scrollbar');
      const globalOverlay = document.getElementById('global-modal-overlay');
      
      const resetScroll = () => {
        if (scrollParent) scrollParent.scrollTop = 0;
        if (globalOverlay) globalOverlay.scrollTop = 0;
      };

      requestAnimationFrame(resetScroll);
      setTimeout(resetScroll, 50);
    }
  }, [activeTab]);

  if (!isOpen || !employee) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Employee Details"
      maxWidth="max-w-[700px]"
      footer={
        <div className="w-full flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onEdit}
              className="flex-1 sm:flex-none justify-center"
              leftIcon={<Edit size={16} className="text-text-muted" />}
            >
              Edit
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onToggleStatus}
              className={cn(
                "flex-1 sm:flex-none justify-center",
                employee.status === "Active"
                  ? "border-red-100 text-red-600 hover:bg-red-50"
                  : "border-green-100 text-green-600 hover:bg-green-50"
              )}
              leftIcon={employee.status === "Active" ? <UserX size={16} /> : <UserCheck size={16} />}
            >
              {employee.status === "Active" ? "Deactivate" : "Activate"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onDelete}
              className="flex-1 sm:flex-none justify-center text-red-600 border-red-100 hover:bg-red-50"
              leftIcon={<Trash2 size={16} />}
            >
              Delete
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onResetPin}
              className="flex-1 sm:flex-none justify-center"
              leftIcon={<Lock size={16} />}
            >
              Reset
            </Button>
          </div>
          <Button
            variant="primary"
            onClick={onClose}
            className="w-full sm:hidden"
          >
            Close
          </Button>
        </div>
      }
    >
      <div ref={contentRef} className="p-5 sm:p-8 pb-12">
        {/* Header Profile */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-6 mb-8">
          <div className="relative">
            <img 
              src={employee.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${employee.name}`} 
              alt={employee.name} 
              className="w-24 h-24 sm:w-[84px] sm:h-[84px] rounded-2xl object-cover border-2 border-white shadow-md sm:shadow-sm" 
            />
            <div className="absolute -bottom-2 -right-2 sm:hidden">
              {employee.status === 'Active' && <span className="w-4 h-4 rounded-full bg-green-500 border-2 border-white block" />}
            </div>
          </div>
          
          <div className="flex flex-col gap-1 sm:mt-1 flex-1 min-w-0 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <h3 className="text-[22px] sm:text-[20px] font-bold text-[#1a1a1a]">{employee.name}</h3>
              <span className="text-[14px] font-mono text-text-muted bg-slate-100 px-2 py-0.5 rounded">#{employee.employeeId || employee.id.slice(-6)}</span>
              <div className="flex justify-center sm:justify-start">
                {employee.status === 'Active' && <span className="px-2 py-0.5 rounded-md bg-[#E8F3EE] text-[#0B7A4B] text-[12px] sm:text-[14px] font-bold tracking-wide uppercase">Active</span>}
                {employee.status === 'On Leave' && <span className="px-2 py-0.5 rounded-md bg-[#FFEDD5] text-[#EA580C] text-[12px] sm:text-[14px] font-bold tracking-wide uppercase">On Leave</span>}
                {employee.status === 'Inactive' && <span className="px-2 py-0.5 rounded-md bg-[#FEE2E2] text-[#DC2626] text-[12px] sm:text-[14px] font-bold tracking-wide uppercase">Inactive</span>}
              </div>
            </div>
            
            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-x-2 gap-y-1 mt-1 text-text-secondary font-medium">
              <span className="text-[14px] sm:text-[16px]">{employee.position}</span>
              <div className="hidden sm:block w-1 h-1 rounded-full bg-slate-300" />
              <span className="text-[14px] sm:text-[16px] text-slate-400 sm:text-text-secondary">{employee.department}</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-5 mt-3 sm:mt-2 text-[14px] sm:text-[15px] text-text-secondary">
              <div className="flex items-center gap-2 bg-slate-50 sm:bg-transparent px-3 py-1 sm:p-0 rounded-full w-full sm:w-auto justify-center sm:justify-start">
                <Mail size={14} className="text-text-muted shrink-0"/>
                <span className="truncate">{employee.email || 'No email provided'}</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 sm:bg-transparent px-3 py-1 sm:p-0 rounded-full w-full sm:w-auto justify-center sm:justify-start">
                <Phone size={14} className="text-text-muted shrink-0"/>
                <span>{employee.phone || 'No phone provided'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center border-b border-border/60 mb-6 space-x-6 sm:space-x-8 overflow-x-auto whitespace-nowrap hide-scrollbar -mx-5 px-5 sm:mx-0 sm:px-0">
           <Button 
             variant="ghost"
             onClick={() => setActiveTab('overview')}
             className={cn(
               "flex-shrink-0 text-[16px] font-medium pb-3 -mb-[2px] rounded-none border-b-2 transition-colors h-auto px-0",
               activeTab === 'overview' ? 'text-[#0B7A4B] border-[#0B7A4B]' : 'text-[#64748B] hover:text-[#1a1a1a] border-transparent'
             )}>
             Overview
           </Button>
           <Button 
             variant="ghost"
             onClick={() => setActiveTab('employment')}
             className={cn(
               "flex-shrink-0 text-[16px] font-medium pb-3 -mb-[2px] rounded-none border-b-2 transition-colors h-auto px-0",
               activeTab === 'employment' ? 'text-[#0B7A4B] border-[#0B7A4B]' : 'text-[#64748B] hover:text-[#1a1a1a] border-transparent'
             )}>
             Employment
           </Button>
           <Button 
             variant="ghost"
             onClick={() => setActiveTab('financial')}
             className={cn(
               "flex-shrink-0 text-[16px] font-medium pb-3 -mb-[2px] rounded-none border-b-2 transition-colors h-auto px-0",
               activeTab === 'financial' ? 'text-[#0B7A4B] border-[#0B7A4B]' : 'text-[#64748B] hover:text-[#1a1a1a] border-transparent'
             )}>
             Financial
           </Button>
           <Button 
             variant="ghost"
             onClick={() => setActiveTab('access')}
             className={cn(
               "flex-shrink-0 text-[16px] font-medium pb-3 -mb-[2px] rounded-none border-b-2 transition-colors h-auto px-0",
               activeTab === 'access' ? 'text-[#0B7A4B] border-[#0B7A4B]' : 'text-[#64748B] hover:text-[#1a1a1a] border-transparent'
             )}>
             Access
           </Button>
           <Button 
             variant="ghost"
             onClick={() => setActiveTab('logs')}
             className={cn(
               "flex-shrink-0 text-[16px] font-medium pb-3 -mb-[2px] rounded-none border-b-2 transition-colors h-auto px-0",
               activeTab === 'logs' ? 'text-[#0B7A4B] border-[#0B7A4B]' : 'text-[#64748B] hover:text-[#1a1a1a] border-transparent'
             )}>
             Logs
           </Button>
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
                <span className="font-medium text-[#1a1a1a]">
                  {employee.shiftTemplateId 
                    ? (() => {
                        const t = settingsService.getSettings().shiftTemplates?.find(x => x.id === employee.shiftTemplateId);
                        return t ? `${t.name} (${formatTimeTo12h(t.startTime)} - ${formatTimeTo12h(t.endTime)})` : 'Default Shift';
                      })()
                    : `Default Shift (${formatTimeTo12h(settingsService.getSettings().shiftStartTime)} - ${formatTimeTo12h(settingsService.getSettings().shiftEndTime)})`}
                </span>
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
                <span className="font-medium text-[#1a1a1a]">{formatISOToDisplay(employee.dateHired) || 'N/A'}</span>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      ? (() => {
                          const t = settingsService.getSettings().shiftTemplates?.find(x => x.id === employee.shiftTemplateId);
                          return t ? `${t.name} (${formatTimeTo12h(t.startTime)} - ${formatTimeTo12h(t.endTime)})` : 'Default Shift';
                        })()
                      : `Default Shift (${formatTimeTo12h(settingsService.getSettings().shiftStartTime)} - ${formatTimeTo12h(settingsService.getSettings().shiftEndTime)})`}
                  </span>
                </div>
                <div className="flex flex-col gap-1 text-[16px]">
                  <span className="text-text-secondary">Date Hired</span>
                  <span className="font-medium text-[#1a1a1a]">{formatISOToDisplay(employee.dateHired) || 'N/A'}</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'financial' && (
          <div className="flex flex-col gap-6">
            <div className="bg-[#F8FAFC] rounded-xl p-5 border border-border">
              <h4 className="text-[16px] font-medium text-[#1a1a1a] mb-4">Compensation</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              
              {employee.facialDataImage && (
                <div className="mb-6">
                  <span className="text-text-secondary text-[14px] block mb-2 uppercase tracking-wider font-bold">Registered Face Model</span>
                  <div className="w-32 h-32 rounded-xl overflow-hidden border-2 border-primary/20 shadow-inner bg-white">
                    <img src={employee.facialDataImage} alt="Registered face" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center justify-between text-[16px]">
                  <span className="text-text-secondary">Employee ID</span>
                  <span className="font-mono font-medium text-[#1a1a1a]">{employee.employeeId || 'Not set'}</span>
                </div>
                <div className="flex items-center justify-between text-[16px]">
                  <span className="text-text-secondary">Fallback PIN</span>
                  <span className="font-mono font-medium text-[#1a1a1a] truncate ml-4">{employee.pin ? '••••••' : 'Not set'}</span>
                </div>
                <div className="flex items-center justify-between text-[16px]">
                  <span className="text-text-secondary">Login Method</span>
                  <span className="font-medium text-[#1a1a1a]">Biometric Verification</span>
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
              <Button 
                onClick={onResetPin} 
                variant="primary" 
                size="sm"
                className="bg-[#DC2626] hover:bg-[#B91C1C] border-none text-white px-4"
              >
                Reset Access
              </Button>
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
