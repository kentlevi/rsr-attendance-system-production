import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Menu, UserCircle, LogIn, Coffee, Utensils, LogOut, ChevronDown, Check, MapPin } from 'lucide-react';
import { cn } from '../lib/utils';
import { Select } from './common/Select';
import Webcam from 'react-webcam';
import { useToast } from '../context/ToastContext';
import { attendanceService } from '../services/AttendanceService';
import { employeeService } from '../services/EmployeeService';
import { settingsService } from '../services/SettingsService';
import { PageLayout } from './layout/PageLayout';
import { auth } from '../lib/firebase';
import { BreakPunchAction, calculateBreakPunchUpdate, calculatePayrollForTimeIn, calculatePayrollForTimeOut } from '../lib/PayrollRules';
import { findBlockingIncompleteAttendance, getIncompleteAttendanceReviewUpdate } from '../lib/AttendanceApprovalRules';
import { canEmployeeAccessAttendance } from '../lib/EmployeeAccessRules';
import { attendancePhotoService } from '../services/AttendancePhotoService';
import { LocalAttendanceSyncSummary, localAttendanceService } from '../services/LocalAttendanceService';

interface TimeClockProps {
  onNavigate: (view: 'welcome' | 'employee' | 'admin' | 'adminLogin' | 'timeclock') => void;
}

