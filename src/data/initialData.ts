import { Teacher, ClassRoom, Subject, TimeSlot, ScheduleItem, AttendanceRecord, DayOfWeek } from '../types';

export const INITIAL_TEACHERS: Teacher[] = [
  { id: 'guru-1', nip: '198205102008011004', name: 'Riza Fani, S.Pd., M.Pd.', gender: 'L', phone: '081234567890', email: 'rizafani@gmail.com', status: 'Aktif' },
  { id: 'guru-2', nip: '197508152002121002', name: 'Drs. Muhammad Nasir', gender: 'L', phone: '081398765432', email: 'muhammadnasir@sman1julok.sch.id', status: 'Aktif' },
  { id: 'guru-3', nip: '198403122009042003', name: 'Cut Nurul Aini, S.Pd.', gender: 'P', phone: '085277112233', email: 'cutnurul@sman1julok.sch.id', status: 'Aktif' },
  { id: 'guru-4', nip: '198711202011011005', name: 'Teuku Zulkifli, S.Pd.', gender: 'L', phone: '085366223344', email: 'tzulkifli@sman1julok.sch.id', status: 'Aktif' },
  { id: 'guru-5', nip: '198307042006042008', name: 'Nurlina, S.Si., M.Pd.', gender: 'P', phone: '081360123456', email: 'nurlina@sman1julok.sch.id', status: 'Aktif' },
  { id: 'guru-6', nip: '198909182014031002', name: 'Faisal, S.Pd.', gender: 'L', phone: '082165432109', email: 'faisal@sman1julok.sch.id', status: 'Aktif' },
  { id: 'guru-7', nip: '198104252007012011', name: 'Rahmawati, S.Pd.', gender: 'P', phone: '085299887766', email: 'rahmawati@sman1julok.sch.id', status: 'Aktif' },
  { id: 'guru-8', nip: '197912052005011007', name: 'Iskandar, S.Pd.I.', gender: 'L', phone: '081377889900', email: 'iskandar@sman1julok.sch.id', status: 'Aktif' },
  { id: 'guru-9', nip: '198602142010012015', name: 'Maryani, S.Pd.', gender: 'P', phone: '085260112244', email: 'maryani@sman1julok.sch.id', status: 'Aktif' },
  { id: 'guru-10', nip: '197806122003121004', name: 'Bukhari, S.E.', gender: 'L', phone: '081269334455', email: 'bukhari@sman1julok.sch.id', status: 'Aktif' },
  { id: 'guru-11', nip: '198801192015042002', name: 'Suryani, S.Sos.', gender: 'P', phone: '085370221199', email: 'suryani@sman1julok.sch.id', status: 'Aktif' },
  { id: 'guru-12', nip: '199108222019031008', name: 'Arman Syahputra, S.Pd.', gender: 'L', phone: '082274112288', email: 'armansyah@sman1julok.sch.id', status: 'Aktif' },
  { id: 'guru-13', nip: '198505162009022006', name: 'Salmiah, S.Pd.', gender: 'P', phone: '085211993344', email: 'salmiah@sman1julok.sch.id', status: 'Aktif' },
  { id: 'guru-14', nip: '199304102020121009', name: 'Munawar, S.Kom.', gender: 'L', phone: '082361778899', email: 'munawar@sman1julok.sch.id', status: 'Aktif' },
  { id: 'guru-15', nip: '198003152006042012', name: 'Nurhayati, S.Pd.', gender: 'P', phone: '081362889911', email: 'nurhayati@sman1julok.sch.id', status: 'Aktif' },
  { id: 'guru-16', nip: '198610082011011010', name: 'Zulfikar, S.T.', gender: 'L', phone: '085270334455', email: 'zulfikar@sman1julok.sch.id', status: 'Aktif' },
];

export const INITIAL_CLASSES: ClassRoom[] = [
  { id: 'kls-x-1', name: 'X-1', grade: 'X', major: 'Umum' },
  { id: 'kls-x-2', name: 'X-2', grade: 'X', major: 'Umum' },
  { id: 'kls-x-3', name: 'X-3', grade: 'X', major: 'Umum' },
  { id: 'kls-x-4', name: 'X-4', grade: 'X', major: 'Umum' },
  { id: 'kls-xi-f1', name: 'XI-F1', grade: 'XI', major: 'MIPA' },
  { id: 'kls-xi-f2', name: 'XI-F2', grade: 'XI', major: 'MIPA' },
  { id: 'kls-xi-f3', name: 'XI-F3', grade: 'XI', major: 'IPS' },
  { id: 'kls-xi-f4', name: 'XI-F4', grade: 'XI', major: 'IPS' },
  { id: 'kls-xii-mipa1', name: 'XII-MIPA 1', grade: 'XII', major: 'MIPA' },
  { id: 'kls-xii-mipa2', name: 'XII-MIPA 2', grade: 'XII', major: 'MIPA' },
  { id: 'kls-xii-ips1', name: 'XII-IPS 1', grade: 'XII', major: 'IPS' },
  { id: 'kls-xii-ips2', name: 'XII-IPS 2', grade: 'XII', major: 'IPS' },
];

