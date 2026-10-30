import * as XLSX from 'xlsx';
import {
  Teacher,
  ClassRoom,
  Subject,
  TimeSlot,
  ScheduleItem,
  DayOfWeek
} from '../types';
import { INDONESIAN_DAYS } from '../data/initialData';

export interface ParsedScheduleRow {
  rowIndex: number;
  rawDay: string;
  rawTeacher: string;
  rawClass: string;
  rawSubject: string;
  rawTimeSlot: string;
  rawRoom: string;
  rawNotes: string;

  // Resolved matches
  day: DayOfWeek | null;
  teacherId: string | null;
  teacherName: string | null;
  classRoomId: string | null;
  className: string | null;
  subjectId: string | null;
  subjectName: string | null;
  timeSlotId: string | null;
  timeSlotIds?: string[];
  timeSlotLabel: string | null;
  room?: string;
  notes?: string;

  isValid: boolean;
  validationErrors: string[];
}

/**
 * Normalizes string for fuzzy matching (lowercase, removes punctuation and titles)
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses days from Indonesian text or abbreviations
 */
export function normalizeDay(dayStr: string): DayOfWeek | null {
  if (!dayStr) return null;
  const clean = dayStr.trim().toLowerCase();
  if (clean.includes('sen')) return 'Senin';
  if (clean.includes('sel')) return 'Selasa';
  if (clean.includes('rab')) return 'Rabu';
  if (clean.includes('kam')) return 'Kamis';
  if (clean.includes('jum')) return 'Jumat';
  if (clean.includes('sab')) return 'Sabtu';
  return null;
}

/**
 * Match a teacher by name or NIP
 */
