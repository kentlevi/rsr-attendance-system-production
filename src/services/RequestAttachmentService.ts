import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { RequestAttachment } from '../models/RequestAttachment';
import { localUploadQueue } from './LocalUploadQueue';
import { isOffline } from '../lib/useOnlineStatus';

type RequestType = 'leave' | 'undertime';

const sanitizeFileName = (name: string) =>
  name
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120);

class RequestAttachmentService {
  async uploadRequestAttachment(
    file: File,
    employeeId: string,
    requestType: RequestType,
  ): Promise<RequestAttachment> {
    const timestamp = Date.now();
    const safeName = sanitizeFileName(file.name) || 'attachment';
    const path = `request-attachments/${employeeId}/${requestType}/${timestamp}-${safeName}`;

    if (isOffline()) {
      await this.queue(file, path, employeeId, requestType);
      return this.localPlaceholder(file, path);
    }

    try {
      const fileRef = ref(storage, path);
      await uploadBytes(fileRef, file, {
        contentType: file.type || 'application/octet-stream',
      });
      const url = await getDownloadURL(fileRef);
      return {
        name: file.name,
        size: file.size,
        type: file.type,
        path,
        url,
        uploadedAt: new Date().toISOString(),
      };
    } catch (e) {
      console.warn('Request attachment upload failed, queueing for retry.', e);
      await this.queue(file, path, employeeId, requestType, e);
      return this.localPlaceholder(file, path);
    }
  }

  private async queue(
    file: File,
    path: string,
    employeeId: string,
    requestType: RequestType,
    error?: unknown,
  ) {
    try {
      await localUploadQueue.enqueue({
        kind: 'request-attachment',
        blob: file,
        fileName: file.name,
        contentType: file.type,
        storagePath: path,
        context: {
          employeeId,
          requestType,
          size: file.size,
          queuedAt: new Date().toISOString(),
          reason: error instanceof Error ? error.message : (error ? String(error) : 'offline'),
        },
      });
    } catch (e) {
      console.error('Failed to queue request attachment for later upload:', e);
    }
  }

  /** Returns a placeholder attachment whose URL is a local blob URL. The real URL is patched in by SyncService later. */
  private localPlaceholder(file: File, path: string): RequestAttachment {
    let url = '';
    try {
      url = URL.createObjectURL(file);
    } catch {
      // ignore — placeholder URL may not be available in some environments
    }
    return {
      name: file.name,
      size: file.size,
      type: file.type,
      path,
      url,
      uploadedAt: new Date().toISOString(),
    };
  }
}

export const requestAttachmentService = new RequestAttachmentService();
