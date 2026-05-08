import React, { useState } from "react";
import { cn } from "../../lib/utils";
import { Select } from "../common/Select";
import { DatePicker } from "../common/DatePicker";
import { DataTable } from "../common/DataTable";
import {
  Download,
  RefreshCw,
  Search,
  Filter,
  X as XIcon,
  Eye,
  Calendar,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Phone,
  User,
  AlertTriangle,
} from "lucide-react";

import { smsService, SmsLog } from "../../services/SmsService";
import { StatsCard } from "../common/StatsCard";
import { useToast } from "../../context/ToastContext";

export function SmsLogsView() {
  const { showToast } = useToast();
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    setLoading(true);
    const unsubscribe = smsService.subscribe((newLogs) => {
      setLogs(newLogs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const newLogs = await smsService.getAllLogs();
    setLogs(newLogs);
    setLoading(false);
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0,2);
  };

  const getRandomColor = (name: string) => {
    const colors = [
      "bg-blue-100 text-blue-600",
      "bg-purple-100 text-purple-600",
      "bg-orange-100 text-orange-600",
      "bg-green-100 text-green-600",
      "bg-pink-100 text-pink-600",
    ];
    let sum = 0;
    for(let i=0; i<name.length; i++) sum += name.charCodeAt(i);
    return colors[sum % colors.length];
  };

  const filteredLogs = logs.filter(l => {
    if (statusFilter !== "All Status" && l.status !== statusFilter) return false;
    if (searchTerm && !l.name?.toLowerCase().includes(searchTerm.toLowerCase()) && !l.phone?.includes(searchTerm)) return false;
    
    const logDate = new Date(l.sentAt).toISOString().split('T')[0];
    if (dateRange.start && logDate < dateRange.start) return false;
    if (dateRange.end && logDate > dateRange.end) return false;
    
    return true;
  });

  const sentToday = logs.filter(l => new Date(l.sentAt).toDateString() === new Date().toDateString()).length;
  const delivered = logs.filter(l => l.status === "Delivered").length;
  const failed = logs.filter(l => l.status === "Failed").length;
  const deliveryRate = logs.length > 0 ? Math.round((delivered / logs.length) * 100) : 0;
  const failRate = logs.length > 0 ? Math.round((failed / logs.length) * 100) : 0;

  const stats: { title: string; value: string; subtext: string; icon: any; iconColor: string; iconBg: string; }[] = [
    {
      title: "SMS Sent Today",
      value: sentToday.toString(),
      subtext: "Total SMS sent today",
      icon: Send,
      iconColor: "text-green-600",
      iconBg: "bg-green-50",
    },
    {
      title: "Delivered",
      value: delivered.toString(),
      subtext: `${deliveryRate}% delivered`,
      icon: CheckCircle2,
      iconColor: "text-green-600",
      iconBg: "bg-green-50",
    },
    {
      title: "Failed",
      value: failed.toString(),
      subtext: `${failRate}% failed`,
      icon: XCircle,
      iconColor: "text-red-600",
      iconBg: "bg-red-50",
    },
    {
      title: "Estimated Cost",
      value: `₱ ${(delivered * 0.5).toFixed(2)}`,
      subtext: "Based on sent messages",
      icon: AlertCircle,
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50",
    },
  ];

  const activeDetails = showDetails
    ? logs.find((l) => l.id === showDetails)
    : null;

  const columns = [
    {
      header: "Employee",
      accessor: (log: SmsLog) => (
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-medium",
              getRandomColor(log.name || ""),
            )}
          >
            {getInitials(log.name || "")}
          </div>
          <span className="font-semibold text-[#1a1a1a]">
            {log.name || "Test Number"}
          </span>
        </div>
      )
    },
    {
      header: "Mobile Number",
      accessor: (log: SmsLog) => <span className="font-medium text-[#1a1a1a]">{log.phone}</span>
    },
    {
      header: "Message Preview",
      accessor: (log: SmsLog) => <span className="text-text-secondary truncate max-w-[200px] inline-block">{log.preview}</span>
    },
    {
      header: "Sent At",
      accessor: (log: SmsLog) => (
        <span className="text-[#1a1a1a] whitespace-pre-line leading-tight text-sm">
          {new Date(log.sentAt).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" }).replace(", ", "\n")}
        </span>
      )
    },
    {
      header: "Status",
      accessor: (log: SmsLog) => (
        <span
          className={cn(
            "px-2.5 py-1 rounded-md text-[13px] font-semibold uppercase tracking-tight inline-flex",
            log.status === "Delivered"
              ? "bg-green-50 text-green-600 border border-green-100"
              : log.status === "Failed"
                ? "bg-red-50 text-red-600 border border-red-100"
                : "bg-orange-50 text-orange-600 border border-orange-100",
          )}
        >
          {log.status}
        </span>
      )
    },
    {
      header: "Actions",
      headerClassName: "text-center",
      className: "text-center",
      accessor: (log: SmsLog) => (
        <button
          className="btn-icon-sm mx-auto"
          onClick={(e) => {
            e.stopPropagation();
            setShowDetails(log.id);
          }}
        >
          <Eye size={18} />
        </button>
      )
    }
  ];

  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExportLogs = () => {
    if (filteredLogs.length === 0) {
      showToast("No SMS logs to export.", "warning");
      return;
    }

    const headers = [
      "Log ID",
      "Employee ID",
      "Name",
      "Phone",
      "Message Preview",
      "Message",
      "Sent At",
      "Status",
    ];
    const escapeCSV = (value: string) => `"${String(value || "").replace(/"/g, '""')}"`;
    const rows = filteredLogs.map((log) =>
      [
        log.id,
        log.employeeId || "",
        log.name || "Test Number",
        log.phone,
        log.preview,
        (log as SmsLog & { message?: string }).message || log.preview,
        new Date(log.sentAt).toLocaleString("en-PH", {
          timeZone: "Asia/Manila",
          dateStyle: "medium",
          timeStyle: "short",
        }),
        log.status,
      ]
        .map(escapeCSV)
        .join(","),
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sms_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("SMS logs exported.", "success");
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-end gap-3 items-end md:items-center">
        <div className="flex items-center gap-3">
          <button className="btn-secondary btn-sm" onClick={handleExportLogs}>
            <Download size={16} /> Export CSV
          </button>
          <button onClick={fetchLogs} className="btn-secondary btn-sm text-primary">
            <RefreshCw size={16} className={cn(loading && "animate-spin")} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <StatsCard
            key={i}
            title={stat.title}
            value={stat.value}
            caption={stat.subtext}
            icon={stat.icon}
            iconBg={stat.iconBg}
            iconColor={stat.iconColor}
          />
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Table Card */}
        <div className={cn("transition-all duration-300 flex flex-col bg-white rounded-2xl border border-border shadow-sm overflow-hidden", showDetails ? "flex-[2]" : "flex-1")}>
          {/* Internal Filters */}
          <div className="p-5 border-b border-border/60 flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-4 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input
                  type="text"
                  placeholder="Search name or mobile"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="control-field pl-10 pr-3"
                />
              </div>

              <div className="md:col-span-3">
                <DatePicker 
                  value={dateRange.start}
                  onChange={(val) => setDateRange(prev => ({ ...prev, start: val }))}
                  className="w-full"
                  placeholder="From date"
                />
              </div>

              <div className="md:col-span-3">
                <DatePicker 
                  value={dateRange.end}
                  onChange={(val) => setDateRange(prev => ({ ...prev, end: val }))}
                  className="w-full"
                  placeholder="To date"
                />
              </div>

              <div className="md:col-span-2">
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-11 shadow-none"
                  options={[
                    "All Status",
                    "Delivered",
                    "Failed",
                    "Pending"
                  ]}
                />
              </div>
            </div>
          </div>

          <DataTable
            columns={columns as any}
            data={paginatedLogs}
            totalItems={filteredLogs.length}
            pageSize={pageSize}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
            emptyMessage="No SMS logs found matching your criteria."
            className="border-none shadow-none rounded-none"
            minHeight="450px"
          />
        </div>

        {/* Side Panel Details */}
        {activeDetails && (
          <div className="flex-1 bg-white border border-border rounded-2xl flex flex-col shadow-sm overflow-hidden animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between p-5 border-b border-border/60">
              <h3 className="text-[16px] font-medium text-[#1a1a1a]">
                SMS Details
              </h3>
              <button
                className="btn-icon-sm"
                onClick={() => setShowDetails(null)}
              >
                <XIcon size={20} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6">
              <div className="flex flex-col gap-4 text-[16px]">
                <div className="flex justify-between items-center text-[#1a1a1a]">
                  <div className="flex items-center gap-2 text-[#64748B] w-32">
                    <User size={16} /> Employee
                  </div>
                  <span className="font-medium text-right">
                    {activeDetails.name || "Test Number"}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[#1a1a1a]">
                  <div className="flex items-center gap-2 text-[#64748B] w-32">
                    <Phone size={16} /> Mobile Number
                  </div>
                  <span className="font-medium">{activeDetails.phone}</span>
                </div>

                <div className="flex justify-between items-center text-[#1a1a1a]">
                  <div className="flex items-center gap-2 text-[#64748B] w-32">
                    <Calendar size={16} /> Sent At
                  </div>
                  <span className="font-medium">
                    {new Date(activeDetails.sentAt).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[#1a1a1a]">
                  <div className="flex items-center gap-2 text-[#64748B] w-32">
                    <AlertCircle size={16} /> Status
                  </div>
                  <span
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[14px] font-medium",
                      activeDetails.status === "Delivered"
                        ? "bg-[#F0FDF4] text-[#16A34A]"
                        : activeDetails.status === "Failed"
                          ? "bg-[#FEF2F2] text-[#DC2626]"
                          : activeDetails.status === "Pending"
                            ? "bg-[#FFFbeb] text-[#D97706]"
                            : "",
                    )}
                  >
                    {activeDetails.status}
                  </span>
                </div>

                {activeDetails.status === "Failed" && (
                  <div className="flex justify-between items-center text-[#1a1a1a]">
                    <div className="flex items-center gap-2 text-[#DC2626] w-32">
                      <AlertTriangle size={16} /> Failure Reason
                    </div>
                    <span className="font-medium text-[#1a1a1a]">
                      Recipient unreachable
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <span className="text-[16px] font-medium text-[#1a1a1a]">
                  Message
                </span>
                <div className="bg-[#F8FAFC] border border-border rounded-xl p-4 text-[16px] text-[#1a1a1a] leading-relaxed font-medium">
                  {activeDetails.preview.replace("...", "")}
                  <br />
                  <br />
                  Please contact your supervisor if this
                  <br />
                  is incorrect.
                </div>
              </div>

              {activeDetails.status === "Failed" && (
                <div className="mt-8 flex justify-center">
                  <button className="btn-secondary text-primary w-1/2">
                    <Send size={16} /> Retry SMS
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
