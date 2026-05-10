
export interface QuotaUsage {
  reads: number;
  writes: number;
  deletes: number;
  lastReset: string;
}

class QuotaService {
  private usage: QuotaUsage;
  private listeners: (() => void)[] = [];

  constructor() {
    this.usage = this.loadUsage();
    this.checkReset();
  }

  private loadUsage(): QuotaUsage {
    if (typeof window === 'undefined') {
      return {
        reads: 0,
        writes: 0,
        deletes: 0,
        lastReset: new Date().toISOString().slice(0, 10)
      };
    }

    const saved = localStorage.getItem('rsr_quota_usage');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("QuotaService: Failed to parse usage", e);
      }
    }
    return {
      reads: 0,
      writes: 0,
      deletes: 0,
      lastReset: new Date().toISOString().slice(0, 10)
    };
  }

  private saveUsage() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('rsr_quota_usage', JSON.stringify(this.usage));
    }
    this.notifyListeners();
  }

  private checkReset() {
    const today = new Date().toISOString().slice(0, 10);
    if (this.usage.lastReset !== today) {
      this.usage = {
        reads: 0,
        writes: 0,
        deletes: 0,
        lastReset: today
      };
      this.saveUsage();
    }
  }

  private notifyListeners() {
    this.listeners.forEach(l => l());
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  recordRead(count = 1) {
    this.checkReset();
    this.usage.reads += count;
    this.saveUsage();
  }

  recordWrite(count = 1) {
    this.checkReset();
    this.usage.writes += count;
    this.saveUsage();
  }

  recordDelete(count = 1) {
    this.checkReset();
    this.usage.deletes += count;
    this.saveUsage();
  }

  getUsage(): QuotaUsage {
    this.checkReset();
    return { ...this.usage };
  }

  getLimits() {
    return {
      reads: 50000,
      writes: 20000,
      deletes: 20000,
      storageMB: 1024
    };
  }

  getHealthStatus() {
    const limits = this.getLimits();
    const thresholds = {
      reads: this.usage.reads / limits.reads,
      writes: this.usage.writes / limits.writes,
      deletes: this.usage.deletes / limits.deletes,
    };

    const isWarning = Object.values(thresholds).some(t => t >= 0.7);
    const isCritical = Object.values(thresholds).some(t => t >= 0.9);

    return {
      thresholds,
      isWarning,
      isCritical,
      summary: isCritical ? "Critical" : isWarning ? "Warning" : "Healthy"
    };
  }
}

export const quotaService = new QuotaService();
