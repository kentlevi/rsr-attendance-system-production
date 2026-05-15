import { attendanceService } from './AttendanceService';
import { calculateBreakPunchUpdate, calculatePayrollForTimeIn, calculatePayrollForTimeOut } from '../lib/PayrollRules';
import { employeeService } from './EmployeeService';
import { settingsService } from './SettingsService';
import { attendancePhotoService } from './AttendancePhotoService';
import { LocalAttendancePunch, localAttendanceService } from './LocalAttendanceService';
import { localUploadQueue, PendingUpload } from './LocalUploadQueue';
import { pendingNotificationQueue, PendingNotification } from './PendingNotificationQueue';
import { notificationService } from './NotificationService';
import { ref, uploadBytes, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

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
  private onlineHandler = () => {
    this.processSync();
  };

  startAutoSync(intervalMs: number = 30000) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    window.removeEventListener('online', this.onlineHandler);
    
    // Initial sync
    this.processSync();

    this.syncInterval = window.setInterval(() => {
      this.processSync();
    }, intervalMs);

    window.addEventListener('online', this.onlineHandler);
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    window.removeEventListener('online', this.onlineHandler);
  }

  async processSync() {
    if (this.isSyncing || !navigator.onLine) return;
    this.isSyncing = true;

    try {
      await this.processNativeAndroidPunches();
      await this.processLocalAttendancePunches();
      await this.processUploadQueue();
      await this.processNotificationQueue();
    } catch (e) {
      console.error("SyncService: Error during sync process", e);
    } finally {
      this.isSyncing = false;
    }
  }

  async getAggregatedSyncSummary(): Promise<{
    punches: number;
    uploads: number;
    notifications: number;
    totalOpen: number;
  }> {
    const [punchSummary, uploadCount, notifCount] = await Promise.all([
      localAttendanceService.getSyncSummary().catch(() => ({ totalOpen: 0 })),
      localUploadQueue.getCount().catch(() => 0),
      pendingNotificationQueue.getCount().catch(() => 0),
    ]);
    const punches = punchSummary.totalOpen || 0;
    return {
      punches,
      uploads: uploadCount,
      notifications: notifCount,
      totalOpen: punches + uploadCount + notifCount,
    };
  }

  private async processNativeAndroidPunches() {
    if (!window.Android || !window.Android.getUnsyncedPunches) return;

    try {
      const unsyncedPunchesStr = window.Android.getUnsyncedPunches();
      const unsyncedPunches = JSON.parse(unsyncedPunchesStr);

      if (!Array.isArray(unsyncedPunches) || unsyncedPunches.length === 0) {
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
          const employeeModel = await employeeService.getEmployeeById(punch.empCode);
          const employee = employeeModel?.data;
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
      console.error("SyncService: Error during native Android sync", e);
    }
  }

  private async processLocalAttendancePunches() {
    const pendingPunches = await localAttendanceService.getRetryablePunches();
    if (pendingPunches.length === 0) return;

    console.log(`SyncService: Found ${pendingPunches.length} browser offline punches.`);
    const syncedDates = new Set<string>();

    for (const punch of pendingPunches) {
      try {
        await localAttendanceService.markSyncing(punch.id);
        await this.syncLocalPunchToCloud(punch);
        await localAttendanceService.markSynced(punch.id);
        syncedDates.add(punch.date);
        console.log(`SyncService: Synced local punch ${punch.id} for ${punch.employeeId}`);
      } catch (error) {
        await localAttendanceService.markFailed(punch.id, error);
        console.error(`SyncService: Failed to sync local punch ${punch.id}`, error);
      }
    }

    if (syncedDates.size > 0) {
      await attendanceService.refreshLogsByDates(Array.from(syncedDates));
    }

    // Opportunistic cleanup so the IndexedDB doesn't accumulate ancient synced
    // punches (each carries a ~50KB photo data URL).
    try {
      const pruned = await localAttendanceService.pruneSynced();
      if (pruned > 0) {
        console.log(`SyncService: pruned ${pruned} synced punches older than retention window.`);
      }
    } catch (err) {
      console.warn('SyncService: failed to prune synced punches', err);
    }
  }

  private async syncLocalPunchToCloud(punch: LocalAttendancePunch) {
    const existingLog = attendanceService.getAllLogs().find((log) => log.data.employeeId === punch.employeeId && log.data.date === punch.date);
    const employeeModel = await employeeService.getEmployeeById(punch.employeeId);
    const employee = employeeModel?.data;
    const settings = settingsService.getSettings();

    if (!employee) {
      throw new Error(`Employee ${punch.employeeId} was not found for offline sync.`);
    }

    // Upload photo separately from the log write. If the photo fails it gets queued
    // (via attendancePhotoService) but we still proceed with the attendance log so the
    // punch isn't blocked. SyncService will reconcile the photo URL later via processUploadQueue.
    let photoUrl: string | null = null;
    if (punch.photoDataUrl && settings.attendancePhotoUploadEnabled === true) {
      try {
        photoUrl = await attendancePhotoService.uploadDirect(punch.photoDataUrl, punch.employeeId, punch.action);
      } catch (e) {
        console.warn(`SyncService: Photo upload failed for punch ${punch.id}; queueing photo for retry.`, e);
        await localUploadQueue.enqueue({
          kind: 'attendance-photo',
          dataUrl: punch.photoDataUrl,
          context: {
            employeeId: punch.employeeId,
            action: punch.action,
            punchId: punch.id,
            date: punch.date,
            // logId will be patched in once we know it
            field: punch.action === 'Time Out' ? 'imageOut' : 'imageIn',
            queuedAt: new Date().toISOString(),
            reason: e instanceof Error ? e.message : 'photo upload failed during sync',
          },
        });
        photoUrl = null;
      }
    }

    if (punch.action === 'Time In') {
      const payroll = calculatePayrollForTimeIn({
        employee,
        actualSite: punch.siteId || existingLog?.data.location || 'Head Office',
        timeIn: punch.time,
        settings,
      });

      if (existingLog) {
        if (existingLog.data.timeIn !== '-') return;

        await attendanceService.updateLog(existingLog.data.id, {
          timeIn: payroll.adjustedTimeIn,
          ...(photoUrl && { imageIn: photoUrl }),
          status: payroll.status,
          location: punch.siteId || existingLog.data.location,
          ...(punch.latitude && { latitude: punch.latitude }),
          ...(punch.longitude && { longitude: punch.longitude }),
          ...(punch.geofenceDistance && { geofenceDistance: punch.geofenceDistance }),
          ...(punch.geofenceStatus && { geofenceStatus: punch.geofenceStatus }),
          ...payroll,
        });
      } else {
        await attendanceService.addLog({
          employeeId: punch.employeeId,
          date: punch.date,
          timeIn: payroll.adjustedTimeIn,
          timeOut: '-',
          workHours: '-',
          overtime: '-',
          status: payroll.status,
          location: punch.siteId || 'Head Office',
          ...(photoUrl && { imageIn: photoUrl }),
          ...(punch.latitude && { latitude: punch.latitude }),
          ...(punch.longitude && { longitude: punch.longitude }),
          ...(punch.geofenceDistance && { geofenceDistance: punch.geofenceDistance }),
          ...(punch.geofenceStatus && { geofenceStatus: punch.geofenceStatus }),
          ...payroll,
        });
      }

      return;
    }

    if (punch.action === 'Time Out') {
      if (!existingLog) {
        await attendanceService.addLog({
          employeeId: punch.employeeId,
          date: punch.date,
          timeIn: '-',
          timeOut: punch.time,
          workHours: '-',
          overtime: '-',
          status: 'Pending Approval',
          location: punch.siteId || 'Head Office',
          ...(photoUrl && { imageOut: photoUrl }),
        });
        return;
      }

      if (existingLog.data.timeOut !== '-') return;

      const payroll = calculatePayrollForTimeOut({
        employee,
        actualSite: existingLog.data.location || punch.siteId || 'Head Office',
        timeIn: existingLog.data.timeIn,
        timeOut: punch.time,
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

      return;
    }

    if (!existingLog) {
      await attendanceService.addLog({
        employeeId: punch.employeeId,
        date: punch.date,
        timeIn: '-',
        timeOut: '-',
        workHours: '-',
        overtime: '-',
        status: 'Pending Approval',
        location: punch.siteId || 'Head Office',
        payrollReviewStatus: 'Pending Review',
        payrollNotes: [`${punch.action} synced without a Time In record.`],
      });
      return;
    }

    const breakUpdate = calculateBreakPunchUpdate({
      action: punch.action,
      time: punch.time,
      settings,
      existingLog: existingLog.data,
    });

    await attendanceService.updateLog(existingLog.data.id, {
      status: breakUpdate.requiresApproval ? 'Pending Approval' : existingLog.data.status,
      ...breakUpdate,
    });
  }

  private async processUploadQueue() {
    const retryable = await localUploadQueue.getRetryable();
    if (retryable.length === 0) return;

    console.log(`SyncService: Draining ${retryable.length} pending uploads.`);

    for (const upload of retryable) {
      try {
        await localUploadQueue.markUploading(upload.id);
        await this.replayUpload(upload);
        await localUploadQueue.remove(upload.id);
      } catch (e) {
        console.error(`SyncService: Upload ${upload.id} failed`, e);
        await localUploadQueue.markFailed(upload.id, e);
      }
    }
  }

  private async replayUpload(upload: PendingUpload) {
    const ctx = upload.context || {};

    if (upload.kind === 'attendance-photo') {
      if (!upload.dataUrl) throw new Error('Attendance photo upload missing dataUrl');
      const url = await attendancePhotoService.uploadDirect(upload.dataUrl, ctx.employeeId, ctx.action);
      // Patch the corresponding attendance log if we know which one
      const logId = ctx.logId as string | undefined;
      const field = (ctx.field as 'imageIn' | 'imageOut') || (ctx.action === 'Time Out' ? 'imageOut' : 'imageIn');
      if (logId) {
        await attendanceService.updateLog(logId, { [field]: url });
      } else if (ctx.employeeId && ctx.date) {
        // Try to find the log by employee + date
        const log = attendanceService.getAllLogs().find(
          (l) => l.data.employeeId === ctx.employeeId && l.data.date === ctx.date
        );
        if (log) {
          await attendanceService.updateLog(log.data.id, { [field]: url });
        }
      }
      return;
    }

    if (upload.kind === 'request-attachment' || upload.kind === 'profile-avatar' || upload.kind === 'incident-evidence') {
      if (!upload.blob && !upload.dataUrl) {
        throw new Error(`${upload.kind} upload missing payload`);
      }
      const path = upload.storagePath || `queued-uploads/${upload.kind}/${upload.id}`;
      const fileRef = ref(storage, path);
      if (upload.blob) {
        await uploadBytes(fileRef, upload.blob, { contentType: upload.contentType || 'application/octet-stream' });
      } else if (upload.dataUrl) {
        await uploadString(fileRef, upload.dataUrl, 'data_url');
      }
      const url = await getDownloadURL(fileRef);
      // Best-effort patch — leave to caller registration if context.onComplete is provided.
      if (ctx.targetCollection && ctx.targetDocId && ctx.targetField) {
        const { doc, updateDoc } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        await updateDoc(doc(db, ctx.targetCollection, ctx.targetDocId), { [ctx.targetField]: url });
      }
      return;
    }

    throw new Error(`Unknown upload kind: ${upload.kind}`);
  }

  private async processNotificationQueue() {
    const retryable = await pendingNotificationQueue.getRetryable();
    if (retryable.length === 0) return;

    console.log(`SyncService: Draining ${retryable.length} pending notifications.`);
    for (const notif of retryable) {
      try {
        await pendingNotificationQueue.markSending(notif.id);
        await this.replayNotification(notif);
        await pendingNotificationQueue.remove(notif.id);
      } catch (e) {
        console.error(`SyncService: Notification ${notif.id} failed`, e);
        await pendingNotificationQueue.markFailed(notif.id, e);
      }
    }
  }

  private async replayNotification(notif: PendingNotification) {
    if (notif.kind === 'telegram') {
      await notificationService.deliverTelegramDirect(notif.message);
      return;
    }
    // SMS path could plug in a cloud-function call here once the endpoint exists.
    throw new Error(`Unknown notification kind: ${notif.kind}`);
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
