import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { localUploadQueue } from './LocalUploadQueue';
import { isOffline } from '../lib/useOnlineStatus';

class AttendancePhotoService {
  /**
   * Uploads a base64 attendance photo to Firebase Storage.
   * Returns the download URL on success.
   * If offline (or upload throws), queues the upload and returns null.
   * Callers must tolerate a null return value (photo will be attached later by SyncService).
   */
  async uploadPhoto(
    base64Data: string,
    employeeId: string,
    action: string,
  ): Promise<string | null> {
    if (isOffline()) {
      await this.queueForLater(base64Data, employeeId, action);
      return null;
    }
    try {
      return await this.uploadDirect(base64Data, employeeId, action);
    } catch (e) {
      console.warn('Photo upload failed, queueing for retry.', e);
      await this.queueForLater(base64Data, employeeId, action, e);
      return null;
    }
  }

  /** Internal direct upload — bypasses the queue. Used by SyncService when replaying. */
  async uploadDirect(
    base64Data: string,
    employeeId: string,
    action: string,
  ): Promise<string> {
    const timestamp = Date.now();
    const safeAction = action.replace(/\s+/g, '-').toLowerCase();
    const path = `attendance-photos/${employeeId}/${timestamp}-${safeAction}.jpg`;
    const fileRef = ref(storage, path);
    await uploadString(fileRef, base64Data, 'data_url');
    return await getDownloadURL(fileRef);
  }

  private async queueForLater(
    base64Data: string,
    employeeId: string,
    action: string,
    error?: unknown,
  ): Promise<void> {
    try {
      await localUploadQueue.enqueue({
        kind: 'attendance-photo',
        dataUrl: base64Data,
        context: {
          employeeId,
          action,
          // logId is populated by the caller after the log is created
          queuedAt: new Date().toISOString(),
          reason: error instanceof Error ? error.message : (error ? String(error) : 'offline'),
        },
      });
    } catch (e) {
      console.error('Failed to queue attendance photo for later upload:', e);
    }
  }
}

export const attendancePhotoService = new AttendancePhotoService();