export function matchTeacher(
  input: string,
  teachers: Teacher[]
): Teacher | null {
  if (!input) return null;
  const trimmed = input.trim();
  const normalizedInput = normalizeString(trimmed);

  // 1. Direct NIP match (numeric)
  const numericOnly = trimmed.replace(/[^0-9]/g, '');
  if (numericOnly.length >= 6) {
    const byNip = teachers.find(
      (t) => t.nip && t.nip.replace(/[^0-9]/g, '').includes(numericOnly)
    );
    if (byNip) return byNip;
  }

  // 2. Exact name match
  const exact = teachers.find(
    (t) => t.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (exact) return exact;

  // 3. Normalized name match
  const normalized = teachers.find(
    (t) => normalizeString(t.name) === normalizedInput
  );
  if (normalized) return normalized;

  // 4. Substring / contains match
  const substring = teachers.find((t) => {
    const normTeacher = normalizeString(t.name);
    return (
      normTeacher.includes(normalizedInput) ||
      normalizedInput.includes(normTeacher)
    );
  });
  if (substring) return substring;

  return null;
}

/**
 * Match a class by name (e.g. "X-1", "XI MIPA 1", "X 1")
 */
export function matchClass(
  input: string,
  classes: ClassRoom[]
): ClassRoom | null {
  if (!input) return null;
  const trimmed = input.trim();
  const normalized = normalizeString(trimmed);

  // Exact match
  const exact = classes.find(
    (c) => c.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (exact) return exact;

  // Normalized
  const norm = classes.find(
    (c) => normalizeString(c.name) === normalized
  );
  if (norm) return norm;

  // Without hyphens: e.g. "X 1" matches "X-1"
  const noHyphen = normalized.replace(/[-_ ]/g, '');
  const found = classes.find(
    (c) => normalizeString(c.name).replace(/[-_ ]/g, '') === noHyphen
  );
  if (found) return found;

  return null;
}

/**
 * Match a subject by name or code
 */
export function matchSubject(
  input: string,
  subjects: Subject[]
): Subject | null {
  if (!input) return null;
  const trimmed = input.trim();
  const normalized = normalizeString(trimmed);

  // By code (e.g. "MAT", "FIS")
  const byCode = subjects.find(
    (s) => s.code.toLowerCase() === trimmed.toLowerCase()
  );
  if (byCode) return byCode;

  // Exact name
  const exact = subjects.find(
    (s) => s.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (exact) return exact;

  // Normalized
  const norm = subjects.find(
    (s) => normalizeString(s.name) === normalized
  );
  if (norm) return norm;

  // Substring
  const sub = subjects.find((s) => {
    const normSub = normalizeString(s.name);
    return normSub.includes(normalized) || normalized.includes(normSub);
  });
  if (sub) return sub;

  return null;
}

/**
 * Match time slots. Handles single ("Jam 1", "1") or multiple ("Jam 1-2", "Jam 1, 2", "1 - 2")
 */
export function matchTimeSlots(
  input: string,
  timeSlots: TimeSlot[]
): { primarySlotId: string | null; allSlotIds: string[]; label: string | null } {
  if (!input) return { primarySlotId: null, allSlotIds: [], label: null };
  const trimmed = input.trim();

  // Extract all numbers: e.g. "Jam 1-2" -> [1, 2]
  const numbers = trimmed.match(/\d+/g);

  if (numbers && numbers.length > 0) {
    const matchedSlots: TimeSlot[] = [];

    if (numbers.length === 1) {
      const num = parseInt(numbers[0], 10);
      const slot = timeSlots.find(
        (ts) => ts.label.toLowerCase().includes(`jam ${num}`) || ts.label.toLowerCase() === `jam ${num}`
      );
      if (slot) matchedSlots.push(slot);
    } else if (numbers.length >= 2) {
      const startNum = parseInt(numbers[0], 10);
      const endNum = parseInt(numbers[1], 10);
      const minNum = Math.min(startNum, endNum);
      const maxNum = Math.max(startNum, endNum);

      for (let n = minNum; n <= maxNum; n++) {
        const slot = timeSlots.find(
          (ts) => ts.label.toLowerCase().includes(`jam ${n}`) || ts.label.toLowerCase() === `jam ${n}`
        );
        if (slot && !matchedSlots.some((s) => s.id === slot.id)) {
          matchedSlots.push(slot);
        }
      }
    }

    if (matchedSlots.length > 0) {
      const allIds = matchedSlots.map((s) => s.id);
      const label =
        matchedSlots.length === 1
          ? matchedSlots[0].label
          : `${matchedSlots[0].label} - ${matchedSlots[matchedSlots.length - 1].label}`;
      return {
        primarySlotId: matchedSlots[0].id,
        allSlotIds: allIds,
        label
      };
    }
  }

  // Fallback: match by label text
  const direct = timeSlots.find(
    (ts) => ts.label.toLowerCase() === trimmed.toLowerCase()
  );
  if (direct) {
    return {
      primarySlotId: direct.id,
      allSlotIds: [direct.id],
      label: direct.label
    };
  }

  return { primarySlotId: null, allSlotIds: [], label: null };
}

/**
 * Parse an Excel file (.xlsx, .xls, .csv) into validated schedule rows
 */
export async function parseScheduleExcelFile(
  file: File,
  teachers: Teacher[],
  classes: ClassRoom[],
  subjects: Subject[],
  timeSlots: TimeSlot[]
): Promise<ParsedScheduleRow[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });

  // Use the first sheet or the sheet named 'Jadwal_Mengajar' or 'Jadwal'
  const sheetName =
    workbook.SheetNames.find(
      (n) => n.toLowerCase().includes('jadwal') || n.toLowerCase().includes('schedule')
    ) || workbook.SheetNames[0];

  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) return [];

  // Parse as JSON array of arrays
  const rows: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: ''
  });

  if (rows.length === 0) return [];

  // Find header row (usually contains "Hari" or "Guru" or "Kelas" or "Mapel")
  let headerRowIndex = 0;
  let colDay = -1;
  let colTeacher = -1;
  let colClass = -1;
  let colSubject = -1;
  let colTime = -1;
  let colRoom = -1;
  let colNotes = -1;

  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i] as string[];
    const rowStr = row.map((c) => String(c || '').toLowerCase());

    const dayIdx = rowStr.findIndex((c) => c.includes('hari') || c.includes('day'));
    const teacherIdx = rowStr.findIndex(
      (c) => c.includes('guru') || c.includes('pengampu') || c.includes('nama') || c.includes('nip')
    );
    const classIdx = rowStr.findIndex((c) => c.includes('kelas') || c.includes('rombel'));
    const subjectIdx = rowStr.findIndex(
      (c) => c.includes('mapel') || c.includes('mata pelajaran') || c.includes('pelajaran') || c.includes('subjek')
    );
    const timeIdx = rowStr.findIndex(
      (c) => c.includes('jam') || c.includes('waktu') || c.includes('sesi') || c.includes('slot')
    );

    if (dayIdx >= 0 || teacherIdx >= 0 || classIdx >= 0 || subjectIdx >= 0) {
      headerRowIndex = i;
      colDay = dayIdx;
      colTeacher = teacherIdx;
      colClass = classIdx;
      colSubject = subjectIdx;
      colTime = timeIdx;
      colRoom = rowStr.findIndex((c) => c.includes('ruang') || c.includes('room'));
      colNotes = rowStr.findIndex((c) => c.includes('catatan') || c.includes('keterangan') || c.includes('notes'));
      break;
    }
  }

  // Fallback defaults if columns not detected by name:
  // Col 0: Hari, Col 1: Guru, Col 2: Kelas, Col 3: Mapel, Col 4: Jam, Col 5: Ruang/Catatan
  if (colDay < 0) colDay = 0;
  if (colTeacher < 0) colTeacher = 1;
  if (colClass < 0) colClass = 2;
  if (colSubject < 0) colSubject = 3;
  if (colTime < 0) colTime = 4;
  if (colRoom < 0) colRoom = 5;
  if (colNotes < 0) colNotes = 6;

  const results: ParsedScheduleRow[] = [];

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i] as string[];
    if (!row || row.length === 0) continue;

    const rawDay = String(row[colDay] || '').trim();
    const rawTeacher = String(row[colTeacher] || '').trim();
    const rawClass = String(row[colClass] || '').trim();
    const rawSubject = String(row[colSubject] || '').trim();
    const rawTimeSlot = String(row[colTime] || '').trim();
    const rawRoom = colRoom >= 0 ? String(row[colRoom] || '').trim() : '';
    const rawNotes = colNotes >= 0 ? String(row[colNotes] || '').trim() : '';

    // Ignore completely empty rows
    if (!rawDay && !rawTeacher && !rawClass && !rawSubject && !rawTimeSlot) {
      continue;
    }

    const validationErrors: string[] = [];

    // Match Day
    const matchedDay = normalizeDay(rawDay);
    if (!matchedDay) {
      validationErrors.push(`Hari "${rawDay}" tidak valid (Gunakan: Senin, Selasa, Rabu, Kamis, Jumat, Sabtu)`);
    }

    // Match Teacher
    const matchedTeacher = matchTeacher(rawTeacher, teachers);
    if (!matchedTeacher) {
      validationErrors.push(`Guru "${rawTeacher}" tidak ditemukan di Master Data Guru`);
    }

    // Match Class
    const matchedClass = matchClass(rawClass, classes);
    if (!matchedClass) {
      validationErrors.push(`Kelas "${rawClass}" tidak ditemukan di Master Data Kelas`);
    }

    // Match Subject
    const matchedSubj = matchSubject(rawSubject, subjects);
    if (!matchedSubj) {
      validationErrors.push(`Mata Pelajaran "${rawSubject}" tidak ditemukan`);
    }

    // Match TimeSlot
    const matchedTime = matchTimeSlots(rawTimeSlot, timeSlots);
    if (!matchedTime.primarySlotId) {
      validationErrors.push(`Jam Pelajaran "${rawTimeSlot}" tidak sesuai format (contoh: Jam 1, Jam 1-2, atau 1)`);
    }

    results.push({
      rowIndex: i + 1,
      rawDay,
      rawTeacher,
      rawClass,
      rawSubject,
      rawTimeSlot,
      rawRoom,
      rawNotes,
      day: matchedDay,
      teacherId: matchedTeacher?.id || null,
      teacherName: matchedTeacher?.name || null,
      classRoomId: matchedClass?.id || null,
      className: matchedClass?.name || null,
      subjectId: matchedSubj?.id || null,
      subjectName: matchedSubj?.name || null,
      timeSlotId: matchedTime.primarySlotId,
      timeSlotIds: matchedTime.allSlotIds,
      timeSlotLabel: matchedTime.label,
      room: rawRoom,
      notes: rawNotes,
      isValid: validationErrors.length === 0,
      validationErrors
    });
  }

  return results;
}