export const INITIAL_SUBJECTS: Subject[] = [
  { id: 'mapel-pai', code: 'PAI', name: 'Pendidikan Agama Islam & Budi Pekerti', category: 'Wajib' },
  { id: 'mapel-pkn', code: 'PPKN', name: 'Pendidikan Pancasila & Kewarganegaraan', category: 'Wajib' },
  { id: 'mapel-bin', code: 'BIN', name: 'Bahasa Indonesia', category: 'Wajib' },
  { id: 'mapel-mat', code: 'MAT', name: 'Matematika', category: 'Wajib' },
  { id: 'mapel-big', code: 'BIG', name: 'Bahasa Inggris', category: 'Wajib' },
  { id: 'mapel-fis', code: 'FIS', name: 'Fisika', category: 'Peminatan' },
  { id: 'mapel-kim', code: 'KIM', name: 'Kimia', category: 'Peminatan' },
  { id: 'mapel-bio', code: 'BIO', name: 'Biologi', category: 'Peminatan' },
  { id: 'mapel-sej', code: 'SEJ', name: 'Sejarah Indonesia', category: 'Wajib' },
  { id: 'mapel-geo', code: 'GEO', name: 'Geografi', category: 'Peminatan' },
  { id: 'mapel-eko', code: 'EKO', name: 'Ekonomi', category: 'Peminatan' },
  { id: 'mapel-sos', code: 'SOS', name: 'Sosiologi', category: 'Peminatan' },
  { id: 'mapel-pjok', code: 'PJOK', name: 'Pendidikan Jasmani & Olahraga', category: 'Wajib' },
  { id: 'mapel-sbd', code: 'SBD', name: 'Seni Budaya', category: 'Wajib' },
  { id: 'mapel-inf', code: 'INF', name: 'Informatika', category: 'Wajib' },
  { id: 'mapel-pkwu', code: 'PKWU', name: 'Prakarya dan Kewirausahaan', category: 'Wajib' },
];

export const INITIAL_TIME_SLOTS: TimeSlot[] = [
  { id: 'ts-1', label: 'Jam 1', startTime: '07:30', endTime: '08:15', period: '07:30 - 08:15' },
  { id: 'ts-2', label: 'Jam 2', startTime: '08:15', endTime: '09:00', period: '08:15 - 09:00' },
  { id: 'ts-3', label: 'Jam 3', startTime: '09:00', endTime: '09:45', period: '09:00 - 09:45' },
  { id: 'ts-4', label: 'Jam 4', startTime: '10:15', endTime: '11:00', period: '10:15 - 11:00' },
  { id: 'ts-5', label: 'Jam 5', startTime: '11:00', endTime: '11:45', period: '11:00 - 11:45' },
  { id: 'ts-6', label: 'Jam 6', startTime: '11:45', endTime: '12:30', period: '11:45 - 12:30' },
  { id: 'ts-7', label: 'Jam 7', startTime: '13:30', endTime: '14:15', period: '13:30 - 14:15' },
  { id: 'ts-8', label: 'Jam 8', startTime: '14:15', endTime: '15:00', period: '14:15 - 15:00' },
  { id: 'ts-9', label: 'Jam 9', startTime: '15:00', endTime: '15:45', period: '15:00 - 15:45' },
  { id: 'ts-10', label: 'Jam 10', startTime: '15:45', endTime: '16:30', period: '15:45 - 16:30' },
];

