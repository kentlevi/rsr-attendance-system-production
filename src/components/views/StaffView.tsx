import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  Users,
  UserCheck,
  ShieldCheck,
  Briefcase,
  XCircle,
  Download,
  Plus,
  Search,
  ChevronDown,
  Filter,
  RefreshCw,
  MoreVertical,
  Edit,
  Lock,
  UserX,
  Mail,
  Phone,
  Home,
  CheckCircle2,
  Clock,
  Wallet,
  User,
  Calendar,
  Building,
  Eye,
  Activity,
  X as XIcon,
  Trash2,
} from "lucide-react";
import { useStaffManagementController } from "../../controllers/StaffManagementController";
import { StatsCard } from "../common/StatsCard";
import { Select } from "../common/Select";
import { DataTable } from "../common/DataTable";
import { AddEmployeeModal } from "./staff/AddEmployeeModal";
import { EmployeeDetailsModal } from "./staff/EmployeeDetailsModal";
import Papa from "papaparse";
import { cn } from "../../lib/utils";

export function StaffView() {
  const {
    employees,
    selectedEmployeeId,
    setSelectedEmployeeId,
    isAddEmployeeModalOpen,
    setIsAddEmployeeModalOpen,
    editingEmployeeId,
    setEditingEmployeeId,
    handleAddEmployee,
    handleUpdateEmployee,
    handleDeleteEmployee,
    handleToggleEmployeeStatus,
    handleResetEmployeeAccess,
  } = useStaffManagementController();
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [actionMenuState, setActionMenuState] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  React.useEffect(() => {
    const handleClickOutside = () => setActionMenuState(null);
    document.addEventListener("click", handleClickOutside);
    window.addEventListener("scroll", handleClickOutside, true);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      window.removeEventListener("scroll", handleClickOutside, true);
    };
  }, []);

  const selectedEmployee = employees.find(
    (e) => e.data.id === selectedEmployeeId,
  )?.data;

  // Compute unique values for dropdowns
  const departments = Array.from(
    new Set(employees.map((e) => e.data.department).filter(Boolean)),
  );
  const positions = Array.from(
    new Set(employees.map((e) => e.data.position).filter(Boolean)),
  );
  const statuses = Array.from(
    new Set(employees.map((e) => e.data.status).filter(Boolean)),
  );

  // Filter employees
  const filteredEmployees = employees.filter((e) => {
    const data = e.data;

    // Search filter (Name, ID, Email)
    const matchesSearch =
      searchQuery === "" ||
      data.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (data.email &&
        data.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (data.employeeId &&
        data.employeeId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (data.id && data.id.includes(searchQuery));

    const matchesDepartment =
      departmentFilter === "" || data.department === departmentFilter;
    const matchesPosition =
      positionFilter === "" || data.position === positionFilter;
    const matchesStatus = statusFilter === "" || data.status === statusFilter;

    return (
      matchesSearch && matchesDepartment && matchesPosition && matchesStatus
    );
  });

  const handleResetFilters = () => {
    setSearchQuery("");
    setDepartmentFilter("");
    setPositionFilter("");
    setStatusFilter("");
  };

  const handleDeleteEmployeeRecord = async (id: string, name?: string) => {
    const label = name || "this employee";
    if (
      !window.confirm(
        `Delete ${label}? This will permanently remove the employee record from Firebase.`,
      )
    ) {
      return;
    }

    await handleDeleteEmployee(id);
    if (selectedEmployeeId === id) {
      setSelectedEmployeeId(null);
    }
    if (editingEmployeeId === id) {
      setEditingEmployeeId(null);
    }
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleExportStaffList = () => {
    const csvData = employees.map((e) => ({
      ID: e.data.id,
      "First Name": e.data.name.split(" ")[0] || "",
      "Last Name": e.data.name.split(" ").slice(1).join(" ") || "",
      Email: e.data.email,
      Phone: e.data.phone || "",
      "Employee ID": e.data.employeeId || "",
      Department: e.data.department,
      Position: e.data.position,
      Status: e.data.status,
      "Mobile Number": e.data.phone || "",
      "Date of Birth": e.data.dob || "",
      Gender: e.data.gender || "",
      "Civil Status": e.data.civilStatus || "",
      Address: e.data.address || "",
      "RFID/Card ID": e.data.rfid || "",
      "Employment Type": e.data.employmentType || "",
      "Work Location": e.data.workLocation || "",
      Supervisor: e.data.supervisor || "",
      Shift: e.data.shift || "",
      "Date Hired": e.data.dateHired || "",
      "Daily Rate": e.data.dailyRate || "",
      "Allowance Type": e.data.allowanceType || "",
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "staff_list.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "First Name": "",
        "Last Name": "",
        Email: "",
        "Mobile Number": "",
        "Date of Birth": "",
        Gender: "",
        "Civil Status": "",
        Address: "",
        "Employee ID": "",
        Department: "",
        Position: "",
        "RFID/Card ID": "",
        "Employment Type": "",
        "Work Location": "",
        Supervisor: "",
        Shift: "",
        "Date Hired": "",
        "Daily Rate": "",
        "Allowance Type": "",
      },
    ];

    const csv = Papa.unparse(templateData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "staff_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        for (const row of results.data as any[]) {
          await handleAddEmployee({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            avatar: "https://i.pravatar.cc/150?u=" + Date.now(),
            pin: "",
            name:
              `${row["First Name"] || ""} ${row["Last Name"] || ""}`.trim() ||
              "New Employee",
            email: row["Email"] || "",
            department: row["Department"] || "Engineering",
            position: row["Position"] || "Staff",
            status: "Active",
            lastLogin: "-",
            phone: row["Mobile Number"] || "",
            dob: row["Date of Birth"] || "",
            gender: row["Gender"] || "",
            civilStatus: row["Civil Status"] || "",
            address: row["Address"] || "",
            rfid: row["RFID/Card ID"] || "",
            employmentType: row["Employment Type"] || "",
            workLocation: row["Work Location"] || "",
            supervisor: row["Supervisor"] || "",
            shift: row["Shift"] || "",
            dateHired: row["Date Hired"] || "",
            dailyRate: row["Daily Rate"] || "",
            allowanceType: row["Allowance Type"] || "",
          });
        }
      },
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const totalEmployees = employees.length;
  const activeCount = employees.filter(
    (e) => e.data.status === "Active",
  ).length;
  const inactiveCount = employees.filter(
    (e) => e.data.status === "Inactive",
  ).length;
  const onLeaveCount = employees.filter(
    (e) => e.data.status === "On Leave",
  ).length;
  const activePercentage = totalEmployees
    ? ((activeCount / totalEmployees) * 100).toFixed(2)
    : "0";
  const inactivePercentage = totalEmployees
    ? ((inactiveCount / totalEmployees) * 100).toFixed(2)
    : "0";
  const onLeavePercentage = totalEmployees
    ? ((onLeaveCount / totalEmployees) * 100).toFixed(2)
    : "0";

  const columns = [
    {
      header: "Employee",
      accessor: (row: any) => (
        <div className="flex items-center gap-3">
          <img
            src={row.avatar || undefined}
            alt={row.name}
            className="w-9 h-9 shrink-0 rounded-full object-cover border border-border"
          />
          <div className="flex flex-col">
            <span className="text-[15px] font-semibold text-[#1a1a1a] leading-tight mb-0.5 group-hover:text-[#0B7A4B] transition-colors">
              {row.name}
            </span>
            <span className="text-[12px] text-text-secondary font-medium">
              {row.email}
            </span>
          </div>
        </div>
      )
    },
    {
      header: "Employee ID",
      accessor: (row: any) => (
        <div className="flex flex-col">
          <span className="text-[14px] font-bold text-[#1a1a1a]">
            {row.employeeId || "NO ID SET"}
          </span>
          <span className="text-[11px] text-text-muted font-mono">
            REF: {row.id.slice(-6)}
          </span>
        </div>
      )
    },
    {
      header: "Department",
      accessor: (row: any) => <span className="text-[14px] text-text-secondary font-medium">{row.department}</span>
    },
    {
      header: "Position",
      accessor: (row: any) => <span className="text-[14px] text-text-secondary font-medium">{row.position}</span>
    },
    {
      header: "Status",
      accessor: (row: any) => (
        <span
          className={cn(
            "px-2.5 py-1 rounded-md text-[13px] font-semibold uppercase tracking-tight",
            row.status === "Active"
              ? "bg-[#E8F3EE] text-[#0B7A4B]"
              : row.status === "On Leave"
                ? "bg-[#FFEDD5] text-[#EA580C]"
                : "bg-[#FEF2F2] text-[#DC2626]",
          )}
        >
          {row.status}
        </span>
      )
    },
    {
      header: "Last Login",
      accessor: (row: any) => <span className="text-text-secondary text-sm">{row.lastLogin}</span>
    },
    {
      header: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      accessor: (row: any) => (
        <button
          className="btn-icon-sm mx-auto"
          onClick={(e) => {
            e.stopPropagation();
            if (actionMenuState?.id === row.id) {
              setActionMenuState(null);
            } else {
              const rect = e.currentTarget.getBoundingClientRect();
              setActionMenuState({
                id: row.id,
                x: rect.right - 192,
                y: rect.bottom + 8,
              });
            }
          }}
        >
          <MoreVertical size={18} />
        </button>
      )
    }
  ];

  const paginatedEmployees = [...filteredEmployees]
    .sort((a, b) => parseInt(b.data.id) - parseInt(a.data.id))
    .slice((currentPage - 1) * pageSize, currentPage * pageSize)
    .map(e => e.data);

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatsCard
          title="Total Employees"
          value={totalEmployees.toString()}
          caption="Total enrollment"
          icon={Users}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <StatsCard
          title="Active Today"
          value={activeCount.toString()}
          caption={`${activePercentage}% active`}
          icon={UserCheck}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatsCard
          title="Departments"
          value={departments.length.toString()}
          caption="Org structure"
          icon={ShieldCheck}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
        <StatsCard
          title="On Leave"
          value={onLeaveCount.toString()}
          caption={`${onLeavePercentage}% on leave`}
          icon={Briefcase}
          iconBg="bg-orange-50"
          iconColor="text-orange-600"
        />
        <StatsCard
          title="Inactive"
          value={inactiveCount.toString()}
          caption={`${inactivePercentage}% inactive`}
          icon={XCircle}
          iconBg="bg-red-50"
          iconColor="text-red-600"
        />
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col min-w-0 overflow-hidden">
        {/* Actions & Filters Section */}
        <div className="p-6 border-b border-border/60 flex flex-col gap-6 bg-white">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[14px] font-bold text-text-secondary uppercase tracking-wider mr-2">
                Bulk Actions
              </span>
              <button
                onClick={handleExportStaffList}
                className="btn-secondary btn-sm"
              >
                <Download size={16} /> Export CSV
              </button>
              <button
                onClick={handleDownloadTemplate}
                className="btn-secondary btn-sm"
              >
                <Download size={16} /> Template
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary btn-sm"
              >
                <Download size={16} /> Import
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportCSV}
                accept=".csv"
                className="hidden"
              />
            </div>
            <button
              className="btn-primary btn-sm"
              onClick={() => setIsAddEmployeeModalOpen(true)}
            >
              <Plus size={18} strokeWidth={2.5} /> Add Employee
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(240px,1.35fr)_repeat(3,minmax(0,1fr))_44px] gap-3 items-center">
            <div className="sm:col-span-2 lg:col-span-1 relative">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
                size={18}
              />
              <input
                type="text"
                placeholder="Search name, ID or email"
                className="control-field pl-10 pr-4 placeholder:text-text-muted"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Select
              icon={Building}
              className="h-11 shadow-none"
              containerClassName="w-full"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map((dept, i) => (
                <option key={i} value={dept}>
                  {dept}
                </option>
              ))}
            </Select>

            <Select
              icon={Briefcase}
              className="h-11 shadow-none"
              containerClassName="w-full"
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
            >
              <option value="">All Positions</option>
              {positions.map((pos, i) => (
                <option key={i} value={pos}>
                  {pos}
                </option>
              ))}
            </Select>

            <Select
              icon={Activity}
              className="h-11 shadow-none"
              containerClassName="w-full"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              {statuses.map((stat, i) => (
                <option key={i} value={stat}>
                  {stat}
                </option>
              ))}
            </Select>

            <div className="flex justify-end sm:col-span-2 lg:col-span-1">
              <button
                onClick={handleResetFilters}
                className="btn-icon text-text-primary"
                title="Reset Filters"
              >
                <RefreshCw size={16} />
                <span className="sr-only">Reset filters</span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-50/50 p-5 px-6 border-b border-border/60 flex items-center justify-between">
          <div className="flex flex-col">
            <h3 className="text-[16px] font-bold text-[#1a1a1a] tracking-tight">
              Employee List ({filteredEmployees.length})
            </h3>
            <p className="text-[12px] text-text-secondary font-medium">
              Manage your workforce members and their permissions
            </p>
          </div>
        </div>
        <DataTable
          columns={columns as any}
          data={paginatedEmployees}
          totalItems={filteredEmployees.length}
          pageSize={pageSize}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
          emptyMessage="No employees found matching your criteria."
          onRowClick={(row) => setSelectedEmployeeId(row.id)}
          className="rounded-none border-none shadow-none"
          minHeight="500px"
        />
      </div>

      {actionMenuState &&
        createPortal(
          <div
            className="fixed w-48 bg-white rounded-xl border border-border py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
            style={{
              top: `${actionMenuState.y}px`,
              left: `${actionMenuState.x}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setSelectedEmployeeId(actionMenuState.id);
                setActionMenuState(null);
              }}
              className="btn-menu-item"
            >
              <Eye size={16} className="text-text-muted" /> View Details
            </button>
            <button
              onClick={() => {
                setEditingEmployeeId(actionMenuState.id);
                setActionMenuState(null);
              }}
              className="btn-menu-item"
            >
              <Edit size={16} className="text-text-muted" /> Edit Details
            </button>
            <div className="h-px bg-border my-1" />
            <button
              onClick={() => {
                const emp = employees.find(
                  (e) => e.data.id === actionMenuState.id,
                )?.data;
                if (emp) {
                  handleToggleEmployeeStatus(actionMenuState.id, emp.status);
                }
                setActionMenuState(null);
              }}
              className={`btn-menu-item ${
                employees.find((e) => e.data.id === actionMenuState.id)?.data
                  .status === "Active"
                  ? "text-[#DC2626] hover:bg-[#FEF2F2]"
                  : "text-[#0B7A4B] hover:bg-[#F0FDF4]"
              }`}
            >
              {employees.find((e) => e.data.id === actionMenuState.id)?.data
                .status === "Active" ? (
                <>
                  <UserX size={16} /> Deactivate Account
                </>
              ) : (
                <>
                  <UserCheck size={16} /> Activate Account
                </>
              )}
            </button>
            <div className="h-px bg-border my-1" />
            <button
              onClick={() => {
                const emp = employees.find(
                  (e) => e.data.id === actionMenuState.id,
                )?.data;
                handleDeleteEmployeeRecord(actionMenuState.id, emp?.name);
                setActionMenuState(null);
              }}
              className="btn-menu-item text-[#DC2626] hover:bg-[#FEF2F2]"
            >
              <Trash2 size={16} /> Delete Employee
            </button>
          </div>,
          document.body,
        )}

      <EmployeeDetailsModal
        employee={selectedEmployee}
        isOpen={!!selectedEmployee}
        onClose={() => setSelectedEmployeeId(null)}
        onEdit={() => {
          setEditingEmployeeId(selectedEmployeeId);
          setSelectedEmployeeId(null);
        }}
        onResetPin={() => {
          if (
            selectedEmployeeId &&
            window.confirm(
              "Reset access for this employee? This will require face re-enrollment.",
            )
          ) {
            handleResetEmployeeAccess(selectedEmployeeId);
          }
        }}
        onToggleStatus={() => {
          if (selectedEmployee && selectedEmployeeId) {
            handleToggleEmployeeStatus(selectedEmployeeId, selectedEmployee.status);
          }
        }}
        onDelete={() => {
          if (selectedEmployee && selectedEmployeeId) {
            handleDeleteEmployeeRecord(selectedEmployeeId, selectedEmployee.name);
          }
        }}
      />

      {(isAddEmployeeModalOpen || editingEmployeeId) && (
        <AddEmployeeModal
          isOpen={true}
          onClose={() => {
            setIsAddEmployeeModalOpen(false);
            setEditingEmployeeId(null);
          }}
          onAdd={
            editingEmployeeId
              ? (data: any) => handleUpdateEmployee(editingEmployeeId, data)
              : handleAddEmployee
          }
          employeeToEdit={
            editingEmployeeId
              ? employees.find((e) => e.data.id === editingEmployeeId)?.data
              : null
          }
        />
      )}
    </div>
  );
}
