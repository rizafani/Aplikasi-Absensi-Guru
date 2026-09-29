import { Teacher, ClassRoom, Subject, TimeSlot, ScheduleItem, AttendanceRecord, DayOfWeek } from '../types';

export const INITIAL_TEACHERS: Teacher[] = [
  { id: 't-1', nip: '19750812 200212 1 002', name: 'Riza Fani, S.Pd., M.Pd.', gender: 'L', email: 'rizafani@gmail.com', phone: '081269001234', status: 'Aktif' },
  { id: 't-2', nip: '19710315 199801 1 001', name: 'Drs. Muhammad Yusuf', gender: 'L', email: 'myusuf@sman1julok.sch.id', phone: '081370002233', status: 'Aktif' },
  { id: 't-3', nip: '19820520 200604 2 015', name: 'Nurul Hayati, S.Pd.', gender: 'P', email: 'nurulhayati@sman1julok.sch.id', phone: '085260003344', status: 'Aktif' },
  { id: 't-4', nip: '19801104 200801 2 008', name: 'Cut Mutia, S.Pd.', gender: 'P', email: 'cutmutia@sman1julok.sch.id', phone: '085361004455', status: 'Aktif' },
  { id: 't-5', nip: '19850410 201001 1 021', name: 'Teuku Syahrul, M.Pd.', gender: 'L', email: 'tsyahrul@sman1julok.sch.id', phone: '081263005566', status: 'Aktif' },
  { id: 't-6', nip: '19880918 201101 1 007', name: 'Fauzi, S.Pd.I.', gender: 'L', email: 'fauzi@sman1julok.sch.id', phone: '082164006677', status: 'Aktif' },
  { id: 't-7', nip: '19860228 201003 2 012', name: 'Sri Wahyuni, S.Si.', gender: 'P', email: 'sriwahyuni@sman1julok.sch.id', phone: '085275007788', status: 'Aktif' },
  { id: 't-8', nip: '19920714 201902 1 003', name: 'Rizki Ramadhan, S.Pd.', gender: 'L', email: 'rizkiram@sman1julok.sch.id', phone: '082366008899', status: 'Aktif' },
  { id: 't-9', nip: '19840101 200902 2 006', name: 'Zubaidah, S.Pd.', gender: 'P', email: 'zubaidah@sman1julok.sch.id', phone: '081362009900', status: 'Aktif' },
  { id: 't-10', nip: '19901225 201503 1 004', name: 'Iskandar Muda, S.Or.', gender: 'L', email: 'iskandar@sman1julok.sch.id', phone: '085261112233', status: 'Aktif' },
  { id: 't-11', nip: '19890616 201402 2 005', name: 'Mariati, S.Pd.', gender: 'P', email: 'mariati@sman1julok.sch.id', phone: '081267889900', status: 'Aktif' },
  { id: 't-12', nip: '19930310 202012 1 008', name: 'Ibrahim Khalil, S.Kom.', gender: 'L', email: 'ibrahimk@sman1julok.sch.id', phone: '085299887766', status: 'Aktif' }
];

export const INITIAL_CLASSES: ClassRoom[] = [
  { id: 'c-1', name: 'X-1', grade: 'X', major: 'Umum' },
  { id: 'c-2', name: 'X-2', grade: 'X', major: 'Umum' },
  { id: 'c-3', name: 'X-3', grade: 'X', major: 'Umum' },
  { id: 'c-4', name: 'XI MIPA 1', grade: 'XI', major: 'MIPA' },
  { id: 'c-5', name: 'XI MIPA 2', grade: 'XI', major: 'MIPA' },
  { id: 'c-6', name: 'XI IPS 1', grade: 'XI', major: 'IPS' },
  { id: 'c-7', name: 'XII MIPA 1', grade: 'XII', major: 'MIPA' },
  { id: 'c-8', name: 'XII MIPA 2', grade: 'XII', major: 'MIPA' },
  { id: 'c-9', name: 'XII IPS 1', grade: 'XII', major: 'IPS' }
];

