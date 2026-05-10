import React, { useState, useEffect } from 'react';
import { UserCircle, Clock, Calendar, ChevronLeft, LogOut, Bell, Briefcase, IdCard, BarChart3, CalendarPlus, Hourglass, ClockAlert, X, ChevronRight, Upload, LayoutDashboard, User, Paperclip, LockKeyhole, ScanFace, Eye, EyeOff } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '../lib/utils';
import Webcam from 'react-webcam';
import { Modal } from './common/Modal';
import { Select } from './common/Select';
import { DatePicker } from './common/DatePicker';
import { TimePicker } from './common/TimePicker';
import { DataTable } from './common/DataTable';
import { useToast } from '../context/ToastContext';
import { attendanceService } from '../services/AttendanceService';
import { leaveService } from '../services/LeaveService';
import { incidentService } from '../services/IncidentService';
import { undertimeService } from '../services/UndertimeService';
import { notificationService } from '../services/NotificationService';
import { employeeService } from '../services/EmployeeService';
import { settingsService } from '../services/SettingsService';
import { requestAttachmentService } from '../services/RequestAttachmentService';
import { validateLeaveRequest } from '../lib/LeaveRules';
import { canEmployeeAccessPortal } from '../lib/EmployeeAccessRules';
import { facialRecognitionService } from '../services/FacialRecognitionService';
import { PageLayout } from './layout/PageLayout';
import ProfileView from './views/ProfileView';
import { HrAssistantChatbot } from './views/common/HrAssistantChatbot';
import { authenticatedFetch } from '../lib/api';
import { getAuth, signInWithCustomToken } from 'firebase/auth';

interface EmployeePortalProps {
  onNavigate: (view: 'welcome' | 'employee' | 'admin' | 'adminLogin' | 'timeclock') => void;
}

