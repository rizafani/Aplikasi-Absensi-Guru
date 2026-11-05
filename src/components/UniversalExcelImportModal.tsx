import React, { useState, useRef } from 'react';
import {
  Teacher,
  ClassRoom,
  Subject,
  TimeSlot,
  PiketAccount,
  DayOfWeek
} from '../types';
import {
  downloadTeachersExcelTemplate,
  downloadBkTuExcelTemplate,
  downloadClassesExcelTemplate,
  downloadSubjectsExcelTemplate,
  downloadTimeSlotsExcelTemplate,
  downloadPiketExcelTemplate,
  parseTeachersExcel,
  parseBkTuExcel,
  parseClassesExcel,
  parseSubjectsExcel,
  parseTimeSlotsExcel,
  parsePiketExcel,
  ParsedTeacherRow,
  ParsedClassRow,
  ParsedSubjectRow,
  ParsedTimeSlotRow,
  ParsedPiketRow
} from '../utils/universalExcel';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
  FileCheck,
  RefreshCw,
  HelpCircle,
  Check,
  Layers,
  ArrowRight,
  Users,
  School,
  BookOpen,
  Clock,
  ClipboardList
} from 'lucide-react';
import {
  cleanTeacherNameForUsername,
  generateDefaultPiketPassword
} from '../utils/piketAuth';

export type ExcelImportTarget =
  | 'teachers'
  | 'bk_tu'
  | 'classes'
  | 'subjects'
  | 'timeslots'
  | 'piket';

interface UniversalExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTarget?: ExcelImportTarget;
  teachers: Teacher[];
  classes: ClassRoom[];
  subjects: Subject[];
  timeSlots: TimeSlot[];
  piketAccounts: PiketAccount[];
  onImportTeachers: (newTeachers: Teacher[], replaceAll: boolean) => Promise<void> | void;
  onImportClasses: (newClasses: ClassRoom[], replaceAll: boolean) => Promise<void> | void;
  onImportSubjects: (newSubjects: Subject[], replaceAll: boolean) => Promise<void> | void;
  onImportTimeSlots: (newTimeSlots: TimeSlot[], replaceAll: boolean) => Promise<void> | void;
  onImportPiket: (newPiket: PiketAccount[], replaceAll: boolean) => Promise<void> | void;
}

