import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Search } from 'lucide-react';
import { Select } from '../common/Select';
import { DataTable } from '../common/DataTable';
import { incidentService } from '../../services/IncidentService';
import { employeeService } from '../../services/EmployeeService';

export function ViolationsView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [incidents, setIncidents] = useState(incidentService.getAll());

  useEffect(() => {
    const unsubscribe = incidentService.subscribe(() => {
      setIncidents(incidentService.getAll());
    });
    return () => unsubscribe();
  }, []);

  const records = useMemo(() => {
    return incidents
      .filter(i => i.data.type === 'Infraction')
      .map(i => {
        const emp = employeeService.getEmployeeByIdSync(i.data.employeeId);
        return {
          id: i.id,
          employee: emp?.data.name || 'Unknown',
          type: i.data.title,
          severity: i.data.severity,
          date: i.data.date,
          status: i.data.acknowledged ? 'Acknowledged' : 'Pending'
        };
      })
      .filter(r => {
        const matchesSearch = r.employee.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             r.type.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSeverity = severityFilter === 'All' || r.severity === severityFilter;
        return matchesSearch && matchesSeverity;
      });
  }, [incidents, searchTerm, severityFilter]);

  const columns = [
    {
      header: 'Employee',
      accessor: 'employee'
    },
    {
      header: 'Infraction',
      accessor: 'type'
    },
    {
      header: 'Severity',
      accessor: (r: any) => (
        <span className={
          r.severity === 'High' ? 'text-red-600 font-bold' : 
          r.severity === 'Medium' ? 'text-orange-600 font-medium' : 
          'text-blue-600'
        }>
          {r.severity}
        </span>
      )
    },
    {
      header: 'Date',
      accessor: 'date'
    },
    {
      header: 'Status',
      accessor: 'status'
    }
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="bg-white sm:rounded-2xl border-y sm:border border-border/60 overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input 
              type="text" 
              placeholder="Search violations..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="control-field w-full pl-10"
            />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              options={[
                { value: 'All', label: 'All Severities' },
                { value: 'Low', label: 'Low Severity' },
                { value: 'Medium', label: 'Medium Severity' },
                { value: 'High', label: 'High Severity' }
              ]}
              className="h-10 sm:w-48 shadow-none"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={records}
          emptyMessage="No violation records found."
          totalItems={records.length}
          getRowKey={(r) => r.id}
          minHeight="400px"
          className="border-none shadow-none rounded-none"
        />
      </div>
    </div>
  );
}