export const INITIAL_SUBJECTS: Subject[] = [
  { id: 's-1', code: 'MAT-W', name: 'Matematika Wajib', category: 'Wajib' },
  { id: 's-2', code: 'MAT-P', name: 'Matematika Peminatan', category: 'Peminatan' },
  { id: 's-3', code: 'BIN', name: 'Bahasa Indonesia', category: 'Wajib' },
  { id: 's-4', code: 'BIG', name: 'Bahasa Inggris', category: 'Wajib' },
  { id: 's-5', code: 'FIS', name: 'Fisika', category: 'Peminatan' },
  { id: 's-6', code: 'KIM', name: 'Kimia', category: 'Peminatan' },
  { id: 's-7', code: 'BIO', name: 'Biologi', category: 'Peminatan' },
  { id: 's-8', code: 'PAI', name: 'Pendidikan Agama Islam', category: 'Wajib' },
  { id: 's-9', code: 'SEJ', name: 'Sejarah Indonesia', category: 'Wajib' },
  { id: 's-10', code: 'PJK', name: 'Pendidikan Jasmani & Olahraga', category: 'Wajib' },
  { id: 's-11', code: 'INF', name: 'Informatika', category: 'Wajib' },
  { id: 's-12', code: 'EKO', name: 'Ekonomi', category: 'Peminatan' }
];

export const INITIAL_TIME_SLOTS: TimeSlot[] = [
  { id: 'slot-1', label: 'Jam Ke 1 - 2', period: '07:30 - 08:50', startTime: '07:30', endTime: '08:50' },
  { id: 'slot-2', label: 'Jam Ke 3 - 4', period: '08:50 - 10:10', startTime: '08:50', endTime: '10:10' },
  { id: 'slot-3', label: 'Jam Ke 5 - 6', period: '10:30 - 11:50', startTime: '10:30', endTime: '11:50' },
  { id: 'slot-4', label: 'Jam Ke 7 - 8', period: '12:30 - 13:50', startTime: '12:30', endTime: '13:50' },
  { id: 'slot-5', label: 'Jam Ke 9 - 10', period: '13:50 - 15:10', startTime: '13:50', endTime: '15:10' }
];

export const INITIAL_SCHEDULES: ScheduleItem[] = [
  // Senin
  { id: 'sch-1', teacherId: 't-1', day: 'Senin', classRoomId: 'c-4', subjectId: 's-1', timeSlotId: 'slot-1', notes: 'Ruang Lab/Kelas XI MIPA 1' },
  { id: 'sch-2', teacherId: 't-1', day: 'Senin', classRoomId: 'c-7', subjectId: 's-2', timeSlotId: 'slot-3', notes: 'Kelas XII MIPA 1' },
  { id: 'sch-3', teacherId: 't-2', day: 'Senin', classRoomId: 'c-1', subjectId: 's-3', timeSlotId: 'slot-1' },
  { id: 'sch-4', teacherId: 't-3', day: 'Senin', classRoomId: 'c-4', subjectId: 's-4', timeSlotId: 'slot-2' },
  { id: 'sch-5', teacherId: 't-4', day: 'Senin', classRoomId: 'c-5', subjectId: 's-5', timeSlotId: 'slot-2' },
  { id: 'sch-6', teacherId: 't-5', day: 'Senin', classRoomId: 'c-6', subjectId: 's-12', timeSlotId: 'slot-3' },
  { id: 'sch-7', teacherId: 't-6', day: 'Senin', classRoomId: 'c-2', subjectId: 's-8', timeSlotId: 'slot-4' },
  { id: 'sch-8', teacherId: 't-7', day: 'Senin', classRoomId: 'c-7', subjectId: 's-7', timeSlotId: 'slot-4' },

  // Selasa
  { id: 'sch-9', teacherId: 't-1', day: 'Selasa', classRoomId: 'c-5', subjectId: 's-1', timeSlotId: 'slot-2' },
  { id: 'sch-10', teacherId: 't-2', day: 'Selasa', classRoomId: 'c-2', subjectId: 's-3', timeSlotId: 'slot-1' },
  { id: 'sch-11', teacherId: 't-4', day: 'Selasa', classRoomId: 'c-7', subjectId: 's-5', timeSlotId: 'slot-3' },
  { id: 'sch-12', teacherId: 't-8', day: 'Selasa', classRoomId: 'c-3', subjectId: 's-6', timeSlotId: 'slot-2' },
  { id: 'sch-13', teacherId: 't-10', day: 'Selasa', classRoomId: 'c-1', subjectId: 's-10', timeSlotId: 'slot-1' },

  // Rabu
  { id: 'sch-14', teacherId: 't-1', day: 'Rabu', classRoomId: 'c-8', subjectId: 's-2', timeSlotId: 'slot-1' },
  { id: 'sch-15', teacherId: 't-3', day: 'Rabu', classRoomId: 'c-1', subjectId: 's-4', timeSlotId: 'slot-2' },
  { id: 'sch-16', teacherId: 't-6', day: 'Rabu', classRoomId: 'c-4', subjectId: 's-8', timeSlotId: 'slot-3' },
  { id: 'sch-17', teacherId: 't-7', day: 'Rabu', classRoomId: 'c-5', subjectId: 's-7', timeSlotId: 'slot-1' },
  { id: 'sch-18', teacherId: 't-12', day: 'Rabu', classRoomId: 'c-2', subjectId: 's-11', timeSlotId: 'slot-4' },

  // Kamis
  { id: 'sch-19', teacherId: 't-1', day: 'Kamis', classRoomId: 'c-4', subjectId: 's-1', timeSlotId: 'slot-3' },
  { id: 'sch-20', teacherId: 't-5', day: 'Kamis', classRoomId: 'c-9', subjectId: 's-12', timeSlotId: 'slot-1' },
  { id: 'sch-21', teacherId: 't-9', day: 'Kamis', classRoomId: 'c-6', subjectId: 's-9', timeSlotId: 'slot-2' },
  { id: 'sch-22', teacherId: 't-11', day: 'Kamis', classRoomId: 'c-3', subjectId: 's-3', timeSlotId: 'slot-3' },

  // Jumat
  { id: 'sch-23', teacherId: 't-6', day: 'Jumat', classRoomId: 'c-7', subjectId: 's-8', timeSlotId: 'slot-1' },
  { id: 'sch-24', teacherId: 't-2', day: 'Jumat', classRoomId: 'c-3', subjectId: 's-3', timeSlotId: 'slot-1' },
  { id: 'sch-25', teacherId: 't-1', day: 'Jumat', classRoomId: 'c-5', subjectId: 's-2', timeSlotId: 'slot-2' },

  // Sabtu
  { id: 'sch-26', teacherId: 't-10', day: 'Sabtu', classRoomId: 'c-4', subjectId: 's-10', timeSlotId: 'slot-1' },
  { id: 'sch-27', teacherId: 't-12', day: 'Sabtu', classRoomId: 'c-1', subjectId: 's-11', timeSlotId: 'slot-2' },
  { id: 'sch-28', teacherId: 't-4', day: 'Sabtu', classRoomId: 'c-8', subjectId: 's-5', timeSlotId: 'slot-3' }
];

