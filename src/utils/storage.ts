import { Teacher, ClassRoom, Subject, TimeSlot, ScheduleItem, AttendanceRecord, UserSession, SchoolLogos, PiketAccount, SchoolLocationConfig } from '../types';
import { INITIAL_TIME_SLOTS } from '../data/initialData';
import { DEFAULT_SCHOOL_LOCATION } from './geo';

export const DEFAULT_LOGOS: SchoolLogos = {
  acehLogo: '/logo-aceh.svg',
};

const STORAGE_KEYS = {
  TEACHERS: 'sman1julok_teachers_v1',
  CLASSES: 'sman1julok_classes_v1',
  SUBJECTS: 'sman1julok_subjects_v1',
  TIME_SLOTS: 'sman1julok_timeslots_v1',
  SCHEDULES: 'sman1julok_schedules_v1',
  ATTENDANCE: 'sman1julok_attendance_v1',
  PIKET_ACCOUNTS: 'sman1julok_piket_accounts_v1',
  SESSION: 'sman1julok_session_v1',
  LOGOS: 'sman1julok_logos_v2',
  ADMIN_PASSWORD: 'sman1julok_admin_password_v1',
  LOCATION_CONFIG: 'sman1julok_location_config_v1',
  DATABASE_MODE: 'sman1julok_database_mode_v1',
};

/**
 * Sanitizes attendance records for localStorage storage.
 * Strips heavy Base64 photos and retains up to 100 recent entries.
 * Full photos remain stored securely in Google Cloud Firestore and in React component state.
 */
function sanitizeAttendanceForStorage(records: AttendanceRecord[]): AttendanceRecord[] {
  if (!Array.isArray(records)) return [];
  return records.slice(0, 100).map((record) => {
    if (record.photoUrl && (record.photoUrl.startsWith('data:') || record.photoUrl.length > 200)) {
      return { ...record, photoUrl: '' };
    }
    return record;
  });
}

/**
 * Proactively clean up any bloated historical attendance entries in localStorage
 * that may have exceeded or approached the browser's ~5MB storage quota.
 */
function initStorageMaintenance(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    if (raw && (raw.length > 150000 || raw.includes('data:image/'))) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const cleaned = sanitizeAttendanceForStorage(parsed);
          localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(cleaned));
        } else {
          localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
      }
    }
  } catch {
    // Silently ignore if localStorage is unavailable
  }
}

