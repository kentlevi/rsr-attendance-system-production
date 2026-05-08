import { attendanceService } from './AttendanceService';
import { calculateBreakPunchUpdate, calculatePayrollForTimeIn, calculatePayrollForTimeOut } from '../lib/PayrollRules';
import { employeeService } from './EmployeeService';
import { settingsService } from './SettingsService';

declare global {
  interface Window {
    Android?: {
      saveEmployee: (json: string) => void;
      savePunchOffline: (empCode: string, type: string, timestamp: string, siteId: string) => void;
      getUnsyncedPunches: () => string;
      markPunchSynced: (id: number) => void;
    };
  }
}

export class SyncService {
  private syncInterval: number | null = null;
  private isSyncing: boolean = false;

  startAutoSync(intervalMs: number = 30000) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    // Initial sync
    this.processSync();

    this.syncInterval = window.setInterval(() => {
      this.processSync();
    }, intervalMs);
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async processSync() {
    // Only run if native Android interface exists and we're not currently syncing
    if (!window.Android || !window.Android.getUnsyncedPunches || this.isSyncing) return;
    
    // Also verify online status
    if (!navigator.onLine) return;

    this.isSyncing = true;
    try {
      const unsyncedPunchesStr = window.Android.getUnsyncedPunches();
      const unsyncedPunches = JSON.parse(unsyncedPunchesStr);

      if (!Array.isArray(unsyncedPunches) || unsyncedPunches.length === 0) {
        this.isSyncing = false;
        return;
      }

      console.log(`SyncService: Found ${unsyncedPunches.length} unsynced offline punches.`);

      for (const punch of unsyncedPunches) {
        try {
          // Construct the required AttendanceLog shape based on the punch
          const dateObj = new Date(punch.timestamp);
          const dateStr = dateObj.toLocaleDateString('en-CA'); // YYYY-MM-DD
          const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

          // Smart mapping: check if log for today already exists
          const existingLogs = attendanceService.getAllLogs();
          const existingLog = existingLogs.find(l => l.data.employeeId === punch.empCode && l.data.date === dateStr);
          const employee = employeeService.getEmployeeByIdSync(punch.empCode)?.data;
          const settings = settingsService.getSettings();

          if (punch.type === 'Time In') {
            if (!employee) continue;
            const payroll = calculatePayrollForTimeIn({
              employee,
              actualSite: punch.siteId || existingLog?.data.location || 'Head Office',
              timeIn: timeStr,
              settings,
            });
            if (existingLog) {
              await attendanceService.updateLog(existingLog.data.id, {
                timeIn: payroll.adjustedTimeIn,
                status: payroll.status,
                location: punch.siteId || existingLog.data.location,
                ...payroll,
              });
            } else {
              await attendanceService.addLog({
                employeeId: punch.empCode,
                date: dateStr,
                timeIn: payroll.adjustedTimeIn,
                timeOut: '-',
                workHours: '-',
                overtime: '-',
                status: payroll.status,
                location: punch.siteId || 'Head Office',
                ...payroll,
              });
            }
          } else if (punch.type === 'Time Out') {
            if (existingLog) {
              if (!employee) continue;
              const payroll = calculatePayrollForTimeOut({
                employee,
                actualSite: existingLog.data.location || punch.siteId || 'Head Office',
                timeIn: existingLog.data.timeIn,
                timeOut: timeStr,
                settings,
                existingPayroll: existingLog.data,
              });
              await attendanceService.updateLog(existingLog.data.id, {
                timeOut: payroll.adjustedTimeOut,
                workHours: payroll.workHours,
                overtime: payroll.overtime,
                status: payroll.requiresApproval ? 'Pending Approval' : existingLog.data.status,
                ...payroll,
              });
            } else {
              await attendanceService.addLog({
                employeeId: punch.empCode,
                date: dateStr,
                timeIn: '-',
                timeOut: timeStr,
                workHours: '-',
                overtime: '-',
                status: 'Pending Approval',
                location: punch.siteId || 'Head Office',
              });
            }
          } else {
            if (!existingLog) {
              await attendanceService.addLog({
                employeeId: punch.empCode,
                date: dateStr,
                timeIn: '-',
                timeOut: '-',
                workHours: '-',
                overtime: '-',
                status: 'Pending Approval',
                location: punch.siteId || 'Head Office',
                payrollReviewStatus: 'Pending Review',
                payrollNotes: [`${punch.type} synced without a Time In record.`],
              });
            } else {
              const breakUpdate = calculateBreakPunchUpdate({
                action: punch.type,
                time: timeStr,
                settings,
                existingLog: existingLog.data,
              });
              await attendanceService.updateLog(existingLog.data.id, {
                status: breakUpdate.requiresApproval ? 'Pending Approval' : existingLog.data.status,
                ...breakUpdate,
              });
            }
          }

          // Mark as synced locally
          window.Android.markPunchSynced(punch.id);
          console.log(`SyncService: Synced punch ${punch.id} for ${punch.empCode}`);
        } catch (e) {
          console.error(`SyncService: Failed to sync punch ${punch.id}`, e);
        }
      }
    } catch (e) {
      console.error("SyncService: Error during sync process", e);
    } finally {
      this.isSyncing = false;
    }
  }

  // Use this when the kiosk records a punch
  recordPunch(empCode: string, type: 'Time In' | 'Lunch Out' | 'Lunch In' | 'PM Break Out' | 'PM Break In' | 'Time Out', timestamp: string, siteId: string) {
    if (window.Android && window.Android.savePunchOffline) {
      // Save offline via Android SQLite Room
      window.Android.savePunchOffline(empCode, type, timestamp, siteId);
      
      // Trigger sync if online
      if (navigator.onLine) {
        this.processSync();
      }
    } else {
      // Fallback for Web/Browser dev (not Android kiosk)
      console.log('SyncService: Android wrapper not detected, skipping offline SQLite save.');
    }
  }
}

export const syncService = new SyncService();