export const UniversalExcelImportModal: React.FC<UniversalExcelImportModalProps> = ({
  isOpen,
  onClose,
  initialTarget = 'teachers',
  teachers,
  classes,
  subjects,
  timeSlots,
  piketAccounts,
  onImportTeachers,
  onImportClasses,
  onImportSubjects,
  onImportTimeSlots,
  onImportPiket
}) => {
  const [currentTarget, setCurrentTarget] = useState<ExcelImportTarget>(initialTarget);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [filterPreview, setFilterPreview] = useState<'ALL' | 'VALID' | 'INVALID'>('ALL');
  const [importMode, setImportMode] = useState<'MERGE' | 'REPLACE'>('MERGE');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Parsed states for each entity
  const [parsedTeachers, setParsedTeachers] = useState<ParsedTeacherRow[]>([]);
  const [parsedClasses, setParsedClasses] = useState<ParsedClassRow[]>([]);
  const [parsedSubjects, setParsedSubjects] = useState<ParsedSubjectRow[]>([]);
  const [parsedTimeSlots, setParsedTimeSlots] = useState<ParsedTimeSlotRow[]>([]);
  const [parsedPiket, setParsedPiket] = useState<ParsedPiketRow[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync initialTarget when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setCurrentTarget(initialTarget);
      resetState();
    }
  }, [isOpen, initialTarget]);

  const resetState = () => {
    setSelectedFile(null);
    setErrorMessage(null);
    setParsedTeachers([]);
    setParsedClasses([]);
    setParsedSubjects([]);
    setParsedTimeSlots([]);
    setParsedPiket([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  const targetConfigs: Record<
    ExcelImportTarget,
    {
      title: string;
      desc: string;
      icon: React.ComponentType<{ className?: string }>;
      downloadFn: () => void;
      columns: string[];
    }
  > = {
    teachers: {
      title: 'Import Data Guru',
      desc: 'Impor daftar dewan guru lengkap dengan NIP, jenis kelamin, kontak WhatsApp, dan email resmi.',
      icon: Users,
      downloadFn: downloadTeachersExcelTemplate,
      columns: ['Nama Guru & Gelar', 'NIP', 'Jenis Kelamin (L/P)', 'No. HP', 'Email', 'Status']
    },
    bk_tu: {
      title: 'Import Guru BK & Staff TU',
      desc: 'Impor data Guru Bimbingan & Konseling (BK) serta Staff Tata Usaha (TU) untuk sistem absensi harian.',
      icon: Users,
      downloadFn: downloadBkTuExcelTemplate,
      columns: ['Nama Lengkap & Gelar', 'NIP / NIK', 'Kategori (Guru BK / Staff TU)', 'Jabatan / Tugas', 'JK (L/P)', 'No. HP', 'Email', 'Status']
    },
    classes: {
      title: 'Import Data Kelas',
      desc: 'Impor daftar rombongan belajar (rombel) kelas X, XI, dan XII beserta peminatan/jurusan.',
      icon: School,
      downloadFn: downloadClassesExcelTemplate,
      columns: ['Nama Kelas (X-1, XI-F1, dll)', 'Tingkat (X/XI/XII)', 'Jurusan (Umum/MIPA/IPS)']
    },
    subjects: {
      title: 'Import Mata Pelajaran',
      desc: 'Impor seluruh mata pelajaran kurikulum merdeka/nasional beserta kode mapel dan kelompok.',
      icon: BookOpen,
      downloadFn: downloadSubjectsExcelTemplate,
      columns: ['Nama Mata Pelajaran', 'Kode Mapel (MAT, FIS, dll)', 'Kategori (Wajib/Peminatan/Muatan Lokal)']
    },
    timeslots: {
      title: 'Import Jam Pelajaran',
      desc: 'Impor susunan jam pelajaran harian (Jam 1, Jam 2, dst.) lengkap dengan waktu mulai dan selesai.',
      icon: Clock,
      downloadFn: downloadTimeSlotsExcelTemplate,
      columns: ['Label Jam', 'Jam Mulai (HH:MM)', 'Jam Selesai (HH:MM)', 'Keterangan/Periode']
    },
    piket: {
      title: 'Import Jadwal Guru Piket',
      desc: 'Impor pembagian jadwal piket mingguan dewan guru beserta lokasi tugas pos sekolah.',
      icon: ClipboardList,
      downloadFn: () => downloadPiketExcelTemplate(teachers),
      columns: ['Nama Guru / NIP', 'Hari Tugas Piket', 'Status Aktif', 'Pos / Catatan Tugas']
    }
  };

  const activeConfig = targetConfigs[currentTarget];

  const handleFileSelected = async (file: File) => {
    setSelectedFile(file);
    setErrorMessage(null);
    setIsParsing(true);

    try {
      if (currentTarget === 'teachers') {
        const results = await parseTeachersExcel(file);
        if (results.length === 0) throw new Error('Tidak ada data guru yang terbaca dari file.');
        setParsedTeachers(results);
      } else if (currentTarget === 'bk_tu') {
        const results = await parseBkTuExcel(file);
        if (results.length === 0) throw new Error('Tidak ada data Guru BK / Staff TU yang terbaca dari file.');
        setParsedTeachers(results);
      } else if (currentTarget === 'classes') {
        const results = await parseClassesExcel(file);
        if (results.length === 0) throw new Error('Tidak ada data kelas yang terbaca dari file.');
        setParsedClasses(results);
      } else if (currentTarget === 'subjects') {
        const results = await parseSubjectsExcel(file);
        if (results.length === 0) throw new Error('Tidak ada data mata pelajaran yang terbaca dari file.');
        setParsedSubjects(results);
      } else if (currentTarget === 'timeslots') {
        const results = await parseTimeSlotsExcel(file);
        if (results.length === 0) throw new Error('Tidak ada data jam pelajaran yang terbaca dari file.');
        setParsedTimeSlots(results);
      } else if (currentTarget === 'piket') {
        const results = await parsePiketExcel(file, teachers);
        if (results.length === 0) throw new Error('Tidak ada data jadwal piket yang terbaca dari file.');
        setParsedPiket(results);
      }
    } catch (err: unknown) {
      console.error('Parsing error:', err);
      const msg = err instanceof Error ? err.message : 'Format file tidak didukung.';
      setErrorMessage(`Gagal memproses file Excel: ${msg}`);
      resetState();
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileSelected(file);
    }
  };

  // Get current active parsed list
  const getCurrentRows = () => {
    switch (currentTarget) {
      case 'teachers':
      case 'bk_tu':
        return parsedTeachers;
      case 'classes':
        return parsedClasses;
      case 'subjects':
        return parsedSubjects;
      case 'timeslots':
        return parsedTimeSlots;
      case 'piket':
        return parsedPiket;
      default:
        return [];
    }
  };

  const allRows = getCurrentRows();
  const validRows = allRows.filter((r) => r.isValid);
  const invalidRows = allRows.filter((r) => !r.isValid);

  const displayedRows =
    filterPreview === 'ALL'
      ? allRows
      : filterPreview === 'VALID'
      ? validRows
      : invalidRows;

  // Execute import commit
  const handleCommitImport = async () => {
    if (validRows.length === 0) {
      alert('Tidak ada baris data valid yang dapat diimpor.');
      return;
    }

    setIsSubmitting(true);
    try {
      const isReplace = importMode === 'REPLACE';

      if (currentTarget === 'teachers' || currentTarget === 'bk_tu') {
        const newTeacherList: Teacher[] = (validRows as ParsedTeacherRow[]).map((r, i) => {
          // Check if existing teacher matches NIP or Name to preserve ID
          const existing = teachers.find(
            (t) =>
              (t.nip && r.nip && t.nip.replace(/\D/g, '') === r.nip.replace(/\D/g, '')) ||
              t.name.toLowerCase() === r.name.toLowerCase()
          );
          return {
            id: existing ? existing.id : `guru-${Date.now()}-${i + 1}`,
            name: r.name,
            nip: r.nip || '-',
            gender: r.gender,
            phone: r.phone || '',
            email: r.email || '',
            status: r.status,
            category: r.category || (currentTarget === 'bk_tu' ? 'STAFF_TU' : 'GURU_MAPEL'),
            jabatan: r.jabatan || existing?.jabatan
          };
        });
        await onImportTeachers(newTeacherList, isReplace);
      } else if (currentTarget === 'classes') {
        const newClassList: ClassRoom[] = (validRows as ParsedClassRow[]).map((r, i) => {
          const existing = classes.find(
            (c) => c.name.toLowerCase() === r.name.toLowerCase()
          );
          return {
            id: existing ? existing.id : `kls-${Date.now()}-${i + 1}`,
            name: r.name,
            grade: r.grade,
            major: r.major
          };
        });
        await onImportClasses(newClassList, isReplace);
      } else if (currentTarget === 'subjects') {
        const newSubjectList: Subject[] = (validRows as ParsedSubjectRow[]).map((r, i) => {
          const existing = subjects.find(
            (s) =>
              s.name.toLowerCase() === r.name.toLowerCase() ||
              (s.code && r.code && s.code.toLowerCase() === r.code.toLowerCase())
          );
          return {
            id: existing ? existing.id : `mapel-${Date.now()}-${i + 1}`,
            name: r.name,
            code: r.code,
            category: r.category
          };
        });
        await onImportSubjects(newSubjectList, isReplace);
      } else if (currentTarget === 'timeslots') {
        const newSlotList: TimeSlot[] = (validRows as ParsedTimeSlotRow[]).map((r, i) => {
          return {
            id: `ts-${Date.now()}-${i + 1}`,
            label: r.label,
            startTime: r.startTime,
            endTime: r.endTime,
            period: r.period
          };
        });
        newSlotList.sort((a, b) => a.startTime.localeCompare(b.startTime));
        await onImportTimeSlots(newSlotList, isReplace);
      } else if (currentTarget === 'piket') {
        const newPiketList: PiketAccount[] = (validRows as ParsedPiketRow[]).map((r) => {
          const existing = piketAccounts.find((p) => p.teacherId === r.teacherId);
          return {
            id: existing ? existing.id : `piket-${r.teacherId}`,
            teacherId: r.teacherId || '',
            teacherName: r.teacherName,
            nip: r.nip,
            username: cleanTeacherNameForUsername(r.teacherName),
            password: existing?.password || generateDefaultPiketPassword(r.nip, r.teacherName),
            assignedDays: r.assignedDays,
            isActive: r.isActive,
            notes: r.notes || '',
            updatedAt: new Date().toISOString()
          };
        });
        await onImportPiket(newPiketList, isReplace);
      }

      onClose();
    } catch (err: unknown) {
      console.error('Import failed:', err);
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
      alert(`Gagal mengimpor data: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-4xl w-full my-auto max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold">
                  Import File Excel (.xlsx / .xls)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-400/40">
                  Semua Data Input
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                SMA NEGERI 1 JULOK • Unggah dokumen Excel untuk memasukkan data secara massal
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Entity Switcher Tabs */}
        <div className="bg-slate-100 border-b border-slate-200 p-2 sm:px-4 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
          {(
            [
              { id: 'teachers', label: '1. Data Guru', icon: Users, count: teachers.length },
              { id: 'classes', label: '2. Data Kelas', icon: School, count: classes.length },
              { id: 'subjects', label: '3. Mata Pelajaran', icon: BookOpen, count: subjects.length },
              { id: 'timeslots', label: '4. Jam Pelajaran', icon: Clock, count: timeSlots.length },
              { id: 'piket', label: '5. Jadwal Guru Piket', icon: ClipboardList, count: piketAccounts.length }
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const isActive = currentTarget === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (currentTarget !== item.id) {
                    setCurrentTarget(item.id);
                    resetState();
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/80'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Active Target Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-blue-950 flex items-center gap-2">
                <activeConfig.icon className="w-4 h-4 text-blue-600" />
                <span>{activeConfig.title}</span>
              </h4>
              <p className="text-xs text-blue-800/80 mt-1">{activeConfig.desc}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-[10px] text-blue-900 font-bold uppercase tracking-wider">
                  Kolom Excel:
                </span>
                {activeConfig.columns.map((c, i) => (
                  <span
                    key={i}
                    className="inline-block px-2 py-0.5 bg-white text-blue-900 text-[10px] font-mono font-semibold rounded border border-blue-200 shadow-2xs"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={activeConfig.downloadFn}
              className="px-3.5 py-2 bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all shrink-0 cursor-pointer active:scale-95 self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Unduh Template Excel</span>
            </button>
          </div>

          {/* Upload Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer ${
              isDragOver
                ? 'border-blue-500 bg-blue-50/70 scale-[0.99]'
                : selectedFile
                ? 'border-emerald-400 bg-emerald-50/40'
                : 'border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileSelected(e.target.files[0]);
                }
              }}
            />

            <div className="flex flex-col items-center justify-center space-y-2">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs ${
                  selectedFile
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600 text-white'
                }`}
              >
                {selectedFile ? (
                  <FileCheck className="w-6 h-6" />
                ) : (
                  <Upload className="w-6 h-6" />
                )}
              </div>

              {selectedFile ? (
                <div>
                  <p className="text-xs font-bold text-emerald-950">
                    File Terpilih: {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    {(selectedFile.size / 1024).toFixed(1)} KB • Klik untuk mengganti file
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Tarik &amp; Lepaskan File Excel (.xlsx / .xls) ke Sini
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    atau klik untuk memilih file dari komputer / HP Anda
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Parsing Spinner */}
          {isParsing && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-blue-800">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              <span>Sedang membaca dan memvalidasi lembar kerja Excel...</span>
            </div>
          )}

          {/* Parsed Results Preview */}
          {allRows.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    Pratinjau Hasil Pembacaan:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFilterPreview('ALL')}
                      className={`px-2.5 py-0.5 text-[11px] font-bold rounded-lg transition-colors ${
                        filterPreview === 'ALL'
                          ? 'bg-slate-800 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Semua ({allRows.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterPreview('VALID')}
                      className={`px-2.5 py-0.5 text-[11px] font-bold rounded-lg transition-colors ${
                        filterPreview === 'VALID'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      Valid ({validRows.length})
                    </button>
                    {invalidRows.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setFilterPreview('INVALID')}
                        className={`px-2.5 py-0.5 text-[11px] font-bold rounded-lg transition-colors ${
                          filterPreview === 'INVALID'
                            ? 'bg-rose-600 text-white'
                            : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                        }`}
                      >
                        Keliru ({invalidRows.length})
                      </button>
                    )}
                  </div>
                </div>

                {/* Import Mode: Merge vs Replace */}
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setImportMode('MERGE')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors ${
                      importMode === 'MERGE'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tambahkan / Perbarui (Merge)
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMode('REPLACE')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors ${
                      importMode === 'REPLACE'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Ganti Semua Data (Replace)
                  </button>
                </div>
              </div>

              {/* Data Table Preview */}
              <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 text-center w-10">No</th>
                      <th className="p-2.5 w-20">Status</th>
                      {(currentTarget === 'teachers' || currentTarget === 'bk_tu') && (
                        <>
                          <th className="p-2.5">Nama Guru</th>
                          <th className="p-2.5">NIP</th>
                          <th className="p-2.5">L/P</th>
                          <th className="p-2.5">No. HP</th>
                          <th className="p-2.5">Status</th>
                        </>
                      )}
                      {currentTarget === 'classes' && (
                        <>
                          <th className="p-2.5">Nama Kelas</th>
                          <th className="p-2.5">Tingkat</th>
                          <th className="p-2.5">Jurusan</th>
                        </>
                      )}
                      {currentTarget === 'subjects' && (
                        <>
                          <th className="p-2.5">Nama Mapel</th>
                          <th className="p-2.5">Kode</th>
                          <th className="p-2.5">Kategori</th>
                        </>
                      )}
                      {currentTarget === 'timeslots' && (
                        <>
                          <th className="p-2.5">Label</th>
                          <th className="p-2.5">Mulai</th>
                          <th className="p-2.5">Selesai</th>
                          <th className="p-2.5">Periode</th>
                        </>
                      )}
                      {currentTarget === 'piket' && (
                        <>
                          <th className="p-2.5">Guru Terpilih</th>
                          <th className="p-2.5">Hari Piket</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Pos Tugas</th>
                        </>
                      )}
                      <th className="p-2.5">Catatan / Validasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={`hover:bg-slate-50 transition-colors ${
                          !row.isValid ? 'bg-rose-50/50' : ''
                        }`}
                      >
                        <td className="p-2.5 text-center font-mono text-slate-400">
                          {row.rowIndex}
                        </td>
                        <td className="p-2.5">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              <Check className="w-3 h-3 text-emerald-600" />
                              Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                              <AlertCircle className="w-3 h-3 text-rose-600" />
                              Keliru
                            </span>
                          )}
                        </td>

                        {/* Entity Columns */}
                        {(currentTarget === 'teachers' || currentTarget === 'bk_tu') && (
                          <>
                            <td className="p-2.5 font-bold text-slate-900">
                              {(row as ParsedTeacherRow).name || '-'}
                            </td>
                            <td className="p-2.5 font-mono text-slate-600">
                              {(row as ParsedTeacherRow).nip || '-'}
                            </td>
                            <td className="p-2.5 text-center font-semibold">
                              {(row as ParsedTeacherRow).gender}
                            </td>
                            <td className="p-2.5 font-mono text-slate-600">
                              {(row as ParsedTeacherRow).phone || '-'}
                            </td>
                            <td className="p-2.5">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  (row as ParsedTeacherRow).status === 'Aktif'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {(row as ParsedTeacherRow).status}
                              </span>
                            </td>
                          </>
                        )}

                        {currentTarget === 'classes' && (
                          <>
                            <td className="p-2.5 font-bold text-slate-900">
                              {(row as ParsedClassRow).name}
                            </td>
                            <td className="p-2.5 font-mono">
                              {(row as ParsedClassRow).grade}
                            </td>
                            <td className="p-2.5 font-semibold text-blue-700">
                              {(row as ParsedClassRow).major}
                            </td>
                          </>
                        )}

                        {currentTarget === 'subjects' && (
                          <>
                            <td className="p-2.5 font-bold text-slate-900">
                              {(row as ParsedSubjectRow).name}
                            </td>
                            <td className="p-2.5 font-mono font-bold text-indigo-700">
                              {(row as ParsedSubjectRow).code}
                            </td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 text-[10px] font-semibold">
                                {(row as ParsedSubjectRow).category}
                              </span>
                            </td>
                          </>
                        )}

                        {currentTarget === 'timeslots' && (
                          <>
                            <td className="p-2.5 font-bold text-slate-900">
                              {(row as ParsedTimeSlotRow).label}
                            </td>
                            <td className="p-2.5 font-mono text-emerald-700 font-bold">
                              {(row as ParsedTimeSlotRow).startTime}
                            </td>
                            <td className="p-2.5 font-mono text-slate-600">
                              {(row as ParsedTimeSlotRow).endTime}
                            </td>
                            <td className="p-2.5 font-mono text-slate-500">
                              {(row as ParsedTimeSlotRow).period}
                            </td>
                          </>
                        )}

                        {currentTarget === 'piket' && (
                          <>
                            <td className="p-2.5 font-bold text-slate-900">
                              {(row as ParsedPiketRow).teacherName}
                            </td>
                            <td className="p-2.5 font-bold text-blue-700">
                              {(row as ParsedPiketRow).assignedDays.join(', ')}
                            </td>
                            <td className="p-2.5">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  (row as ParsedPiketRow).isActive
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {(row as ParsedPiketRow).isActive ? 'Aktif' : 'Nonaktif'}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-600">
                              {(row as ParsedPiketRow).notes || '-'}
                            </td>
                          </>
                        )}

                        {/* Validation message */}
                        <td className="p-2.5 text-[11px]">
                          {row.validationErrors.length > 0 ? (
                            <span className="text-rose-600 font-medium">
                              {row.validationErrors.join(', ')}
                            </span>
                          ) : (
                            <span className="text-slate-400">Siap disimpan</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            {allRows.length > 0 ? (
              <span>
                Total <strong className="text-slate-800">{validRows.length}</strong> dari{' '}
                {allRows.length} baris valid siap diimpor ke database.
              </span>
            ) : (
              <span>Pilih atau seret file Excel (.xlsx / .xls) untuk memulai pratinjau.</span>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleCommitImport}
              disabled={validRows.length === 0 || isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan ke Server...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    Impor {validRows.length} Data {activeConfig.title.replace('Import ', '')}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