export const INITIAL_SCHEDULES: ScheduleItem[] = [
  // SENIN
  { id: 'sch-1', teacherId: 'guru-1', day: 'Senin', classRoomId: 'kls-xii-mipa1', subjectId: 'mapel-fis', timeSlotId: 'ts-1', timeSlotIds: ['ts-1', 'ts-2', 'ts-3'], room: 'Lab Fisika', notes: 'Fisika Inti' },
  { id: 'sch-2', teacherId: 'guru-2', day: 'Senin', classRoomId: 'kls-x-1', subjectId: 'mapel-mat', timeSlotId: 'ts-1', timeSlotIds: ['ts-1', 'ts-2'], room: 'R. 101', notes: 'Aljabar' },
  { id: 'sch-3', teacherId: 'guru-3', day: 'Senin', classRoomId: 'kls-xi-f1', subjectId: 'mapel-bin', timeSlotId: 'ts-4', timeSlotIds: ['ts-4', 'ts-5'], room: 'R. 201', notes: 'Teks Argumentasi' },
  { id: 'sch-4', teacherId: 'guru-4', day: 'Senin', classRoomId: 'kls-x-2', subjectId: 'mapel-big', timeSlotId: 'ts-4', timeSlotIds: ['ts-4', 'ts-5'], room: 'R. 102', notes: 'Reading Comprehension' },
  { id: 'sch-5', teacherId: 'guru-5', day: 'Senin', classRoomId: 'kls-xii-mipa2', subjectId: 'mapel-bio', timeSlotId: 'ts-7', timeSlotIds: ['ts-7', 'ts-8'], room: 'Lab Biologi', notes: 'Genetika' },
  { id: 'sch-6', teacherId: 'guru-8', day: 'Senin', classRoomId: 'kls-xi-f3', subjectId: 'mapel-pai', timeSlotId: 'ts-1', timeSlotIds: ['ts-1', 'ts-2', 'ts-3'], room: 'Musholla / R. 203', notes: 'Fiqih Mawaris' },

  // SELASA
  { id: 'sch-7', teacherId: 'guru-6', day: 'Selasa', classRoomId: 'kls-xi-f1', subjectId: 'mapel-kim', timeSlotId: 'ts-1', timeSlotIds: ['ts-1', 'ts-2', 'ts-3'], room: 'Lab Kimia', notes: 'Termokimia' },
  { id: 'sch-8', teacherId: 'guru-1', day: 'Selasa', classRoomId: 'kls-xi-f2', subjectId: 'mapel-fis', timeSlotId: 'ts-4', timeSlotIds: ['ts-4', 'ts-5', 'ts-6'], room: 'Lab Fisika', notes: 'Gelombang Mekanik' },
  { id: 'sch-9', teacherId: 'guru-7', day: 'Selasa', classRoomId: 'kls-x-3', subjectId: 'mapel-sej', timeSlotId: 'ts-1', timeSlotIds: ['ts-1', 'ts-2'], room: 'R. 103', notes: 'Kerajaan Islam di Aceh' },
  { id: 'sch-10', teacherId: 'guru-10', day: 'Selasa', classRoomId: 'kls-xii-ips1', subjectId: 'mapel-eko', timeSlotId: 'ts-4', timeSlotIds: ['ts-4', 'ts-5', 'ts-6'], room: 'R. 301', notes: 'Akuntansi Perusahaan' },
  { id: 'sch-11', teacherId: 'guru-14', day: 'Selasa', classRoomId: 'kls-x-1', subjectId: 'mapel-inf', timeSlotId: 'ts-7', timeSlotIds: ['ts-7', 'ts-8'], room: 'Lab Komputer', notes: 'Pemrograman Visual' },

  // RABU
  { id: 'sch-12', teacherId: 'guru-2', day: 'Rabu', classRoomId: 'kls-xii-mipa1', subjectId: 'mapel-mat', timeSlotId: 'ts-1', timeSlotIds: ['ts-1', 'ts-2', 'ts-3'], room: 'R. 302', notes: 'Kalkulus Integral' },
  { id: 'sch-13', teacherId: 'guru-5', day: 'Rabu', classRoomId: 'kls-xi-f1', subjectId: 'mapel-bio', timeSlotId: 'ts-4', timeSlotIds: ['ts-4', 'ts-5', 'ts-6'], room: 'Lab Biologi', notes: 'Struktur Jaringan' },
  { id: 'sch-14', teacherId: 'guru-9', day: 'Rabu', classRoomId: 'kls-xi-f4', subjectId: 'mapel-geo', timeSlotId: 'ts-1', timeSlotIds: ['ts-1', 'ts-2'], room: 'R. 204', notes: 'Penginderaan Jauh' },
  { id: 'sch-15', teacherId: 'guru-11', day: 'Rabu', classRoomId: 'kls-xii-ips2', subjectId: 'mapel-sos', timeSlotId: 'ts-4', timeSlotIds: ['ts-4', 'ts-5'], room: 'R. 304', notes: 'Perubahan Sosial' },
  { id: 'sch-16', teacherId: 'guru-12', day: 'Rabu', classRoomId: 'kls-x-4', subjectId: 'mapel-pjok', timeSlotId: 'ts-1', timeSlotIds: ['ts-1', 'ts-2', 'ts-3'], room: 'Lapangan Olahraga', notes: 'Bola Voli' },

  // KAMIS
  { id: 'sch-17', teacherId: 'guru-3', day: 'Kamis', classRoomId: 'kls-x-2', subjectId: 'mapel-bin', timeSlotId: 'ts-1', timeSlotIds: ['ts-1', 'ts-2', 'ts-3'], room: 'R. 102', notes: 'Teks Negosiasi' },
  { id: 'sch-18', teacherId: 'guru-4', day: 'Kamis', classRoomId: 'kls-xii-mipa2', subjectId: 'mapel-big', timeSlotId: 'ts-4', timeSlotIds: ['ts-4', 'ts-5'], room: 'R. 303', notes: 'Narrative Text' },
  { id: 'sch-19', teacherId: 'guru-15', day: 'Kamis', classRoomId: 'kls-xi-f2', subjectId: 'mapel-pkn', timeSlotId: 'ts-1', timeSlotIds: ['ts-1', 'ts-2'], room: 'R. 202', notes: 'Sistem Hukum Indonesia' },
  { id: 'sch-20', teacherId: 'guru-16', day: 'Kamis', classRoomId: 'kls-x-3', subjectId: 'mapel-pkwu', timeSlotId: 'ts-7', timeSlotIds: ['ts-7', 'ts-8'], room: 'R. 103', notes: 'Produk Kerajinan Lokal' },
  { id: 'sch-21', teacherId: 'guru-13', day: 'Kamis', classRoomId: 'kls-x-1', subjectId: 'mapel-sbd', timeSlotId: 'ts-4', timeSlotIds: ['ts-4', 'ts-5'], room: 'R. Seni', notes: 'Seni Tari Saman Aceh' },

  // JUMAT
  { id: 'sch-22', teacherId: 'guru-8', day: 'Jumat', classRoomId: 'kls-x-1', subjectId: 'mapel-pai', timeSlotId: 'ts-1', timeSlotIds: ['ts-1', 'ts-2'], room: 'Musholla', notes: 'Tadabbur Al-Quran' },
  { id: 'sch-23', teacherId: 'guru-1', day: 'Jumat', classRoomId: 'kls-x-4', subjectId: 'mapel-fis', timeSlotId: 'ts-3', timeSlotIds: ['ts-3', 'ts-4'], room: 'R. 104', notes: 'Pengukuran dan Vektor' },
  { id: 'sch-24', teacherId: 'guru-2', day: 'Jumat', classRoomId: 'kls-xi-f3', subjectId: 'mapel-mat', timeSlotId: 'ts-1', timeSlotIds: ['ts-1', 'ts-2'], room: 'R. 203', notes: 'Matriks & Transformasi' },

  // SABTU
  { id: 'sch-25', teacherId: 'guru-12', day: 'Sabtu', classRoomId: 'kls-xi-f1', subjectId: 'mapel-pjok', timeSlotId: 'ts-1', timeSlotIds: ['ts-1', 'ts-2', 'ts-3'], room: 'Lapangan Olahraga', notes: 'Kebugaran Jasmani' },
  { id: 'sch-26', teacherId: 'guru-6', day: 'Sabtu', classRoomId: 'kls-xii-mipa2', subjectId: 'mapel-kim', timeSlotId: 'ts-1', timeSlotIds: ['ts-1', 'ts-2'], room: 'Lab Kimia', notes: 'Kimia Unsur' },
  { id: 'sch-27', teacherId: 'guru-14', day: 'Sabtu', classRoomId: 'kls-xi-f2', subjectId: 'mapel-inf', timeSlotId: 'ts-4', timeSlotIds: ['ts-4', 'ts-5'], room: 'Lab Komputer', notes: 'Jaringan Komputer' },
];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [];

