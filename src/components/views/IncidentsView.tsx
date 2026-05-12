import React, { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Search, Check, FileText } from 'lucide-react';
import { incidentService, IncidentReport } from '../../services/IncidentService';
import { employeeService } from '../../services/EmployeeService';
import { useToast } from '../../context/ToastContext';
import { DatePicker } from '../common/DatePicker';
import { Select } from '../common/Select';
import { DataTable } from '../common/DataTable';

export function IncidentsView() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    employeeId: '',
    type: 'Infraction' as IncidentReport['data']['type'],
    date: new Date().toISOString().split('T')[0],
    title: '',
    description: '',
    severity: 'Medium' as IncidentReport['data']['severity']
  });

  useEffect(() => {
    loadData();
    const unsub = incidentService.subscribe(loadData);
    return () => unsub();
  }, []);

  const loadData = () => {
    setIncidents(incidentService.getAll());
    setEmployees(employeeService.getAllEmployeesSync());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.title || !formData.description) {
      showToast('Please fill in all required fields', 'warning');
      return;
    }

    try {
      await incidentService.add({
        ...formData,
        acknowledged: false,
        createdBy: 'Admin',
        createdAt: new Date().toISOString()
      });
      showToast('Incident logged successfully');
      setIsModalOpen(false);
      setFormData({
        employeeId: '',
        type: 'Infraction',
        date: new Date().toISOString().split('T')[0],
        title: '',
        description: '',
        severity: 'Medium'
      });
    } catch (error: any) {
      showToast(error.message || 'Error logging incident', 'error');
    }
  };

  const getEmployeeName = (id: string) => {
    return employees.find(e => e.id === id)?.data.name || 'Unknown Employee';
  };

  const filteredIncidents = incidents.filter(i => {
    const empName = getEmployeeName(i.data.employeeId).toLowerCase();
    const search = searchQuery.toLowerCase();
    return empName.includes(search) || i.data.title.toLowerCase().includes(search);
  }).sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime());

  return (
    <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 h-full">
      <div className="bg-white rounded-2xl p-6 border border-border flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h2 className="text-[20px] font-bold text-[#1a1a1a]">Incident Reports</h2>
            <p className="text-[14px] text-text-secondary">Log infractions, merits, and accidents.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-[300px]">
             <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="control-field pl-10 h-10 w-full" placeholder="Search incidents..." />
             <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          </div>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary h-10 px-4 whitespace-nowrap inline-flex items-center gap-2">
             <Plus size={18} /> Log Incident
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white border border-border rounded-2xl flex flex-col h-[500px]">
         <DataTable
           columns={[
             {
               header: "Date",
               accessor: (incident: any) => (
                 <span className="font-medium text-[#1a1a1a] whitespace-nowrap">
                   {new Date(incident.data.date).toLocaleDateString()}
                 </span>
               )
             },
             {
               header: "Employee",
               accessor: (incident: any) => getEmployeeName(incident.data.employeeId)
             },
             {
               header: "Type / Severity",
               accessor: (incident: any) => (
                 <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[12px] font-medium leading-none whitespace-nowrap overflow-hidden text-ellipsis ${
                       incident.data.type === 'Merit' ? 'bg-green-100 text-green-700' :
                       incident.data.type === 'Accident' ? 'bg-red-100 text-red-700' :
                       incident.data.type === 'Infraction' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {incident.data.type}
                    </span>
                    {incident.data.type !== 'Merit' && (
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[12px] font-medium leading-none whitespace-nowrap overflow-hidden text-ellipsis ${
                         incident.data.severity === 'High' ? 'bg-red-100 text-red-700' :
                         incident.data.severity === 'Medium' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {incident.data.severity}
                      </span>
                    )}
                 </div>
               )
             },
             {
               header: "Title",
               accessor: (incident: any) => (
                 <span className="max-w-[200px] truncate block" title={incident.data.title}>
                   {incident.data.title}
                 </span>
               )
             },
             {
               header: "Status",
               accessor: (incident: any) => (
                 <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium leading-none whitespace-nowrap ${
                   incident.data.acknowledged ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                 }`}>
                   {incident.data.acknowledged ? <Check size={12} /> : <AlertTriangle size={12} />}
                   {incident.data.acknowledged ? 'Acknowledged' : 'Pending'}
                 </span>
               )
             }
           ]}
           data={filteredIncidents}
           emptyMessage="No incident reports found."
           className="border-0 rounded-none h-full shadow-none"
           minHeight="400px"
         />
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-[600px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-6 border-b border-border bg-[#F8FAFC]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl shadow-sm border border-border">
                  <FileText size={20} className="text-[#1a1a1a]" />
                </div>
                <div>
                  <h3 className="text-[18px] font-bold text-[#1a1a1a]">Log Incident</h3>
                  <p className="text-[14px] text-text-secondary mt-0.5">Create a new report or appraisal</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 text-[#64748B] hover:text-[#1a1a1a] transition-colors">
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 overflow-y-auto max-h-[70vh]">
               <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                     <label className="text-label">Employee <span className="text-red-500">*</span></label>
                     <Select 
                        value={formData.employeeId} 
                        onChange={e => setFormData({...formData, employeeId: e.target.value})}
                     >
                        <option value="">Select Employee</option>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.data.name}</option>)}
                     </Select>
                  </div>
                  <div className="flex flex-col gap-2 relative z-50">
                     <label className="text-label">Date <span className="text-red-500">*</span></label>
                     <DatePicker
                       value={formData.date}
                       onChange={val => setFormData({ ...formData, date: val })}
                       className="w-full"
                     />
                  </div>
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                     <label className="text-label">Type <span className="text-red-500">*</span></label>
                     <Select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                        <option value="Infraction">Infraction</option>
                        <option value="Accident">Accident</option>
                        <option value="Merit">Performance Merit</option>
                        <option value="Other">Other</option>
                     </Select>
                  </div>
                  {formData.type !== 'Merit' && (
                     <div className="flex flex-col gap-2">
                        <label className="text-label">Severity <span className="text-red-500">*</span></label>
                        <Select value={formData.severity} onChange={e => setFormData({...formData, severity: e.target.value as any})}>
                           <option value="Low">Low</option>
                           <option value="Medium">Medium</option>
                           <option value="High">High</option>
                        </Select>
                     </div>
                  )}
               </div>

               <div className="flex flex-col gap-2">
                  <label className="text-label">Title/Subject <span className="text-red-500">*</span></label>
                  <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Brief summary" className="control-field" />
               </div>

               <div className="flex flex-col gap-2">
                  <label className="text-label">Description <span className="text-red-500">*</span></label>
                  <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Detailed description..." className="control-field min-h-[120px] py-3 text-base resize-y"></textarea>
               </div>

               <div className="pt-4 flex items-center justify-end gap-3 mt-4">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary px-6">Cancel</button>
                 <button type="submit" className="btn-primary px-6 inline-flex items-center gap-2">
                   <Plus size={18} /> Save Report
                 </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
