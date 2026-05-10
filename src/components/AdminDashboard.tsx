import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  List,
  DollarSign,
  Clock,
  Camera,
  Users,
  Settings,
  MessageSquare,
  Bell,
  LogOut,
  Search,
  Download,
  Filter,
  Check,
  X as XIcon,
  Menu,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  CalendarCheck,
  FileText,
  Image as ImageIcon,
  PieChart,
  Calendar,
  ChevronLeft,
  BarChart2,
  Wallet,
  MapPin,
  Edit,
  FileSpreadsheet,
  ShieldCheck,
  Info,
  MoreVertical,
  AlertTriangle,
  Timer,
  Receipt,
  ClipboardList,
  ArrowDownRight,
  History,
  CheckCircle2,
  XCircle,
  Trash2,
  RefreshCw,
  User,
  Plus,
  UserCheck,
  Building,
  Briefcase,
  Mail,
  Phone,
  Lock,
  UserX,
  Home,
  ScanFace,
  Eye,
  Send,
  Database,
  Upload,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ComposedChart,
  PieChart as RePieChart,
  Pie,
  Cell,
} from "recharts";
import { cn } from "../lib/utils";
import { StaffView } from "./views/StaffView";
import { LogsView } from "./views/LogsView";
import { DashboardView } from "./views/DashboardView";
import { WorkforceInsightsView } from "./views/WorkforceInsightsView";
import { ApprovalsView } from "./views/ApprovalsView";
import { PhotosView } from "./views/PhotosView";
import { SettingsView } from "./views/SettingsView";
import { SmsLogsView } from "./views/SmsLogsView";
import { StraightDutyView } from "./views/StraightDutyView";
import { IncidentsView } from "./views/IncidentsView";
import { ViolationsView } from "./views/ViolationsView";
import { PayrollView } from "./views/PayrollView";
import ProfileView from "./views/ProfileView";
import { NotificationModal, AppNotification } from "./common/NotificationModal";
import { notificationService } from "../services/NotificationService";
import { PageLayout } from "./layout/PageLayout";
import { adminProfileService } from "../services/AdminProfileService";
import { adminAccountService } from "../services/AdminAccountService";

interface AdminDashboardProps {
  onNavigate: (view: "welcome" | "employee" | "admin" | "adminLogin" | "timeclock") => void;
}

const fallbackAdminAccount = {
  fullName: "Admin User",
  username: "admin",
  email: "admin@rsrengineering.com",
  department: "Administration",
  mobile: "+63 917 123 4567",
  position: "System Administrator",
  gender: "Male",
  dateRegistered: "January 5, 2024",
  address: "RSR Engineering Office, Cebu City, Philippines",
  lastLogin: "May 10, 2024 08:45 AM",
  timezone: "(GMT+08:00) Asia/Manila",
  role: "Administrator",
  avatar: "https://i.pravatar.cc/150?img=11",
};

function getSessionAdminAccount() {
  if (typeof window === "undefined") return fallbackAdminAccount;

  const storedAccount = sessionStorage.getItem("rsr_admin_account");
  if (!storedAccount) return fallbackAdminAccount;

  try {
    return { ...fallbackAdminAccount, ...JSON.parse(storedAccount) };
  } catch (e) {
    console.error("Error parsing admin account", e);
    return fallbackAdminAccount;
  }
}

function getSessionAdminLoginId(account: typeof fallbackAdminAccount) {
  if (typeof window === "undefined") return account.username;
  return sessionStorage.getItem("rsr_admin_login_id") || account.username;
}

