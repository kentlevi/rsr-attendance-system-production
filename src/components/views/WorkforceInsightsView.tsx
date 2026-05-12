import React, { useState, useMemo } from "react";
import {
  Calendar,
  ChevronDown,
  Download,
  Settings,
  Filter,
  MapPin,
  MoreVertical,
  Search,
  CheckCircle2,
  Clock,
  Users,
  Receipt,
  ChevronLeft,
  AlertTriangle,
  Timer,
  History,
  RefreshCw,
  X,
  UserCheck,
  UserX,
  Navigation,
  Activity,
} from "lucide-react";
import {
  cn,
  formatDateToISO,
  formatISOToDisplay,
  downloadCSV,
} from "../../lib/utils";
import { Select } from "../common/Select";
import { StatsCard } from "../common/StatsCard";
import { DatePicker } from "../common/DatePicker";
import { DataTable } from "../common/DataTable";
import { Modal } from "../common/Modal";
import { UndertimeRequestsModal } from "../dashboard/UndertimeRequestsModal";
import { Button } from "../common/Button";
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useToast } from "../../context/ToastContext";

import { allowanceService } from "../../services/AllowanceService";
import { undertimeService } from "../../services/UndertimeService";
import { employeeService } from "../../services/EmployeeService";
import { attendanceService } from "../../services/AttendanceService";

type WorkforceActivityItem = {
  id: string;
  time: string;
  text: string;
  site: string;
  icon: React.ElementType;
  color: string;
  bg: string;
};

function getPayrollAmount(value?: string) {
  if (!value) return 0;
  const sign = value.trim().startsWith("-") ? -1 : 1;
  const amount = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(amount) ? sign * amount : 0;
}