/**
 * Downloads a professional, pre-filled Excel template for teaching schedule
 */
export function downloadScheduleExcelTemplate(
  teachers: Teacher[],
  classes: ClassRoom[],
  subjects: Subject[],
  timeSlots: TimeSlot[]
): void {
  const wb = XLSX.utils.book_new();

  // 1. Sheet: Jadwal_Mengajar (with sample realistic data for SMAN 1 Julok)
  const sampleTeacher1 = teachers[0]?.name || 'Drs. Muhammad Yusuf';
  const sampleTeacher2 = teachers[1]?.name || 'Siti Aminah, M.Pd.';
  const sampleTeacher3 = teachers[2]?.name || 'Ahmad Dahlan, S.Pd.';
  const sampleClass1 = classes[0]?.name || 'X-1';
  const sampleClass2 = classes[1]?.name || 'X-2';
  const sampleClass3 = classes[2]?.name || 'XI MIPA 1';
  const sampleSubject1 = subjects[0]?.name || 'Bahasa Indonesia';
  const sampleSubject2 = subjects[1]?.name || 'Matematika Wajib';
  const sampleSubject3 = subjects[2]?.name || 'Fisika';

  const scheduleHeaders = [
    ['PETUNJUK PENGISIAN:', '', '', '', '', ''],
    ['1. Isi kolom Hari dengan: Senin, Selasa, Rabu, Kamis, Jumat, atau Sabtu', '', '', '', '', ''],
    ['2. Nama Guru dapat menggunakan Nama Lengkap atau NIP yang sesuai pada sheet "Referensi_Guru"', '', '', '', '', ''],
    ['3. Kelas harus sesuai dengan daftar pada sheet "Referensi_Kelas" (contoh: X-1, XI MIPA 1)', '', '', '', '', ''],
    ['4. Jam Pelajaran dapat berupa satu jam (contoh: Jam 1) atau rentang jam (contoh: Jam 1-2 atau Jam 3-4)', '', '', '', '', ''],
    ['', '', '', '', '', ''],
    [
      'Hari',
      'Nama Guru / NIP',
      'Kelas',
      'Mata Pelajaran',
      'Jam Pelajaran',
      'Ruangan / Catatan'
    ]
  ];

  const sampleRows = [
    ['Senin', sampleTeacher1, sampleClass1, sampleSubject1, 'Jam 1-2', 'Ruang Kelas X-1'],
    ['Senin', sampleTeacher2, sampleClass2, sampleSubject2, 'Jam 3-4', 'Ruang Kelas X-2'],
    ['Senin', sampleTeacher3, sampleClass3, sampleSubject3, 'Jam 5-6', 'Lab Fisika'],
    ['Selasa', sampleTeacher1, sampleClass2, sampleSubject1, 'Jam 1-2', 'Ruang Kelas X-2'],
    ['Selasa', sampleTeacher2, sampleClass3, sampleSubject2, 'Jam 3-4', 'Ruang Kelas XI MIPA 1'],
    ['Rabu', sampleTeacher3, sampleClass1, sampleSubject3, 'Jam 1-2', 'Ruang Kelas X-1'],
    ['Kamis', sampleTeacher1, sampleClass3, sampleSubject1, 'Jam 3-4', 'Ruang Kelas XI MIPA 1'],
    ['Jumat', sampleTeacher2, sampleClass1, sampleSubject2, 'Jam 1-2', 'Ruang Kelas X-1'],
    ['Sabtu', sampleTeacher3, sampleClass2, sampleSubject3, 'Jam 3-4', 'Ruang Kelas X-2']
  ];

  const scheduleSheetData = [...scheduleHeaders, ...sampleRows];
  const wsSchedule = XLSX.utils.aoa_to_sheet(scheduleSheetData);

  // Set column widths
  wsSchedule['!cols'] = [
    { wch: 12 }, // Hari
    { wch: 32 }, // Nama Guru
    { wch: 16 }, // Kelas
    { wch: 28 }, // Mapel
    { wch: 18 }, // Jam Pelajaran
    { wch: 22 }  // Ruangan / Catatan
  ];

  XLSX.utils.book_append_sheet(wb, wsSchedule, 'Jadwal_Mengajar');

  // 2. Sheet: Referensi_Guru
  const teacherRows = [
    ['No', 'Nama Guru', 'NIP', 'Jenis Kelamin', 'Status'],
    ...teachers.map((t, idx) => [idx + 1, t.name, t.nip || '-', t.gender === 'L' ? 'Laki-Laki' : 'Perempuan', t.status || 'Aktif'])
  ];
  const wsTeacher = XLSX.utils.aoa_to_sheet(teacherRows);
  wsTeacher['!cols'] = [{ wch: 6 }, { wch: 32 }, { wch: 24 }, { wch: 16 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsTeacher, 'Referensi_Guru');

  // 3. Sheet: Referensi_Kelas
  const classRows = [
    ['No', 'Nama Kelas', 'Tingkat', 'Jurusan'],
    ...classes.map((c, idx) => [idx + 1, c.name, c.grade, c.major || 'Umum'])
  ];
  const wsClass = XLSX.utils.aoa_to_sheet(classRows);
  wsClass['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 12 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsClass, 'Referensi_Kelas');

  // 4. Sheet: Referensi_Mapel
  const subjectRows = [
    ['No', 'Nama Mata Pelajaran', 'Kode Mapel', 'Kategori'],
    ...subjects.map((s, idx) => [idx + 1, s.name, s.code, s.category || 'Wajib'])
  ];
  const wsSubject = XLSX.utils.aoa_to_sheet(subjectRows);
  wsSubject['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 14 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsSubject, 'Referensi_Mapel');

  // 5. Sheet: Referensi_Jam
  const slotRows = [
    ['No', 'Label Jam Pelajaran', 'Waktu Pelaksanaan', 'Keterangan'],
    ...timeSlots.map((ts, idx) => [idx + 1, ts.label, ts.period, `${ts.startTime} s/d ${ts.endTime} WIB`])
  ];
  const wsSlot = XLSX.utils.aoa_to_sheet(slotRows);
  wsSlot['!cols'] = [{ wch: 6 }, { wch: 22 }, { wch: 20 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, wsSlot, 'Referensi_Jam');

  // Trigger browser download
  XLSX.writeFile(wb, 'Template_Jadwal_Mengajar_SMAN_1_JULOK.xlsx');
}

/**
 * Exports current schedules to Excel file (.xlsx)
 */
export function exportSchedulesToExcel(
  schedules: ScheduleItem[],
  teachers: Teacher[],
  classes: ClassRoom[],
  subjects: Subject[],
  timeSlots: TimeSlot[]
): void {
  const wb = XLSX.utils.book_new();

  const sorted = [...schedules].sort((a, b) => {
    const dayDiff = INDONESIAN_DAYS.indexOf(a.day) - INDONESIAN_DAYS.indexOf(b.day);
    if (dayDiff !== 0) return dayDiff;
    const slotA = timeSlots.findIndex((t) => t.id === a.timeSlotId);
    const slotB = timeSlots.findIndex((t) => t.id === b.timeSlotId);
    return (slotA >= 0 ? slotA : 999) - (slotB >= 0 ? slotB : 999);
  });

  const headers = [
    'No',
    'Hari',
    'Nama Guru',
    'NIP Guru',
    'Kelas',
    'Mata Pelajaran',
    'Kode Mapel',
    'Jam Pelajaran',
    'Waktu WIB',
    'Ruangan / Catatan'
  ];

  const dataRows = sorted.map((s, idx) => {
    const t = teachers.find((tc) => tc.id === s.teacherId);
    const c = classes.find((cl) => cl.id === s.classRoomId);
    const sb = subjects.find((sub) => sub.id === s.subjectId);

    // Compute slot label
    let timeLabel = '-';
    let timePeriod = '-';
    if (s.timeSlotIds && s.timeSlotIds.length > 1) {
      const first = timeSlots.find((slot) => slot.id === s.timeSlotIds![0]);
      const last = timeSlots.find((slot) => slot.id === s.timeSlotIds![s.timeSlotIds!.length - 1]);
      timeLabel = first && last ? `${first.label} - ${last.label}` : first?.label || '-';
      timePeriod = first && last ? `${first.startTime} - ${last.endTime}` : first?.period || '-';
    } else {
      const slot = timeSlots.find((slot) => slot.id === s.timeSlotId);
      timeLabel = slot?.label || '-';
      timePeriod = slot?.period || '-';
    }

    return [
      idx + 1,
      s.day,
      t?.name || '-',
      t?.nip || '-',
      c?.name || '-',
      sb?.name || '-',
      sb?.code || '-',
      timeLabel,
      timePeriod,
      s.room || s.notes || '-'
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 12 },
    { wch: 32 },
    { wch: 22 },
    { wch: 16 },
    { wch: 28 },
    { wch: 12 },
    { wch: 18 },
    { wch: 18 },
    { wch: 22 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Jadwal_SMAN_1_Julok');

  const todayStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Jadwal_Mengajar_SMAN1Julok_${todayStr}.xlsx`);
}
