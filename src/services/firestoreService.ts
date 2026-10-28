import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  Teacher,
  ClassRoom,
  Subject,
  TimeSlot,
  ScheduleItem,
  AttendanceRecord,
  PiketAccount,
  SchoolLocationConfig
} from '../types';

const COLLECTIONS = {
  TEACHERS: 'teachers',
  CLASSES: 'classes',
  SUBJECTS: 'subjects',
  TIME_SLOTS: 'timeSlots',
  SCHEDULES: 'schedules',
  ATTENDANCE: 'attendance',
  PIKET_ACCOUNTS: 'piketAccounts',
  SETTINGS: 'settings',
};

/**
 * Strips undefined values to prevent Firestore crashes:
 * "Function setDoc() called with invalid data. Unsupported field value: undefined"
 */
export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return '' as unknown as T;
  }
  if (Array.isArray(data)) {
    return data.map((item) => cleanForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (value !== undefined) {
        cleaned[key] = cleanForFirestore(value);
      } else {
        cleaned[key] = '';
      }
    }
    return cleaned as T;
  }
  return data;
}

export const FirestoreService = {
  // Subscribe to real-time updates for all collections across any device
  subscribeToAll(callbacks: {
    onTeachers: (data: Teacher[]) => void;
    onClasses: (data: ClassRoom[]) => void;
    onSubjects: (data: Subject[]) => void;
    onTimeSlots: (data: TimeSlot[]) => void;
    onSchedules: (data: ScheduleItem[]) => void;
    onAttendance: (data: AttendanceRecord[]) => void;
    onPiketAccounts?: (data: PiketAccount[]) => void;
    onLocationConfig?: (config: SchoolLocationConfig) => void;
    onSyncStatus?: (synced: boolean, details?: string) => void;
  }) {
    let initialSyncCount = 0;
    const checkInitialSync = () => {
      initialSyncCount++;
      if (initialSyncCount >= 6 && callbacks.onSyncStatus) {
        callbacks.onSyncStatus(true, 'Cloud Database Terhubung');
      }
    };

    // 1. Teachers
    const unsubTeachers = onSnapshot(
      collection(db, COLLECTIONS.TEACHERS),
      (snapshot) => {
        const list: Teacher[] = [];
        snapshot.forEach((d) => list.push(d.data() as Teacher));
        list.sort((a, b) => a.name.localeCompare(b.name));
        callbacks.onTeachers(list);
        checkInitialSync();
      },
      (error) => {
        console.error('Error listening to teachers:', error);
        callbacks.onSyncStatus?.(false, 'Gagal memuat data guru dari Cloud');
      }
    );

    // 2. Classes
    const unsubClasses = onSnapshot(
      collection(db, COLLECTIONS.CLASSES),
      (snapshot) => {
        const list: ClassRoom[] = [];
        snapshot.forEach((d) => list.push(d.data() as ClassRoom));
        list.sort((a, b) => a.name.localeCompare(b.name));
        callbacks.onClasses(list);
        checkInitialSync();
      },
      (error) => {
        console.error('Error listening to classes:', error);
        callbacks.onSyncStatus?.(false, 'Gagal memuat data kelas dari Cloud');
      }
    );

    // 3. Subjects
    const unsubSubjects = onSnapshot(
      collection(db, COLLECTIONS.SUBJECTS),
      (snapshot) => {
        const list: Subject[] = [];
        snapshot.forEach((d) => list.push(d.data() as Subject));
        list.sort((a, b) => a.name.localeCompare(b.name));
        callbacks.onSubjects(list);
        checkInitialSync();
      },
      (error) => {
        console.error('Error listening to subjects:', error);
        callbacks.onSyncStatus?.(false, 'Gagal memuat data mata pelajaran dari Cloud');
      }
    );

    // 4. TimeSlots
    const unsubTimeSlots = onSnapshot(
      collection(db, COLLECTIONS.TIME_SLOTS),
      (snapshot) => {
        const list: TimeSlot[] = [];
        snapshot.forEach((d) => list.push(d.data() as TimeSlot));
        list.sort((a, b) => a.startTime.localeCompare(b.startTime));
        callbacks.onTimeSlots(list);
        checkInitialSync();
      },
      (error) => {
        console.error('Error listening to time slots:', error);
        callbacks.onSyncStatus?.(false, 'Gagal memuat jam pelajaran dari Cloud');
      }
    );

    // 5. Schedules
    const unsubSchedules = onSnapshot(
      collection(db, COLLECTIONS.SCHEDULES),
      (snapshot) => {
        const list: ScheduleItem[] = [];
        snapshot.forEach((d) => list.push(d.data() as ScheduleItem));
        callbacks.onSchedules(list);
        checkInitialSync();
      },
      (error) => {
        console.error('Error listening to schedules:', error);
        callbacks.onSyncStatus?.(false, 'Gagal memuat jadwal mengajar dari Cloud');
      }
    );

    // 6. Attendance Records
    const unsubAttendance = onSnapshot(
      collection(db, COLLECTIONS.ATTENDANCE),
      (snapshot) => {
        const list: AttendanceRecord[] = [];
        snapshot.forEach((d) => list.push(d.data() as AttendanceRecord));
        list.sort((a, b) => {
          const dateComp = (b.date || '').localeCompare(a.date || '');
          if (dateComp !== 0) return dateComp;
          return (b.timestamp || '').localeCompare(a.timestamp || '');
        });
        callbacks.onAttendance(list);
        checkInitialSync();
      },
      (error) => {
        console.error('Error listening to attendance:', error);
        callbacks.onSyncStatus?.(false, 'Gagal memuat catatan presensi dari Cloud');
      }
    );

    // 7. Piket Accounts
    const unsubPiketAccounts = onSnapshot(
      collection(db, COLLECTIONS.PIKET_ACCOUNTS),
      (snapshot) => {
        const list: PiketAccount[] = [];
        snapshot.forEach((d) => list.push(d.data() as PiketAccount));
        callbacks.onPiketAccounts?.(list);
      },
      (error) => {
        console.error('Error listening to piket accounts:', error);
      }
    );

    // 8. Location Settings
    const unsubLocationConfig = onSnapshot(
      doc(db, COLLECTIONS.SETTINGS, 'schoolLocation'),
      (snapshot) => {
        if (snapshot.exists()) {
          callbacks.onLocationConfig?.(snapshot.data() as SchoolLocationConfig);
        }
      },
      (error) => {
        console.warn('Note: schoolLocation config doc not initialized yet or read error:', error);
      }
    );

    return () => {
      unsubTeachers();
      unsubClasses();
      unsubSubjects();
      unsubTimeSlots();
      unsubSchedules();
      unsubAttendance();
      unsubPiketAccounts();
      unsubLocationConfig();
    };
  },

  // Save / Update School Location Geofence Config
  async saveLocationConfig(config: SchoolLocationConfig): Promise<void> {
    const docRef = doc(db, COLLECTIONS.SETTINGS, 'schoolLocation');
    try {
      await setDoc(docRef, cleanForFirestore(config), { merge: true });
      console.log('School location config synced to Firestore');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${COLLECTIONS.SETTINGS}/schoolLocation`);
    }
  },

  // Save / Update Attendance Record to Cloud
  async saveAttendanceRecord(record: AttendanceRecord): Promise<void> {
    const docRef = doc(db, COLLECTIONS.ATTENDANCE, record.id);
    const cleaned = cleanForFirestore(record);
    try {
      await setDoc(docRef, cleaned, { merge: true });
      console.log('Attendance successfully synced to Firestore:', record.id);
    } catch (err) {
      console.error('Failed to sync attendance to Firestore:', err);
      handleFirestoreError(err, OperationType.WRITE, `${COLLECTIONS.ATTENDANCE}/${record.id}`);
    }
  },

  // Delete Attendance Record from Cloud
  async deleteAttendanceRecord(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.ATTENDANCE, id);
    try {
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${COLLECTIONS.ATTENDANCE}/${id}`);
    }
  },

  // Teacher CRUD
  async saveTeacher(teacher: Teacher): Promise<void> {
    const docRef = doc(db, COLLECTIONS.TEACHERS, teacher.id);
    const cleaned = cleanForFirestore(teacher);
    try {
      await setDoc(docRef, cleaned, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${COLLECTIONS.TEACHERS}/${teacher.id}`);
    }
  },

  async deleteTeacher(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.TEACHERS, id);
    try {
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${COLLECTIONS.TEACHERS}/${id}`);
    }
  },

  async bulkSaveTeachers(teachers: Teacher[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      teachers.forEach((t) => {
        const ref = doc(db, COLLECTIONS.TEACHERS, t.id);
        batch.set(ref, cleanForFirestore(t), { merge: true });
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, COLLECTIONS.TEACHERS);
    }
  },

  // Class CRUD
  async saveClass(cls: ClassRoom): Promise<void> {
    const docRef = doc(db, COLLECTIONS.CLASSES, cls.id);
    try {
      await setDoc(docRef, cleanForFirestore(cls), { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${COLLECTIONS.CLASSES}/${cls.id}`);
    }
  },

  async deleteClass(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.CLASSES, id);
    try {
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${COLLECTIONS.CLASSES}/${id}`);
    }
  },

  async bulkSaveClasses(classes: ClassRoom[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      classes.forEach((c) => {
        const ref = doc(db, COLLECTIONS.CLASSES, c.id);
        batch.set(ref, cleanForFirestore(c), { merge: true });
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, COLLECTIONS.CLASSES);
    }
  },

  // Subject CRUD
  async saveSubject(sub: Subject): Promise<void> {
    const docRef = doc(db, COLLECTIONS.SUBJECTS, sub.id);
    try {
      await setDoc(docRef, cleanForFirestore(sub), { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${COLLECTIONS.SUBJECTS}/${sub.id}`);
    }
  },

  async deleteSubject(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.SUBJECTS, id);
    try {
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${COLLECTIONS.SUBJECTS}/${id}`);
    }
  },

  async bulkSaveSubjects(subjects: Subject[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      subjects.forEach((s) => {
        const ref = doc(db, COLLECTIONS.SUBJECTS, s.id);
        batch.set(ref, cleanForFirestore(s), { merge: true });
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, COLLECTIONS.SUBJECTS);
    }
  },

  // Time Slots
  async saveTimeSlot(slot: TimeSlot): Promise<void> {
    const docRef = doc(db, COLLECTIONS.TIME_SLOTS, slot.id);
    try {
      await setDoc(docRef, cleanForFirestore(slot), { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${COLLECTIONS.TIME_SLOTS}/${slot.id}`);
    }
  },

  async deleteTimeSlot(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.TIME_SLOTS, id);
    try {
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${COLLECTIONS.TIME_SLOTS}/${id}`);
    }
  },

  async bulkSaveTimeSlots(slots: TimeSlot[]): Promise<void> {
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.TIME_SLOTS));
      const batch = writeBatch(db);
      const newIds = new Set(slots.map((s) => s.id));

      snap.forEach((d) => {
        if (!newIds.has(d.id)) {
          batch.delete(d.ref);
        }
      });

      slots.forEach((s) => {
        const ref = doc(db, COLLECTIONS.TIME_SLOTS, s.id);
        batch.set(ref, cleanForFirestore(s), { merge: true });
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, COLLECTIONS.TIME_SLOTS);
    }
  },

  // Schedules
  async saveSchedule(schedule: ScheduleItem): Promise<void> {
    const docRef = doc(db, COLLECTIONS.SCHEDULES, schedule.id);
    try {
      await setDoc(docRef, cleanForFirestore(schedule), { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${COLLECTIONS.SCHEDULES}/${schedule.id}`);
    }
  },

  async deleteSchedule(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.SCHEDULES, id);
    try {
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${COLLECTIONS.SCHEDULES}/${id}`);
    }
  },

  async bulkSaveSchedules(schedules: ScheduleItem[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      schedules.forEach((s) => {
        const ref = doc(db, COLLECTIONS.SCHEDULES, s.id);
        batch.set(ref, cleanForFirestore(s), { merge: true });
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, COLLECTIONS.SCHEDULES);
    }
  },

  // Save / Update Piket Account
  async savePiketAccount(account: PiketAccount): Promise<void> {
    try {
      const ref = doc(db, COLLECTIONS.PIKET_ACCOUNTS, account.id);
      await setDoc(ref, cleanForFirestore(account), { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${COLLECTIONS.PIKET_ACCOUNTS}/${account.id}`);
    }
  },

  async bulkSavePiketAccounts(accounts: PiketAccount[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      accounts.forEach((acc) => {
        const ref = doc(db, COLLECTIONS.PIKET_ACCOUNTS, acc.id);
        batch.set(ref, cleanForFirestore(acc), { merge: true });
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, COLLECTIONS.PIKET_ACCOUNTS);
    }
  },

  async deletePiketAccount(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTIONS.PIKET_ACCOUNTS, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${COLLECTIONS.PIKET_ACCOUNTS}/${id}`);
    }
  },

  // Force fetch all data directly from Firestore
  async fetchAllDirect(): Promise<{
    teachers: Teacher[];
    classes: ClassRoom[];
    subjects: Subject[];
    timeSlots: TimeSlot[];
    schedules: ScheduleItem[];
    attendance: AttendanceRecord[];
    piketAccounts: PiketAccount[];
  }> {
    const [tSnap, cSnap, sSnap, tsSnap, schSnap, aSnap, pSnap] = await Promise.all([
      getDocs(collection(db, COLLECTIONS.TEACHERS)),
      getDocs(collection(db, COLLECTIONS.CLASSES)),
      getDocs(collection(db, COLLECTIONS.SUBJECTS)),
      getDocs(collection(db, COLLECTIONS.TIME_SLOTS)),
      getDocs(collection(db, COLLECTIONS.SCHEDULES)),
      getDocs(collection(db, COLLECTIONS.ATTENDANCE)),
      getDocs(collection(db, COLLECTIONS.PIKET_ACCOUNTS)),
    ]);

    const teachers: Teacher[] = [];
    tSnap.forEach((d) => teachers.push(d.data() as Teacher));

    const classes: ClassRoom[] = [];
    cSnap.forEach((d) => classes.push(d.data() as ClassRoom));

    const subjects: Subject[] = [];
    sSnap.forEach((d) => subjects.push(d.data() as Subject));

    const timeSlots: TimeSlot[] = [];
    tsSnap.forEach((d) => timeSlots.push(d.data() as TimeSlot));

    const schedules: ScheduleItem[] = [];
    schSnap.forEach((d) => schedules.push(d.data() as ScheduleItem));

    const attendance: AttendanceRecord[] = [];
    aSnap.forEach((d) => attendance.push(d.data() as AttendanceRecord));

    const piketAccounts: PiketAccount[] = [];
    pSnap.forEach((d) => piketAccounts.push(d.data() as PiketAccount));

    return { teachers, classes, subjects, timeSlots, schedules, attendance, piketAccounts };
  },
};