// Run maintenance on module evaluation
initStorageMaintenance();

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[Storage] Error reading ${key} from localStorage, using fallback`, err);
    return fallback;
  }
}

function safeSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err: unknown) {
    const isQuotaError =
      (err instanceof DOMException &&
        (err.name === 'QuotaExceededError' ||
          err.code === 22 ||
          err.code === 1014 ||
          err.name === 'NS_ERROR_DOM_QUOTA_REACHED')) ||
      (typeof err === 'object' && err !== null && 'name' in err && (err as { name: string }).name === 'QuotaExceededError');

    if (isQuotaError) {
      console.warn(`[Storage] LocalStorage quota exceeded when writing ${key}. Initiating recovery...`);
      try {
        if (key === STORAGE_KEYS.ATTENDANCE && Array.isArray(value)) {
          const trimmed = (value as AttendanceRecord[]).slice(0, 30).map((item) => ({
            ...item,
            photoUrl: '',
          }));
          localStorage.setItem(key, JSON.stringify(trimmed));
          return;
        }

        // Evict cached attendance to free up quota for other essential configurations
        localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
        localStorage.setItem(key, JSON.stringify(value));
      } catch (recoveryErr) {
        console.warn(`[Storage] Could not persist ${key} into localStorage after eviction; keeping in-memory.`, recoveryErr);
      }
    } else {
      console.warn(`[Storage] Warning writing ${key} to localStorage:`, err);
    }
  }
}

export const Storage = {
  getTeachers(): Teacher[] {
    return safeGet<Teacher[]>(STORAGE_KEYS.TEACHERS, []);
  },
  saveTeachers(data: Teacher[]): void {
    safeSet(STORAGE_KEYS.TEACHERS, data);
  },

  getClasses(): ClassRoom[] {
    return safeGet<ClassRoom[]>(STORAGE_KEYS.CLASSES, []);
  },
  saveClasses(data: ClassRoom[]): void {
    safeSet(STORAGE_KEYS.CLASSES, data);
  },

  getSubjects(): Subject[] {
    return safeGet<Subject[]>(STORAGE_KEYS.SUBJECTS, []);
  },
  saveSubjects(data: Subject[]): void {
    safeSet(STORAGE_KEYS.SUBJECTS, data);
  },

  getTimeSlots(): TimeSlot[] {
    const list = safeGet<TimeSlot[]>(STORAGE_KEYS.TIME_SLOTS, []);
    if (!list || list.length === 0) {
      safeSet(STORAGE_KEYS.TIME_SLOTS, INITIAL_TIME_SLOTS);
      return INITIAL_TIME_SLOTS;
    }
    return list;
  },
  saveTimeSlots(data: TimeSlot[]): void {
    safeSet(STORAGE_KEYS.TIME_SLOTS, data);
  },

  getSchedules(): ScheduleItem[] {
    return safeGet<ScheduleItem[]>(STORAGE_KEYS.SCHEDULES, []);
  },
  saveSchedules(data: ScheduleItem[]): void {
    safeSet(STORAGE_KEYS.SCHEDULES, data);
  },

  getAttendance(): AttendanceRecord[] {
    return safeGet<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, []);
  },
  saveAttendance(data: AttendanceRecord[]): void {
    const sanitized = sanitizeAttendanceForStorage(data);
    safeSet(STORAGE_KEYS.ATTENDANCE, sanitized);
  },

  getPiketAccounts(): PiketAccount[] {
    return safeGet<PiketAccount[]>(STORAGE_KEYS.PIKET_ACCOUNTS, []);
  },
  savePiketAccounts(data: PiketAccount[]): void {
    safeSet(STORAGE_KEYS.PIKET_ACCOUNTS, data);
  },

  getSession(): UserSession {
    return safeGet<UserSession>(STORAGE_KEYS.SESSION, { role: 'GUEST' });
  },
  saveSession(session: UserSession): void {
    safeSet(STORAGE_KEYS.SESSION, session);
  },

  clearSession(): void {
    safeSet(STORAGE_KEYS.SESSION, { role: 'GUEST' });
  },

  getSchoolLogos(): SchoolLogos {
    const saved = safeGet<Partial<SchoolLogos>>(STORAGE_KEYS.LOGOS, {});
    return {
      acehLogo: saved.acehLogo || DEFAULT_LOGOS.acehLogo,
    };
  },

  saveSchoolLogos(logos: SchoolLogos): void {
    safeSet(STORAGE_KEYS.LOGOS, logos);
  },

  getAdminPassword(): string {
    return safeGet<string>(STORAGE_KEYS.ADMIN_PASSWORD, 'Kutabinjei88*');
  },
  saveAdminPassword(password: string): void {
    safeSet(STORAGE_KEYS.ADMIN_PASSWORD, password);
  },

  getLocationConfig(): SchoolLocationConfig {
    const saved = safeGet<Partial<SchoolLocationConfig>>(STORAGE_KEYS.LOCATION_CONFIG, {});
    return {
      schoolName: saved.schoolName || DEFAULT_SCHOOL_LOCATION.schoolName,
      address: saved.address || DEFAULT_SCHOOL_LOCATION.address,
      latitude: typeof saved.latitude === 'number' ? saved.latitude : DEFAULT_SCHOOL_LOCATION.latitude,
      longitude: typeof saved.longitude === 'number' ? saved.longitude : DEFAULT_SCHOOL_LOCATION.longitude,
      radiusMeters: typeof saved.radiusMeters === 'number' ? saved.radiusMeters : DEFAULT_SCHOOL_LOCATION.radiusMeters,
      strictValidation: saved.strictValidation !== undefined ? saved.strictValidation : DEFAULT_SCHOOL_LOCATION.strictValidation,
    };
  },
  saveLocationConfig(config: SchoolLocationConfig): void {
    safeSet(STORAGE_KEYS.LOCATION_CONFIG, config);
  },

  getDatabaseMode(): 'direct' | 'cloud' {
    return safeGet<'direct' | 'cloud'>(STORAGE_KEYS.DATABASE_MODE, 'direct');
  },
  saveDatabaseMode(mode: 'direct' | 'cloud'): void {
    safeSet(STORAGE_KEYS.DATABASE_MODE, mode);
  },

  exportFullDatabase(): string {
    const dump = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      school: 'SMA Negeri 1 Julok',
      teachers: this.getTeachers(),
      classes: this.getClasses(),
      subjects: this.getSubjects(),
      timeSlots: this.getTimeSlots(),
      schedules: this.getSchedules(),
      attendance: this.getAttendance(),
      piketAccounts: this.getPiketAccounts(),
      locationConfig: this.getLocationConfig(),
      logos: this.getSchoolLogos(),
    };
    return JSON.stringify(dump, null, 2);
  },

  importFullDatabase(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.teachers)) this.saveTeachers(data.teachers);
      if (Array.isArray(data.classes)) this.saveClasses(data.classes);
      if (Array.isArray(data.subjects)) this.saveSubjects(data.subjects);
      if (Array.isArray(data.timeSlots)) this.saveTimeSlots(data.timeSlots);
      if (Array.isArray(data.schedules)) this.saveSchedules(data.schedules);
      if (Array.isArray(data.attendance)) this.saveAttendance(data.attendance);
      if (Array.isArray(data.piketAccounts)) this.savePiketAccounts(data.piketAccounts);
      if (data.locationConfig) this.saveLocationConfig(data.locationConfig);
      if (data.logos) this.saveSchoolLogos(data.logos);
      return true;
    } catch (e) {
      console.error('Failed to import database:', e);
      return false;
    }
  },

  clearAll(): void {
    safeSet(STORAGE_KEYS.TEACHERS, []);
    safeSet(STORAGE_KEYS.CLASSES, []);
    safeSet(STORAGE_KEYS.SUBJECTS, []);
    safeSet(STORAGE_KEYS.TIME_SLOTS, []);
    safeSet(STORAGE_KEYS.SCHEDULES, []);
    safeSet(STORAGE_KEYS.ATTENDANCE, []);
  }
};
