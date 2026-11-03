import {
  Teacher,
  ClassRoom,
  Subject,
  TimeSlot,
  ScheduleItem,
  AttendanceRecord,
  PiketAccount,
  SchoolLocationConfig,
  SchoolLogos,
  SmileCaptureConfig,
  TeacherFaceProfile
} from '../types';
import { Storage } from '../utils/storage';

export interface FullDatabaseState {
  version: number;
  lastUpdated: string;
  school: string;
  teachers: Teacher[];
  classes: ClassRoom[];
  subjects: Subject[];
  timeSlots: TimeSlot[];
  schedules: ScheduleItem[];
  attendance: AttendanceRecord[];
  piketAccounts: PiketAccount[];
  locationConfig: SchoolLocationConfig;
  logos: SchoolLogos;
  smileCaptureConfig: SmileCaptureConfig;
  faceProfiles: TeacherFaceProfile[];
}

class CentralSyncService {
  private currentVersion = 0;
  private sseSource: EventSource | null = null;
  private isConnecting = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private listeners: Array<(db: FullDatabaseState) => void> = [];
  private statusListeners: Array<(connected: boolean, message: string) => void> = [];

  constructor() {
    this.currentVersion = 0;
  }

  public getVersion(): number {
    return this.currentVersion;
  }

  public onDatabaseUpdate(listener: (db: FullDatabaseState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public onConnectionStatus(listener: (connected: boolean, message: string) => void): () => void {
    this.statusListeners.push(listener);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener);
    };
  }

  private notifyStatus(connected: boolean, message: string) {
    this.statusListeners.forEach((fn) => {
      try {
        fn(connected, message);
      } catch (e) {
        console.warn('Status listener error:', e);
      }
    });
  }

  private notifyUpdate(db: FullDatabaseState) {
    this.listeners.forEach((fn) => {
      try {
        fn(db);
      } catch (e) {
        console.warn('DB update listener error:', e);
      }
    });
  }

  /**
   * Fetches the complete database from the central backend.
   * Updates local storage cache for instant offline resilience.
   */
  public async fetchFullDatabase(): Promise<FullDatabaseState | null> {
    try {
      const res = await fetch('/api/db', {
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data: FullDatabaseState = await res.json();
      this.currentVersion = data.version || Date.now();

      // Check if server is currently unseeded/empty but client already has populated data in localStorage
      const isServerEmpty =
        (!data.teachers || data.teachers.length === 0) &&
        (!data.classes || data.classes.length === 0) &&
        (!data.schedules || data.schedules.length === 0);

      const localTeachers = Storage.getTeachers();
      const localClasses = Storage.getClasses();
      const localSchedules = Storage.getSchedules();
      const hasLocalData =
        localTeachers.length > 0 || localClasses.length > 0 || localSchedules.length > 0;

      if (isServerEmpty && hasLocalData) {
        console.log('[CentralSync] Server database is empty while local storage has data. Synchronizing local data to central server...');
        const localDump: Partial<FullDatabaseState> = {
          teachers: localTeachers,
          classes: localClasses,
          subjects: Storage.getSubjects(),
          timeSlots: Storage.getTimeSlots(),
          schedules: localSchedules,
          attendance: Storage.getAttendance(),
          piketAccounts: Storage.getPiketAccounts(),
          faceProfiles: Storage.getFaceProfiles(),
          locationConfig: Storage.getLocationConfig(),
          logos: Storage.getSchoolLogos(),
          smileCaptureConfig: Storage.getSmileCaptureConfig()
        };
        await this.syncFullDatabase(localDump);
        this.notifyStatus(true, 'Tersinkronisasi Real-Time (Semua Perangkat)');
        return {
          version: Date.now(),
          lastUpdated: new Date().toISOString(),
          school: 'SMA NEGERI 1 JULOK',
          ...localDump
        } as FullDatabaseState;
      }

      // Synchronize to local storage for instant cache
      this.saveToLocalCache(data);
      this.notifyStatus(true, 'Tersinkronisasi Real-Time (Semua Perangkat)');
      return data;
    } catch (err) {
      console.warn('[CentralSync] Failed to fetch central database, using local fallback:', err);
      this.notifyStatus(false, 'Mode Lokal (Menghubungkan ke Server Pusat...)');
      return null;
    }
  }

  private saveToLocalCache(data: FullDatabaseState): void {
    try {
      if (Array.isArray(data.teachers)) Storage.saveTeachers(data.teachers);
      if (Array.isArray(data.classes)) Storage.saveClasses(data.classes);
      if (Array.isArray(data.subjects)) Storage.saveSubjects(data.subjects);
      if (Array.isArray(data.timeSlots)) Storage.saveTimeSlots(data.timeSlots);
      if (Array.isArray(data.schedules)) Storage.saveSchedules(data.schedules);
      if (Array.isArray(data.attendance)) Storage.saveAttendance(data.attendance);
      if (Array.isArray(data.piketAccounts)) Storage.savePiketAccounts(data.piketAccounts);
      if (data.locationConfig) Storage.saveLocationConfig(data.locationConfig);
      if (data.logos) Storage.saveSchoolLogos(data.logos);
      if (data.smileCaptureConfig) Storage.saveSmileCaptureConfig(data.smileCaptureConfig);
      if (Array.isArray(data.faceProfiles)) Storage.saveFaceProfiles(data.faceProfiles);
    } catch (e) {
      console.warn('[CentralSync] Error saving to local storage cache:', e);
    }
  }

  /**
   * Initializes real-time SSE listener and polling heartbeat.
   */
  public initRealTimeSync(onUpdateCallback: (db: FullDatabaseState) => void): () => void {
    const unsub = this.onDatabaseUpdate(onUpdateCallback);

    // Initial fetch
    this.fetchFullDatabase().then((db) => {
      if (db) onUpdateCallback(db);
    });

    // Start SSE stream
    this.connectSSE();

    // Start backup polling heartbeat every 4 seconds
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/version', { headers: { 'Cache-Control': 'no-cache' } });
        if (res.ok) {
          const { version } = await res.json();
          if (version && version > this.currentVersion) {
            console.log('[CentralSync] New version detected on server, refreshing:', version);
            const freshDb = await this.fetchFullDatabase();
            if (freshDb) {
              this.notifyUpdate(freshDb);
            }
          }
        }
      } catch {
        // Silent polling failure
      }
    }, 4000);

