import {
  Teacher,
  ClassRoom,
  Subject,
  TimeSlot,
  ScheduleItem,
  AttendanceRecord,
  UserSession,
  SchoolLogos,
  PiketAccount,
  SchoolLocationConfig,
  TeacherFaceProfile,
  SmileCaptureConfig,
  DEFAULT_SMILE_CAPTURE_CONFIG
} from '../types';
import { INITIAL_TEACHERS, INITIAL_CLASSES, INITIAL_SUBJECTS, INITIAL_TIME_SLOTS, INITIAL_SCHEDULES, INITIAL_ATTENDANCE } from '../data/initialData';
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
  SMILE_CAPTURE_CONFIG: 'sman1julok_smile_capture_config_v1',
  FACE_PROFILES: 'sman1julok_teacher_face_profiles_v1',
};

/**
 * Sanitizes attendance records for localStorage storage.
 * Retains up to 100 recent entries with their selfie photos.
 */
function sanitizeAttendanceForStorage(records: AttendanceRecord[]): AttendanceRecord[] {
  if (!Array.isArray(records)) return [];
  return records.slice(0, 100);
}

/**
 * Proactively clean up any corrupted historical attendance entries in localStorage
 */
function initStorageMaintenance(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
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
    return safeGet<TimeSlot[]>(STORAGE_KEYS.TIME_SLOTS, []);
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

  getSmileCaptureConfig(): SmileCaptureConfig {
    const saved = safeGet<Partial<SmileCaptureConfig>>(STORAGE_KEYS.SMILE_CAPTURE_CONFIG, {});
    return {
      enabled: saved.enabled !== undefined ? saved.enabled : DEFAULT_SMILE_CAPTURE_CONFIG.enabled,
      autoCaptureCountdown: typeof saved.autoCaptureCountdown === 'number' ? saved.autoCaptureCountdown : DEFAULT_SMILE_CAPTURE_CONFIG.autoCaptureCountdown,
      sensitivity: saved.sensitivity || DEFAULT_SMILE_CAPTURE_CONFIG.sensitivity,
      requireFaceEnrollment: saved.requireFaceEnrollment !== undefined ? saved.requireFaceEnrollment : DEFAULT_SMILE_CAPTURE_CONFIG.requireFaceEnrollment,
      soundEffect: saved.soundEffect !== undefined ? saved.soundEffect : DEFAULT_SMILE_CAPTURE_CONFIG.soundEffect,
    };
  },
  saveSmileCaptureConfig(config: SmileCaptureConfig): void {
    safeSet(STORAGE_KEYS.SMILE_CAPTURE_CONFIG, config);
  },

  getFaceProfiles(): TeacherFaceProfile[] {
    return safeGet<TeacherFaceProfile[]>(STORAGE_KEYS.FACE_PROFILES, []);
  },
  saveFaceProfiles(profiles: TeacherFaceProfile[]): void {
    safeSet(STORAGE_KEYS.FACE_PROFILES, profiles);
  },
  getFaceProfileByTeacherId(teacherId: string): TeacherFaceProfile | undefined {
    const list = this.getFaceProfiles();
    return list.find((p) => p.teacherId === teacherId && p.status === 'ACTIVE');
  },
  saveFaceProfile(profile: TeacherFaceProfile): void {
    const list = this.getFaceProfiles();
    const index = list.findIndex((p) => p.teacherId === profile.teacherId);
    let updated: TeacherFaceProfile[];
    if (index >= 0) {
      updated = [...list];
      updated[index] = { ...profile, updatedAt: new Date().toISOString() };
    } else {
      updated = [...list, { ...profile, updatedAt: new Date().toISOString() }];
    }
    this.saveFaceProfiles(updated);
  },
  deleteFaceProfile(teacherId: string): void {
    const list = this.getFaceProfiles();
    const filtered = list.filter((p) => p.teacherId !== teacherId);
    this.saveFaceProfiles(filtered);
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
      smileCaptureConfig: this.getSmileCaptureConfig(),
      faceProfiles: this.getFaceProfiles(),
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
      if (data.smileCaptureConfig) this.saveSmileCaptureConfig(data.smileCaptureConfig);
      if (Array.isArray(data.faceProfiles)) this.saveFaceProfiles(data.faceProfiles);
      return true;
    } catch (e) {
      console.error('Failed to import database:', e);
      return false;
    }
  },

  resetToDefaultData(): void {
    this.clearAll();
  },

  clearAll(): void {
    safeSet(STORAGE_KEYS.TEACHERS, []);
    safeSet(STORAGE_KEYS.CLASSES, []);
    safeSet(STORAGE_KEYS.SUBJECTS, []);
    safeSet(STORAGE_KEYS.TIME_SLOTS, []);
    safeSet(STORAGE_KEYS.SCHEDULES, []);
    safeSet(STORAGE_KEYS.ATTENDANCE, []);
    safeSet(STORAGE_KEYS.PIKET_ACCOUNTS, []);
    safeSet(STORAGE_KEYS.FACE_PROFILES, []);
  }
};
