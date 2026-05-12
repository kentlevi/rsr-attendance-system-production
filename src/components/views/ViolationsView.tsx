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
    <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1a1a1a]">Absence Violations</h2>
          <p className="text-text-secondary text-sm">View lifetime absence violation records and suspensions.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="relative w-full md:w-64">
            <input 
              type="text" 
              placeholder="Search by name or ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="control-field w-full"
            />
          </div>
          <div className="flex items-center gap-3">
             <div className="relative w-48">
                <Select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  options={[
                    { value: 'All', label: 'All Severities' },
                    { value: 'Low', label: 'Low Severity' },
                    { value: 'Medium', label: 'Medium Severity' },
                    { value: 'High', label: 'High Severity' }
                  ]}
                  className="rounded-xl bg-[#F8FAFC]"
                />
             </div>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={records}
          emptyMessage="No Violation Records"
          totalItems={records.length}
          getRowKey={(r) => r.id}
          minHeight="320px"
        />
      </div>
    </div>
  );
}
