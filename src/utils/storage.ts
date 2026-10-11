import { Teacher, ClassRoom, Subject, TimeSlot, ScheduleItem, AttendanceRecord, UserSession, SchoolLogos, PiketAccount } from '../types';
import { INITIAL_TIME_SLOTS } from '../data/initialData';

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
};

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${key} from localStorage`, err);
    return fallback;
  }
}

function safeSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error writing ${key} to localStorage`, err);
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
    // Ensure time slots are not paired (e.g. no "Jam 1-2" or "1 - 2")
    const hasPaired = list.some((slot) => /\d+\s*[-–/]\s*\d+/.test(slot.label));
    if (list.length === 0 || hasPaired) {
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
    safeSet(STORAGE_KEYS.ATTENDANCE, data);
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

  clearAll(): void {
    safeSet(STORAGE_KEYS.TEACHERS, []);
    safeSet(STORAGE_KEYS.CLASSES, []);
    safeSet(STORAGE_KEYS.SUBJECTS, []);
    safeSet(STORAGE_KEYS.TIME_SLOTS, []);
    safeSet(STORAGE_KEYS.SCHEDULES, []);
    safeSet(STORAGE_KEYS.ATTENDANCE, []);
  }
};