export default function EmployeePortal({ onNavigate }: EmployeePortalProps) {
  const { showToast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [identifiedEmp, setIdentifiedEmp] = useState<any>(null);
  const [unacknowledgedIncidents, setUnacknowledgedIncidents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [employeeLoginMode, setEmployeeLoginMode] = useState<"face" | "manual">("face");
  const [employeeLoginId, setEmployeeLoginId] = useState("");
  const [employeeLoginPin, setEmployeeLoginPin] = useState("");
  const [isEmployeeLoggingIn, setIsEmployeeLoggingIn] = useState(false);
  const [isFaceScanning, setIsFaceScanning] = useState(false);
  const [showEmployeePin, setShowEmployeePin] = useState(false);
  const [isTimeDetailsOpen, setIsTimeDetailsOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isUndertimeModalOpen, setIsUndertimeModalOpen] = useState(false);
  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false);
  const webcamRef = React.useRef<Webcam>(null);

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "my-time", label: "My Time", icon: BarChart3 },
    { id: "payslips", label: "My Payslips", icon: Hourglass },
    { id: "leave-status", label: "Leave Status", icon: Hourglass },
    { id: "file-leave", label: "File Leave", icon: CalendarPlus },
    { id: "undertime", label: "Submit Undertime", icon: ClockAlert },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "profile", label: "Profile", icon: User },
  ];

  // Leave Form State
  const [leaveForm, setLeaveForm] = useState({
    type: 'vacation',
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [leaveAiText, setLeaveAiText] = useState('');
  const [isParsingLeave, setIsParsingLeave] = useState(false);
  const [leaveAttachment, setLeaveAttachment] = useState<File | null>(null);
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  // Undertime Form State
  const [undertimeForm, setUndertimeForm] = useState({
    date: '',
    plannedTimeOut: '',
    actualTimeOut: '',
    reason: ''
  });
  const [undertimeAttachment, setUndertimeAttachment] = useState<File | null>(null);
  const [isSubmittingUndertime, setIsSubmittingUndertime] = useState(false);

  // Data lists
  const [logs, setLogs] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [undertimes, setUndertimes] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  const persistEmployeeSession = (employee: any) => {
    sessionStorage.setItem("rsr_active_role", "employee");
    sessionStorage.setItem("rsr_employee_id", employee.id);
  };

  const clearEmployeeSession = () => {
    sessionStorage.removeItem("rsr_active_role");
    sessionStorage.removeItem("rsr_employee_id");
  };

  const completeEmployeeLogin = (employee: any) => {
    setIdentifiedEmp(employee);
    setIsAuthenticated(true);
    persistEmployeeSession(employee);
    showToast(`Welcome back, ${employee.name}!`);
  };

  const handleFaceLogin = async () => {
    setIsFaceScanning(true);

    const photo = webcamRef.current?.getScreenshot();

    if (!photo) {
      showToast("Could not capture photo. Please check your camera.", "error");
      setIsFaceScanning(false);
      return;
    }

    try {
      const employeeId = await facialRecognitionService.verifyFace(photo);

      if (!employeeId) {
        showToast("Face not recognized. Use your employee ID and PIN or ask admin to enroll your face.", "warning");
        return;
      }

      let employee = employeeService.getEmployeeByIdSync(employeeId);

      if (!employee) {
        employee = await employeeService.getEmployeeById(employeeId);
      }

      if (!employee) {
        showToast("Face profile found, but employee record was not found.", "error");
        return;
      }

      if (!employee.data.facialRecognitionProfileId) {
        showToast("This employee is not enrolled for facial login.", "warning");
        return;
      }

      const access = canEmployeeAccessPortal(employee.data);
      if (!access.allowed) {
        showToast(access.message, "error");
        return;
      }

      completeEmployeeLogin(employee.data);
    } catch (error) {
      console.error(error);
      showToast("Unable to verify face login. Check Firebase connection.", "error");
    } finally {
      setIsFaceScanning(false);
    }
  };

  const handleEmployeeLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const loginId = employeeLoginId.trim().toLowerCase();
    const pin = employeeLoginPin.trim();

    if (!loginId || !pin) {
      showToast("Enter your employee ID or email and PIN.", "warning");
      return;
    }

    setIsEmployeeLoggingIn(true);
    try {
      const response = await fetch('/api/login-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, pin })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        showToast(result.error || "Invalid employee credentials.", "error");
        return;
      }

      const auth = getAuth();
      await signInWithCustomToken(auth, result.token);

      const access = canEmployeeAccessPortal(result.employee);
      if (!access.allowed) {
        showToast(access.message, "error");
        return;
      }

      completeEmployeeLogin(result.employee);
      setEmployeeLoginId("");
      setEmployeeLoginPin("");
    } catch (error) {
      console.error(error);
      showToast("Unable to verify employee login. Check API connection.", "error");
    } finally {
      setIsEmployeeLoggingIn(false);
    }
  };

  // Calculate specific analytics based on logs
  const getWeeklyTimeData = () => {
    // Generate empty week (last 7 days)
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const summary = Array(7).fill(0).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        dateStr: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        name: days[d.getDay()],
        hours: 0
      };
    });

    logs.forEach(log => {
      const match = summary.find(s => s.dateStr === log.data.date);
      if (match && log.data.workHours && log.data.workHours !== '-') {
        match.hours = parseFloat(log.data.workHours);
      }
    });

    return summary;
  };
  const weeklyData = getWeeklyTimeData();
  const totalWeeklyHours = weeklyData.reduce((sum, day) => sum + day.hours, 0);

  const getWeeklyOvertime = () => {
    let overtime = 0;
    const summaryDates = weeklyData.map(d => d.dateStr);
    logs.forEach(log => {
      if (summaryDates.includes(log.data.date) && log.data.overtime && log.data.overtime !== '-') {
        overtime += parseFloat(log.data.overtime);
      }
    });
    return overtime;
  };
  const totalWeeklyOvertime = getWeeklyOvertime();

  const handleAttachmentSelect = (
    file: File | undefined,
    setFile: React.Dispatch<React.SetStateAction<File | null>>,
  ) => {
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    const maxSize = 5 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      showToast("Attachment must be a JPG, PNG, or PDF file.", "warning");
      return;
    }

    if (file.size > maxSize) {
      showToast("Attachment must be 5MB or smaller.", "warning");
      return;
    }

    setFile(file);
  };

  const handleParseLeaveText = async () => {
    if (!leaveAiText.trim()) return;
    setIsParsingLeave(true);
    try {
      const response = await authenticatedFetch('/api/extract-leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: leaveAiText }),
      });
      const data = await response.json();
      
      let type = 'vacation';
      if (data.type === 'Sick Leave') type = 'sick';
      else if (data.type === 'Leave Without Pay') type = 'unpaid';
      
      setLeaveForm({
        type,
        startDate: data.startDate || '',
        endDate: data.endDate || '',
        reason: data.reason || ''
      });
      showToast("Form auto-filled by AI!");
    } catch (e) {
      console.error(e);
      showToast("Failed to parse the text. Try again.");
    } finally {
      setIsParsingLeave(false);
    }
  };

  const handleSubmitLeave = async () => {
    if (!identifiedEmp) return;

    if (!leaveForm.type || !leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason.trim()) {
      showToast("Please complete all required leave fields.", "warning");
      return;
    }

    const leaveValidation = validateLeaveRequest({
      type: leaveForm.type,
      startDate: leaveForm.startDate,
      endDate: leaveForm.endDate,
    });

    if (!leaveValidation.valid) {
      showToast(leaveValidation.message, "warning");
      return;
    }

    setIsSubmittingLeave(true);
    try {
      const attachments = leaveAttachment
        ? [
            await requestAttachmentService.uploadRequestAttachment(
              leaveAttachment,
              identifiedEmp.id,
              'leave',
            ),
          ]
        : [];

      await leaveService.addRequest({
        employeeId: identifiedEmp.id,
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        type: leaveForm.type,
        status: 'Pending',
        reason: leaveForm.reason,
        attachments,
      });
      await notificationService.addNotification({
        title: "Leave request submitted",
        message: `${leaveForm.type} leave from ${leaveForm.startDate} to ${leaveForm.endDate} is pending review.`,
        time: "Just now",
        type: "info",
        isRead: false,
        targetRole: "employee",
        employeeId: identifiedEmp.id,
      });
      showToast("Leave request submitted successfully!");
      setIsLeaveModalOpen(false);
      setLeaveForm({ type: 'vacation', startDate: '', endDate: '', reason: '' });
      setLeaveAiText('');
      setLeaveAttachment(null);
      setActiveTab("leave-status");
    } catch (e) {
      showToast("Failed to submit leave request.", "error");
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  const parseTimeToMinutes = (time: string) => {
    const match = time.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
    if (!match) return null;

    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const period = match[3].toUpperCase();

    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;

    return hours * 60 + minutes;
  };

  const getUndertimeDuration = () => {
    const plannedMinutes = parseTimeToMinutes(undertimeForm.plannedTimeOut);
    const actualMinutes = parseTimeToMinutes(undertimeForm.actualTimeOut);

    if (plannedMinutes === null || actualMinutes === null) return null;

    return Math.max(0, plannedMinutes - actualMinutes);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours === 0) return `${remainingMinutes}m`;
    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h ${remainingMinutes}m`;
  };

  const undertimeDuration = getUndertimeDuration();

  const handleSubmitUndertime = async () => {
    if (!identifiedEmp) return;

    if (!undertimeForm.date || !undertimeForm.plannedTimeOut || !undertimeForm.actualTimeOut || !undertimeForm.reason.trim()) {
      showToast("Please complete all required undertime fields.", "warning");
      return;
    }

    const durationMinutes = getUndertimeDuration();

    if (!durationMinutes) {
      showToast("Actual time out must be earlier than planned time out.", "warning");
      return;
    }

    const durationHours = durationMinutes / 60;
    const hourlyRate = settingsService.getSettings().otAllowance || 0;
    const deduction = durationHours * hourlyRate;
    const durationLabel = formatDuration(durationMinutes);

    setIsSubmittingUndertime(true);
    try {
      const attachments = undertimeAttachment
        ? [
            await requestAttachmentService.uploadRequestAttachment(
              undertimeAttachment,
              identifiedEmp.id,
              'undertime',
            ),
          ]
        : [];

      await undertimeService.addRequest({
        employeeId: identifiedEmp.id,
        date: undertimeForm.date,
        type: 'Early Out',
        plannedTimeOut: undertimeForm.plannedTimeOut,
        actualTimeOut: undertimeForm.actualTimeOut,
        reason: undertimeForm.reason.trim(),
        timeLost: durationLabel,
        duration: durationLabel,
        deduction: `₱${deduction.toFixed(2)}`,
        attachments,
        status: 'Pending Review',
      });
      await notificationService.addNotification({
        title: "Undertime request submitted",
        message: `Your undertime request for ${undertimeForm.date} is pending review.`,
        time: "Just now",
        type: "info",
        isRead: false,
        targetRole: "employee",
        employeeId: identifiedEmp.id,
      });
      showToast("Undertime request submitted for approval!");
      setIsUndertimeModalOpen(false);
      setUndertimeForm({ date: '', plannedTimeOut: '', actualTimeOut: '', reason: '' });
      setUndertimeAttachment(null);
      setActiveTab("leave-status");
    } catch (e) {
      showToast("Failed to submit undertime request.", "error");
    } finally {
      setIsSubmittingUndertime(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isAuthenticated) return;
    if (sessionStorage.getItem("rsr_active_role") !== "employee") return;

    const employeeId = sessionStorage.getItem("rsr_employee_id");
    if (!employeeId) {
      clearEmployeeSession();
      return;
    }

    const restoreEmployee = () => {
      const emp = employeeService
        .getAllEmployeesSync()
        .find((employee) => employee.data.id === employeeId);

      if (emp) {
        setIdentifiedEmp(emp.data);
        setIsAuthenticated(true);
        return true;
      }

      return false;
    };

    if (restoreEmployee()) return;

    const unsubscribe = employeeService.subscribe(() => {
      restoreEmployee();
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!identifiedEmp) return;
    const updateIncidents = () => setUnacknowledgedIncidents(incidentService.getUnacknowledgedIncidents(identifiedEmp.id));
    updateIncidents();
    const unsub = incidentService.subscribe(updateIncidents);
    return () => unsub();
  }, [identifiedEmp]);

  useEffect(() => {
    if (!identifiedEmp) return;

    const unsubLogs = attendanceService.subscribe(() => {
      const allLogs = attendanceService.getAllLogs();
      setLogs(allLogs.filter(log => log.data.employeeId === identifiedEmp.id));
    });

    const unsubLeaves = leaveService.subscribe(() => {
      const allLeaves = leaveService.getAllRequests();
      setLeaves(allLeaves.filter(req => req.data.employeeId === identifiedEmp.id));
    });

    const unsubUndertimes = undertimeService.subscribe(() => {
      const allUndertimes = undertimeService.getAllRequests();
      setUndertimes(allUndertimes.filter(req => req.data.employeeId === identifiedEmp.id));
    });

    const unsubNotifications = notificationService.subscribeForEmployee(identifiedEmp.id, (nots) => {
      setNotifications(nots);
    });

    // Initial load
    setLogs(attendanceService.getAllLogs().filter(log => log.data.employeeId === identifiedEmp.id));
    setLeaves(leaveService.getAllRequests().filter(req => req.data.employeeId === identifiedEmp.id));
    setUndertimes(undertimeService.getAllRequests().filter(req => req.data.employeeId === identifiedEmp.id));

    return () => {
      unsubLogs();
      unsubLeaves();
      unsubUndertimes();
      unsubNotifications();
    };
  }, [identifiedEmp]);

  if (!isAuthenticated) {
    const isFaceLogin = employeeLoginMode === "face";

    return (
      <PageLayout onNavigate={onNavigate as any} className="items-center justify-start py-12 px-6">
        <div className="w-full max-w-[420px] mx-auto bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-10 border border-border/60 flex flex-col gap-8">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="w-[68px] h-[68px] rounded-full bg-[#E8F3EE] flex items-center justify-center text-[#0B7A4B]">
              {isFaceLogin ? (
                <ScanFace size={32} strokeWidth={2.2} />
              ) : (
                <LockKeyhole size={32} strokeWidth={2.2} />
              )}
            </div>
            <h1 className="text-[28px] font-bold text-text-primary">
              {isFaceLogin ? "Facial access" : "Manual access"}
            </h1>
            <p className="text-[16px] text-text-secondary">
              {isFaceLogin
                ? "Scan your registered face to continue."
                : "Enter your employee credentials to continue."}
            </p>
          </div>

          {isFaceLogin ? (
            <div className="flex flex-col gap-6">
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-surface-muted border border-border">
                  {/* @ts-ignore */}
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ facingMode: "user" }}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-success/5 pointer-events-none"></div>
                  <div className="absolute top-6 left-6 w-10 h-10 border-t-[4px] border-l-[4px] border-primary rounded-tl-3xl"></div>
                  <div className="absolute top-6 right-6 w-10 h-10 border-t-[4px] border-r-[4px] border-primary rounded-tr-3xl"></div>
                  <div className="absolute bottom-6 left-6 w-10 h-10 border-b-[4px] border-l-[4px] border-primary rounded-bl-3xl"></div>
                  <div className="absolute bottom-6 right-6 w-10 h-10 border-b-[4px] border-r-[4px] border-primary rounded-br-3xl"></div>
                  <style>{`
                    @keyframes employee-face-scan {
                      0% { top: 0%; opacity: 0; }
                      10% { opacity: 1; }
                      90% { opacity: 1; }
                      100% { top: 100%; opacity: 0; }
                    }
                  `}</style>
                  <div
                    className="absolute left-0 right-0 h-1 bg-primary/40 shadow-[0_0_20px_rgba(11,122,75,0.5)] z-20"
                    style={{ animation: "employee-face-scan 3s ease-in-out infinite" }}
                  ></div>
                </div>

                <button
                  type="button"
                  onClick={handleFaceLogin}
                  disabled={isFaceScanning}
                className="btn-primary w-full"
              >
                {isFaceScanning ? "Scanning Face" : "Login with Face"}
              </button>
            </div>
          ) : (
            <form onSubmit={handleEmployeeLogin} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="block text-[16px] font-medium text-text-primary">
                      Employee ID or Email
                    </label>
                    <div className="relative">
                      <IdCard
                        size={18}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
                      />
                      <input
                        type="text"
                        value={employeeLoginId}
                        onChange={(event) => setEmployeeLoginId(event.target.value)}
                        placeholder="Enter employee ID or email"
                        className="control-field pl-10"
                        autoComplete="username"
                      />
                    </div>
                  </div>

              <div className="flex flex-col gap-2">
                <label className="block text-[16px] font-medium text-text-primary">
                      PIN
                    </label>
                    <div className="relative">
                      <LockKeyhole
                        size={18}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
                      />
                      <input
                    type={showEmployeePin ? "text" : "password"}
                        value={employeeLoginPin}
                        onChange={(event) => setEmployeeLoginPin(event.target.value)}
                        placeholder="Enter access PIN"
                    className="control-field h-12 pl-10 pr-12"
                        autoComplete="current-password"
                      />
                  <button
                    type="button"
                    onClick={() => setShowEmployeePin((visible) => !visible)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors p-1"
                    aria-label={showEmployeePin ? "Hide PIN" : "Show PIN"}
                  >
                    {showEmployeePin ? <Eye size={20} /> : <EyeOff size={20} />}
                  </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isEmployeeLoggingIn}
                    className="btn-primary w-full"
                >
                  {isEmployeeLoggingIn ? "Verifying" : "Login"}
                </button>
              </form>
          )}

          <div className="flex flex-col pt-6 border-t border-border/60 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3">
              <span className="text-[14px] font-medium text-text-muted">OR</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setEmployeeLoginMode((mode) => (mode === "face" ? "manual" : "face"));
                setEmployeeLoginPin("");
                setShowEmployeePin(false);
              }}
              className="btn-secondary w-full text-primary"
            >
              {isFaceLogin ? (
                <LockKeyhole size={18} strokeWidth={2.5} />
              ) : (
                <ScanFace size={18} strokeWidth={2.5} />
              )}
              {isFaceLogin ? "Manual Login" : "Facial Login"}
            </button>
            <p className="pt-3 text-center text-[13px] font-medium text-text-muted">
              Switch to {isFaceLogin ? "Manual access" : "Facial access"}
            </p>
          </div>
        </div>
      </PageLayout>
    );
  }

  // Dashboard View
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <PageLayout 
      onNavigate={onNavigate as any}
      onLogoClick={() => setActiveTab("dashboard")}
      title={
        <div className="flex flex-col items-center gap-1 min-w-0">
          <h1 className="text-[28px] font-bold text-[#1a1a1a] tracking-tight whitespace-nowrap truncate w-full text-center">
            {activeTab === "dashboard" ? (
              <>{tabs.find((t) => t.id === activeTab)?.label}</>
            ) : activeTab === "my-time" ? (
              "My Time & Attendance"
            ) : activeTab === "payslips" ? (
              "My Payslips"
            ) : activeTab === "leave-status" ? (
              "Leave Status & Requests"
            ) : activeTab === "file-leave" ? (
              "File Leave Request"
            ) : activeTab === "undertime" ? (
              "Submit Undertime"
            ) : activeTab === "notifications" ? (
              "Notifications"
            ) : activeTab === "profile" ? (
              "My Profile"
            ) : activeTab === "menu" ? (
              "Navigation Menu"
            ) : (
              ""
            )}
          </h1>
          <p className="text-[12px] font-medium text-text-secondary max-w-xl text-center truncate">
            {activeTab === "dashboard" && "Welcome back to your employee portal!"}
            {activeTab === "my-time" && "View your weekly time summary and detailed attendance logs."}
            {activeTab === "payslips" && "View and download your digital payslips."}
            {activeTab === "leave-status" && "Track your leave balances and request history."}
            {activeTab === "file-leave" && "Submit a new request for leave or time off."}
            {activeTab === "undertime" && "Report and submit early out or undertime hours."}
            {activeTab === "notifications" && "Stay updated with your recent alerts and messages."}
            {activeTab === "profile" && "View and manage your personal information and account settings."}
            {activeTab === "menu" && "Select an option to navigate."}
          </p>
        </div>
      }
      showMenu={true}
      headerRight={
        <div className="flex items-center gap-6 z-50">
          <button 
            onClick={() => setActiveTab("notifications")}
            className="btn-icon relative rounded-full text-[#1a1a1a] hover:text-primary"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#0B7A4B] text-white flex items-center justify-center text-[12px] font-medium border-2 border-white">
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
                  src={identifiedEmp?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${identifiedEmp?.name || 'Employee'}`}
                  alt={identifiedEmp?.name || "Employee"}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="hidden md:flex flex-col gap-0.5 text-left pr-2">
                <span className="text-[16px] font-medium text-[#1a1a1a] leading-none">
                  {identifiedEmp?.name || "Employee"}
                </span>
                <span className="text-[12px] font-medium text-text-secondary leading-none">
                  {identifiedEmp?.role || "Staff"}
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
            {activeTab === "menu" ? (
              <div className="w-full max-w-[1200px] mx-auto pt-8 animate-in fade-in zoom-in-95">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    let subtitle = "";
                    if (tab.id === "dashboard") subtitle = "Overview & Analytics";
                    if (tab.id === "my-time") subtitle = "Attendance logs";
                    if (tab.id === "leave-status") subtitle = "Balances & requests";
                    if (tab.id === "file-leave") subtitle = "Request time off";
                    if (tab.id === "undertime") subtitle = "Report early out";
                    if (tab.id === "notifications") subtitle = "Alerts & messages";
                    if (tab.id === "profile") subtitle = "Your profile info";
                    
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
                          <p className="text-[12px] text-text-secondary truncate">
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
                        clearEmployeeSession();
                        setIsAuthenticated(false);
                        setIdentifiedEmp(null);
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
                      <p className="text-[12px] text-red-400 truncate">
                        Sign out of account
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 group-hover:bg-red-500 transition-colors">
                      <ChevronRight size={16} className="text-red-400 group-hover:text-white transition-colors" />
                    </div>
                  </button>
                </div>
              </div>
            ) : activeTab === "dashboard" ? (
              <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 pb-12">
        
        {/* Profile Card & Info Strip */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-border flex flex-col xl:flex-row gap-6 w-full xl:items-center">
          {/* Profile Details */}
          <div className="flex items-center gap-5 xl:w-[320px] xl:border-r border-border xl:pr-6 shrink-0">
             <div className="w-[84px] h-[84px] rounded-full bg-surface-muted flex-shrink-0 flex items-center justify-center relative overflow-hidden">
               <img src={identifiedEmp?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${identifiedEmp?.name || 'Employee'}`} alt={identifiedEmp?.name || "Employee"} className="w-full h-full object-cover scale-110 mt-2" />
             </div>
             <div className="flex flex-col gap-2">
               <h2 className="text-[28px] font-bold text-text-primary leading-none">{identifiedEmp?.name || "Employee"}</h2>
               <p className="text-[12px] font-medium text-text-secondary">{identifiedEmp?.position || identifiedEmp?.role || "Staff"} • {identifiedEmp?.department || "Department"}</p>
               <div className="flex items-center gap-1.5 text-success font-medium text-[12px]">
                  <Clock size={14} /> 
                  <span>{identifiedEmp?.status || "Active"}</span>
                  <div className="w-2 h-2 rounded-full bg-success ml-1"></div>
               </div>
             </div>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 xl:flex-1 w-full pt-4 xl:pt-0 border-t border-border xl:border-0 pl-0 xl:pl-4 xl:items-center">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                 <Calendar size={20} />
               </div>
               <div className="flex flex-col gap-0.5">
                 <span className="text-[16px] font-medium text-text-secondary uppercase tracking-wider">Today's Schedule</span>
                 <span className="text-[16px] font-medium text-text-primary">{identifiedEmp?.shift?.split('\n')[1] || "8:00 AM - 5:00 PM"}</span>
                 <span className="text-[14px] text-text-muted font-medium">{identifiedEmp?.shift?.split('\n')[0] || "Regular Shift"}</span>
               </div>
             </div>

             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/10 text-[#8B5CF6] flex items-center justify-center flex-shrink-0">
                 <IdCard size={20} />
               </div>
               <div className="flex flex-col gap-0.5">
                 <span className="text-[16px] font-medium text-text-secondary uppercase tracking-wider">Employee ID</span>
                 <span className="text-[16px] font-medium text-text-primary">{identifiedEmp?.id || "EMP-001"}</span>
                 <span className="text-[14px] text-text-muted font-medium">{identifiedEmp?.employmentType || "Full Time"}</span>
               </div>
             </div>

             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                 <Calendar size={20} />
               </div>
               <div className="flex flex-col gap-0.5">
                 <span className="text-[16px] font-medium text-text-secondary uppercase tracking-wider">Join Date</span>
                 <span className="text-[16px] font-medium text-text-primary">{identifiedEmp?.dateHired || "Jan 10, 2023"}</span>
                 <span className="text-[14px] text-text-muted font-medium">
                   {identifiedEmp?.dateHired ? (() => {
                     const hired = new Date(identifiedEmp.dateHired);
                     const now = new Date();
                     const diff = now.getTime() - hired.getTime();
                     const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
                     const months = Math.floor((diff % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44));
                     if (isNaN(years)) return "1y 4m";
                     let str = [];
                     if (years > 0) str.push(`${years}y`);
                     if (months > 0) str.push(`${months}m`);
                     return str.length > 0 ? str.join(' ') : 'New Employee';
                   })() : "1y 4m"}
                 </span>
               </div>
             </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
           
           {/* My Time Chart */}
           <div className="bg-white rounded-2xl p-6 shadow-sm border border-border flex flex-col justify-between gap-6 min-h-[340px]">
             <div className="flex items-start gap-4">
               <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                 <BarChart3 size={24} />
               </div>
               <div className="flex flex-col gap-0.5">
                  <h3 className="text-[20px] font-bold text-text-primary">My Time</h3>
                  <p className="text-[16px] font-medium text-text-secondary">View your weekly time summary</p>
               </div>
             </div>

             <div className="flex-1 w-full h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                     <XAxis dataKey="name" axisLine={{stroke: '#E2E8F0'}} tickLine={false} tick={{ fontSize: 13, fill: '#1a1a1a', fontWeight: 500 }} dy={10} />
                     <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#64748B', fontWeight: 500 }} ticks={[0, 4, 8, 12, 16]} />
                     <Tooltip cursor={{ fill: '#F1F5F9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                     <Bar dataKey="hours" fill="#0E8A54" radius={[4, 4, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
             </div>

             <div className="flex items-center justify-between pt-1">
               <span className="font-medium text-[16px] text-text-primary">Weekly Summary: <span className="text-primary">{totalWeeklyHours} hrs</span></span>
               <button 
                 onClick={() => setActiveTab("my-time")}
                 className="btn-secondary btn-sm text-primary"
               >
                 View Details
               </button>
             </div>
           </div>

           {/* File Leave */}
           <div className="bg-white rounded-2xl p-6 shadow-sm border border-border flex flex-col justify-between gap-4 min-h-[340px]">
             <div className="flex items-start gap-4">
               <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                 <CalendarPlus size={24} />
               </div>
               <div className="flex flex-col gap-0.5">
                  <h3 className="text-[20px] font-bold text-text-primary">File Leave</h3>
                  <p className="text-[16px] font-medium text-text-secondary">Request for leave or time off</p>
               </div>
             </div>

             <div className="flex-1 flex items-center justify-center py-6">
                <div className="w-[100px] h-[100px] relative text-primary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                     <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                     <line x1="16" y1="2" x2="16" y2="6" />
                     <line x1="8" y1="2" x2="8" y2="6" />
                     <line x1="3" y1="10" x2="21" y2="10" />
                     <rect x="7" y="14" width="3" height="3" fill="currentColor" stroke="none" />
                     <rect x="14" y="14" width="3" height="3" fill="currentColor" stroke="none" />
                     <rect x="7" y="18" width="3" height="3" fill="currentColor" stroke="none" />
                  </svg>
                </div>
             </div>

             <div className="pt-2">
               <button 
                 onClick={() => setActiveTab("file-leave")}
                 className="btn-primary w-full"
               >
                 Apply for Leave
               </button>
             </div>
           </div>

           {/* Leave Status */}
           <div className="bg-[#f0ece1]/40 rounded-2xl p-6 shadow-sm border border-border flex flex-col justify-between gap-6 min-h-[240px]">
             <div className="flex items-start gap-4">
               <div className="w-12 h-12 rounded-xl bg-[#D97706]/10 text-[#D97706] flex items-center justify-center flex-shrink-0">
                 <Hourglass size={24} />
               </div>
               <div className="flex flex-col gap-0.5">
                  <h3 className="text-[20px] font-bold text-text-primary">Leave Status</h3>
                  <p className="text-[16px] font-medium text-text-secondary">Track your leave requests and balances</p>
               </div>
             </div>

             <div className="grid grid-cols-3 gap-4">
               <div className="flex flex-col items-center justify-center gap-1.5 p-3 text-center">
                 <span className="text-[32px] font-bold text-success leading-none">{leaves.filter(l => l.data.status === 'Approved').length}</span>
                 <span className="text-[12px] font-medium text-text-primary">Approved</span>
               </div>
               <div className="flex flex-col items-center justify-center gap-1.5 p-3 text-center border-x border-[#d1d5db]/50 relative">
                 <span className="text-[32px] font-bold text-[#D97706] leading-none">{leaves.filter(l => l.data.status === 'Pending').length}</span>
                 <span className="text-[12px] font-medium text-text-primary">Pending</span>
               </div>
               <div className="flex flex-col items-center justify-center gap-1.5 p-3 text-center">
                 <span className="text-[32px] font-bold text-text-primary leading-none">{15 - leaves.filter(l => l.data.status === 'Approved').length}</span>
                 <span className="text-[12px] font-medium text-text-primary">Remaining</span>
               </div>
             </div>

             <div>
               <button 
                 onClick={() => setActiveTab("leave-status")}
                 className="btn-secondary w-full text-primary"
               >
                 View My Requests
               </button>
             </div>
           </div>

           {/* Submit Undertime */}
           <div className="bg-[#f8e5e5]/40 rounded-2xl p-6 shadow-sm border border-border flex flex-col justify-between gap-4 min-h-[240px]">
             <div className="flex items-start gap-4">
               <div className="w-12 h-12 rounded-xl bg-[#DC2626]/10 text-[#DC2626] flex items-center justify-center flex-shrink-0">
                 <ClockAlert size={24} />
               </div>
               <div className="flex flex-col gap-0.5">
                  <h3 className="text-[20px] font-bold text-text-primary">Submit Undertime</h3>
                  <p className="text-[16px] font-medium text-text-secondary">Report and submit undertime hours</p>
               </div>
             </div>

             <div className="flex-1 flex items-center justify-center py-2">
                <div className="w-[84px] h-[84px] relative text-[#DC2626]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                     <circle cx="12" cy="12" r="10" />
                     <polyline points="12 6 12 12 16 14" />
                     <path d="M19.5 21l-3 -3" stroke="#DC2626" strokeWidth="3" />
                     <path d="M16.5 21l3 -3" stroke="#DC2626" strokeWidth="3" />
                  </svg>
                </div>
             </div>

             <div className="pt-2">
               <button 
                 onClick={() => setActiveTab("undertime")}
                 className="btn-primary w-full"
                 style={{ background: "#B91C1C" }}
               >
                 Submit Undertime
               </button>
             </div>
           </div>

        </div>

        {/* Recent Notifications */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-border w-full flex items-center justify-between gap-6">
           <div className="flex items-center gap-5">
              <div className="w-[52px] h-[52px] rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                 <Bell size={24} fill="currentColor" strokeWidth={0} />
              </div>
              <div className="flex flex-col gap-3">
                 <div className="flex flex-col gap-0.5">
                   <h3 className="text-[20px] font-bold text-text-primary">Recent Notifications</h3>
                   <p className="text-[16px] text-text-secondary">Stay updated with your recent alerts and messages</p>
                 </div>
                 {notifications.length > 0 ? (
                   <div className="flex items-center gap-3">
                     {!notifications[0].isRead && <div className="w-3 h-3 rounded-full bg-primary border border-primary/20 ring-[3px] ring-primary/10"></div>}
                     <p className="text-[16px] font-medium text-text-primary">{notifications[0].message}</p>
                   </div>
                 ) : (
                   <div className="flex items-center gap-3">
                     <p className="text-[16px] font-medium text-text-secondary italic">No recent notifications.</p>
                   </div>
                 )}
              </div>
           </div>

           <div className="flex flex-col items-end gap-3 self-end shrink-0">
              <button 
                onClick={() => setActiveTab("notifications")}
                className="view-all-link hidden sm:inline-flex"
              >
                View All
              </button>
              {notifications.length > 0 && (
                <p className="text-[12px] text-text-secondary font-medium">
                  {new Date(notifications[0].createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </p>
              )}
           </div>
        </div>

      </div>

            ) : activeTab === "payslips" ? (
              <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 pb-12">
               {unacknowledgedIncidents.length > 0 ? (
                 <div className="bg-orange-50 rounded-2xl border border-orange-200 p-6 shadow-sm flex flex-col items-center justify-center text-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                       <ClockAlert size={32} />
                    </div>
                    <h2 className="text-[20px] font-bold text-orange-900">Action Required</h2>
                    <p className="text-[16px] text-orange-800 max-w-[500px]">
                      You have {unacknowledgedIncidents.length} unacknowledged incident report(s). You must acknowledge them before you can view your payslips.
                    </p>
                    <div className="flex flex-col gap-4 w-full max-w-[500px] mt-4">
                      {unacknowledgedIncidents.map(inc => (
                        <div key={inc.id} className="bg-white rounded-xl p-4 border border-orange-200 text-left shadow-sm">
                           <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-orange-900">{inc.data.title}</span>
                              <span className="text-[12px] text-orange-700 font-medium">
                                {new Date(inc.data.date).toLocaleDateString()}
                              </span>
                           </div>
                           <p className="text-[14px] text-text-secondary mb-4">{inc.data.description}</p>
                           <button onClick={() => {
                             incidentService.acknowledgeIncident(inc.id);
                             showToast("Incident acknowledged successfully.");
                           }} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-lg font-medium transition-colors">
                             I Acknowledge
                           </button>
                        </div>
                      ))}
                    </div>
                 </div>
               ) : (
                 <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
                   <div className="flex items-center justify-between gap-6 pb-6 border-b border-border">
                     <div className="flex flex-col gap-1">
                       <h2 className="text-[20px] font-bold text-[#1a1a1a]">My Payslips</h2>
                       <p className="text-[16px] text-text-secondary">View and download your recent payslips.</p>
                     </div>
                   </div>
                   <div className="p-12 flex flex-col items-center justify-center gap-4 text-center">
                     <Hourglass size={48} className="text-text-muted/50" />
                     <h3 className="text-[18px] font-medium text-text-primary">No Payslips Available</h3>
                     <p className="text-[16px] text-text-secondary max-w-[400px]">Your finalized payslips will appear here after the upcoming payroll cutoff.</p>
                   </div>
                 </div>
               )}
              </div>

            ) : activeTab === "my-time" ? (
              <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 pb-12">
               <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
                 <div className="flex items-center justify-between gap-6 pb-6 border-b border-border">
                   <div className="flex flex-col gap-1">
                     <h2 className="text-[20px] font-bold text-[#1a1a1a]">My Time – Weekly Details</h2>
                     <p className="text-[16px] text-text-secondary">Review your daily attendance logs and total hours.</p>
                   </div>
                 </div>
        <div className="p-6 flex flex-col gap-6">
          {/* Date Selector */}
          <div className="flex items-center gap-4">
            <Calendar size={22} className="text-primary" />
            <span className="font-medium text-text-primary text-[16px]">
              {weeklyData[6]?.dateStr} – {weeklyData[0]?.dateStr}
            </span>
            <button className="btn-icon-sm rounded-full">
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Table */}
          <DataTable
            columns={[
              {
                header: 'Date',
                accessor: (dayData: any) => dayData.dateStr.split(" ").slice(0, 2).join(" "),
                className: 'font-medium text-text-primary text-[16px]'
              },
              {
                header: 'Day',
                accessor: (dayData: any) => dayData.name,
                className: 'text-text-primary text-[16px]'
              },
              {
                header: 'Time In',
                accessor: (dayData: any) => {
                  const logForDay = logs.find(log => log.data.date === dayData.dateStr);
                  return logForDay?.data?.timeIn || "—";
                },
                className: 'text-text-primary text-[16px] text-center'
              },
              {
                header: 'Lunch Break',
                accessor: () => "—",
                className: 'text-text-primary text-[16px] text-center'
              },
              {
                header: 'PM Break',
                accessor: () => "—",
                className: 'text-text-primary text-[16px] text-center'
              },
              {
                header: 'Time Out',
                accessor: (dayData: any) => {
                  const logForDay = logs.find(log => log.data.date === dayData.dateStr);
                  return logForDay?.data?.timeOut || "—";
                },
                className: 'text-text-primary text-[16px] text-center'
              },
              {
                header: 'Total Hours',
                accessor: (dayData: any) => (
                  <span className={cn("font-medium", !dayData.hours ? "text-[#3B82F6]" : "text-text-primary")}>
                    {dayData.hours ? `${dayData.hours.toFixed(2)} hrs` : "0.00 hrs"}
                  </span>
                ),
                className: 'text-[16px] text-right'
              }
            ]}
            data={[...weeklyData].reverse()}
            emptyMessage="No time logs found for this week."
            totalItems={weeklyData.length}
            minHeight="300px"
          />

          {/* Summary Block */}
          <div className="bg-[#F4Fdf6] border border-success/10 rounded-xl p-5 flex flex-wrap items-center gap-12 max-w-full">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-primary text-primary flex items-center justify-center bg-white flex-shrink-0">
                <Clock size={20} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[12px] font-semibold text-text-primary leading-tight">
                  Total Hours This Week
                </span>
                <span className="text-[16px] font-medium text-primary leading-none">
                  {totalWeeklyHours.toFixed(2)} hrs
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-[#D97706] text-[#D97706] flex items-center justify-center bg-white flex-shrink-0">
                <Clock size={20} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[12px] font-semibold text-text-primary leading-tight">
                  Overtime Hours
                </span>
                <span className="text-[16px] font-medium text-[#D97706] leading-none">
                  {totalWeeklyOvertime.toFixed(2)} hrs
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    ) : activeTab === "file-leave" ? (
          <div className="max-w-[800px] mx-auto w-full flex flex-col gap-6 pb-12">
            <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
              <div className="flex items-center justify-between gap-6 pb-6 border-b border-border">
                <div className="flex flex-col gap-1">
                  <h2 className="text-[20px] font-bold text-[#1a1a1a]">Apply for Leave</h2>
                  <p className="text-[16px] text-text-secondary">Submit a new request for time off.</p>
                </div>
              </div>
        <div className="px-6 pb-6 pt-2">
          <form className="flex flex-col gap-4">
            {/* Conversational UI */}
            <div className="flex flex-col gap-1.5 p-4 bg-primary/5 rounded-xl border border-primary/20">
              <label className="block text-[12px] font-medium text-primary">
                Smart Fill (AI)
              </label>
              <p className="text-[12px] text-text-secondary leading-snug">
                Type your request naturally and our AI will fill out the form for you. (e.g., "I need sick leave tomorrow because I have a fever")
              </p>
              <div className="flex gap-2">
                <textarea
                  value={leaveAiText}
                  onChange={(e) => setLeaveAiText(e.target.value)}
                  placeholder="Describe your leave request"
                  className="control-field flex-1 p-2.5 text-[14px] resize-none"
                  rows={1}
                />
                <button
                  type="button"
                  onClick={handleParseLeaveText}
                  disabled={isParsingLeave || !leaveAiText.trim()}
                  className="btn-primary px-4 text-[12px] disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {isParsingLeave ? "Parsing" : "Auto-fill"}
                </button>
              </div>
            </div>

            {/* Leave Type */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-border/50">
              <label className="block text-[16px] font-medium text-[#1a1a1a]">
                Leave Type <span className="text-[#DC2626]">*</span>
              </label>
              <div className="relative">
                <Select
                  value={leaveForm.type}
                  onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}
                  placeholder="Select Leave Type"
                  className="h-11"
                >
                  <option value="vacation">Vacation Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="unpaid">Unpaid Leave</option>
                </Select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="block text-[16px] font-medium text-[#1a1a1a]">
                  Start Date <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <DatePicker
                    value={leaveForm.startDate}
                    onChange={(val) => setLeaveForm({ ...leaveForm, startDate: val })}
                    placeholder="Start Date"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="block text-[16px] font-medium text-[#1a1a1a]">
                  End Date <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <DatePicker
                    value={leaveForm.endDate}
                    onChange={(val) => setLeaveForm({ ...leaveForm, endDate: val })}
                    placeholder="End Date"
                  />
                </div>
              </div>
            </div>

            {/* Total Days */}
            <div className="flex flex-col gap-1.5">
              <label className="block text-[16px] font-medium text-[#1a1a1a]">
                Total Days
              </label>
              <input
                type="text"
                value={`${leaveForm.startDate && leaveForm.endDate ? Math.max(1, Math.ceil((new Date(leaveForm.endDate).getTime() - new Date(leaveForm.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1) : 0} day(s)`}
                readOnly
                className="control-field rounded-lg bg-[#F8FAFC] text-[#64748B] cursor-not-allowed"
              />
            </div>

            {/* Reason */}
            <div className="flex flex-col gap-1.5">
              <label className="block text-[16px] font-medium text-[#1a1a1a]">
                Reason <span className="text-[#DC2626]">*</span>
              </label>
              <textarea
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                placeholder="Enter reason for leave"
                className="control-field h-[100px] rounded-lg p-3 resize-none"
              ></textarea>
              <div className="text-right text-[12px] text-[#64748B] font-medium">
                {leaveForm.reason.length} / 500
              </div>
            </div>

            {/* Attachment */}
            <div className="flex flex-col gap-1.5">
              <label className="block text-[16px] font-medium text-[#1a1a1a]">
                Attachment{" "}
                <span className="text-[#64748B] font-normal">(Optional)</span>
              </label>
              <label className="border border-dashed border-[#CBD5E1] rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-[#F8FAFC] hover:border-primary/50 transition-all cursor-pointer">
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  className="sr-only"
                  onChange={(e) => handleAttachmentSelect(e.target.files?.[0], setLeaveAttachment)}
                />
                <div className="flex items-center justify-center text-[12px]">
                  <Upload size={16} className="text-primary mr-2" />
                  <span className="text-[#1a1a1a]">
                    <span className="text-primary font-semibold">Click to upload</span>{" "}
                    or drag and drop
                  </span>
                </div>
                <span className="text-[12px] text-[#64748B]">
                  JPG, PNG, PDF (Max. 5MB)
                </span>
              </label>
              {leaveAttachment && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-[#F8FAFC] px-3 py-2 text-[12px]">
                  <div className="flex items-center gap-2 min-w-0 text-text-secondary">
                    <Paperclip size={14} className="text-primary shrink-0" />
                    <span className="truncate">{leaveAttachment.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLeaveAttachment(null)}
                    className="btn-icon-sm h-7 w-7"
                    aria-label="Remove leave attachment"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t border-border">
              <button
                type="button"
                onClick={() => setActiveTab("dashboard")}
                className="btn-secondary text-text-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitLeave}
                disabled={isSubmittingLeave}
                className="btn-primary"
              >
                {isSubmittingLeave ? "Submitting" : "Submit Request"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    ) : activeTab === "undertime" ? (
      <div className="max-w-[800px] mx-auto w-full flex flex-col gap-6 pb-12">
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between gap-6 pb-6 border-b border-border">
            <div className="flex flex-col gap-1">
              <h2 className="text-[20px] font-bold text-[#1a1a1a]">Submit Undertime</h2>
              <p className="text-[16px] text-text-secondary">Report early out or undertime hours.</p>
            </div>
          </div>
        <div className="px-6 pb-6 pt-2">
          <form className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="block text-[16px] font-medium text-[#1a1a1a]">
                  Date <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <DatePicker
                    value={undertimeForm.date}
                    onChange={(val) => setUndertimeForm({ ...undertimeForm, date: val })}
                    placeholder="Select Date"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="block text-[16px] font-medium text-[#1a1a1a]">
                  Planned Time Out <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <TimePicker
                    value={undertimeForm.plannedTimeOut}
                    onChange={(val) => setUndertimeForm({ ...undertimeForm, plannedTimeOut: val })}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="block text-[16px] font-medium text-[#1a1a1a]">
                  Actual Time Out <span className="text-[#DC2626]">*</span>
                </label>
                <div className="relative">
                  <TimePicker
                    value={undertimeForm.actualTimeOut}
                    onChange={(val) => setUndertimeForm({ ...undertimeForm, actualTimeOut: val })}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="block text-[16px] font-medium text-[#1a1a1a]">
                  Duration
                </label>
                <input
                  type="text"
                  value={
                    undertimeDuration
                      ? formatDuration(undertimeDuration)
                      : "Duration will be calculated"
                  }
                  readOnly
                  className="control-field rounded-lg bg-[#F8FAFC] text-[#64748B] cursor-not-allowed"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="block text-[16px] font-medium text-[#1a1a1a]">
                Reason for Undertime <span className="text-[#DC2626]">*</span>
              </label>
              <textarea
                value={undertimeForm.reason}
                onChange={(e) => setUndertimeForm({ ...undertimeForm, reason: e.target.value })}
                placeholder="Enter reason for undertime"
                className="control-field h-[100px] rounded-lg p-3 resize-none"
              ></textarea>
              <div className="text-right text-[12px] text-[#64748B] font-medium">
                {undertimeForm.reason.length} / 500
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="block text-[16px] font-medium text-[#1a1a1a]">
                Attachment{" "}
                <span className="text-[#64748B] font-normal">(Optional)</span>
              </label>
              <label className="border border-dashed border-[#CBD5E1] rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-[#F8FAFC] hover:border-primary/50 transition-all cursor-pointer">
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  className="sr-only"
                  onChange={(e) => handleAttachmentSelect(e.target.files?.[0], setUndertimeAttachment)}
                />
                <div className="flex items-center justify-center text-[12px]">
                  <Upload size={16} className="text-primary mr-2" />
                  <span className="text-[#1a1a1a]">
                    <span className="text-primary font-semibold">Click to upload</span>{" "}
                    or drag and drop
                  </span>
                </div>
                <span className="text-[12px] text-[#64748B]">
                  JPG, PNG, PDF (Max. 5MB)
                </span>
              </label>
              {undertimeAttachment && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-[#F8FAFC] px-3 py-2 text-[12px]">
                  <div className="flex items-center gap-2 min-w-0 text-text-secondary">
                    <Paperclip size={14} className="text-primary shrink-0" />
                    <span className="truncate">{undertimeAttachment.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUndertimeAttachment(null)}
                    className="btn-icon-sm h-7 w-7"
                    aria-label="Remove undertime attachment"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t border-border">
              <button
                type="button"
                onClick={() => setActiveTab("dashboard")}
                className="btn-secondary text-text-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitUndertime}
                disabled={isSubmittingUndertime}
                className="btn-primary"
                style={{ background: "#B91C1C" }}
              >
                {isSubmittingUndertime ? "Submitting" : "Submit Request"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    ) : activeTab === "leave-status" ? (
      <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 pb-12">
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between gap-6 pb-6 border-b border-border">
            <div className="flex flex-col gap-1">
              <h2 className="text-[20px] font-bold text-[#1a1a1a]">My Requests</h2>
              <p className="text-[16px] text-text-secondary">Track the status of your leave and undertime requests.</p>
            </div>
          </div>
        <div className="px-6 pb-6 pt-2">
          <div className="flex flex-col gap-3 pb-6">
            <h4 className="text-[16px] font-medium text-[#1a1a1a]">Leave Requests</h4>
            {leaves.length > 0 ? (
              <div className="flex flex-col gap-3">
                {leaves.map((leave, i) => (
                  <div key={i} className="p-4 border border-[#E2E8F0] rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-medium text-[16px] text-[#1a1a1a] capitalize">{leave.data.type} Leave</div>
                      <div className="text-[12px] text-text-secondary pt-1">{leave.data.startDate} to {leave.data.endDate}</div>
                      {leave.data.attachments?.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {leave.data.attachments.map((attachment: any) => (
                            <a
                              key={attachment.path}
                              href={attachment.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg border border-border bg-[#F8FAFC] px-2 py-1 text-[12px] font-medium text-primary hover:bg-primary/5"
                            >
                              <Paperclip size={12} />
                              {attachment.name}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className={`px-2.5 py-1 text-[12px] font-semibold rounded-lg uppercase tracking-wider
                      ${leave.data.status === 'Approved' ? 'bg-[#D1FAE5] text-[#065F46]' : 
                        leave.data.status === 'Rejected' ? 'bg-[#FEE2E2] text-[#991B1B]' : 
                        'bg-[#FEF3C7] text-[#92400E]'}`}
                    >
                      {leave.data.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[16px] text-text-secondary italic">No leave requests found.</div>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <h4 className="text-[16px] font-semibold text-[#1a1a1a]">Undertime Requests</h4>
            {undertimes.length > 0 ? (
              <div className="flex flex-col gap-3">
                {undertimes.map((ut, i) => (
                  <div key={i} className="p-4 border border-[#E2E8F0] rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-medium text-[16px] text-[#1a1a1a]">{ut.data.date}</div>
                      <div className="text-[12px] text-text-secondary pt-1">
                        {ut.data.actualTimeOut || "-"} of {ut.data.plannedTimeOut || "-"} - Lost {ut.data.timeLost}
                      </div>
                      {ut.data.reason && (
                        <div className="text-[12px] text-text-secondary pt-1">
                          {ut.data.reason}
                        </div>
                      )}
                      {ut.data.attachments?.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {ut.data.attachments.map((attachment: any) => (
                            <a
                              key={attachment.path}
                              href={attachment.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg border border-border bg-[#F8FAFC] px-2 py-1 text-[12px] font-medium text-primary hover:bg-primary/5"
                            >
                              <Paperclip size={12} />
                              {attachment.name}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className={`px-2.5 py-1 text-[12px] font-semibold rounded-lg uppercase tracking-wider
                      ${ut.data.status === 'Approved' ? 'bg-[#D1FAE5] text-[#065F46]' : 
                        ut.data.status === 'Rejected' ? 'bg-[#FEE2E2] text-[#991B1B]' : 
                        'bg-[#FEF3C7] text-[#92400E]'}`}
                    >
                      {ut.data.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[16px] text-text-secondary italic">No undertime requests found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
    ) : activeTab === "notifications" ? (
      <div className="max-w-[800px] mx-auto w-full flex flex-col gap-6 pb-12">
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between gap-6 pb-6 border-b border-border">
            <div className="flex flex-col gap-1">
              <h2 className="text-[20px] font-bold text-[#1a1a1a]">Notifications</h2>
              <p className="text-[16px] text-text-secondary">Stay updated with alerts and messages.</p>
            </div>
          </div>
          {notifications.length > 0 ? (
            <div className="flex flex-col gap-4">
              {notifications.map((n, i) => (
                <div key={i} className="p-4 border border-border rounded-xl">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[16px] font-medium text-[#1a1a1a]">{n.title}</span>
                    <span className="text-[14px] text-text-secondary">{new Date(n.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-[16px] text-text-secondary">{n.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[16px] text-text-secondary italic">No notifications found.</div>
          )}
        </div>
      </div>
    ) : activeTab === "profile" ? (
      <ProfileView
        personalInfo={{
          fullName: identifiedEmp?.name || "Employee",
          username: identifiedEmp?.id || "Set your username",
          email: identifiedEmp?.email || "employee@example.com",
          department: identifiedEmp?.department || "General",
          mobile: identifiedEmp?.phone || "No phone",
          position: identifiedEmp?.position || "Staff",
          gender: identifiedEmp?.gender || "Not Specified",
          dateRegistered: identifiedEmp?.dateHired || "No date",
          address: identifiedEmp?.address || "No address",
          role: identifiedEmp?.role || "Staff",
          lastLogin: identifiedEmp?.lastLogin || "Never",
          timezone: "Local",
        }}
        setPersonalInfo={async (info: any) => {
          try {
            const up = {
              name: info.fullName,
              email: info.email,
              department: info.department,
              phone: info.mobile,
              position: info.position,
              gender: info.gender,
              address: info.address,
            };
            await employeeService.updateEmployee(identifiedEmp.id, up);
            setIdentifiedEmp({ ...identifiedEmp, ...up });
          } catch (e) {
            console.error(e);
            throw e;
          }
        }}
        profileImage={identifiedEmp?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${identifiedEmp?.name}`}
        setProfileImage={async (img: string) => {
          try {
            await employeeService.updateEmployee(identifiedEmp.id, { avatar: img });
            setIdentifiedEmp({ ...identifiedEmp, avatar: img });
          } catch (e) {
            console.error(e);
            throw e;
          }
        }}
      />
    ) : null}
          </div>
          {identifiedEmp && (
            <HrAssistantChatbot employee={identifiedEmp} settings={settingsService.getSettings()} />
          )}
        </main>
      </div>
    </PageLayout>
  );
}