export default function TimeClock({ onNavigate }: TimeClockProps) {
  const { showToast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [employees, setEmployees] = useState(employeeService.getAllEmployeesSync().map(e => e.data));
  const [sites, setSites] = useState<string[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>('Head Office');
  const [isProcessing, setIsProcessing] = useState(false);
  const [identifiedEmpId, setIdentifiedEmpId] = useState<string | null>(null);
  const [identifiedEmpName, setIdentifiedEmpName] = useState<string | null>(null);
  const [syncSummary, setSyncSummary] = useState<LocalAttendanceSyncSummary>({
    pending: 0,
    syncing: 0,
    failed: 0,
    retryReady: 0,
    totalOpen: 0,
  });
  const webcamRef = useRef<Webcam>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const unsub = employeeService.subscribe(() => setEmployees(employeeService.getAllEmployeesSync().map(e => e.data)));
    
    // Load employees for kiosk mode if they aren't already loaded
    const currentEmployees = employeeService.getAllEmployeesSync();
    if (currentEmployees.length === 0) {
      employeeService.loadEmployees().then(loaded => {
        setEmployees(loaded.map(e => e.data));
      });
    }

    // Load settings to get sites
    const settings = settingsService.getSettings();
    setSites(settings.sites || ['Head Office']);
    setSelectedSite(settings.activeSite || 'Head Office');
    
    const unsubSettings = settingsService.subscribe((newSettings) => {
      setSites(newSettings.sites || ['Head Office']);
      if (!newSettings.sites.includes(selectedSite)) {
        setSelectedSite(newSettings.activeSite || newSettings.sites[0] || 'Head Office');
      }
    });

    return () => {
      clearInterval(timer);
      unsub();
      unsubSettings();
    };
  }, []);

  const refreshPendingSyncCount = useCallback(async () => {
    try {
      setSyncSummary(await localAttendanceService.getSyncSummary());
    } catch (error) {
      console.error('Failed to load pending local punches', error);
    }
  }, []);

  useEffect(() => {
    refreshPendingSyncCount();
    window.addEventListener('online', refreshPendingSyncCount);
    return () => window.removeEventListener('online', refreshPendingSyncCount);
  }, [refreshPendingSyncCount]);

  const capture = useCallback(() => {
    return webcamRef.current?.getScreenshot();
  }, [webcamRef]);

  type TimeClockAction = 'Time In' | 'Time Out' | BreakPunchAction;

  const handleTimeAction = async (action: TimeClockAction) => {
    if (!auth.currentUser) {
      console.warn("System is not authenticated. Using public kiosk mode.");
    }

    setIsProcessing(true);
    setIdentifiedEmpName(null);
    setIdentifiedEmpId(null);

    const photo = capture();
    
    if (!photo) {
      showToast("Could not capture photo. Please check your camera.", "error");
      setIsProcessing(false);
      return;
    }

    let empId: string | null = null;
    let timeoutId: any;
    try {
      const { facialRecognitionService } = await import('../services/FacialRecognitionService');
      
      const timeoutPromise = new Promise<null>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Facial recognition timed out. Please try again.")), 15000);
      });
      
      empId = await Promise.race([
        facialRecognitionService.verifyFace(photo),
        timeoutPromise
      ]);

      if (timeoutId) clearTimeout(timeoutId);

      if (!empId) {
         showToast("Face not recognized. Please enroll first.", "error");
         setIsProcessing(false);
         return;
      }
    } catch (error: any) {
       if (timeoutId) clearTimeout(timeoutId);
       console.error("Facial recognition error:", error);
       showToast(error.message || "An error occurred during facial recognition. Please try again.", "error");
       setIsProcessing(false);
       return;
    }
    
    const empModel = employeeService.getEmployeeByIdSync(empId);
    const emp = empModel?.data;
    if (!emp) {
      showToast("Identity recognized but employee not found in database.", "error");
      setIsProcessing(false);
      return;
    }

    const access = canEmployeeAccessAttendance(emp);
    if (!access.allowed) {
      showToast(access.message, "error");
      setIsProcessing(false);
      return;
    }

    const settings = settingsService.getSettings();
    const coords = settings.siteCoordinates?.[selectedSite];
    
    let userLat: number | undefined;
    let userLng: number | undefined;
    let userDistance: number | undefined;

    if (coords && coords.lat && coords.lng && coords.radius) {
      // Perform geofence check
      let inGeofence = false;
      try {
        inGeofence = await new Promise<boolean>((resolve) => {
          if (!navigator.geolocation) {
            showToast("Geolocation is not supported by your browser.", "error");
            return resolve(false);
          }
          navigator.geolocation.getCurrentPosition((position) => {
            const { latitude, longitude } = position.coords;
            userLat = latitude;
            userLng = longitude;

            const R = 6371e3; // metres
            const phi1 = coords.lat * Math.PI/180;
            const phi2 = latitude * Math.PI/180;
            const deltaPhi = (latitude-coords.lat) * Math.PI/180;
            const deltaLambda = (longitude-coords.lng) * Math.PI/180;

            const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
                    Math.cos(phi1) * Math.cos(phi2) *
                    Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const distance = R * c;
            userDistance = distance;

            if (distance <= coords.radius) {
              resolve(true);
            } else {
              showToast(`Too far from ${selectedSite}. You are ${Math.round(distance)}m away.`, "error");
              resolve(false);
            }
          }, (err) => {
            showToast("Unable to retrieve location. Please allow location access.", "error");
            resolve(false);
          }, { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 });
        });
      } catch (e) {
         showToast("Geofencing check failed.", "error");
      }

      if (!inGeofence) {
        setIsProcessing(false);
        return;
      }
    }

    setIdentifiedEmpId(emp.id);
    setIdentifiedEmpName(emp.name);

    const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    const punchDate = new Date();
    const timestamp = punchDate.toISOString();
    const timeStr = punchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let localPunchId: string | null = null;
    
    try {
      // Ensure we have the most recent data for this employee before proceeding
      const freshLogs = await attendanceService.refreshLogsByDates([todayStr], false, emp.id);
      const logs = freshLogs.length > 0 ? freshLogs : attendanceService.getAllLogs();
      const existingLog = logs.find(l => l.data.employeeId === emp.id && l.data.date === todayStr);
      const todayISO = new Date().toISOString().slice(0, 10);

      if (action === "Time In") {
        const blockingIncompleteLog = findBlockingIncompleteAttendance(logs, emp.id, todayStr);
        if (blockingIncompleteLog) {
          await attendanceService.updateLog(
            blockingIncompleteLog.data.id,
            getIncompleteAttendanceReviewUpdate(blockingIncompleteLog.data),
          );
          showToast(`${emp.name} has a missing Time Out from ${blockingIncompleteLog.data.date}. Admin approval is required before Time In.`, "warning");
          return;
        }

        if (existingLog && existingLog.data.timeIn !== '-') {
          showToast(`Welcome ${emp.name}! You have already clocked in today`, "warning");
          return;
        }
      } else if (action === "Time Out") {
        if (!existingLog || existingLog.data.timeIn === '-') {
          showToast(`${emp.name}, you must clock in before clocking out`, "error");
          return;
        }
      } else if (!existingLog || existingLog.data.timeIn === '-') {
        showToast(`${emp.name}, you must clock in before recording ${action}`, "error");
        return;
      }

      const localPunch = await localAttendanceService.savePunch({
        employeeId: emp.id,
        employeeName: emp.name,
        action,
        timestamp,
        date: todayStr,
        time: timeStr,
        siteId: selectedSite,
        photoDataUrl: photo,
        photoCaptured: Boolean(photo),
        ...(userLat && { latitude: userLat }),
        ...(userLng && { longitude: userLng }),
        ...(userDistance && { geofenceDistance: userDistance }),
        ...(userDistance && { geofenceStatus: 'Inside' as const }),
      });
      localPunchId = localPunch.id;
      await refreshPendingSyncCount();

      if (!navigator.onLine) {
        showToast(`${emp.name}, ${action} saved locally and will sync when internet returns.`, "warning");
        return;
      }

      await localAttendanceService.markSyncing(localPunch.id);
      await refreshPendingSyncCount();

      const photoUploadEnabled = settingsService.getSettings().attendancePhotoUploadEnabled === true;
      const photoUrl = photo && photoUploadEnabled
        ? await attendancePhotoService.uploadPhoto(photo, emp.id, action)
        : null;

      if (action === "Time In") {
        const settings = settingsService.getSettings();
        const payroll = calculatePayrollForTimeIn({
          employee: emp,
          actualSite: selectedSite,
          timeIn: timeStr,
          settings,
        });
        if (existingLog) {
          await attendanceService.updateLog(existingLog.data.id, {
             timeIn: payroll.adjustedTimeIn,
             ...(photoUrl && { imageIn: photoUrl }),
             status: payroll.status,
             location: selectedSite,
             ...(userLat && { latitude: userLat }),
             ...(userLng && { longitude: userLng }),
             ...(userDistance && { geofenceDistance: userDistance }),
             ...(userDistance && { geofenceStatus: 'Inside' }),
             ...payroll,
          });
        } else {
          await attendanceService.addLog({
            employeeId: emp.id,
            date: todayStr,
            timeIn: payroll.adjustedTimeIn,
            timeOut: '-',
            workHours: '-',
            overtime: '-',
            status: payroll.status,
            location: selectedSite,
            ...(photoUrl && { imageIn: photoUrl }),
            ...(userLat && { latitude: userLat }),
            ...(userLng && { longitude: userLng }),
            ...(userDistance && { geofenceDistance: userDistance }),
            ...(userDistance && { geofenceStatus: 'Inside' }),
            ...payroll,
          });
        }
        if (!emp.dateHired) {
          await employeeService.updateEmployee(emp.id, { dateHired: todayISO });
        }
        if (payroll.status === 'Pending Approval') {
          showToast(`Welcome ${emp.name}! Time In recorded at ${timeStr} (Pending Approval)`);
        } else {
          showToast(`Welcome ${emp.name}! Time In recorded at ${timeStr}`);
        }
      } else if (action === "Time Out") {
        const settings = settingsService.getSettings();
        const payroll = calculatePayrollForTimeOut({
          employee: emp,
          actualSite: existingLog.data.location || selectedSite,
          timeIn: existingLog.data.timeIn,
          timeOut: timeStr,
          settings,
          existingPayroll: existingLog.data,
        });
        await attendanceService.updateLog(existingLog.data.id, {
          timeOut: payroll.adjustedTimeOut,
          ...(photoUrl && { imageOut: photoUrl }),
          workHours: payroll.workHours,
          overtime: payroll.overtime,
          status: payroll.requiresApproval ? 'Pending Approval' : existingLog.data.status,
          ...payroll,
        });
        if (payroll.requiresApproval) {
          showToast(`Goodbye ${emp.name}! Time Out recorded at ${timeStr} (Pending Approval)`);
        } else {
          showToast(`Goodbye ${emp.name}! Time Out recorded at ${timeStr}`);
        }
      } else {
        const settings = settingsService.getSettings();
        const breakUpdate = calculateBreakPunchUpdate({
          action,
          time: timeStr,
          settings,
          existingLog: existingLog.data,
        });

        await attendanceService.updateLog(existingLog.data.id, {
          status: breakUpdate.requiresApproval ? 'Pending Approval' : existingLog.data.status,
          ...breakUpdate,
        });

        if (breakUpdate.requiresApproval) {
          showToast(`${emp.name}, ${action} recorded at ${timeStr} (Pending Review)`, "warning");
        } else {
          showToast(`${emp.name}, ${action} recorded successfully!`);
        }
      }
      await localAttendanceService.markSynced(localPunch.id);
      await refreshPendingSyncCount();
    } catch (error) {
      if (localPunchId) {
        await localAttendanceService.markFailed(localPunchId, error);
        await refreshPendingSyncCount();
        showToast(`${action} saved locally. Cloud sync failed and will be retried later.`, "warning");
      } else {
        showToast("An error occurred. Please try again.", "error");
      }
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setIdentifiedEmpName(null);
        setIdentifiedEmpId(null);
      }, 3000); // keep identity visible on screen for 3s
    }
  };

  return (
    <PageLayout 
      onNavigate={onNavigate as any}
      showMenu={true}
      onMenuClick={() => onNavigate('welcome')}
      className="items-center justify-start gap-3 sm:gap-6 max-w-[1200px] mx-auto w-full px-4 py-4 sm:py-12 flex-1"
    >
      <div className="w-full flex-1 flex flex-col gap-4 sm:gap-6 min-h-0">
        <div className="w-full flex-1 min-h-[500px] sm:min-h-[540px] rounded-[24px] sm:rounded-[32px] overflow-hidden relative border border-[#E2E8F0] bg-white/50 backdrop-blur-sm p-4 sm:p-6 flex flex-col items-center justify-center">
          {/* Live Camera Feed Background (optional, keep transparent or remove if they want flat bg) - User wants minimalist */}
          {/* We will hide the background camera feed for minimalist look */}
          
          {/* Site Selector */}
          <div className="relative sm:absolute sm:top-6 sm:left-6 z-20 mb-4 sm:mb-0 self-start sm:self-auto w-full sm:w-auto">
            <Select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              options={sites}
              containerClassName="w-full sm:w-[180px]"
              className="bg-white border-[#E2E8F0] !h-12 !pl-12 !pr-10 rounded-[14px] text-[14px] font-medium text-[#1a1a1a] cursor-pointer"
            />
            <div className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-[#f0fdf4] flex items-center justify-center pointer-events-none z-30">
              <MapPin size={16} className="text-[#0B7A4B] stroke-[2.5px]" />
            </div>
          </div>

          <div className="relative z-10 w-full max-w-[420px] flex flex-col items-center gap-3 sm:gap-4 flex-1">
            <div className="flex flex-col items-center gap-1 mt-0 sm:mt-0">
              <h2 className="text-[32px] sm:text-[48px] font-bold text-[#1a1a1a] tabular-nums tracking-tight leading-none mt-2 sm:mt-0">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).replace('AM', '').replace('PM', '')}
                <span className="text-[14px] sm:text-[22px] font-bold text-text-secondary ml-2">{currentTime.toLocaleTimeString().split(' ')[1]}</span>
              </h2>
              <p className="text-[#64748B] font-medium text-[12px] sm:text-[15px] hidden sm:block">
                {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              {syncSummary.totalOpen > 0 && (
                <p className={cn(
                  "text-[11px] sm:text-[13px] font-semibold mt-1",
                  syncSummary.failed > 0 ? "text-red-600" : "text-amber-600"
                )}>
                  {syncSummary.totalOpen} offline pending
                </p>
              )}
            </div>

            <div className="w-full rounded-[24px] sm:rounded-[32px] bg-white p-2 sm:p-4 shadow-[0_20px_50px_rgba(15,23,42,0.05)] border border-white flex flex-col gap-2 sm:gap-4 flex-1 min-h-[300px]">
             <div className="relative w-full flex-1 aspect-[3/4] sm:aspect-[4/3] rounded-[16px] sm:rounded-[24px] overflow-hidden bg-surface-muted border border-border shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
                {/* @ts-ignore */}
                <Webcam 
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  mirrored={true}
                  videoConstraints={{ 
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: "user" 
                  }}
                  className="w-full h-full object-cover absolute inset-0 z-0"
                />
                
                {/* Scanner corners */}
                <div className="absolute top-4 sm:top-6 left-4 sm:left-6 w-8 sm:w-10 h-8 sm:h-10 border-t-[4px] border-l-[4px] border-primary rounded-tl-2xl sm:rounded-tl-3xl z-10"></div>
                <div className="absolute top-4 sm:top-6 right-4 sm:right-6 w-8 sm:w-10 h-8 sm:h-10 border-t-[4px] border-r-[4px] border-primary rounded-tr-2xl sm:rounded-tr-3xl z-10"></div>
                <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 w-8 sm:w-10 h-8 sm:h-10 border-b-[4px] border-l-[4px] border-primary rounded-bl-2xl sm:rounded-bl-3xl z-10"></div>
                <div className="absolute bottom-4 sm:bottom-6 right-4 sm:right-6 w-8 sm:w-10 h-8 sm:h-10 border-b-[4px] border-r-[4px] border-primary rounded-br-2xl sm:rounded-br-3xl z-10"></div>
                
                <div className="absolute inset-0 bg-success/5 z-0"></div>
                <style>{`
                  @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                  }
                `}</style>
                <div className="absolute left-0 right-0 h-1 bg-primary/40 shadow-[0_0_20px_rgba(11,122,75,0.5)] z-20" style={{ animation: 'scan 3s ease-in-out infinite' }}></div>
                {isProcessing && !identifiedEmpName && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20 backdrop-blur-[2px]">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span className="text-white font-medium text-sm tracking-widest uppercase">Scanning Face</span>
                    </div>
                  </div>
                )}
                {isProcessing && identifiedEmpName && (
                  <div className="absolute inset-0 bg-[#0B7A4B]/80 flex items-center justify-center z-20 backdrop-blur-[2px]">
                    <div className="flex flex-col items-center gap-3">
                      <Check className="w-16 h-16 text-white" />
                    </div>
                  </div>
                )}
             </div>

             <div className="bg-[#F8FAFC] border border-border/50 rounded-[24px] p-3 flex items-center gap-3">
               <div className="w-12 h-12 rounded-[16px] bg-white flex items-center justify-center text-primary shadow-sm flex-shrink-0 border border-border/50">
                 {identifiedEmpName ? <Check size={28} strokeWidth={2.4} /> : <UserCircle size={28} strokeWidth={1.75} />}
               </div>
               <div className="flex flex-col gap-0.5 min-w-0">
                 <span className="font-medium text-[#1a1a1a] text-[13px] sm:text-[16px] truncate">
                   {identifiedEmpName || "Align your face within the frame"}
                 </span>
                 <span className="text-[12px] text-[#64748B] font-medium">
                   {identifiedEmpName ? "Identity verified" : "Select an action below to scan and record attendance"}
                 </span>
               </div>
             </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="w-full grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
          <button 
            onClick={() => handleTimeAction("Time In")}
            disabled={isProcessing}
            className="h-[80px] sm:h-[100px] rounded-[24px] bg-[#0E8A54] text-white flex flex-col items-center justify-center gap-2 hover:bg-primary-dark transition-all active:scale-95 border-2 border-transparent disabled:opacity-50"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white/30 flex items-center justify-center bg-white/10">
              <LogIn size={18} className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="font-medium text-[14px] sm:text-[18px]">Time In</span>
          </button>
        
        <button 
          onClick={() => handleTimeAction("Lunch Out")}
          disabled={isProcessing}
          className="h-[80px] sm:h-[100px] rounded-[24px] bg-white border border-border flex flex-col items-center justify-center gap-2 hover:bg-surface-muted transition-all active:scale-95 disabled:opacity-50"
        >
           <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-warning text-warning flex items-center justify-center bg-warning/5">
              <Utensils size={18} className="w-4 h-4 sm:w-5 sm:h-5" />
           </div>
            <span className="font-medium text-[13px] sm:text-[16px] text-text-primary">Lunch Out</span>
        </button>

        <button 
          onClick={() => handleTimeAction("Lunch In")}
          disabled={isProcessing}
          className="h-[80px] sm:h-[100px] rounded-[24px] bg-white border border-border flex flex-col items-center justify-center gap-2 hover:bg-surface-muted transition-all active:scale-95 disabled:opacity-50"
        >
           <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-info text-info flex items-center justify-center bg-info/5">
              <Utensils size={18} className="w-4 h-4 sm:w-5 sm:h-5" />
           </div>
           <span className="font-medium text-[13px] sm:text-[16px] text-text-primary">Lunch In</span>
        </button>

        <button 
          onClick={() => handleTimeAction("PM Break Out")}
          disabled={isProcessing}
          className="h-[80px] sm:h-[100px] rounded-[24px] bg-white border border-border flex flex-col items-center justify-center gap-2 hover:bg-surface-muted transition-all active:scale-95 disabled:opacity-50"
        >
           <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-[#8B5CF6] text-[#8B5CF6] flex items-center justify-center bg-[#8B5CF6]/5">
              <Coffee size={18} className="w-4 h-4 sm:w-5 sm:h-5" />
           </div>
           <span className="font-medium text-[13px] sm:text-[16px] text-text-primary">PM Break Out</span>
        </button>

        <button 
          onClick={() => handleTimeAction("PM Break In")}
          disabled={isProcessing}
          className="h-[80px] sm:h-[100px] rounded-[24px] bg-white border border-border flex flex-col items-center justify-center gap-2 hover:bg-surface-muted transition-all active:scale-95 disabled:opacity-50"
        >
           <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-[#8B5CF6] text-[#8B5CF6] flex items-center justify-center bg-[#8B5CF6]/5">
              <Coffee size={18} className="w-4 h-4 sm:w-5 sm:h-5" />
           </div>
           <span className="font-medium text-[13px] sm:text-[16px] text-text-primary">PM Break In</span>
        </button>

          <button 
            onClick={() => handleTimeAction("Time Out")}
            disabled={isProcessing}
            className="h-[80px] sm:h-[100px] rounded-[24px] bg-[#E03A2E] text-white flex flex-col items-center justify-center gap-2 hover:bg-danger transition-all active:scale-95 border-2 border-transparent disabled:opacity-50"
          >
             <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white/30 flex items-center justify-center bg-white/10">
               <LogOut size={18} className="w-4 h-4 sm:w-5 sm:h-5" />
             </div>
             <span className="font-medium text-[14px] sm:text-[18px]">Time Out</span>
          </button>
        </div>
      </div>
    </PageLayout>
  );
}
