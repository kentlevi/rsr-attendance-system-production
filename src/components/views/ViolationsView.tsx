import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Select } from '../common/Select';
import { DataTable } from '../common/DataTable';

export function ViolationsView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');

  // Currently acts as a placeholder view since it had no real data table rendering before
  const records: any[] = [];
  
  const columns = [
    {
      header: 'Employee',
      accessor: 'employee'
    },
    {
      header: 'Violation Type',
      accessor: 'type'
    },
    {
      header: 'Severity',
      accessor: 'severity'
    },
    {
      header: 'Date',
      accessor: 'date'
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
              placeholder="Search by name or PIN..." 
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
                    { value: 'All', label: 'All Severity' },
                    { value: 'Warning', label: 'Warning (Day 1/2)' },
                    { value: 'Suspension', label: 'Suspension (Day 3+)' }
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
          totalItems={0}
          minHeight="320px"
        />
      </div>
    </div>
  );
}
