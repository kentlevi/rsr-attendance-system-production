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
import { db, OperationType, handleFirestoreError, logFirestoreError } from "../lib/firebase";
import { AppNotification } from "../components/common/NotificationModal";
import { settingsService } from "./SettingsService";
import { pendingNotificationQueue } from "./PendingNotificationQueue";
import { isOffline } from "../lib/useOnlineStatus";

export class NotificationService {
  private notifications: AppNotification[] = [];
  private collectionPath = "notifications";
  private unsubscribe: Unsubscribe | null = null;
  private listeners: (() => void)[] = [];
  private hasRetried = false;

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
      const retry = this.hasRetried ? undefined : () => {
        this.hasRetried = true;
        this.initializeForUser(isAdmin, employeeId);
      };
      logFirestoreError(error, OperationType.LIST, this.collectionPath, retry);
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

  // Telegram rate-limiting state. Telegram's documented per-chat limit is ~1
  // message/second; bursts get the bot 429'd or even banned. We also de-dup
  // identical messages inside a short window so a button-mash or runaway loop
  // can't flood the bot.
  private telegramLastSentAt = 0;
  private readonly telegramMinIntervalMs = 1100;        // ~1 msg/sec
  private telegramRecent: Map<string, number> = new Map();
  private readonly telegramDedupWindowMs = 60_000;      // drop identical msgs in 60s

  async sendTelegramNotification(message: string) {
    const settings = settingsService.getSettings();
    if (!settings.telegramEnabled || !settings.telegramChatId || !settings.telegramBotToken) {
      return;
    }

    // Drop duplicate messages within the dedup window. Cleans stale entries
    // each call so the map can't grow unbounded.
    const now = Date.now();
    for (const [k, ts] of this.telegramRecent) {
      if (now - ts > this.telegramDedupWindowMs) this.telegramRecent.delete(k);
    }
    if (this.telegramRecent.has(message)) {
      return;
    }
    this.telegramRecent.set(message, now);

    if (isOffline()) {
      await pendingNotificationQueue.enqueue({ kind: 'telegram', message });
      return;
    }

    // Throttle so consecutive sends stay under ~1 msg/sec per chat.
    const delta = now - this.telegramLastSentAt;
    if (delta < this.telegramMinIntervalMs) {
      await new Promise((r) => setTimeout(r, this.telegramMinIntervalMs - delta));
    }
    this.telegramLastSentAt = Date.now();

    try {
      await this.deliverTelegramDirect(message);
    } catch (error) {
      console.error("Failed to send Telegram notification — queuing for retry", error);
      await pendingNotificationQueue.enqueue({ kind: 'telegram', message });
    }
  }

  /** Direct send used by SyncService when replaying the queue. Throws on failure. */
  async deliverTelegramDirect(message: string): Promise<void> {
    const settings = settingsService.getSettings();
    if (!settings.telegramEnabled || !settings.telegramChatId || !settings.telegramBotToken) {
      return;
    }
    const url = `https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: settings.telegramChatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Telegram API error: ${response.status} ${JSON.stringify(errorData)}`);
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