export const INDONESIAN_DAYS: DayOfWeek[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function getTodayDayName(): DayOfWeek {
  const dayIndex = new Date().getDay(); // 0 is Sunday
  if (dayIndex === 1) return 'Senin';
  if (dayIndex === 2) return 'Selasa';
  if (dayIndex === 3) return 'Rabu';
  if (dayIndex === 4) return 'Kamis';
  if (dayIndex === 5) return 'Jumat';
  if (dayIndex === 6) return 'Sabtu';
  return 'Senin'; // default Sunday to Senin
}

export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatScheduleTimeSlots(
  schedule: { timeSlotId: string; timeSlotIds?: string[] },
  timeSlots: TimeSlot[]
): { label: string; period: string; fullText: string } {
  const ids = schedule.timeSlotIds && schedule.timeSlotIds.length > 0
    ? schedule.timeSlotIds
    : (schedule.timeSlotId ? [schedule.timeSlotId] : []);

  const matched = timeSlots
    .filter((ts) => ids.includes(ts.id))
    .sort((a, b) => timeSlots.indexOf(a) - timeSlots.indexOf(b));

  if (matched.length === 0) {
    const single = timeSlots.find((ts) => ts.id === schedule.timeSlotId);
    if (single) {
      return {
        label: single.label,
        period: single.period,
        fullText: `${single.label} (${single.period})`
      };
    }
    return { label: '-', period: '-', fullText: '-' };
  }

  const label = matched.map((m) => m.label).join(', ');
  const period = `${matched[0].startTime} - ${matched[matched.length - 1].endTime}`;
  const fullText = `${label} (${period})`;

  return { label, period, fullText };
}
