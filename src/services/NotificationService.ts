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
  writeBatch,
  where,
  type QueryConstraint,
  Unsubscribe
} from "firebase/firestore";
import { db, OperationType, handleFirestoreError } from "../lib/firebase";
import { AppNotification } from "../components/common/NotificationModal";
import { settingsService } from "./SettingsService";

export class NotificationService {
  private notifications: AppNotification[] = [];
  private collectionPath = "notifications";
  private unsubscribe: Unsubscribe | null = null;
  private listeners: (() => void)[] = [];

  constructor() {
    // Eager subscription removed. Must call initializeForUser manually.
  }

  public initializeForUser(isAdmin: boolean, employeeId?: string) {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    if (!isAdmin && !employeeId) {
      return;
    }

    const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")];
    
    // Security/Optimization: Only fetch relevant notifications
    if (!isAdmin && employeeId) {
      // Employees get notifications specifically for them OR for all employees OR for everyone
       constraints.push(where('targetRole', 'in', ['employee', 'all']));
    }

    const q = query(collection(db, this.collectionPath), ...constraints);

    this.unsubscribe = onSnapshot(q, (snapshot) => {
      this.notifications = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as AppNotification));
      
      // Further client-side filtering if needed (e.g. specific employeeId)
      if (!isAdmin && employeeId) {
        this.notifications = this.notifications.filter(n => !n.employeeId || n.employeeId === employeeId);
      }

      this.notifyListeners();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, this.collectionPath);
    });
  }

  public stopSubscription() {
     if (this.unsubscribe) {
         this.unsubscribe();
         this.unsubscribe = null;
     }
  }

  private notifyListeners() {
    this.listeners.forEach(l => l());
  }

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

  subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  getAllNotifications() {
    return this.notifications;
  }

  getAdminNotifications() {
    return this.notifications.filter(n => !n.targetRole || n.targetRole === "admin" || n.targetRole === "all");
  }

  getEmployeeNotifications(employeeId: string) {
    return this.notifications.filter(n => {
      if (n.employeeId) return n.employeeId === employeeId;
      return n.targetRole === "employee" || n.targetRole === "all";
    });
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
