import * as XLSX from 'xlsx';
import {
  Teacher,
  ClassRoom,
  Subject,
  TimeSlot,
  PiketAccount,
  DayOfWeek,
  StaffCategory
} from '../types';
import { INDONESIAN_DAYS } from '../data/initialData';
import {
  cleanTeacherNameForUsername,
  generateDefaultPiketPassword
} from './piketAuth';
import { normalizeDay, matchTeacher } from './scheduleExcel';

// ---------------------------------------------------------------------------
// TYPES FOR PARSED ROWS
// ---------------------------------------------------------------------------

export interface ParsedTeacherRow {
  rowIndex: number;
  rawName: string;
  rawNip: string;
  rawGender: string;
  rawPhone: string;
  rawEmail: string;
  rawStatus: string;

  name: string;
  nip: string;
  gender: 'L' | 'P';
  phone: string;
  email: string;
  status: 'Aktif' | 'Nonaktif';
  category?: StaffCategory;
  jabatan?: string;

  isValid: boolean;
  validationErrors: string[];
}

export interface ParsedClassRow {
  rowIndex: number;
  rawName: string;
  rawGrade: string;
  rawMajor: string;

  name: string;
  grade: 'X' | 'XI' | 'XII';
  major: 'MIPA' | 'IPS' | 'Umum';

  isValid: boolean;
  validationErrors: string[];
}

export interface ParsedSubjectRow {
  rowIndex: number;
  rawName: string;
  rawCode: string;
  rawCategory: string;

  name: string;
  code: string;
  category: 'Wajib' | 'Peminatan' | 'Muatan Lokal';

  isValid: boolean;
  validationErrors: string[];
}

export interface ParsedTimeSlotRow {
  rowIndex: number;
  rawLabel: string;
  rawStartTime: string;
  rawEndTime: string;
  rawPeriod: string;

  label: string;
  startTime: string;
  endTime: string;
  period: string;

  isValid: boolean;
  validationErrors: string[];
}

export interface ParsedPiketRow {
  rowIndex: number;
  rawTeacher: string;
  rawDays: string;
  rawStatus: string;
  rawNotes: string;

  teacherId: string | null;
  teacherName: string;
  nip: string;
  assignedDays: DayOfWeek[];
  isActive: boolean;
  notes: string;

  isValid: boolean;
  validationErrors: string[];
}

// ---------------------------------------------------------------------------
// HELPER UTILITIES
// ---------------------------------------------------------------------------

function cleanCell(val: unknown): string {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

function normalizeTime(timeStr: string): string {
  if (!timeStr) return '';
  const clean = timeStr.trim().replace('.', ':');
  // If format is H:MM or HH:MM
  const match = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    const h = match[1].padStart(2, '0');
    const m = match[2];
    return `${h}:${m}`;
  }
  return clean;
}

// ---------------------------------------------------------------------------
// EXCEL TEMPLATE DOWNLOADERS
// ---------------------------------------------------------------------------

/**
 * Downloads official Excel template for Data Guru
 */
