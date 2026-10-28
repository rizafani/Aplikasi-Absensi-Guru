export type DayOfWeek = 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu';

export type AttendanceStatus = 'HADIR' | 'SAKIT' | 'IZIN' | 'DINAS_LUAR' | 'ALPA';

export interface Teacher {
  id: string;
  nip: string;
  name: string;
  gender: 'L' | 'P';
  phone?: string;
  email?: string;
  status: 'Aktif' | 'Nonaktif';
}

export interface ClassRoom {
  id: string;
  name: string; // e.g. "X-1", "XI MIPA 1", "XII IPS 2"
  grade: 'X' | 'XI' | 'XII';
  major?: 'MIPA' | 'IPS' | 'Umum';
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  category?: 'Wajib' | 'Peminatan' | 'Muatan Lokal';
}

export interface TimeSlot {
  id: string;
  label: string; // e.g. "Jam 1", "Jam 2" (bukan berpasang)
  period: string; // "07:30 - 08:15"
  startTime: string; // "07:30"
  endTime: string; // "08:15"
}

export interface ScheduleItem {
  id: string;
  teacherId: string;
  day: DayOfWeek;
  classRoomId: string;
  subjectId: string;
  timeSlotId: string; // primary or first time slot
  timeSlotIds?: string[]; // multiple selected individual time slots, kept as one schedule
  room?: string;
  notes?: string;
}

export type LocationValidationStatus = 'VALID' | 'OUT_OF_RANGE' | 'GPS_DISABLED' | 'UNVERIFIED';

export interface SchoolLocationConfig {
  schoolName: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  strictValidation: boolean;
}

export interface AttendanceRecord {
  id: string;
  teacherId: string;
  teacherName: string;
  nip: string;
  date: string; // YYYY-MM-DD
  dayName: DayOfWeek;
  classRoomName: string;
  subjectName: string;
  timeSlotName: string;
  status: AttendanceStatus;
  photoUrl: string; // base64 or placeholder
  timestamp: string; // ISO string or HH:mm:ss
  notes?: string;
  topic?: string; // Materi pembelajaran
  recordedBy: 'MANDIRI' | 'GURU_PIKET' | 'ADMIN';
  piketOfficerName?: string;
  piketNotes?: string;
  substituteTeacherName?: string;
  // GPS Location Verification
  latitude?: number;
  longitude?: number;
  accuracy?: number; // Akurasi GPS dalam meter
  distanceMeters?: number; // Jarak dari pusat SMAN 1 Julok (meter)
  locationStatus?: LocationValidationStatus;
  locationAddress?: string;
}

export type UserRole = 'GUEST' | 'ADMIN' | 'PIKET';

export interface UserSession {
  role: UserRole;
  email?: string;
  name?: string;
  avatar?: string;
  piketName?: string;
  teacherId?: string;
  username?: string;
}

export interface PiketAccount {
  id: string; // e.g. "piket-<teacherId>"
  teacherId: string;
  teacherName: string;
  nip: string;
  username: string; // auto-generated from teacher name (lowercase, no titles)
  password: string; // auto-generated default password or customized
  assignedDays?: DayOfWeek[]; // days assigned for piket duty e.g. ['Senin']
  isActive: boolean;
  notes?: string;
  updatedAt?: string;
}

export interface SchoolLogos {
  acehLogo: string;
  schoolLogo?: string;
}
