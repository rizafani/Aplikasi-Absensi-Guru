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
  label: string; // e.g. "Jam 1 - 2"
  period: string; // "07:30 - 08:50"
  startTime: string; // "07:30"
  endTime: string; // "08:50"
}

export interface ScheduleItem {
  id: string;
  teacherId: string;
  day: DayOfWeek;
  classRoomId: string;
  subjectId: string;
  timeSlotId: string;
  room?: string;
  notes?: string;
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
}

export type UserRole = 'GUEST' | 'ADMIN' | 'PIKET';

export interface UserSession {
  role: UserRole;
  email?: string;
  name?: string;
  avatar?: string;
  piketName?: string;
}