export const INDONESIAN_DAYS: DayOfWeek[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function getTodayDayName(): DayOfWeek {
  const dayIndex = new Date().getDay(); // 0 is Sunday
  if (dayIndex === 1) return 'Senin';
  if (dayIndex === 2) return 'Selasa';
  if (dayIndex === 3) return 'Rabu';
  if (dayIndex === 4) return 'Kamis';
  if (dayIndex === 5) return 'Jumat';
  if (dayIndex === 6) return 'Sabtu';
  return 'Senin'; // default Sunday to Senin for testing
}

export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'att-1',
    teacherId: 't-1',
    teacherName: 'Riza Fani, S.Pd., M.Pd.',
    nip: '19750812 200212 1 002',
    date: getTodayDateString(),
    dayName: getTodayDayName(),
    classRoomName: 'XI MIPA 1',
    subjectName: 'Matematika Wajib',
    timeSlotName: 'Jam Ke 1 - 2 (07:30 - 08:50)',
    status: 'HADIR',
    photoUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&auto=format&fit=crop&q=80',
    timestamp: '07:28:15',
    topic: 'Turunan Fungsi Aljabar dan Latihan Soal Mandiri',
    notes: 'Siswa aktif berdiskusi di kelas.',
    recordedBy: 'MANDIRI'
  },
  {
    id: 'att-2',
    teacherId: 't-2',
    teacherName: 'Drs. Muhammad Yusuf',
    nip: '19710315 199801 1 001',
    date: getTodayDateString(),
    dayName: getTodayDayName(),
    classRoomName: 'X-1',
    subjectName: 'Bahasa Indonesia',
    timeSlotName: 'Jam Ke 1 - 2 (07:30 - 08:50)',
    status: 'HADIR',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    timestamp: '07:34:02',
    topic: 'Teks Laporan Hasil Observasi (LHO)',
    recordedBy: 'MANDIRI'
  },
  {
    id: 'att-3',
    teacherId: 't-5',
    teacherName: 'Teuku Syahrul, M.Pd.',
    nip: '19850410 201001 1 021',
    date: getTodayDateString(),
    dayName: getTodayDayName(),
    classRoomName: 'XI IPS 1',
    subjectName: 'Ekonomi',
    timeSlotName: 'Jam Ke 5 - 6 (10:30 - 11:50)',
    status: 'DINAS_LUAR',
    photoUrl: '',
    timestamp: '08:00:00',
    recordedBy: 'GURU_PIKET',
    piketOfficerName: 'Cut Mutia, S.Pd.',
    piketNotes: 'Mengikuti Bimtek Kurikulum Merdeka di Dinas Pendidikan Aceh Timur',
    substituteTeacherName: 'Mariati, S.Pd.'
  }
];
