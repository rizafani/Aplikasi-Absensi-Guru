import { Teacher, ClassRoom, Subject, TimeSlot, ScheduleItem, AttendanceRecord, UserSession } from '../types';
import {
  INITIAL_TEACHERS,
  INITIAL_CLASSES,
  INITIAL_SUBJECTS,
  INITIAL_TIME_SLOTS,
  INITIAL_SCHEDULES,
  INITIAL_ATTENDANCE
} from '../data/initialData';

const STORAGE_KEYS = {
  TEACHERS: 'sman1julok_teachers_v1',
  CLASSES: 'sman1julok_classes_v1',
  SUBJECTS: 'sman1julok_subjects_v1',
  TIME_SLOTS: 'sman1julok_timeslots_v1',
  SCHEDULES: 'sman1julok_schedules_v1',
  ATTENDANCE: 'sman1julok_attendance_v1',
  SESSION: 'sman1julok_session_v1',
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
    return safeGet<Teacher[]>(STORAGE_KEYS.TEACHERS, INITIAL_TEACHERS);
  },
  saveTeachers(data: Teacher[]): void {
    safeSet(STORAGE_KEYS.TEACHERS, data);
  },

  getClasses(): ClassRoom[] {
    return safeGet<ClassRoom[]>(STORAGE_KEYS.CLASSES, INITIAL_CLASSES);
  },
  saveClasses(data: ClassRoom[]): void {
    safeSet(STORAGE_KEYS.CLASSES, data);
  },

  getSubjects(): Subject[] {
    return safeGet<Subject[]>(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
  },
  saveSubjects(data: Subject[]): void {
    safeSet(STORAGE_KEYS.SUBJECTS, data);
  },

  getTimeSlots(): TimeSlot[] {
    return safeGet<TimeSlot[]>(STORAGE_KEYS.TIME_SLOTS, INITIAL_TIME_SLOTS);
  },
  saveTimeSlots(data: TimeSlot[]): void {
    safeSet(STORAGE_KEYS.TIME_SLOTS, data);
  },

  getSchedules(): ScheduleItem[] {
    return safeGet<ScheduleItem[]>(STORAGE_KEYS.SCHEDULES, INITIAL_SCHEDULES);
  },
  saveSchedules(data: ScheduleItem[]): void {
    safeSet(STORAGE_KEYS.SCHEDULES, data);
  },

  getAttendance(): AttendanceRecord[] {
    return safeGet<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, INITIAL_ATTENDANCE);
  },
  saveAttendance(data: AttendanceRecord[]): void {
    safeSet(STORAGE_KEYS.ATTENDANCE, data);
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

  resetAllToDefault(): void {
    safeSet(STORAGE_KEYS.TEACHERS, INITIAL_TEACHERS);
    safeSet(STORAGE_KEYS.CLASSES, INITIAL_CLASSES);
    safeSet(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
    safeSet(STORAGE_KEYS.TIME_SLOTS, INITIAL_TIME_SLOTS);
    safeSet(STORAGE_KEYS.SCHEDULES, INITIAL_SCHEDULES);
    safeSet(STORAGE_KEYS.ATTENDANCE, INITIAL_ATTENDANCE);
    safeSet(STORAGE_KEYS.SESSION, { role: 'GUEST' });
  }
};
