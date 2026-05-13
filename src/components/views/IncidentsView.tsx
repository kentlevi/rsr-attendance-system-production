import React, { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Search, Check, FileText } from 'lucide-react';
import { incidentService, IncidentReport } from '../../services/IncidentService';
import { employeeService } from '../../services/EmployeeService';
import { useToast } from '../../context/ToastContext';
import { DatePicker } from '../common/DatePicker';
import { Select } from '../common/Select';
import { DataTable } from '../common/DataTable';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';

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
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="bg-white sm:rounded-2xl border-y sm:border border-border/60 overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-72">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="control-field pl-10 h-10 w-full" 
              placeholder="Search incidents..." 
            />
          </div>
          <Button 
            onClick={() => setIsModalOpen(true)} 
            variant="primary"
            size="sm"
            className="whitespace-nowrap w-full sm:w-auto"
            leftIcon={<Plus size={18} />}
          >
            Log Incident
          </Button>
        </div>

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
          getRowKey={(incident: any) => incident.id}
          totalItems={filteredIncidents.length}
          emptyMessage="No incident reports found."
          className="border-none rounded-none shadow-none"
          minHeight="450px"
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Log Incident"
        maxWidth="max-w-2xl"
        footer={
          <div className="flex gap-3 w-full">
            <Button onClick={() => setIsModalOpen(false)} variant="secondary" className="flex-1">Cancel</Button>
            <Button onClick={handleSubmit} variant="primary" className="flex-1" leftIcon={<Plus size={18} />}>Save Report</Button>
          </div>
        }
      >
        <div className="p-5 sm:p-8 flex flex-col gap-6">
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                 <label className="text-label pl-1">Employee <span className="text-red-500">*</span></label>
                 <Select 
                    value={formData.employeeId} 
                    onChange={e => setFormData({...formData, employeeId: e.target.value})}
                    className="h-11"
                 >
                    <option value="">Select Employee</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.data.name}</option>)}
                 </Select>
              </div>
              <div className="flex flex-col gap-2">
                 <label className="text-label pl-1">Date <span className="text-red-500">*</span></label>
                 <DatePicker
                   value={formData.date}
                   onChange={val => setFormData({ ...formData, date: val })}
                   className="w-full"
                 />
              </div>
           </div>
           
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                 <label className="text-label pl-1">Type <span className="text-red-500">*</span></label>
                 <Select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="h-11">
                    <option value="Infraction">Infraction</option>
                    <option value="Accident">Accident</option>
                    <option value="Merit">Performance Merit</option>
                    <option value="Other">Other</option>
                 </Select>
              </div>
              {formData.type !== 'Merit' && (
                 <div className="flex flex-col gap-2">
                    <label className="text-label pl-1">Severity <span className="text-red-500">*</span></label>
                    <Select value={formData.severity} onChange={e => setFormData({...formData, severity: e.target.value as any})} className="h-11">
                       <option value="Low">Low</option>
                       <option value="Medium">Medium</option>
                       <option value="High">High</option>
                    </Select>
                 </div>
              )}
           </div>

           <div className="flex flex-col gap-2">
              <label className="text-label pl-1">Title/Subject <span className="text-red-500">*</span></label>
              <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Brief summary of incident" className="control-field h-11" />
           </div>

            <div className="flex flex-col gap-2">
               <label className="text-label pl-1">Description <span className="text-red-500">*</span></label>
               <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Provide detailed information about what happened..." className="control-field min-h-[140px] py-3 text-base resize-none"></textarea>
           </div>
        </div>
      </Modal>
    </div>
  );
}
