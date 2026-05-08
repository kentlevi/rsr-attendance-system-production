import React, { useState, useEffect } from "react";
import {
  Users,
  Clock,
  CheckCircle2,
  Settings,
  CalendarCheck,
  FileText,
  Check,
  X as XIcon,
  Inbox,
} from "lucide-react";
import { cn } from "../../lib/utils";
import {
  ComposedChart,
  AreaChart,
  Area,
  Line,
  LineChart,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { StatsCard } from "../common/StatsCard";
import { Select } from "../common/Select";
import { employeeService } from "../../services/EmployeeService";
import { attendanceService } from "../../services/AttendanceService";
import { undertimeService } from "../../services/UndertimeService";
import { notificationService } from "../../services/NotificationService";
import { AppNotification, NotificationModal } from "../common/NotificationModal";
import { LeaveBalanceModal } from "../dashboard/LeaveBalanceModal";
import { UndertimeRequestsModal } from "../dashboard/UndertimeRequestsModal";
import { useToast } from "../../context/ToastContext";

export function DashboardView() {
  const { showToast } = useToast();
  const [employees, setEmployees] = useState(employeeService.getAllEmployeesSync());
  const [attendanceLogs, setAttendanceLogs] = useState(attendanceService.getAllLogs());
  const [undertimeRequests, setUndertimeRequests] = useState(undertimeService.getAllRequests());
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Modal states
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [isLeaveBalanceModalOpen, setIsLeaveBalanceModalOpen] = useState(false);
  const [isUndertimeOverviewModalOpen, setIsUndertimeOverviewModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);

  // Filter state
  const [timeFilter, setTimeFilter] = useState<"Today" | "This Week" | "This Month">("This Week");

  useEffect(() => {
    const unsubEmployees = employeeService.subscribe(() => {
      setEmployees(employeeService.getAllEmployeesSync());
    });
    const unsubAttendance = attendanceService.subscribe(() => {
      setAttendanceLogs(attendanceService.getAllLogs());
    });
    const unsubUndertime = undertimeService.subscribe(() => {
      setUndertimeRequests(undertimeService.getAllRequests());
    });
    const unsubNotifications = notificationService.subscribeForAdmin(setNotifications);

    return () => {
      unsubEmployees();
      unsubAttendance();
      unsubUndertime();
      unsubNotifications();
    };
  }, []);

  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.data.status === "Active").length;
  const onLeave = employees.filter((e) => e.data.status === "On Leave").length;
  
  // Real stats from logs
  const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const presentToday = attendanceLogs.filter(l => l.data.date === todayStr && l.data.timeIn !== '-').length;
  const absentToday = Math.max(0, totalEmployees - presentToday - onLeave);
  const undertimeCount = undertimeRequests.filter(r => r.data.status === 'Pending Review').length;
  const pendingRequestsCount = undertimeRequests.filter(r => r.data.status === 'Pending Review').length;

  const getAttendanceData = () => {
    const data = [];
    const now = new Date();
    
    if (timeFilter === "Today") {
      data.push({
        name: todayStr,
        present: presentToday,
        absent: absentToday,
        onLeave: onLeave,
      });
    } else if (timeFilter === "This Week") {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const currentDay = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0 for Mon
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(now);
        date.setDate(now.getDate() - (currentDay - i));
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        const dayPresent = attendanceLogs.filter(l => l.data.date === dateStr && l.data.timeIn !== '-').length;
        const dayOnLeave = i === currentDay ? onLeave : 0;
        
        data.push({
          name: days[i],
          present: dayPresent,
          absent: Math.max(0, totalEmployees - dayPresent - dayOnLeave),
          onLeave: dayOnLeave,
        });
      }
    } else if (timeFilter === "This Month") {
      const currentYear = now.getFullYear();
      const currentMonthIndex = now.getMonth();
      const weeksInMonth = Math.ceil(new Date(currentYear, currentMonthIndex + 1, 0).getDate() / 7);
      
      for (let i = 0; i < weeksInMonth; i++) {
        // Approximate calculation for weeks
        const startDay = i * 7 + 1;
        const endDay = Math.min((i + 1) * 7, new Date(currentYear, currentMonthIndex + 1, 0).getDate());
        
        let presentInWeek = 0;
        let onLeaveInWeek = 0;
        for (let d = startDay; d <= endDay; d++) {
          const date = new Date(currentYear, currentMonthIndex, d);
          const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const dayPresent = attendanceLogs.filter(l => l.data.date === dateStr && l.data.timeIn !== '-').length;
          presentInWeek += dayPresent;
        }

        data.push({
          name: `Week ${i + 1}`,
          present: Math.round(presentInWeek / (endDay - startDay + 1)), // Average per day
          absent: Math.max(0, totalEmployees - Math.round(presentInWeek / (endDay - startDay + 1))),
          onLeave: 0,
        });
      }
    }
    return data;
  };

  const attendanceData = getAttendanceData();

  const undertimeData = [
    { name: "Pending", value: undertimeCount, color: "#EF4444" },
    { name: "Resolved", value: Math.max(0, undertimeRequests.length - undertimeCount), color: "#22C55E" },
  ];

  const pendingRequests = undertimeRequests
    .filter(r => r.data.status === 'Pending Review')
    .slice(0, 5)
    .map(r => {
      const emp = employeeService.getEmployeeByIdSync(r.data.employeeId);
      return {
        id: r.data.id,
        name: emp?.data.name || "Unknown",
        type: r.data.type,
        date: r.data.date,
        avatar: emp?.data.avatar || `https://i.pravatar.cc/150?u=${r.data.employeeId}`
      };
    });

  const leaveBalance = employees.slice(0, 5).map(e => ({
    name: e.data.name,
    vl: e.data.vlBalance?.toFixed(1) || "0.0",
    sl: e.data.slBalance?.toFixed(1) || "0.0",
    avatar: e.data.avatar || `https://i.pravatar.cc/150?u=${e.data.id}`
  }));

  const recentActivity = notifications.slice(0, 5).map(n => ({
    text: n.title,
    date: n.time,
    type: n.type === 'success' ? 'timein' : n.type === 'warning' ? 'timeout' : 'system',
    icon: n.type === 'success' ? CheckCircle2 : n.type === 'warning' ? Clock : Settings
  }));

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

  const EmptyCardState = ({
    icon: Icon,
    title,
    description,
  }: {
    icon: any;
    title: string;
    description: string;
  }) => (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-slate-50/40 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-white border border-border flex items-center justify-center text-text-muted shadow-sm">
        <Icon size={24} strokeWidth={1.8} />
      </div>
      <div className="flex flex-col gap-1 max-w-[260px]">
        <span className="text-[16px] font-semibold text-[#1a1a1a]">{title}</span>
        <span className="text-[13px] leading-5 text-text-secondary">{description}</span>
      </div>
    </div>
  );

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatsCard
          title="Total Employees"
          value={totalEmployees.toString()}
          caption="Total in organization"
          icon={Users}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <StatsCard
          title="Active Today"
          value={presentToday.toString()}
          caption={
            totalEmployees > 0
              ? `${((presentToday / totalEmployees) * 100).toFixed(0)}% of total`
              : "0% of total"
          }
          icon={CalendarCheck}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatsCard
          title="Departments"
          value="8"
          caption="Total departments"
          icon={CheckCircle2}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
        <StatsCard
          title="On Leave"
          value={onLeave.toString()}
          caption="0% of total"
          icon={Clock}
          iconBg="bg-orange-50"
          iconColor="text-orange-600"
        />
        <StatsCard
          title="Inactive"
          value="0"
          caption="0% of total"
          icon={XIcon}
          iconBg="bg-red-50"
          iconColor="text-red-600"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-2xl p-6 border border-border flex flex-col gap-8">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-[16px] font-medium text-[#1a1a1a]">
              Attendance Overview
            </h3>
            <Select 
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as any)}
              className="h-10 text-[14px] font-medium min-w-[120px]"
            >
              <option value="Today">Today</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
            </Select>
          </div>
          <div className="flex items-center gap-6 text-[16px] font-medium">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#22C55E]"></span>{" "}
              Present
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span> On
              Leave
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#EF4444]"></span>{" "}
              Undertime
            </div>
          </div>
          <div className="flex-1 min-h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={attendanceData}
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#E2E8F0"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748B", fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748B", fontSize: 12 }}
                  dx={-10}
                />
                <RechartsTooltip />
                <Area
                  type="monotone"
                  dataKey="present"
                  stroke="#22C55E"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorPresent)"
                  activeDot={{
                    r: 6,
                    fill: "#22C55E",
                    stroke: "#fff",
                    strokeWidth: 2,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="onLeave"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  fill="none"
                  activeDot={{
                    r: 6,
                    fill: "#F59E0B",
                    stroke: "#fff",
                    strokeWidth: 2,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="absent"
                  stroke="#EF4444"
                  strokeWidth={2}
                  fill="none"
                  activeDot={{
                    r: 6,
                    fill: "#EF4444",
                    stroke: "#fff",
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-border flex flex-col gap-4 h-[400px]">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-[16px] font-medium text-[#1a1a1a]">
              Pending Leave Requests
            </h3>
            {pendingRequests.length > 0 && (
              <button 
                onClick={() => setIsPendingModalOpen(true)}
                className="view-all-link"
              >
                View All
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-5">
            {pendingRequests.length > 0 ? (
              pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 p-3 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={req.avatar || undefined}
                      alt={req.name}
                      className="w-10 h-10 rounded-full object-cover border border-border"
                    />
                    <div className="min-w-0 flex flex-col gap-0.5">
                      <div className="text-[16px] font-medium text-[#1a1a1a] truncate">
                        {req.name}
                      </div>
                      <div className="text-[13px] text-text-secondary">
                        {req.date}
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-[12px] font-semibold whitespace-nowrap">
                    {req.type}
                  </span>
                  <div className="flex items-center gap-2">
                    <button className="btn-icon-sm h-8 w-8 text-[#22C55E] hover:bg-[#F0FDF4] hover:border-[#22C55E]">
                      <Check size={16} strokeWidth={3} />
                    </button>
                    <button className="btn-icon-sm h-8 w-8 text-[#EF4444] hover:bg-[#FEF2F2] hover:border-[#EF4444]">
                      <XIcon size={16} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <EmptyCardState
                icon={Inbox}
                title="No pending requests"
                description="New leave or undertime requests will appear here for review."
              />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-border flex flex-col gap-4 h-[400px]">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-[16px] font-medium text-[#1a1a1a]">
              Leave Balance Snapshot
            </h3>
            {leaveBalance.length > 0 && (
              <button 
                onClick={() => setIsLeaveBalanceModalOpen(true)}
                className="view-all-link"
              >
                View All
              </button>
            )}
          </div>
          {leaveBalance.length > 0 ? (
            <>
              <div className="grid grid-cols-[1fr_auto_auto] gap-4 pb-4 text-[13px] font-semibold text-text-secondary px-2 uppercase tracking-wide">
                <div>Employee</div>
                <div className="w-12 text-center">VL</div>
                <div className="w-12 text-center">SL</div>
              </div>
              <div className="flex-1 overflow-y-auto flex flex-col gap-2">
                {leaveBalance.map((item, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_auto_auto] gap-4 items-center p-2 hover:bg-[#F8FAFC] rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={item.avatar || undefined}
                        alt={item.name}
                        className="w-9 h-9 rounded-full object-cover border border-border"
                      />
                      <span className="text-[15px] font-medium text-[#1a1a1a] truncate">
                        {item.name}
                      </span>
                    </div>
                    <div className="w-12 text-center text-[15px] font-semibold text-[#0B7A4B]">
                      {item.vl}
                    </div>
                    <div className="w-12 text-center text-[15px] font-semibold text-blue-600">
                      {item.sl}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyCardState
              icon={Users}
              title="No leave balances yet"
              description="Employee leave balances will show after staff records are available."
            />
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 border border-border flex flex-col gap-4 h-[400px]">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-[16px] font-medium text-[#1a1a1a]">
              Undertime Overview
            </h3>
            {undertimeRequests.length > 0 && (
              <button
                onClick={() => setIsUndertimeOverviewModalOpen(true)}
                className="view-all-link"
              >
                View All
              </button>
            )}
          </div>
          {undertimeRequests.length > 0 ? (
            <>
              <div className="flex-1 relative flex items-center justify-center">
                <ResponsiveContainer width={180} height={180}>
                  <RePieChart>
                    <Pie
                      data={undertimeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {undertimeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </RePieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none">
                  <span className="text-[32px] font-bold text-[#1a1a1a] leading-none">
                    {undertimeRequests.length}
                  </span>
                  <span className="text-[14px] text-text-secondary font-medium">
                    Requests
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 px-2">
                {undertimeData.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[14px]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      ></span>
                      <span className="text-text-secondary truncate">{item.name}</span>
                    </div>
                    <span className="font-semibold text-text-primary whitespace-nowrap">
                      {item.value} ({Math.round((item.value / undertimeRequests.length) * 100)}%)
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyCardState
              icon={Clock}
              title="No undertime records"
              description="Approved and pending undertime requests will be summarized here."
            />
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 border border-border flex flex-col gap-4 h-[400px]">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-[16px] font-medium text-[#1a1a1a]">
              Recent Activity
            </h3>
            {recentActivity.length > 0 && (
              <button
                onClick={() => setIsActivityModalOpen(true)}
                className="view-all-link"
              >
                View All
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto flex flex-col gap-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((item, i) => (
                <div key={i} className="flex items-start gap-4 rounded-2xl border border-border/60 p-3 hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-[#E8F3EE] flex items-center justify-center text-[#0B7A4B] flex-shrink-0">
                    <item.icon size={18} />
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="text-[15px] font-medium text-[#1a1a1a] leading-tight truncate">
                      {item.text}
                    </span>
                    <span className="text-[13px] text-text-secondary">
                      {item.date}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <EmptyCardState
                icon={CalendarCheck}
                title="No recent activity"
                description="Attendance alerts and system events will be listed here."
              />
            )}
          </div>
        </div>
      </div>

      <UndertimeRequestsModal 
        isOpen={isPendingModalOpen} 
        onClose={() => setIsPendingModalOpen(false)}
        requests={undertimeRequests.filter(r => r.data.status === 'Pending Review')}
        onApprove={(id) => handleUpdateUndertimeStatus(id, "Approved")}
        onReject={(id) => handleUpdateUndertimeStatus(id, "Rejected")}
        title="Pending Requests"
      />

      <LeaveBalanceModal 
        isOpen={isLeaveBalanceModalOpen}
        onClose={() => setIsLeaveBalanceModalOpen(false)}
        employees={employees}
      />

      <UndertimeRequestsModal 
        isOpen={isUndertimeOverviewModalOpen}
        onClose={() => setIsUndertimeOverviewModalOpen(false)}
        requests={undertimeRequests}
        onApprove={(id) => handleUpdateUndertimeStatus(id, "Approved")}
        onReject={(id) => handleUpdateUndertimeStatus(id, "Rejected")}
        title="All Undertime Records"
      />

      <NotificationModal 
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={() => notificationService.markAllAsRead()}
        onClearAll={() => notificationService.clearAll()}
      />
    </div>
  );
}
