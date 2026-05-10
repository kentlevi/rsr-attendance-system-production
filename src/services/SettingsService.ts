import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot,
  Unsubscribe
} from "firebase/firestore";
import { db, OperationType, handleFirestoreError } from "../lib/firebase";

export interface SiteCoordinate {
  lat: number;
  lng: number;
  radius: number;
}

export interface CustomShift {
  id: string;
  name: string;
  startTime: string; // '22:00'
  endTime: string; // '07:00'
  gracePeriodMins: number; // 10
  isNightShift: boolean; // enables night diff calc
  nightDifferentialRate?: number; // 0.10 for 10%
}

export interface SystemSettings {
  activeSite: string;
  sites: string[];
  siteCoordinates?: Record<string, SiteCoordinate>;
  shiftTemplates?: CustomShift[];
  dailyAllowance: number;
  otAllowance: number;
  awaySiteAllowance: number;
  awaySiteAllowanceRule: string;
  shiftStartTime: string;
  shiftEndTime: string;
  gracePeriodMins: number;
  lunchBreakStart: string;
  lunchBreakEnd: string;
  pmBreakStart: string;
  pmBreakEnd: string;
  autoTimeoutRule: string;
  smsEnabled: boolean;
  senderName: string;
  adminMobile: string;
  notificationGroup: string;
  telegramEnabled: boolean;
  telegramChatId: string;
  attendancePhotoUploadEnabled?: boolean;
  cloudRetentionDays?: number;
  photoRetentionDays?: number;
  logoDataUrl?: string;
}

const defaultSettings: SystemSettings = {
  activeSite: "Head Office",
  sites: ["Head Office", "Site A", "Site B"],
  shiftTemplates: [],
  dailyAllowance: 150.00,
  otAllowance: 75.00,
  awaySiteAllowance: 200.00,
  awaySiteAllowanceRule: "Apply when employee is assigned outside active site",
  shiftStartTime: "08:00",
  shiftEndTime: "17:00",
  gracePeriodMins: 10,
  lunchBreakStart: "12:00",
  lunchBreakEnd: "13:00",
  pmBreakStart: "15:00",
  pmBreakEnd: "15:15",
  autoTimeoutRule: "Out automatically after shift end time + grace period",
  smsEnabled: true,
  senderName: "RSR-ATTEND",
  adminMobile: "+63 917 123 4567",
  notificationGroup: "Attendance Alerts",
  telegramEnabled: false,
  telegramChatId: "",
  attendancePhotoUploadEnabled: false,
  cloudRetentionDays: 90,
  photoRetentionDays: 30,
};

export class SettingsService {
  private settings: SystemSettings;
  private listeners: ((settings: SystemSettings) => void)[] = [];
  private docPath = "settings/config";
  private unsubscribe: Unsubscribe | null = null;

  constructor() {
    this.settings = this.loadLocalSettings();
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

    this.unsubscribe = onSnapshot(doc(db, this.docPath), (snapshot) => {
      if (snapshot.exists()) {
        this.settings = { ...defaultSettings, ...snapshot.data() as SystemSettings };
        localStorage.setItem('rsr_settings', JSON.stringify(this.settings));
        this.notifyListeners();
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, this.docPath);
    });
  }

  public stopSubscription() {
     if (this.unsubscribe) {
         this.unsubscribe();
         this.unsubscribe = null;
     }
  }

  private loadLocalSettings(): SystemSettings {
    const stored = localStorage.getItem('rsr_settings');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return { ...defaultSettings, ...parsed };
      } catch (e) {
        return { ...defaultSettings };
      }
    }
    return { ...defaultSettings };
  }

  async fetchSettings(): Promise<SystemSettings> {
    try {
      const docSnap = await getDoc(doc(db, this.docPath));
      if (docSnap.exists()) {
        this.settings = { ...defaultSettings, ...docSnap.data() as SystemSettings };
        localStorage.setItem('rsr_settings', JSON.stringify(this.settings));
        this.notifyListeners();
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, this.docPath);
    }
    return this.settings;
  }

  getSettings(): SystemSettings {
    return { ...this.settings };
  }

  async updateSettings(updates: Partial<SystemSettings>): Promise<void> {
    const oldSettings = this.settings;
    this.settings = { ...this.settings, ...updates };
    this.notifyListeners();

    try {
      await setDoc(doc(db, this.docPath), this.settings, { merge: true });
      localStorage.setItem('rsr_settings', JSON.stringify(this.settings));
    } catch (e) {
      this.settings = oldSettings;
      this.notifyListeners();
      handleFirestoreError(e, OperationType.UPDATE, this.docPath);
    }
  }

  subscribe(listener: (settings: SystemSettings) => void): () => void {
    this.listeners.push(listener);
    listener(this.settings);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l(this.settings));
  }
}

export const settingsService = new SettingsService();
