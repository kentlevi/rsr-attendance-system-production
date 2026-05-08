import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { RequestAttachment } from '../models/RequestAttachment';

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
  }
}

export const requestAttachmentService = new RequestAttachmentService();