export function downloadTeachersExcelTemplate(): void {
  const wb = XLSX.utils.book_new();

  const data = [
    {
      'Nama Guru & Gelar': 'Riza Fani, S.Pd., M.Pd.',
      'NIP': '198205102008011004',
      'Jenis Kelamin (L/P)': 'L',
      'No. HP (WhatsApp)': '081234567890',
      'Email': 'rizafani@gmail.com',
      'Status (Aktif/Nonaktif)': 'Aktif'
    },
    {
      'Nama Guru & Gelar': 'Cut Nurul Aini, S.Pd.',
      'NIP': '198403122009042003',
      'Jenis Kelamin (L/P)': 'P',
      'No. HP (WhatsApp)': '085277112233',
      'Email': 'cutnurul@sman1julok.sch.id',
      'Status (Aktif/Nonaktif)': 'Aktif'
    },
    {
      'Nama Guru & Gelar': 'Drs. Muhammad Nasir',
      'NIP': '197508152002121002',
      'Jenis Kelamin (L/P)': 'L',
      'No. HP (WhatsApp)': '081398765432',
      'Email': 'muhammadnasir@sman1julok.sch.id',
      'Status (Aktif/Nonaktif)': 'Aktif'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 30 }, // Nama
    { wch: 22 }, // NIP
    { wch: 18 }, // Gender
    { wch: 20 }, // Phone
    { wch: 28 }, // Email
    { wch: 22 }  // Status
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Data Guru SMAN 1 Julok');
  XLSX.writeFile(wb, 'Template_Data_Guru_SMAN1_Julok.xlsx');
}

/**
 * Downloads official Excel template for Data Guru BK & Staff TU
 */
export function downloadBkTuExcelTemplate(): void {
  const wb = XLSX.utils.book_new();

  const data = [
    {
      'Nama Lengkap & Gelar': 'Siti Rahmah, S.Pd.',
      'NIP / NIK': '198604152010012008',
      'Kategori (Guru BK / Staff TU)': 'Guru BK',
      'Jabatan / Tugas': 'Guru Bimbingan & Konseling',
      'Jenis Kelamin (L/P)': 'P',
      'No. HP (WhatsApp)': '081260112233',
      'Email': 'sitirahmah@sman1julok.sch.id',
      'Status (Aktif/Nonaktif)': 'Aktif'
    },
    {
      'Nama Lengkap & Gelar': 'Hendri Saputra, S.E.',
      'NIP / NIK': '199007202019031004',
      'Kategori (Guru BK / Staff TU)': 'Staff TU',
      'Jabatan / Tugas': 'Staff Administrasi & Operator',
      'Jenis Kelamin (L/P)': 'L',
      'No. HP (WhatsApp)': '085277889900',
      'Email': 'hendri.tu@sman1julok.sch.id',
      'Status (Aktif/Nonaktif)': 'Aktif'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 30 }, // Nama
    { wch: 22 }, // NIP
    { wch: 28 }, // Kategori
    { wch: 28 }, // Jabatan
    { wch: 20 }, // JK
    { wch: 20 }, // HP
    { wch: 28 }, // Email
    { wch: 22 }  // Status
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Guru BK & Staff TU');
  XLSX.writeFile(wb, 'Template_Guru_BK_dan_Staff_TU_SMAN1_Julok.xlsx');
}

/**
 * Downloads official Excel template for Data Kelas
 */
export function downloadClassesExcelTemplate(): void {
  const wb = XLSX.utils.book_new();

  const data = [
    {
      'Nama Kelas': 'X-1',
      'Tingkat (X / XI / XII)': 'X',
      'Jurusan (Umum / MIPA / IPS)': 'Umum'
    },
    {
      'Nama Kelas': 'XI-F1',
      'Tingkat (X / XI / XII)': 'XI',
      'Jurusan (Umum / MIPA / IPS)': 'MIPA'
    },
    {
      'Nama Kelas': 'XI-F3',
      'Tingkat (X / XI / XII)': 'XI',
      'Jurusan (Umum / MIPA / IPS)': 'IPS'
    },
    {
      'Nama Kelas': 'XII-MIPA 1',
      'Tingkat (X / XI / XII)': 'XII',
      'Jurusan (Umum / MIPA / IPS)': 'MIPA'
    },
    {
      'Nama Kelas': 'XII-IPS 1',
      'Tingkat (X / XI / XII)': 'XII',
      'Jurusan (Umum / MIPA / IPS)': 'IPS'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 20 }, // Nama Kelas
    { wch: 24 }, // Tingkat
    { wch: 28 }  // Jurusan
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Data Kelas');
  XLSX.writeFile(wb, 'Template_Data_Kelas_SMAN1_Julok.xlsx');
}

/**
 * Downloads official Excel template for Data Mata Pelajaran
 */
export function downloadSubjectsExcelTemplate(): void {
  const wb = XLSX.utils.book_new();

  const data = [
    {
      'Kode Mapel': 'PAI',
      'Nama Mata Pelajaran': 'Pendidikan Agama Islam & Budi Pekerti',
      'Kategori (Wajib / Peminatan / Muatan Lokal)': 'Wajib'
    },
    {
      'Kode Mapel': 'MAT',
      'Nama Mata Pelajaran': 'Matematika Wajib',
      'Kategori (Wajib / Peminatan / Muatan Lokal)': 'Wajib'
    },
    {
      'Kode Mapel': 'FIS',
      'Nama Mata Pelajaran': 'Fisika',
      'Kategori (Wajib / Peminatan / Muatan Lokal)': 'Peminatan'
    },
    {
      'Kode Mapel': 'BIO',
      'Nama Mata Pelajaran': 'Biologi',
      'Kategori (Wajib / Peminatan / Muatan Lokal)': 'Peminatan'
    },
    {
      'Kode Mapel': 'EKO',
      'Nama Mata Pelajaran': 'Ekonomi',
      'Kategori (Wajib / Peminatan / Muatan Lokal)': 'Peminatan'
    },
    {
      'Kode Mapel': 'ACEH',
      'Nama Mata Pelajaran': 'Bahasa & Sastra Aceh',
      'Kategori (Wajib / Peminatan / Muatan Lokal)': 'Muatan Lokal'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 15 }, // Kode
    { wch: 40 }, // Nama
    { wch: 35 }  // Kategori
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Mata Pelajaran');
  XLSX.writeFile(wb, 'Template_Mata_Pelajaran_SMAN1_Julok.xlsx');
}

/**
 * Downloads official Excel template for Data Jam Pelajaran
 */
export function downloadTimeSlotsExcelTemplate(): void {
  const wb = XLSX.utils.book_new();

  const data = [
    {
      'Label Jam': 'Jam 1',
      'Jam Mulai (HH:MM)': '07:30',
      'Jam Selesai (HH:MM)': '08:15',
      'Keterangan / Periode': '07:30 - 08:15'
    },
    {
      'Label Jam': 'Jam 2',
      'Jam Mulai (HH:MM)': '08:15',
      'Jam Selesai (HH:MM)': '09:00',
      'Keterangan / Periode': '08:15 - 09:00'
    },
    {
      'Label Jam': 'Jam 3',
      'Jam Mulai (HH:MM)': '09:00',
      'Jam Selesai (HH:MM)': '09:45',
      'Keterangan / Periode': '09:00 - 09:45'
    },
    {
      'Label Jam': 'Jam 4',
      'Jam Mulai (HH:MM)': '10:15',
      'Jam Selesai (HH:MM)': '11:00',
      'Keterangan / Periode': '10:15 - 11:00'
    },
    {
      'Label Jam': 'Jam 5',
      'Jam Mulai (HH:MM)': '11:00',
      'Jam Selesai (HH:MM)': '11:45',
      'Keterangan / Periode': '11:00 - 11:45'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 15 }, // Label
    { wch: 20 }, // Mulai
    { wch: 22 }, // Selesai
    { wch: 25 }  // Keterangan
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Jam Pelajaran');
  XLSX.writeFile(wb, 'Template_Jam_Pelajaran_SMAN1_Julok.xlsx');
}

/**
 * Downloads official Excel template for Jadwal Guru Piket
 */
export function downloadPiketExcelTemplate(teachers: Teacher[] = []): void {
  const wb = XLSX.utils.book_new();

  const sampleTeachers = (teachers || []).slice(0, 6);
  const days: DayOfWeek[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  const data = sampleTeachers.map((t, i) => ({
    'Nama Guru / NIP': `${t.name} (${t.nip})`,
    'Hari Tugas Piket': days[i % days.length],
    'Status Aktif (Aktif/Nonaktif)': 'Aktif',
    'Pos / Catatan Tugas': i % 2 === 0 ? 'Lobi Utama & Pintu Gerbang' : 'Kantor Piket Guru'
  }));

  const ws = XLSX.utils.json_to_sheet(
    data.length > 0
      ? data
      : [
          {
            'Nama Guru / NIP': 'Riza Fani, S.Pd., M.Pd.',
            'Hari Tugas Piket': 'Senin',
            'Status Aktif (Aktif/Nonaktif)': 'Aktif',
            'Pos / Catatan Tugas': 'Lobi Utama & Ruang Piket'
          },
          {
            'Nama Guru / NIP': 'Cut Nurul Aini, S.Pd.',
            'Hari Tugas Piket': 'Selasa, Kamis',
            'Status Aktif (Aktif/Nonaktif)': 'Aktif',
            'Pos / Catatan Tugas': 'Kantor Piket'
          }
        ]
  );

  ws['!cols'] = [
    { wch: 35 }, // Guru
    { wch: 22 }, // Hari
    { wch: 28 }, // Status
    { wch: 30 }  // Catatan
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Jadwal Piket Guru');
  XLSX.writeFile(wb, 'Template_Jadwal_Guru_Piket_SMAN1_Julok.xlsx');
}

// ---------------------------------------------------------------------------
// PARSERS FOR EACH DATA TYPE
// ---------------------------------------------------------------------------

/**
 * Reads array of objects from first worksheet of Excel file
 */
async function readWorksheetRows(file: File): Promise<Record<string, unknown>[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('File Excel tidak memiliki lembar kerja (worksheet).');
  }
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
}

/**
 * Helper to find value from row object by matching possible column aliases
 */
function findValue(row: Record<string, unknown>, aliases: string[]): string {
  const rowKeys = Object.keys(row);
  for (const alias of aliases) {
    const matchedKey = rowKeys.find(
      (k) => k.trim().toLowerCase() === alias.trim().toLowerCase()
    );
    if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
      return String(row[matchedKey]).trim();
    }
  }

  // Fallback: search key containing alias
  for (const alias of aliases) {
    const matchedKey = rowKeys.find((k) =>
      k.trim().toLowerCase().includes(alias.trim().toLowerCase())
    );
    if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
      return String(row[matchedKey]).trim();
    }
  }

  return '';
}

/**
 * Parse Data Guru from Excel
 */
export async function parseTeachersExcel(file: File): Promise<ParsedTeacherRow[]> {
  const rawRows = await readWorksheetRows(file);
  const parsed: ParsedTeacherRow[] = [];

  rawRows.forEach((row, idx) => {
    const rawName = findValue(row, ['Nama Guru & Gelar', 'Nama Guru', 'Nama', 'Guru']);
    const rawNip = findValue(row, ['NIP', 'Nomor Pegawai', 'No Pegawai', 'NIP / NUPTK']);
    const rawGender = findValue(row, ['Jenis Kelamin (L/P)', 'Jenis Kelamin', 'JK', 'Gender']);
    const rawPhone = findValue(row, ['No. HP (WhatsApp)', 'No HP', 'No. HP', 'HP', 'Telepon', 'WhatsApp']);
    const rawEmail = findValue(row, ['Email', 'Surel', 'Alamat Email']);
    const rawStatus = findValue(row, ['Status (Aktif/Nonaktif)', 'Status', 'Keaktifan']);

    // Skip empty lines
    if (!rawName && !rawNip) return;

    const validationErrors: string[] = [];
    if (!rawName) {
      validationErrors.push('Nama Guru tidak boleh kosong');
    }

    // Gender normalize
    let gender: 'L' | 'P' = 'L';
    const gClean = rawGender.trim().toUpperCase();
    if (gClean.startsWith('P') || gClean.includes('WANITA') || gClean.includes('PEREMPUAN')) {
      gender = 'P';
    } else {
      gender = 'L';
    }

    // Status normalize
    let status: 'Aktif' | 'Nonaktif' = 'Aktif';
    if (rawStatus.trim().toLowerCase().includes('non') || rawStatus.trim().toLowerCase().includes('tidak')) {
      status = 'Nonaktif';
    }

    const rawCategory = findValue(row, ['Kategori (Guru Mapel / Guru BK / Staff TU)', 'Kategori', 'Jenis PTK', 'Unit']);
    const rawJabatan = findValue(row, ['Jabatan / Tugas', 'Jabatan', 'Tugas']);

    let category: StaffCategory = 'GURU_MAPEL';
    const catClean = rawCategory.trim().toUpperCase();
    if (catClean.includes('BK') || catClean.includes('KONSELING')) {
      category = 'GURU_BK';
    } else if (catClean.includes('TU') || catClean.includes('TATA USAHA') || catClean.includes('STAFF') || catClean.includes('STAF')) {
      category = 'STAFF_TU';
    }

    parsed.push({
      rowIndex: idx + 2,
      rawName,
      rawNip,
      rawGender,
      rawPhone,
      rawEmail,
      rawStatus,
      name: rawName,
      nip: rawNip,
      gender,
      phone: rawPhone,
      email: rawEmail,
      status,
      category,
      jabatan: rawJabatan || undefined,
      isValid: validationErrors.length === 0,
      validationErrors
    });
  });

  return parsed;
}

/**
 * Parse Data Guru BK & Staff TU from Excel
 */
export async function parseBkTuExcel(file: File): Promise<ParsedTeacherRow[]> {
  const rawRows = await readWorksheetRows(file);
  const parsed: ParsedTeacherRow[] = [];

  rawRows.forEach((row, idx) => {
    const rawName = findValue(row, ['Nama Lengkap & Gelar', 'Nama Guru & Gelar', 'Nama Lengkap', 'Nama']);
    const rawNip = findValue(row, ['NIP / NIK', 'NIP', 'NIK', 'Nomor Pegawai', 'No Pegawai']);
    const rawCategory = findValue(row, ['Kategori (Guru BK / Staff TU)', 'Kategori', 'Jenis', 'Unit']);
    const rawJabatan = findValue(row, ['Jabatan / Tugas', 'Jabatan', 'Tugas']);
    const rawGender = findValue(row, ['Jenis Kelamin (L/P)', 'Jenis Kelamin', 'JK', 'Gender']);
    const rawPhone = findValue(row, ['No. HP (WhatsApp)', 'No HP', 'No. HP', 'HP', 'Telepon', 'WhatsApp']);
    const rawEmail = findValue(row, ['Email', 'Surel', 'Alamat Email']);
    const rawStatus = findValue(row, ['Status (Aktif/Nonaktif)', 'Status', 'Keaktifan']);

    if (!rawName && !rawNip) return;

    const validationErrors: string[] = [];
    if (!rawName) {
      validationErrors.push('Nama Lengkap tidak boleh kosong');
    }

    let category: StaffCategory = 'STAFF_TU';
    const catClean = (rawCategory || rawJabatan || '').trim().toUpperCase();
    if (catClean.includes('BK') || catClean.includes('KONSELING')) {
      category = 'GURU_BK';
    } else {
      category = 'STAFF_TU';
    }

    let gender: 'L' | 'P' = 'L';
    const gClean = rawGender.trim().toUpperCase();
    if (gClean.startsWith('P') || gClean.includes('WANITA') || gClean.includes('PEREMPUAN')) {
      gender = 'P';
    }

    let status: 'Aktif' | 'Nonaktif' = 'Aktif';
    if (rawStatus.trim().toLowerCase().includes('non') || rawStatus.trim().toLowerCase().includes('tidak')) {
      status = 'Nonaktif';
    }

    parsed.push({
      rowIndex: idx + 2,
      rawName,
      rawNip,
      rawGender,
      rawPhone,
      rawEmail,
      rawStatus,
      name: rawName,
      nip: rawNip,
      gender,
      phone: rawPhone,
      email: rawEmail,
      status,
      category,
      jabatan: rawJabatan || (category === 'GURU_BK' ? 'Guru BK' : 'Staff TU'),
      isValid: validationErrors.length === 0,
      validationErrors
    });
  });

  return parsed;
}

/**
 * Parse Data Kelas from Excel
 */
export async function parseClassesExcel(file: File): Promise<ParsedClassRow[]> {
  const rawRows = await readWorksheetRows(file);
  const parsed: ParsedClassRow[] = [];

  rawRows.forEach((row, idx) => {
    const rawName = findValue(row, ['Nama Kelas', 'Kelas', 'Nama']);
    const rawGrade = findValue(row, ['Tingkat (X / XI / XII)', 'Tingkat', 'Grade']);
    const rawMajor = findValue(row, ['Jurusan (Umum / MIPA / IPS)', 'Jurusan', 'Peminatan', 'Major']);

    if (!rawName) return;

    const validationErrors: string[] = [];

    // Auto-detect grade if not provided
    let grade: 'X' | 'XI' | 'XII' = 'X';
    const gradeClean = (rawGrade || rawName).toUpperCase();
    if (gradeClean.includes('XII')) {
      grade = 'XII';
    } else if (gradeClean.includes('XI')) {
      grade = 'XI';
    } else if (gradeClean.includes('X')) {
      grade = 'X';
    }

    // Auto-detect major
    let major: 'MIPA' | 'IPS' | 'Umum' = 'Umum';
    const majorClean = (rawMajor || rawName).toUpperCase();
    if (majorClean.includes('MIPA') || majorClean.includes('IPA')) {
      major = 'MIPA';
    } else if (majorClean.includes('IPS') || majorClean.includes('SOSIAL')) {
      major = 'IPS';
    } else {
      major = 'Umum';
    }

    parsed.push({
      rowIndex: idx + 2,
      rawName,
      rawGrade,
      rawMajor,
      name: rawName,
      grade,
      major,
      isValid: validationErrors.length === 0,
      validationErrors
    });
  });

  return parsed;
}

/**
 * Parse Data Mata Pelajaran from Excel
 */
export async function parseSubjectsExcel(file: File): Promise<ParsedSubjectRow[]> {
  const rawRows = await readWorksheetRows(file);
  const parsed: ParsedSubjectRow[] = [];

  rawRows.forEach((row, idx) => {
    const rawName = findValue(row, ['Nama Mata Pelajaran', 'Nama Mapel', 'Mata Pelajaran', 'Mapel']);
    const rawCode = findValue(row, ['Kode Mapel', 'Kode', 'Singkatan']);
    const rawCategory = findValue(row, ['Kategori (Wajib / Peminatan / Muatan Lokal)', 'Kategori', 'Kelompok']);

    if (!rawName && !rawCode) return;

    const validationErrors: string[] = [];
    if (!rawName) {
      validationErrors.push('Nama Mata Pelajaran tidak boleh kosong');
    }

    // Generate code if empty
    let code = rawCode.trim().toUpperCase();
    if (!code && rawName) {
      code = rawName
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .slice(0, 4)
        .toUpperCase();
    }

    // Category normalize
    let category: 'Wajib' | 'Peminatan' | 'Muatan Lokal' = 'Wajib';
    const catClean = rawCategory.toLowerCase();
    if (catClean.includes('peminatan') || catClean.includes('jurusan')) {
      category = 'Peminatan';
    } else if (catClean.includes('lokal') || catClean.includes('muatan')) {
      category = 'Muatan Lokal';
    } else {
      category = 'Wajib';
    }

    parsed.push({
      rowIndex: idx + 2,
      rawName,
      rawCode,
      rawCategory,
      name: rawName,
      code,
      category,
      isValid: validationErrors.length === 0,
      validationErrors
    });
  });

  return parsed;
}

/**
 * Parse Data Jam Pelajaran from Excel
 */
export async function parseTimeSlotsExcel(file: File): Promise<ParsedTimeSlotRow[]> {
  const rawRows = await readWorksheetRows(file);
  const parsed: ParsedTimeSlotRow[] = [];

  rawRows.forEach((row, idx) => {
    const rawLabel = findValue(row, ['Label Jam', 'Jam Ke', 'Jam', 'Label']);
    const rawStartTime = findValue(row, ['Jam Mulai (HH:MM)', 'Jam Mulai', 'Mulai', 'Waktu Mulai']);
    const rawEndTime = findValue(row, ['Jam Selesai (HH:MM)', 'Jam Selesai', 'Selesai', 'Waktu Selesai']);
    const rawPeriod = findValue(row, ['Keterangan / Periode', 'Periode', 'Rentang', 'Keterangan']);

    if (!rawLabel && !rawStartTime) return;

    const validationErrors: string[] = [];

    const startTime = normalizeTime(rawStartTime);
    const endTime = normalizeTime(rawEndTime);

    if (!startTime) {
      validationErrors.push('Jam Mulai wajib diisi (format HH:mm, contoh: 07:30)');
    }
    if (!endTime) {
      validationErrors.push('Jam Selesai wajib diisi (format HH:mm, contoh: 08:15)');
    }

    const label = rawLabel || `Jam ${idx + 1}`;
    const period = rawPeriod || (startTime && endTime ? `${startTime} - ${endTime}` : '');

    parsed.push({
      rowIndex: idx + 2,
      rawLabel,
      rawStartTime,
      rawEndTime,
      rawPeriod,
      label,
      startTime,
      endTime,
      period,
      isValid: validationErrors.length === 0,
      validationErrors
    });
  });

  // Sort chronological
  parsed.sort((a, b) => a.startTime.localeCompare(b.startTime));

  return parsed;
}

/**
 * Parse Jadwal Guru Piket from Excel
 */
export async function parsePiketExcel(
  file: File,
  teachers: Teacher[]
): Promise<ParsedPiketRow[]> {
  const rawRows = await readWorksheetRows(file);
  const parsed: ParsedPiketRow[] = [];

  rawRows.forEach((row, idx) => {
    const rawTeacher = findValue(row, ['Nama Guru / NIP', 'Nama Guru', 'Guru', 'Petugas Piket']);
    const rawDays = findValue(row, ['Hari Tugas Piket', 'Hari Piket', 'Hari', 'Jadwal']);
    const rawStatus = findValue(row, ['Status Aktif (Aktif/Nonaktif)', 'Status', 'Aktif']);
    const rawNotes = findValue(row, ['Pos / Catatan Tugas', 'Catatan', 'Lokasi', 'Pos']);

    if (!rawTeacher) return;

    const validationErrors: string[] = [];

    // Match teacher
    const matched = matchTeacher(rawTeacher, teachers);
    if (!matched) {
      validationErrors.push(`Guru "${rawTeacher}" tidak ditemukan di database`);
    }

    // Match days (supports multiple days separated by comma)
    const assignedDays: DayOfWeek[] = [];
    if (rawDays) {
      const parts = rawDays.split(/[,;/+]/);
      parts.forEach((p) => {
        const norm = normalizeDay(p.trim());
        if (norm && !assignedDays.includes(norm)) {
          assignedDays.push(norm);
        }
      });
    }

    if (assignedDays.length === 0) {
      assignedDays.push('Senin'); // Default if empty
    }

    let isActive = true;
    if (rawStatus.trim().toLowerCase().includes('non') || rawStatus.trim().toLowerCase().includes('tidak')) {
      isActive = false;
    }

    parsed.push({
      rowIndex: idx + 2,
      rawTeacher,
      rawDays,
      rawStatus,
      rawNotes,
      teacherId: matched ? matched.id : null,
      teacherName: matched ? matched.name : rawTeacher,
      nip: matched ? matched.nip : '',
      assignedDays,
      isActive,
      notes: rawNotes,
      isValid: validationErrors.length === 0 && Boolean(matched),
      validationErrors
    });
  });

  return parsed;
}
