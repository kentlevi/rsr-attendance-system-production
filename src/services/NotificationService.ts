import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  query, 
  orderBy,
  getDocs,
  writeBatch
} from "firebase/firestore";
import { db, OperationType, handleFirestoreError } from "../lib/firebase";
import { AppNotification } from "../components/common/NotificationModal";
import { settingsService } from "./SettingsService";

export class NotificationService {
  private collectionPath = "notifications";
  private listeners: ((notifications: AppNotification[]) => void)[] = [];

  async sendTelegramNotification(message: string) {
    const settings = settingsService.getSettings();
    if (settings.telegramEnabled && settings.telegramChatId) {
      try {
        console.log(`Telegram notification to ${settings.telegramChatId}: ${message}`);
        // Telegram bot token removed for security
      } catch (error) {
        console.error("Failed to send Telegram notification", error);
      }
    }
  }

  private subscribeFiltered(
    callback: (notifications: AppNotification[]) => void,
    filter: (notification: AppNotification) => boolean,
  ) {
    return this.subscribe((notifications) => {
      callback(notifications.filter(filter));
    });
  }

  private isAdminNotification(notification: AppNotification) {
    return !notification.targetRole || notification.targetRole === "admin" || notification.targetRole === "all";
  }

  private isEmployeeNotification(notification: AppNotification, employeeId: string) {
    if (notification.employeeId) {
      return notification.employeeId === employeeId;
    }

    return notification.targetRole === "employee" || notification.targetRole === "all";
  }

  subscribe(callback: (notifications: AppNotification[]) => void) {
    const q = query(collection(db, this.collectionPath), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as AppNotification));
      callback(notifications);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, this.collectionPath);
    });
  }

  subscribeForAdmin(callback: (notifications: AppNotification[]) => void) {
    return this.subscribeFiltered(callback, (notification) => this.isAdminNotification(notification));
  }

  subscribeForEmployee(employeeId: string, callback: (notifications: AppNotification[]) => void) {
    return this.subscribeFiltered(callback, (notification) => this.isEmployeeNotification(notification, employeeId));
  }

  async addNotification(notification: Omit<AppNotification, "id">) {
    try {
      const data = {
        ...notification,
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, this.collectionPath), data);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, this.collectionPath);
    }
  }

  async markAsRead(id: string) {
    try {
      const docRef = doc(db, this.collectionPath, id);
      await updateDoc(docRef, { isRead: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `${this.collectionPath}/${id}`);
    }
  }

  async markAllAsRead() {
    try {
      const q = query(collection(db, this.collectionPath));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      snapshot.docs.forEach(d => {
        if (!d.data().isRead) {
          batch.update(d.ref, { isRead: true });
        }
      });
      
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, this.collectionPath);
    }
  }

  async clearAll() {
    try {
      const q = query(collection(db, this.collectionPath));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      snapshot.docs.forEach(d => {
        batch.delete(d.ref);
      });
      
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, this.collectionPath);
    }
  }
}

export const notificationService = new NotificationService();