    return () => {
      unsub();
      if (this.sseSource) {
        this.sseSource.close();
        this.sseSource = null;
      }
      if (this.pollInterval) {
        clearInterval(this.pollInterval);
        this.pollInterval = null;
      }
    };
  }

  private connectSSE() {
    if (typeof window === 'undefined' || !window.EventSource) return;
    if (this.sseSource || this.isConnecting) return;

    this.isConnecting = true;
    try {
      const source = new EventSource('/api/events');
      this.sseSource = source;

      source.onopen = () => {
        this.isConnecting = false;
        this.notifyStatus(true, 'Terhubung Real-Time (Antar HP & Komputer)');
      };

      source.onmessage = async (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload && payload.type === 'db_update') {
            const fresh = await this.fetchFullDatabase();
            if (fresh) {
              this.notifyUpdate(fresh);
            }
          }
        } catch (e) {
          console.warn('[CentralSync] SSE message parse error:', e);
        }
      };

      source.onerror = () => {
        this.isConnecting = false;
        source.close();
        this.sseSource = null;
        this.notifyStatus(false, 'Sinkronisasi Otomatis Terhubung via Polling');
        // Reconnect after 5 seconds
        setTimeout(() => this.connectSSE(), 5000);
      };
    } catch (e) {
      this.isConnecting = false;
      console.warn('[CentralSync] SSE connection failed:', e);
    }
  }

  // --- API MUTATIONS (Instantly sync across all devices) ---

  public async saveAttendance(record: AttendanceRecord): Promise<void> {
    try {
      await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
    } catch (e) {
      console.warn('[CentralSync] Failed to post attendance to server:', e);
    }
  }

  public async deleteAttendance(id: string): Promise<void> {
    try {
      await fetch(`/api/attendance/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('[CentralSync] Failed to delete attendance on server:', e);
    }
  }

  public async saveTeacher(teacher: Teacher): Promise<void> {
    try {
      await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teacher)
      });
    } catch (e) {
      console.warn('[CentralSync] Failed to save teacher on server:', e);
    }
  }

  public async deleteTeacher(id: string): Promise<void> {
    try {
      await fetch(`/api/teachers/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('[CentralSync] Failed to delete teacher on server:', e);
    }
  }

  public async bulkSaveTeachers(teachers: Teacher[]): Promise<void> {
    try {
      await fetch('/api/teachers/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teachers })
      });
    } catch (e) {
      console.warn('[CentralSync] Failed to bulk save teachers on server:', e);
    }
  }

  public async saveClass(cls: ClassRoom): Promise<void> {
    try {
      await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cls)
      });
    } catch (e) {
      console.warn('[CentralSync] Failed to save class on server:', e);
    }
  }

  public async deleteClass(id: string): Promise<void> {
    try {
      await fetch(`/api/classes/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('[CentralSync] Failed to delete class on server:', e);
    }
  }

  public async bulkSaveClasses(classes: ClassRoom[]): Promise<void> {
    try {
      await fetch('/api/classes/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classes })
      });
    } catch (e) {
      console.warn('[CentralSync] Failed to bulk save classes on server:', e);
    }
  }

  public async saveSubject(subject: Subject): Promise<void> {
    try {
      await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subject)
      });
    } catch (e) {
      console.warn('[CentralSync] Failed to save subject on server:', e);
    }
  }

  public async deleteSubject(id: string): Promise<void> {
    try {
      await fetch(`/api/subjects/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('[CentralSync] Failed to delete subject on server:', e);
    }
  }

  public async bulkSaveSubjects(subjects: Subject[]): Promise<void> {
    try {
      await fetch('/api/subjects/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjects })
      });
    } catch (e) {
      console.warn('[CentralSync] Failed to bulk save subjects on server:', e);
    }
  }

  public async saveSchedule(schedule: ScheduleItem): Promise<void> {
    try {
      await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule)
      });
    } catch (e) {
      console.warn('[CentralSync] Failed to save schedule on server:', e);
    }
  }

  public async bulkSaveSchedules(schedules: ScheduleItem[]): Promise<void> {
    try {
      await fetch('/api/schedules/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedules })
      });
    } catch (e) {
      console.warn('[CentralSync] Failed to bulk save schedules on server:', e);
    }
  }

  public async replaceAllSchedules(schedules: ScheduleItem[]): Promise<void> {
    try {
      await fetch('/api/schedules/replace-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedules })
      });
    } catch (e) {
      console.warn('[CentralSync] Failed to replace schedules on server:', e);
    }
  }

  public async deleteSchedule(id: string): Promise<void> {
    try {
      await fetch(`/api/schedules/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('[CentralSync] Failed to delete schedule on server:', e);
    }
  }

  public async saveTimeSlot(slot: TimeSlot): Promise<void> {
    try {
      await fetch('/api/timeslots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slot)
      });
    } catch (e) {
      console.warn('[CentralSync] Failed to save timeslot on server:', e);
    }
  }

  public async deleteTimeSlot(id: string): Promise<void> {
    try {
      await fetch(`/api/timeslots/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('[CentralSync] Failed to delete timeslot on server:', e);
    }
  }

  public async bulkSaveTimeSlots(timeSlots: TimeSlot[]): Promise<void> {
    try {
      await fetch('/api/timeslots/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeSlots })
      });
    } catch (e) {
      console.warn('[CentralSync] Failed to bulk save timeslots on server:', e);
    }
  }

  public async savePiketAccount(account: PiketAccount): Promise<void> {
    try {
      await fetch('/api/piket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account)
      });
    } catch (e) {
      console.warn('[CentralSync] Failed to save piket account on server:', e);
    }
  }

  public async bulkSavePiketAccounts(accounts: PiketAccount[]): Promise<void> {
    try {
      await fetch('/api/piket/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts })
      });
    } catch (e) {
      console.warn('[CentralSync] Failed to bulk save piket accounts on server:', e);
    }
  }

  public async saveLocationConfig(config: SchoolLocationConfig): Promise<void> {
    try {
      await fetch('/api/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
    } catch (e) {
      console.warn('[CentralSync] Failed to save location config on server:', e);
    }
  }

  public async saveLogos(logos: SchoolLogos): Promise<void> {
    try {
      await fetch('/api/logos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logos)
      });
    } catch (e) {
      console.warn('[CentralSync] Failed to save logos on server:', e);
    }
  }

  public async saveSmileConfig(config: SmileCaptureConfig): Promise<void> {
    try {
      await fetch('/api/smile-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
    } catch (e) {
      console.warn('[CentralSync] Failed to save smile config on server:', e);
    }
  }

  public async saveFaceProfile(profile: TeacherFaceProfile): Promise<void> {
    try {
      await fetch('/api/face-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
    } catch (e) {
      console.warn('[CentralSync] Failed to save face profile on server:', e);
    }
  }

  public async deleteFaceProfile(teacherId: string): Promise<void> {
    try {
      await fetch(`/api/face-profiles/${encodeURIComponent(teacherId)}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('[CentralSync] Failed to delete face profile on server:', e);
    }
  }

  public async syncFullDatabase(dump: Partial<FullDatabaseState>): Promise<void> {
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dump)
      });
    } catch (e) {
      console.warn('[CentralSync] Failed to sync full database on server:', e);
    }
  }

  public async clearAllMasterData(): Promise<void> {
    try {
      await fetch('/api/clear-all', { method: 'POST' });
    } catch (e) {
      console.warn('[CentralSync] Failed to clear all master data on server:', e);
    }
  }

  public async resetToDefault(): Promise<void> {
    try {
      await fetch('/api/reset-default', { method: 'POST' });
    } catch (e) {
      console.warn('[CentralSync] Failed to reset default database on server:', e);
    }
  }
}

export const CentralSync = new CentralSyncService();
