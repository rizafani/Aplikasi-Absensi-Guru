import React, { useState, useRef } from 'react';
import {
  Teacher,
  ClassRoom,
  Subject,
  TimeSlot,
  ScheduleItem
} from '../types';
import {
  parseScheduleExcelFile,
  downloadScheduleExcelTemplate,
  ParsedScheduleRow
} from '../utils/scheduleExcel';
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
  ArrowRight
} from 'lucide-react';

interface ScheduleExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: Teacher[];
  classes: ClassRoom[];
  subjects: Subject[];
  timeSlots: TimeSlot[];
  onImportSchedules: (newSchedules: ScheduleItem[], replaceAll: boolean) => Promise<void> | void;
}

export const ScheduleExcelImportModal: React.FC<ScheduleExcelImportModalProps> = ({
  isOpen,
  onClose,
  teachers,
  classes,
  subjects,
  timeSlots,
  onImportSchedules
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parsedRows, setParsedRows] = useState<ParsedScheduleRow[]>([]);
  const [filterPreview, setFilterPreview] = useState<'ALL' | 'VALID' | 'INVALID'>('ALL');
  const [importMode, setImportMode] = useState<'MERGE' | 'REPLACE'>('MERGE');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const validRows = parsedRows.filter((r) => r.isValid);
  const invalidRows = parsedRows.filter((r) => !r.isValid);

  const handleFileSelected = async (file: File) => {
    setSelectedFile(file);
    setErrorMessage(null);
    setIsParsing(true);

    try {
      const results = await parseScheduleExcelFile(
        file,
        teachers,
        classes,
        subjects,
        timeSlots
      );

      if (results.length === 0) {
        setErrorMessage(
          'Tidak ada data jadwal yang terdeteksi di dalam file Excel. Pastikan baris data memiliki nama kolom seperti: Hari, Guru, Kelas, Mapel, dan Jam.'
        );
      }

      setParsedRows(results);
    } catch (err: unknown) {
      console.error('Error parsing excel:', err);
      const msg = err instanceof Error ? err.message : 'Format file tidak didukung.';
      setErrorMessage(`Gagal membaca file Excel: ${msg}`);
      setParsedRows([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (
        file.name.endsWith('.xlsx') ||
        file.name.endsWith('.xls') ||
        file.name.endsWith('.csv')
      ) {
        handleFileSelected(file);
      } else {
        setErrorMessage('Mohon unggah file dengan format .xlsx, .xls, atau .csv');
      }
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setParsedRows([]);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExecuteImport = async () => {
    if (validRows.length === 0) {
      alert('Tidak ada baris jadwal yang valid untuk diimpor.');
      return;
    }

    if (
      importMode === 'REPLACE' &&
      !confirm(
        `PERINGATAN: Mode "Ganti Seluruh Jadwal" akan menghapus semua jadwal lama dan menggantinya dengan ${validRows.length} jadwal dari file Excel ini. Apakah Anda yakin ingin melanjutkan?`
      )
    ) {
      return;
    }

    setIsSubmitting(true);

    try {
      const scheduleItemsToSave: ScheduleItem[] = validRows.map((r) => ({
        id: `sch-imp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        day: r.day!,
        teacherId: r.teacherId!,
        classRoomId: r.classRoomId!,
        subjectId: r.subjectId!,
        timeSlotId: r.timeSlotId!,
        timeSlotIds: r.timeSlotIds && r.timeSlotIds.length > 0 ? r.timeSlotIds : undefined,
        room: r.room || '',
        notes: r.notes || ''
      }));

      await onImportSchedules(scheduleItemsToSave, importMode === 'REPLACE');

      alert(
        `Berhasil mengimpor ${scheduleItemsToSave.length} data jadwal mengajar ke Cloud Database!`
      );
      handleReset();
      onClose();
    } catch (err: unknown) {
      console.error('Import execution error:', err);
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
      alert(`Gagal menyimpan jadwal ke database: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDisplayRows = parsedRows.filter((r) => {
    if (filterPreview === 'VALID') return r.isValid;
    if (filterPreview === 'INVALID') return !r.isValid;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-4xl w-full my-auto max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20 shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">Import Jadwal Mengajar dari Excel</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/30 text-emerald-100 border border-emerald-400/30">
                  .XLSX / .XLS
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Unggah file Excel jadwal mengajar semester/mingguan SMA NEGERI 1 JULOK
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {/* Top Info Banner & Template Download */}
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5 uppercase tracking-wide">
                <HelpCircle className="w-4 h-4 text-emerald-700" />
                Template Resmi SMAN 1 JULOK
              </span>
              <p className="text-xs text-emerald-900 leading-relaxed max-w-xl">
                Gunakan template resmi yang telah dilengkapi sheet referensi Nama Guru, NIP, Kelas, Mata Pelajaran, dan Jam Pelajaran agar data terbaca 100% akurat.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                downloadScheduleExcelTemplate(teachers, classes, subjects, timeSlots)
              }
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 shrink-0 active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Template Excel (.xlsx)</span>
            </button>
          </div>

          {/* Upload Area */}
          {!selectedFile ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                isDragOver
                  ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99]'
                  : 'border-slate-300 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelected(file);
                }}
              />

              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3 shadow-xs">
                <Upload className="w-7 h-7" />
              </div>

              <h4 className="text-sm font-bold text-slate-800">
                Pilih atau Tarik File Excel Jadwal ke Sini
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Mendukung format Microsoft Excel (<strong>.xlsx</strong>, <strong>.xls</strong>) atau <strong>.csv</strong>. Sistem akan otomatis memvalidasi nama guru, kelas, dan mapel.
              </p>

              <div className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-100">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Pilih File dari Komputer / HP</span>
              </div>
            </div>
          ) : (
            /* File Loaded & Parsed Status */
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block truncate max-w-md">
                      {selectedFile.name}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB • {parsedRows.length} baris jadwal terdeteksi
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Ganti File
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Hapus
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelected(file);
                    }}
                  />
                </div>
              </div>

              {/* Parsing Indicator */}
              {isParsing && (
                <div className="p-6 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
                  <p className="text-xs text-slate-600 font-semibold">
                    Sedang memverifikasi data jadwal dari file Excel...
                  </p>
                </div>
              )}

              {/* Error Message */}
              {errorMessage && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-rose-700">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Peringatan:</span>
                    <span>{errorMessage}</span>
                  </div>
                </div>
              )}

              {/* Verification Summary Chips */}
              {parsedRows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">Pratinjau Hasil Validasi:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setFilterPreview('ALL')}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                            filterPreview === 'ALL'
                              ? 'bg-slate-800 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Semua ({parsedRows.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilterPreview('VALID')}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                            filterPreview === 'VALID'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                        >
                          ✓ Siap Impor ({validRows.length})
                        </button>
                        {invalidRows.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setFilterPreview('INVALID')}
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                              filterPreview === 'INVALID'
                                ? 'bg-rose-600 text-white'
                                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                            }`}
                          >
                            ⚠️ Perlu Koreksi ({invalidRows.length})
                          </button>
                        )}
                      </div>
                    </div>

                    <span className="text-xs text-slate-500">
                      Menampilkan {filteredDisplayRows.length} dari {parsedRows.length} baris
                    </span>
                  </div>

                  {/* Preview Table */}
                  <div className="overflow-x-auto border border-slate-200 rounded-2xl max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                          <th className="p-2.5 text-center">Baris</th>
                          <th className="p-2.5">Hari</th>
                          <th className="p-2.5">Guru Pengampu</th>
                          <th className="p-2.5">Kelas</th>
                          <th className="p-2.5">Mata Pelajaran</th>
                          <th className="p-2.5">Jam Pelajaran</th>
                          <th className="p-2.5">Status Validasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredDisplayRows.map((row) => (
                          <tr
                            key={row.rowIndex}
                            className={`hover:bg-slate-50 ${
                              !row.isValid ? 'bg-rose-50/40' : ''
                            }`}
                          >
                            <td className="p-2.5 text-center font-mono text-slate-400">
                              {row.rowIndex}
                            </td>

                            <td className="p-2.5">
                              {row.day ? (
                                <span className="font-bold text-blue-700">{row.day}</span>
                              ) : (
                                <span className="text-rose-600 font-semibold">
                                  {row.rawDay || '-'}
                                </span>
                              )}
                            </td>

                            <td className="p-2.5">
                              {row.teacherName ? (
                                <span className="font-semibold text-slate-800">
                                  {row.teacherName}
                                </span>
                              ) : (
                                <span className="text-rose-600 font-bold">
                                  {row.rawTeacher || '-'} (Guru Tidak Cocok)
                                </span>
                              )}
                            </td>

                            <td className="p-2.5">
                              {row.className ? (
                                <span className="font-bold text-slate-700">
                                  {row.className}
                                </span>
                              ) : (
                                <span className="text-rose-600 font-bold">
                                  {row.rawClass || '-'} (Kelas Tidak Ada)
                                </span>
                              )}
                            </td>

                            <td className="p-2.5">
                              {row.subjectName ? (
                                <span className="text-slate-800">{row.subjectName}</span>
                              ) : (
                                <span className="text-rose-600 font-bold">
                                  {row.rawSubject || '-'} (Mapel Tidak Ada)
                                </span>
                              )}
                            </td>

                            <td className="p-2.5">
                              {row.timeSlotLabel ? (
                                <span className="font-mono font-semibold text-blue-800">
                                  {row.timeSlotLabel}
                                </span>
                              ) : (
                                <span className="text-rose-600 font-bold">
                                  {row.rawTimeSlot || '-'}
                                </span>
                              )}
                            </td>

                            <td className="p-2.5">
                              {row.isValid ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  Siap Impor
                                </span>
                              ) : (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                                    Perlu Koreksi
                                  </span>
                                  <div className="text-[10px] text-rose-600 max-w-xs leading-tight">
                                    {row.validationErrors.join(' • ')}
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Import Mode Options */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <span className="text-xs font-bold text-slate-800 block">
                      Pilihan Metode Penyimpanan ke Database:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label
                        className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                          importMode === 'MERGE'
                            ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="importMode"
                          value="MERGE"
                          checked={importMode === 'MERGE'}
                          onChange={() => setImportMode('MERGE')}
                          className="mt-0.5 w-4 h-4 text-blue-600"
                        />
                        <div>
                          <span className="text-xs font-bold block">
                            Gabungkan (Merge) dengan Jadwal Saat Ini
                          </span>
                          <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                            Menambahkan {validRows.length} jadwal baru tanpa menghapus jadwal yang sudah ada.
                          </span>
                        </div>
                      </label>

                      <label
                        className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                          importMode === 'REPLACE'
                            ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="importMode"
                          value="REPLACE"
                          checked={importMode === 'REPLACE'}
                          onChange={() => setImportMode('REPLACE')}
                          className="mt-0.5 w-4 h-4 text-amber-600"
                        />
                        <div>
                          <span className="text-xs font-bold block">
                            Ganti Seluruh Jadwal (Replace All)
                          </span>
                          <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                            Menghapus seluruh jadwal lama dan menggantinya penuh dengan data Excel ini.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            {parsedRows.length > 0 ? (
              <span>
                <strong>{validRows.length}</strong> jadwal valid akan disimpan ke Cloud Firestore.
              </span>
            ) : (
              <span>Pilih file Excel yang valid untuk melanjutkan.</span>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={validRows.length === 0 || isSubmitting}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Menyimpan ke Cloud Firestore...</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  <span>
                    Impor {validRows.length} Jadwal Sekarang
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
