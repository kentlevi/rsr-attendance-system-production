import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import { storage } from '../lib/firebase';

class AttendancePhotoService {
  async uploadPhoto(
    base64Data: string,
    employeeId: string,
    action: string,
  ): Promise<string> {
    const timestamp = Date.now();
    const safeAction = action.replace(/\s+/g, '-').toLowerCase();
    const path = `attendance-photos/${employeeId}/${timestamp}-${safeAction}.jpg`;
    const fileRef = ref(storage, path);

    // Assuming base64Data is a Data URL like "data:image/jpeg;base64,..."
    await uploadString(fileRef, base64Data, 'data_url');
    return await getDownloadURL(fileRef);
  }
}

export const attendancePhotoService = new AttendancePhotoService();