function WorkforceActivityModal({
  isOpen,
  onClose,
  activity,
}: {
  isOpen: boolean;
  onClose: () => void;
  activity: WorkforceActivityItem[];
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredActivity = activity.filter((item) => {
    const query = searchTerm.toLowerCase();
    return (
      item.text.toLowerCase().includes(query) ||
      item.site.toLowerCase().includes(query) ||
      item.time.toLowerCase().includes(query)
    );
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Live Activity Feed"
      maxWidth="max-w-3xl"
    >
      <div className="p-8 flex flex-col gap-6">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            size={18}
          />
          <input
            type="text"
            placeholder="Search by employee, site, or time"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="control-field pl-10 pr-4"
          />
        </div>

        <div className="max-h-[60vh] overflow-y-auto flex flex-col gap-4 pr-2">
          {filteredActivity.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-4 rounded-2xl border border-border/60 p-4 hover:bg-slate-50/70 transition-colors"
            >
              <div
                className={cn(
                  "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border-2 border-white ring-1 ring-slate-100",
                  item.bg,
                  item.color,
                )}
              >
                <item.icon size={20} strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <span className="text-[16px] font-medium text-[#1a1a1a] leading-tight">
                    {item.text}
                  </span>
                  <span className="text-[14px] font-medium text-text-muted whitespace-nowrap">
                    {item.time}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1 bg-[#F8FAFC] border border-border/40 rounded-xl self-start">
                  <MapPin size={12} className="text-text-muted" />
                  <span className="text-[13px] font-medium text-text-secondary uppercase tracking-wider">
                    {item.site || "Unknown Site"}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {filteredActivity.length === 0 && (
            <div className="py-20 text-center text-text-secondary">
              No activity found.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function WorkforceInsightsView() {
  const { showToast } = useToast();
  const [employees, setEmployees] = useState(
    employeeService.getAllEmployeesSync(),
  );
  const [attendanceLogs, setAttendanceLogs] = useState(
    attendanceService.getAllLogs(),
  );
  const [undertimeRequests, setUndertimeRequests] = useState(
    undertimeService.getAllRequests(),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [siteFilter, setSiteFilter] = useState("All Sites");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUndertimeModalOpen, setIsUndertimeModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const trendData = useMemo(() => {
    const data = [];
    const logs = attendanceService.getAllLogs();
    const totalStaff = employeeService.getAllEmployeesSync().length || 1;
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = logs.filter(l => l.data.date === dateStr).length;
      data.push({
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        attendance: Math.round((count / totalStaff) * 100)
      });
    }
    return data;
  }, [attendanceLogs]);

  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);

  const EmptyCardState = ({
    icon: Icon,
    title,
    description,
  }: {
    icon: React.ElementType;
    title: string;
    description: string;
  }) => (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-slate-50/40 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-white border border-border flex items-center justify-center text-text-muted shadow-sm">
        <Icon size={24} strokeWidth={1.8} />
      </div>
      <div className="flex flex-col gap-1 max-w-[280px]">
        <span className="text-[16px] font-semibold text-[#1a1a1a]">
          {title}
        </span>
        <span className="text-[13px] leading-5 text-text-secondary">
          {description}
        </span>
      </div>
    </div>
  );

  React.useEffect(() => {
    const unsubEmployees = employeeService.subscribe(() =>
      setEmployees(employeeService.getAllEmployeesSync()),
    );
    const unsubLogs = attendanceService.subscribe(() =>
      setAttendanceLogs(attendanceService.getAllLogs()),
    );
    const unsubUndertime = undertimeService.subscribe(() =>
      setUndertimeRequests(undertimeService.getAllRequests()),
    );

    return () => {
      unsubEmployees();
      unsubLogs();
      unsubUndertime();
    };
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate a reload, but since we're subscribed, it's just visual feedback
    setTimeout(() => {
      setIsRefreshing(false);
      showToast("Workforce data updated", "success");
    }, 800);
  };

  const handleExport = () => {
    setIsPayrollModalOpen(true);
  };

  // Filter logic
  const filteredEmployees = useMemo(() => {
    return employees.filter((empModel) => {
      const emp = empModel.data;
      const matchesSearch =
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSite =
        siteFilter === "All Sites" || emp.location === siteFilter;
      const matchesDept =
        deptFilter === "All Departments" || emp.department === deptFilter;
      return matchesSearch && matchesSite && matchesDept;
    });
  }, [employees, searchQuery, siteFilter, deptFilter]);

  const selectedDateDisplay = useMemo(
    () => formatISOToDisplay(selectedDate),
    [selectedDate],
  );

  const logsForDate = useMemo(() => {
    return attendanceLogs.filter((log) => log.data.date === selectedDate);
  }, [attendanceLogs, selectedDate]);

  // Calculate Stats
  const stats = useMemo(() => {
    const totalStaff = filteredEmployees.length;
    const presentLogs = logsForDate.filter(
      (l) => l.data.status === "Present" || l.data.status === "Late",
    );
    const lateLogs = logsForDate.filter((l) => l.data.status === "Late");
    const undertimeLogs = logsForDate.filter(
      (l) => (l.data.undertimeMinutes || 0) > 0,
    );
    const awaySite = logsForDate.filter(
      (l) => getPayrollAmount(l.data.awaySiteAllowance) > 0,
    ).length;
    const onLeaveCount = filteredEmployees.filter(
      (e) => e.data.status === "On Leave",
    ).length;
    const absentCount = totalStaff - presentLogs.length - onLeaveCount;

    return {
      present: presentLogs.length,
      absent: Math.max(0, absentCount),
      late: lateLogs.length,
      undertime: undertimeLogs.length,
      onLeave: onLeaveCount,
      awaySite,
      total: totalStaff,
    };
  }, [filteredEmployees, logsForDate]);

  const getPerc = (val: number) =>
    stats.total > 0 ? ((val / stats.total) * 100).toFixed(1) + "%" : "0%";

  const distributionData = [
    {
      name: "Present",
      value: stats.present,
      color: "#22C55E",
      perc: getPerc(stats.present),
    },
    {
      name: "Late",
      value: stats.late,
      color: "#F59E0B",
      perc: getPerc(stats.late),
    },
    {
      name: "On Leave",
      value: stats.onLeave,
      color: "#3B82F6",
      perc: getPerc(stats.onLeave),
    },
    {
      name: "Away Site",
      value: stats.awaySite,
      color: "#A855F7",
      perc: getPerc(stats.awaySite),
    },
    {
      name: "Undertime",
      value: stats.undertime,
      color: "#06B6D4",
      perc: getPerc(stats.undertime),
    },
    {
      name: "Absent",
      value: stats.absent,
      color: "#EF4444",
      perc: getPerc(stats.absent),
    },
  ].filter((d) => d.value > 0);

  const tableData = filteredEmployees.map((empModel) => {
    const emp = empModel.data;
    const log = logsForDate.find((l) => l.data.employeeId === emp.id);
    let displayStatus = "Absent";
    if (emp.status === "On Leave") displayStatus = "On Leave";
    else if (log) displayStatus = log.data.status;

    const payrollNotes = log?.data.payrollNotes?.length
      ? log.data.payrollNotes.join("; ")
      : log?.data.status === "Late"
        ? "Late Arrival"
        : "-";

    return {
      id: emp.id,
      name: emp.name,
      avatar: emp.avatar || `https://i.pravatar.cc/150?u=${emp.id}`,
      status: displayStatus,
      site: log?.data.location || emp.workLocation || "-",
      timeIn: log?.data.timeIn || "-",
      timeOut: log?.data.timeOut || "-",
      shift: "Day Shift\n8:00 AM - 5:00 PM",
      allowance:
        getPayrollAmount(log?.data.awaySiteAllowance) > 0
          ? `+${log?.data.awaySiteAllowance}`
          : "-",
      allowanceDesc:
        getPayrollAmount(log?.data.awaySiteAllowance) > 0 ? "Site Allowance" : "",
      undertime:
        getPayrollAmount(log?.data.undertimeDeduction) > 0
          ? `-${log?.data.undertimeDeduction}`
          : "-",
      undertimeLost: log?.data.undertimeMinutes ? `${log.data.undertimeMinutes}m` : "-",
      notes: payrollNotes,
    };
  });

  const allActivityFeed = useMemo(() => {
    return [...attendanceLogs]
      .reverse()
      .map((logModel) => {
        const log = logModel.data;
        const emp = employees.find((e) => e.data.id === log.employeeId);
        return {
          id: log.id,
          time: log.timeIn || "08:00 AM",
          text: `${emp?.data.name || "Employee"} clocked in`,
          site: log.location || "-",
          icon: UserCheck,
          color: "text-emerald-600",
          bg: "bg-emerald-50",
        };
      });
  }, [attendanceLogs, employees]);

  const activityFeed = allActivityFeed.slice(0, 10);

  const pendingUndertime = undertimeRequests.filter(
    (r) => r.data.status === "Pending Review",
  ).length;
  const approvedUndertime = undertimeRequests.filter(
    (r) => r.data.status === "Approved",
  ).length;

  const totalUndertimeMinutes = undertimeRequests
    .filter(
      (r) =>
        r.data.date === selectedDateDisplay && r.data.status === "Approved",
    )
    .reduce((sum, r) => {
      const match = r.data.duration.match(/(\d+)h\s*(\d+)m/);
      if (match) return sum + parseInt(match[1]) * 60 + parseInt(match[2]);
      const minMatch = r.data.duration.match(/(\d+)m/);
      if (minMatch) return sum + parseInt(minMatch[1]);
      return sum;
    }, 0);

  const totalUndertimeFormatted = `${Math.floor(totalUndertimeMinutes / 60)}h ${totalUndertimeMinutes % 60}m`;

  const handleUpdateUndertimeStatus = async (
    id: string,
    status: "Approved" | "Rejected",
  ) => {
    try {
      await undertimeService.updateRequest(id, { status });
      showToast(`Undertime request ${status.toLowerCase()}.`, "success");
    } catch (error) {
      console.error(error);
      showToast("Failed to update undertime request.", "error");
    }
  };

  const columns = [
    {
      header: "Employee",
      accessor: (row: any) => (
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <img
              src={row.avatar || undefined}
              alt={row.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm ring-1 ring-slate-200"
            />
            <div
              className={cn(
                "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white",
                row.status === "Present" || row.status === "Away Site"
                  ? "bg-[#22C55E]"
                  : "bg-[#EF4444]",
              )}
            ></div>
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] font-semibold text-[#1a1a1a] leading-tight group-hover:text-[#0B7A4B] transition-colors">
              {row.name}
            </span>
            <span className="text-[12px] text-text-secondary font-medium uppercase tracking-wider">
              ID#{row.id}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: "Status",
      accessor: (row: any) => (
        <span
          className={cn(
            "px-2.5 py-1 rounded-md text-[13px] font-semibold uppercase tracking-tight",
            row.status === "Present"
              ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
              : row.status === "Late"
                ? "bg-amber-50 text-amber-600 border border-amber-100"
                : row.status === "On Leave"
                  ? "bg-blue-50 text-blue-600 border border-blue-100"
                  : row.status === "Undertime"
                    ? "bg-cyan-50 text-cyan-600 border border-cyan-100"
                    : row.status === "Away Site"
                      ? "bg-purple-50 text-purple-600 border border-purple-100"
                      : "bg-red-50 text-red-600 border border-red-100",
          )}
        >
          {row.status}
        </span>
      )
    },
    {
      header: "Site",
      accessor: (row: any) => <span className="font-medium text-[#1a1a1a]">{row.site}</span>
    },
    {
      header: "Time In",
      accessor: (row: any) => (
        <span className="font-semibold text-emerald-600">
          {row.timeIn === "-" ? "--:--" : row.timeIn}
        </span>
      )
    },
    {
      header: "Time Out",
      accessor: (row: any) => (
        <span className="font-semibold text-emerald-600">
          {row.timeOut === "-" ? "--:--" : row.timeOut}
        </span>
      )
    },
    {
      header: "Shift",
      accessor: (row: any) => {
        const parts = row.shift.split("\n");
        return (
          <div className="flex flex-col items-start leading-tight min-w-[130px]">
            <span className="text-text-secondary font-medium text-sm whitespace-nowrap">
              {parts[0]}
            </span>
            {parts[1] && (
              <span className="text-text-muted text-[12px] whitespace-nowrap">
                {parts[1]}
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: "Allowance",
      accessor: (row: any) => (
        row.allowance !== "-" ? (
          <div className="flex flex-col items-start leading-tight">
            <span className="text-[14px] font-semibold text-emerald-600">
              {row.allowance}
            </span>
            <span className="text-[11px] text-text-secondary font-medium uppercase tracking-wider">
              {row.allowanceDesc}
            </span>
          </div>
        ) : <span className="text-text-muted text-sm">—</span>
      )
    },
    {
      header: "Undertime",
      accessor: (row: any) => (
        row.undertime !== "-" ? (
          <div className="flex flex-col items-start leading-tight">
            <span className="text-[14px] font-semibold text-red-600">
              {row.undertime}
            </span>
            <span className="text-[11px] text-text-secondary font-medium uppercase tracking-wider">
              Lost: {row.undertimeLost}
            </span>
          </div>
        ) : <span className="text-text-muted text-sm">—</span>
      )
    },
    {
      header: "Notes",
      accessor: (row: any) => (
        <span className="text-[13px] text-text-secondary font-medium italic">
          {row.notes}
        </span>
      )
    }
  ];

  const paginatedData = tableData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in duration-700 pb-10">
      {/* Action Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-end gap-3 items-end md:items-center">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          leftIcon={<RefreshCw size={18} className={cn("text-[#0B7A4B]", isRefreshing && "animate-spin")} />}
        >
          {isRefreshing ? "Refreshing" : "Refresh"}
        </Button>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatsCard
          title="Active Today"
          value={stats.present.toString()}
          caption={`${getPerc(stats.present)} of total staff`}
          icon={UserCheck}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <StatsCard
          title="Absent"
          value={stats.absent.toString()}
          caption={`${getPerc(stats.absent)} of total staff`}
          icon={UserX}
          iconBg="bg-red-50"
          iconColor="text-red-600"
        />
        <StatsCard
          title="Late Arrival"
          value={stats.late.toString()}
          caption={`${getPerc(stats.late)} of total staff`}
          icon={Timer}
          iconBg="bg-orange-50"
          iconColor="text-orange-600"
        />
        <StatsCard
          title="On Leave"
          value={stats.onLeave.toString()}
          caption={`${getPerc(stats.onLeave)} staff on leave`}
          icon={Calendar}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatsCard
          title="Off-site"
          value={stats.awaySite.toString()}
          caption={`${getPerc(stats.awaySite)} field staff`}
          icon={Navigation}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
        <StatsCard
          title="Undertime"
          value={stats.undertime.toString()}
          caption={`${getPerc(stats.undertime)} staff`}
          icon={Clock}
          iconBg="bg-cyan-50"
          iconColor="text-cyan-600"
        />
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-border shadow-sm flex flex-col overflow-hidden">
        {/* Internal Filters Header */}
        <div className="p-6 border-b border-border/60 bg-white">
          <div className="flex flex-col xl:flex-row items-center gap-4">
            <div className="flex-1 flex gap-3 w-full">
              <DatePicker 
                value={selectedDate}
                onChange={setSelectedDate}
                placeholder="Select Date"
                className="flex-1"
              />
              <Select
                icon={MapPin}
                className="shadow-none flex-1"
                value={siteFilter}
                onChange={(e) => setSiteFilter(e.target.value)}
              >
                <option>All Sites</option>
                <option>Head Office</option>
                <option>Site A</option>
                <option>Site B</option>
              </Select>
              <Select
                icon={Users}
                className="shadow-none flex-1"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
              >
                <option>All Departments</option>
                <option>Engineering</option>
                <option>HR</option>
                <option>Logistics</option>
              </Select>
            </div>
            
            <div className="w-full xl:w-80 relative group">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted group-hover:text-[#0B7A4B] transition-colors"
                size={18}
              />
              <input
                type="text"
                placeholder="Search name or ID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="control-field pl-10 pr-4"
              />
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSiteFilter("All Sites");
                setDeptFilter("All Departments");
                setSelectedDate(new Date().toISOString().split("T")[0]);
              }}
              className="min-w-[140px]"
              leftIcon={<X size={18} />}
            >
              Reset
            </Button>
          </div>
        </div>

        {/* List Header */}
        <div className="bg-slate-50/50 p-5 px-6 border-b border-border/60 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex flex-col">
            <h3 className="text-[16px] font-bold text-[#1a1a1a] tracking-tight">
              Attendance Overview ({selectedDateDisplay})
            </h3>
            <p className="text-[12px] text-text-secondary font-medium">
              Daily status for {tableData.length} filtered employees
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-border rounded-lg text-[12px] font-bold text-emerald-600 shadow-sm">
                <CheckCircle2 size={14} /> {stats.present} Present
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-border rounded-lg text-[12px] font-bold text-red-600 shadow-sm">
                <AlertTriangle size={14} /> {stats.absent} Absent
            </div>
          </div>
        </div>

        <DataTable
          columns={columns as any}
          data={paginatedData}
          totalItems={tableData.length}
          pageSize={pageSize}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
          getRowKey={(r: any) => r.id || r.employeeId}
          emptyMessage="No attendance records found for the selected criteria."
          className="rounded-none border-none shadow-none"
          minHeight="500px"
        />
      </div>

      {/* Bottom Insights Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Distribution Card */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 flex flex-col gap-4 overflow-hidden min-h-[384px]">
          <h3 className="text-[18px] font-medium text-[#1a1a1a]">
            Attendance Distribution
          </h3>
          {distributionData.length > 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-8">
              <div className="relative w-56 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={distributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </RePieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none">
                  <span className="text-[12px] font-semibold text-text-muted uppercase tracking-[0.18em]">
                    Total Staff
                  </span>
                  <span className="text-[42px] font-bold text-[#1a1a1a] leading-none">
                    {stats.total}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full border-t border-slate-100 pt-5">
                {distributionData.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-[14px]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      ></span>
                      <span className="font-medium text-text-secondary truncate">
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold text-[#1a1a1a]">
                        {item.value}
                      </span>
                      <span className="text-text-muted font-medium">
                        {item.perc}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyCardState
              icon={Users}
              title="No attendance data"
              description="Distribution will appear once employees have attendance records for the selected filters."
            />
          )}
        </div>

        {/* Undertime Summary Card */}
        <div className="bg-white rounded-[24px] border border-slate-200/60 shadow-sm p-7 flex flex-col gap-6 overflow-hidden min-h-[400px] relative transition-all hover:shadow-md group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50/50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-rose-100/50 transition-colors duration-500"></div>
          
          <div className="flex items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shadow-sm border border-rose-100/50">
                <Clock size={20} strokeWidth={2.5} />
              </div>
              <h3 className="text-[19px] font-bold text-slate-900 tracking-tight">
                Undertime Summary
              </h3>
            </div>
             {undertimeRequests.length > 0 && (
               <Button
                 variant="ghost"
                 size="sm"
                 onClick={() => setIsUndertimeModalOpen(true)}
                 className="text-primary font-semibold hover:bg-emerald-50/50 rounded-xl px-4"
               >
                 View all
               </Button>
             )}
          </div>
          
          {undertimeRequests.length > 0 ? (
            <div className="flex-1 flex flex-col gap-8 relative z-10">
              <div className="flex flex-col items-center justify-center pt-2">
                <div className="relative">
                  {/* Decorative Outer Ring */}
                  <div className="absolute inset-0 -m-3 rounded-full border border-slate-100/80"></div>
                  
                  <div className="w-32 h-32 rounded-full border-[10px] border-slate-50 border-t-rose-500 border-r-rose-500 flex flex-col items-center justify-center relative shadow-inner bg-white">
                    {/* Floating Icon Label */}
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center justify-center">
                      <div className="bg-rose-500 text-white rounded-xl p-2 shadow-lg shadow-rose-200 ring-4 ring-white transition-transform group-hover:scale-110 duration-300">
                        <Users size={20} />
                      </div>
                    </div>
                    
                    <span className="text-[36px] font-black text-slate-900 leading-none tracking-tight">
                      {stats.undertime}
                    </span>
                    <span className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.1em] mt-1">
                      Employees
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 w-full">
                <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center gap-2.5 text-center transition-all hover:bg-white hover:shadow-lg hover:shadow-slate-100 group/item cursor-default border-b-2 border-b-transparent hover:border-b-amber-400">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500 mb-0.5">
                    <History size={16} />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[22px] font-bold text-slate-900">
                      {pendingUndertime}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1.5 uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                      Pending
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center gap-2.5 text-center transition-all hover:bg-white hover:shadow-lg hover:shadow-slate-100 group/item cursor-default border-b-2 border-b-transparent hover:border-b-emerald-500">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500 mb-0.5">
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[22px] font-bold text-slate-900">
                      {approvedUndertime}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1.5 uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Approved
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center gap-2.5 text-center transition-all hover:bg-white hover:shadow-lg hover:shadow-slate-100 group/item cursor-default border-b-2 border-b-transparent hover:border-b-rose-500">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500 mb-0.5">
                    <Timer size={16} />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[20px] font-bold text-slate-900 leading-none">
                      {totalUndertimeFormatted}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                      Total Hours
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyCardState
              icon={Clock}
              title="No undertime records"
              description="Pending and approved undertime totals will appear once requests are submitted."
            />
          )}
        </div>

        {/* Live Activity Feed Card */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 flex flex-col gap-4 overflow-hidden min-h-[384px]">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-[18px] font-medium text-[#1a1a1a]">
              Live Activity Feed
            </h3>
             {activityFeed.length > 0 && (
               <Button
                 variant="ghost"
                 size="sm"
                 onClick={() => setIsActivityModalOpen(true)}
                 className="view-all-link"
               >
                 View all
               </Button>
             )}
          </div>
          <div className="flex-1 flex flex-col gap-4 overflow-y-auto max-h-[460px] pr-2 scrollbar-hide">
            {activityFeed.length > 0 ? (
              activityFeed.map((item) => (
                <div key={item.id} className="flex items-start gap-4 rounded-2xl border border-border/60 p-4 transition-colors hover:bg-slate-50">
                  <div
                    className={cn(
                      "w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm border-2 border-white ring-1 ring-slate-100",
                      item.bg,
                      item.color,
                    )}
                  >
                    <item.icon size={20} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 flex flex-col gap-2 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-[15px] font-medium text-[#1a1a1a] leading-tight truncate">
                        {item.text}
                      </span>
                      <span className="text-[12px] font-semibold text-text-muted whitespace-nowrap">
                        {item.time}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 px-2.5 py-1 bg-[#F8FAFC] border border-border/40 rounded-xl self-start">
                      <MapPin size={12} className="text-text-muted" />
                      <span className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider">
                        {item.site}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyCardState
                icon={Activity}
                title="No activity today"
                description="Recent clock-ins and outs will appear here."
              />
            )}
          </div>
        </div>

        {/* Weekly Trend Card */}
        <div className="bg-white rounded-[24px] border border-slate-200/60 shadow-sm p-7 flex flex-col gap-6 overflow-hidden min-h-[400px] relative transition-all hover:shadow-md group">
           <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shadow-sm border border-emerald-100/50">
                <Activity size={20} strokeWidth={2.5} />
              </div>
              <h3 className="text-[19px] font-bold text-slate-900 tracking-tight">
                7-Day Trend
              </h3>
            </div>
            
            <div className="flex-1 w-full h-[240px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorAttend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis 
                    hide 
                    domain={[0, 100]}
                  />
                  <RechartsTooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white border border-slate-100 shadow-xl rounded-xl p-3 flex flex-col gap-1">
                            <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">{payload[0].payload.name}</span>
                            <span className="text-[18px] font-black text-emerald-600">{payload[0].value}% Attendance</span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="attendance" 
                    stroke="#10b981" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorAttend)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
        </div>
      </div>

      <UndertimeRequestsModal
        isOpen={isUndertimeModalOpen}
        onClose={() => setIsUndertimeModalOpen(false)}
        requests={undertimeRequests}
        onApprove={(id) => handleUpdateUndertimeStatus(id, "Approved")}
        onReject={(id) => handleUpdateUndertimeStatus(id, "Rejected")}
        title="All Undertime Records"
      />

      <WorkforceActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        activity={allActivityFeed}
      />

    </div>
  );
}