export default function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const adminAccount = React.useMemo(() => getSessionAdminAccount(), []);
  const adminLoginId = React.useMemo(() => getSessionAdminLoginId(adminAccount), [adminAccount]);
  const profileImageStorageKey = `admin_profile_image_${adminLoginId}`;
  const personalInfoStorageKey = `admin_personal_info_${adminLoginId}`;
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    const update = () => setNotifications(notificationService.getAdminNotifications());
    update();
    const unsubscribe = notificationService.subscribe(update);
    return () => unsubscribe();
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAllAsRead = async () => {
    await notificationService.markAllAsRead();
  };

  const clearAllNotifications = async () => {
    await notificationService.clearAll();
  };

  // Lifted Profile State with Persistence
  const [profileImage, setProfileImage] = useState(() => {
    if (typeof window !== "undefined") {
      const savedImage = localStorage.getItem(profileImageStorageKey);
      return savedImage || adminAccount.avatar;
    }
    return adminAccount.avatar;
  });

  const [personalInfo, setPersonalInfo] = useState(() => {
    if (typeof window !== "undefined") {
      const savedInfo = localStorage.getItem(personalInfoStorageKey);
      if (savedInfo) {
        try {
          return { ...adminAccount, ...JSON.parse(savedInfo) };
        } catch (e) {
          console.error("Error parsing saved profile info", e);
        }
      }
    }
    return adminAccount;
  });

  useEffect(() => {
    let isMounted = true;

    adminProfileService
      .getProfile(adminLoginId, adminAccount)
      .then((profile) => {
        if (!isMounted) return;
        setPersonalInfo(profile);
        setProfileImage(profile.avatar);
        localStorage.setItem(personalInfoStorageKey, JSON.stringify(profile));
        localStorage.setItem(profileImageStorageKey, profile.avatar);
        sessionStorage.setItem("rsr_admin_account", JSON.stringify(profile));
      })
      .catch((error) => console.error("Error loading admin profile", error));

    const unsubscribe = adminProfileService.subscribe(
      adminLoginId,
      adminAccount,
      (profile) => {
        setPersonalInfo(profile);
        setProfileImage(profile.avatar);
        localStorage.setItem(personalInfoStorageKey, JSON.stringify(profile));
        localStorage.setItem(profileImageStorageKey, profile.avatar);
        sessionStorage.setItem("rsr_admin_account", JSON.stringify(profile));
      },
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [adminAccount, adminLoginId, personalInfoStorageKey, profileImageStorageKey]);

  const handleAdminInfoUpdate = async (info: any) => {
    const nextProfile = { ...personalInfo, ...info, avatar: profileImage };
    setPersonalInfo(nextProfile);
    localStorage.setItem(personalInfoStorageKey, JSON.stringify(nextProfile));
    sessionStorage.setItem("rsr_admin_account", JSON.stringify(nextProfile));
    await Promise.all([
      adminProfileService.updateProfile(adminLoginId, nextProfile),
      adminAccountService.updateProfile(adminLoginId, nextProfile),
    ]);
  };

  const handleAdminImageUpdate = async (image: string) => {
    const nextProfile = { ...personalInfo, avatar: image };
    setProfileImage(image);
    setPersonalInfo(nextProfile);
    localStorage.setItem(profileImageStorageKey, image);
    localStorage.setItem(personalInfoStorageKey, JSON.stringify(nextProfile));
    sessionStorage.setItem("rsr_admin_account", JSON.stringify(nextProfile));
    await Promise.all([
      adminProfileService.updateProfile(adminLoginId, { avatar: image }),
      adminAccountService.updateProfile(adminLoginId, { avatar: image }),
    ]);
  };

  const handleAdminPasswordUpdate = async (
    currentPassword: string,
    newPassword: string,
  ) => {
    const defaultPassword = adminLoginId === "assistant" ? "assistant" : "admin";
    const account = await adminAccountService.getAccount(adminLoginId, {
      ...personalInfo,
      avatar: profileImage,
      password: defaultPassword,
    });

    if (currentPassword.trim() !== account.password) {
      throw new Error("Current password is incorrect.");
    }

    await adminAccountService.updatePassword(adminLoginId, newPassword.trim());
  };

  const allTabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "approvals", label: "Approvals", icon: ShieldCheck },
    { id: "logs", label: "Logs", icon: ClipboardList },
    { id: "workforce", label: "Workforce Insights", icon: BarChart2 },
    { id: "payroll", label: "Payroll", icon: FileSpreadsheet },
    { id: "photos", label: "Photos", icon: ImageIcon },
    { id: "duty", label: "Straight Duty", icon: Timer },
    { id: "incidents", label: "Incidents", icon: AlertTriangle },
    { id: "violations", label: "Violations", icon: AlertTriangle },
    { id: "staff", label: "Staff", icon: Users },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "sms", label: "SMS Logs", icon: MessageSquare },
    { id: "profile", label: "Profile", icon: User },
  ];

  const isAssistant = personalInfo.role === "Assistant";
  // Filter tabs for Assistant: Log, Leave, Status, Duty, Employee(Staff), Profile
  const tabs = isAssistant ? allTabs.filter(tab => 
     ["dashboard", "approvals", "logs", "duty", "staff", "profile", "menu"].includes(tab.id)
  ).map(tab => {
    // Rename slightly for Assistant where needed to match requirements
    if (tab.id === "approvals") return { ...tab, label: "Leave" };
    return tab;
  }) : allTabs;

  return (
    <PageLayout
      onNavigate={onNavigate as any}
      onLogoClick={() => setActiveTab("dashboard")}
      title={
        <div className="flex flex-col items-center gap-1 min-w-0">
          <h1 className="text-[28px] font-bold text-[#1a1a1a] tracking-tight whitespace-nowrap truncate w-full text-center">
            {activeTab === "dashboard" ? (
              <>{tabs.find((t) => t.id === activeTab)?.label}</>
            ) : activeTab === "logs" ? (
              "Attendance Logs"
            ) : activeTab === "approvals" ? (
              "Approvals"
            ) : activeTab === "photos" ? (
              "Photo Verification"
            ) : activeTab === "staff" ? (
              "Staff Management"
            ) : activeTab === "workforce" ? (
              "Workforce Insights"
            ) : activeTab === "payroll" ? (
              "Payroll & Payslips"
            ) : activeTab === "duty" ? (
              "Straight Duty"
            ) : activeTab === "incidents" ? (
              "Incident Reports"
            ) : activeTab === "violations" ? (
              "Violations"
            ) : activeTab === "settings" ? (
              "System Settings"
            ) : activeTab === "profile" ? (
              "My Profile"
            ) : activeTab === "sms" ? (
              "SMS Logs"
            ) : activeTab === "menu" ? (
              "Navigation Menu"
            ) : (
              ""
            )}
          </h1>
          <p className="text-[14px] font-medium text-text-secondary max-w-xl text-center truncate">
            {activeTab === "dashboard" && "Welcome back, Admin!"}
            {activeTab === "approvals" && "Review and resolve attendance records that need admin approval."}
            {activeTab === "logs" && "View and manage employee attendance records"}
            {activeTab === "workforce" && "Automated insights and calculations based on attendance logs and company policies."}
            {activeTab === "payroll" && "Manage payroll cut-offs, analyze earnings, and generate digital payslips."}
            {activeTab === "photos" && "Review and verify employee verification photos"}
            {activeTab === "duty" && "Manage straight duty records and schedules"}
            {activeTab === "incidents" && "Log performance merits, complaints, and accident reports"}
            {activeTab === "violations" && "Monitor lifetime absence violation records"}
            {activeTab === "staff" && "Manage employee information, roles, and account access."}
            {activeTab === "settings" && "Manage site rules, shift schedules, allowance rates, and SMS notifications."}
            {activeTab === "profile" && "View and manage your personal information and account settings."}
            {activeTab === "sms" && "Track and monitor outbound SMS communications."}
            {activeTab === "menu" && "Select an option to navigate."}
          </p>
        </div>
      }
      showMenu={true}
      headerRight={
        <div className="flex items-center gap-6 z-50">
          <button 
            onClick={() => setIsNotificationModalOpen(true)}
            className="btn-icon relative rounded-full text-[#1a1a1a] hover:text-primary"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#0B7A4B] text-white flex items-center justify-center text-[10px] font-medium border-2 border-white">
                {unreadCount}
              </div>
            )}
          </button>
          <div className="relative group">
            <button 
              onClick={() => setActiveTab(activeTab === "menu" ? "dashboard" : "menu")}
              className="flex items-center gap-3 cursor-pointer group bg-white border border-border rounded-full py-1.5 px-2 hover:border-[#0B7A4B]/30 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-surface-muted overflow-hidden">
                <img
                  src={profileImage || undefined}
                  alt="Admin"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="hidden md:flex flex-col gap-0.5 text-left pr-2">
                <span className="text-[15px] font-medium text-[#1a1a1a] leading-none">
                  {personalInfo.fullName}
                </span>
                <span className="text-[14px] font-medium text-text-secondary leading-none">
                  {personalInfo.role}
                </span>
              </div>
            </button>
          </div>
        </div>
      }
      className="p-0 overflow-hidden"
    >
      <div className="flex w-full h-full relative overflow-hidden">
        {/* Main Content */}
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto stable-scrollbar bg-transparent">
            <div className="w-full max-w-[1200px] mx-auto flex flex-col gap-6 pb-12">
            {/* View Switching */}
            {activeTab === "dashboard" && <DashboardView />}
            {activeTab === "approvals" && <ApprovalsView isAssistant={isAssistant} />}
            {activeTab === "logs" && <LogsView isAssistant={isAssistant} />}
            {activeTab === "workforce" && <WorkforceInsightsView />}
            {activeTab === "payroll" && <PayrollView />}
            {activeTab === "photos" && <PhotosView />}
            {activeTab === "duty" && <StraightDutyView isAssistant={isAssistant} />}
            {activeTab === "incidents" && <IncidentsView />}
            {activeTab === "violations" && <ViolationsView />}
            {activeTab === "staff" && <StaffView />}
            {activeTab === "settings" && <SettingsView />}
            {activeTab === "sms" && <SmsLogsView />}
            {activeTab === "menu" && (
              <div className="w-full animate-in fade-in zoom-in-95">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    let subtitle = "";
                    if (tab.id === "dashboard") subtitle = "Overview & Analytics";
                    if (tab.id === "approvals") subtitle = "Review attendance";
                    if (tab.id === "logs") subtitle = "View system logs";
                    if (tab.id === "workforce") subtitle = "Analytics & Reports";
                    if (tab.id === "payroll") subtitle = "Generate payslips";
                    if (tab.id === "photos") subtitle = "Attendance photos";
                    if (tab.id === "duty") subtitle = "Straight duty records";
                    if (tab.id === "incidents") subtitle = "Employee incidents";
                    if (tab.id === "violations") subtitle = "Absence violations";
                    if (tab.id === "staff") subtitle = "Manage staff";
                    if (tab.id === "settings") subtitle = "System preferences";
                    if (tab.id === "sms") subtitle = "SMS history";
                    if (tab.id === "profile") subtitle = "Your profile";
                    
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className="group flex items-center gap-4 bg-white border border-border p-4 rounded-2xl hover:border-[#0B7A4B]/30 transition-all text-left"
                      >
                        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-[#f0fdf4] group-hover:border-[#0B7A4B]/20 transition-colors">
                          <Icon size={24} className="text-slate-500 group-hover:text-[#0B7A4B] transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                          <h3 className="text-[16px] font-medium text-[#1a1a1a] truncate group-hover:text-[#0B7A4B] transition-colors">
                            {tab.label}
                          </h3>
                          <p className="text-[14px] text-text-secondary truncate">
                            {subtitle}
                          </p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center flex-shrink-0 group-hover:bg-[#0B7A4B] transition-colors">
                          <ChevronRight size={16} className="text-slate-400 group-hover:text-white transition-colors" />
                        </div>
                      </button>
                    );
                  })}
                  
                  {/* Logout Card */}
                  <button
                    onClick={() => {
                      sessionStorage.removeItem("rsr_active_role");
                      sessionStorage.removeItem("rsr_admin_account");
                      onNavigate("welcome");
                    }}
                    className="group flex items-center gap-4 bg-white border border-red-100 p-4 rounded-2xl hover:border-red-300 transition-all text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0 group-hover:bg-red-100 transition-colors">
                      <LogOut size={24} className="text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <h3 className="text-[16px] font-medium text-red-600 truncate">
                        Log out
                      </h3>
                      <p className="text-[14px] text-red-400 truncate">
                        Sign out of account
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 group-hover:bg-red-500 transition-colors">
                      <ChevronRight size={16} className="text-red-400 group-hover:text-white transition-colors" />
                    </div>
                  </button>
                </div>
              </div>
            )}
            {activeTab === "profile" && (
              <ProfileView 
                personalInfo={personalInfo}
                setPersonalInfo={handleAdminInfoUpdate}
                profileImage={profileImage}
                setProfileImage={handleAdminImageUpdate}
                onChangePassword={handleAdminPasswordUpdate}
              />
            )}
            {activeTab !== "dashboard" &&
              activeTab !== "approvals" &&
              activeTab !== "logs" &&
              activeTab !== "workforce" &&
              activeTab !== "payroll" &&
              activeTab !== "photos" &&
              activeTab !== "duty" &&
              activeTab !== "incidents" &&
              activeTab !== "violations" &&
              activeTab !== "staff" &&
              activeTab !== "settings" &&
              activeTab !== "sms" &&
              activeTab !== "menu" &&
              activeTab !== "profile" && (
                <div className="flex flex-col items-center justify-center h-64 text-text-muted">
                  <span className="text-[16px] font-medium">
                    Developing {activeTab} module
                  </span>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <NotificationModal 
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={markAllAsRead}
        onClearAll={clearAllNotifications}
      />
    </PageLayout>
  );
}
