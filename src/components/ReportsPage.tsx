import React, { useState } from 'react';
import { Teacher, AttendanceRecord, SchoolLogos } from '../types';
import { generateAttendancePDF, ReportFilterOptions } from '../utils/pdfExport';
import {
  FileText,
  Download,
  Calendar,
  User,
  Filter,
  Printer,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  School,
  FileCheck,
  Camera,
  Maximize2,
  MapPin,
  X,
  Sparkles,
  ExternalLink
} from 'lucide-react';

import { analyzeRecordLateness } from '../utils/latenessHelper';

export interface AttendanceStatusInfo {
  label: 'Hadir' | 'Telat' | 'Absen' | 'Sakit' | 'Izin' | 'Dinas Luar';
  jamText: string;
  badgeClass: string;
  dotClass: string;
  isLate: boolean;
  lateMinutes?: number;
  slotStartTime?: string;
  warningText?: string;
}

export function parseAttendanceStatusAndJam(record: AttendanceRecord): AttendanceStatusInfo {
  // 1. Format Jam Kehadiran
  let jamText = '-';
  if (record.timestamp) {
    if (record.timestamp.includes('T')) {
      const d = new Date(record.timestamp);
      if (!isNaN(d.getTime())) {
        jamText = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} WIB`;
      }
    } else {
      const match = record.timestamp.match(/(\d{1,2})[.:](\d{2})/);
      if (match) {
        jamText = `${match[1].padStart(2, '0')}:${match[2]} WIB`;
      } else {
        jamText = `${record.timestamp} WIB`;
      }
    }
  }

  // 2. Tentukan status (Hadir, Telat, Absen, Sakit, Izin, Dinas Luar)
  if (record.status === 'HADIR') {
    const lateness = analyzeRecordLateness(record);

    if (lateness.isLate) {
      return {
        label: 'Telat',
        jamText,
        badgeClass: 'bg-rose-100 text-rose-900 border-2 border-rose-400 font-extrabold ring-1 ring-rose-200',
        dotClass: 'bg-rose-600 animate-ping',
        isLate: true,
        lateMinutes: lateness.lateMinutes > 0 ? lateness.lateMinutes : undefined,
        slotStartTime: lateness.slotStartTime !== '-' ? lateness.slotStartTime : undefined,
        warningText: lateness.warningText
      };
    }

    return {
      label: 'Hadir',
      jamText,
      badgeClass: 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold',
      dotClass: 'bg-emerald-500',
      isLate: false
    };
  }

  if (record.status === 'ALPA') {
    return {
      label: 'Absen',
      jamText: '-',
      badgeClass: 'bg-rose-100 text-rose-900 border border-rose-300 font-bold',
      dotClass: 'bg-rose-600',
      isLate: false
    };
  }

  if (record.status === 'SAKIT') {
    return {
      label: 'Sakit',
      jamText: '-',
      badgeClass: 'bg-red-50 text-red-800 border border-red-200 font-medium',
      dotClass: 'bg-red-400',
      isLate: false
    };
  }

  if (record.status === 'IZIN') {
    return {
      label: 'Izin',
      jamText: '-',
      badgeClass: 'bg-orange-100 text-orange-900 border border-orange-300 font-medium',
      dotClass: 'bg-orange-500',
      isLate: false
    };
  }

  return {
    label: 'Dinas Luar',
    jamText: jamText !== '-' ? jamText : '-',
    badgeClass: 'bg-blue-100 text-blue-900 border border-blue-300 font-medium',
    dotClass: 'bg-blue-500',
    isLate: false
  };
}

interface ReportsPageProps {
  teachers: Teacher[];
  attendanceRecords: AttendanceRecord[];
  logos?: SchoolLogos;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  teachers,
  attendanceRecords,
  logos
}) => {
  const [reportType, setReportType] = useState<'month' | 'teacher' | 'range' | 'all'>('month');

  // Month selector (Default: current month YYYY-MM)
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Teacher selector
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(teachers[0]?.id || '');

  // Date range
  const [startDate, setStartDate] = useState<string>(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(now.toISOString().split('T')[0]);

  // Status Filter
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [selectedPhotoRecord, setSelectedPhotoRecord] = useState<AttendanceRecord | null>(null);

  // Filter records based on active criteria
  const filteredRecords = attendanceRecords.filter((rec) => {
    // 1. By Report Type
    if (reportType === 'month') {
      if (!rec.date.startsWith(selectedMonth)) return false;
    } else if (reportType === 'teacher') {
      if (rec.teacherId !== selectedTeacherId) return false;
    } else if (reportType === 'range') {
      if (rec.date < startDate || rec.date > endDate) return false;
    }

    // 2. By Status (Hadir, Telat, Absen, dll)
    if (statusFilter !== 'all') {
      const info = parseAttendanceStatusAndJam(rec);
      if (statusFilter === 'HADIR_TEPAT' && info.label !== 'Hadir') return false;
      if (statusFilter === 'TELAT' && info.label !== 'Telat') return false;
      if (statusFilter === 'ABSEN' && info.label !== 'Absen' && rec.status !== 'ALPA') return false;
      if (statusFilter === 'HADIR' && rec.status !== 'HADIR') return false;
      if (statusFilter === 'SAKIT' && rec.status !== 'SAKIT') return false;
      if (statusFilter === 'IZIN' && rec.status !== 'IZIN') return false;
      if (statusFilter === 'DINAS_LUAR' && rec.status !== 'DINAS_LUAR') return false;
      if (statusFilter === 'ALPA' && rec.status !== 'ALPA') return false;
    }

    // 3. Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        rec.teacherName.toLowerCase().includes(q) ||
        rec.nip.includes(q) ||
        rec.classRoomName.toLowerCase().includes(q) ||
        rec.subjectName.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  // Calculate stats
  const total = filteredRecords.length;
  const hadirTepat = filteredRecords.filter((r) => parseAttendanceStatusAndJam(r).label === 'Hadir').length;
  const telat = filteredRecords.filter((r) => parseAttendanceStatusAndJam(r).label === 'Telat').length;
  const totalHadir = hadirTepat + telat;
  const sakit = filteredRecords.filter((r) => r.status === 'SAKIT').length;
  const izin = filteredRecords.filter((r) => r.status === 'IZIN').length;
  const dinas = filteredRecords.filter((r) => r.status === 'DINAS_LUAR').length;
  const alpa = filteredRecords.filter((r) => parseAttendanceStatusAndJam(r).label === 'Absen' || r.status === 'ALPA').length;
  const attendanceRate = total > 0 ? ((totalHadir / total) * 100).toFixed(1) : '0';

  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId);

  const handleExportPDF = () => {
    setIsExporting(true);
    const filterOptions: ReportFilterOptions = {
      type: reportType,
      month: selectedMonth,
      teacherId: selectedTeacherId,
      teacherName: selectedTeacher?.name,
      startDate,
      endDate,
      statusFilter
    };

    setTimeout(async () => {
      try {
        await generateAttendancePDF(
          filteredRecords,
          filterOptions,
          {
            name: 'SMA NEGERI 1 JULOK',
            address: 'Jln Alue Ie Mirah Desa Buket Seuraja Kecamatan Julok Kabupaten Aceh Timur - Kode Pos 24457',
            headmasterName: 'Irmi, S.Pd, M.Pd',
            headmasterNip: '19800102 200504 2 001',
            curriculumViceName: 'Desi Muliana, S.Pd',
            curriculumViceNip: '19862025212030'
          },
          logos,
          teachers
        );
      } catch (err) {
        console.error('PDF export error:', err);
        alert('Gagal membuat PDF. Coba kurangi filter atau cetak melalui peramban.');
      } finally {
        setIsExporting(false);
      }
    }, 300);
  };

  const handlePrint = () => {
    window.print();
  };

  const acehLogoUrl = logos?.acehLogo || '/logo-aceh.svg';

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Laporan Rekapitulasi Presensi Guru
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
              PDF Generator
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Ekspor laporan presensi resmi SMA NEGERI 1 JULOK per bulan atau per individu guru dalam format PDF siap cetak.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportPDF}
            disabled={isExporting || total === 0}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Memproses PDF...' : 'Simpan dalam PDF'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
            title="Cetak via browser"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Cetak</span>
          </button>
        </div>
      </div>

      {/* Filter Control Box */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Filter className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800">
            Pilihan Kriteria Laporan Presensi
          </h3>
        </div>

        {/* Choice: Per Bulan / Per Guru / Rentang / Semua */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: 'month', label: 'Laporan Per Bulan', icon: Calendar },
            { id: 'teacher', label: 'Laporan Per Guru', icon: User },
            { id: 'range', label: 'Rentang Tanggal', icon: Clock },
            { id: 'all', label: 'Semua Riwayat', icon: FileText }
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = reportType === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setReportType(item.id as typeof reportType)}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/80 text-blue-800 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Secondary Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {reportType === 'month' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pilih Bulan & Tahun
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>
          )}

          {reportType === 'teacher' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pilih Guru
              </label>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (NIP: {t.nip})
                  </option>
                ))}
              </select>
            </div>
          )}

          {reportType === 'range' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dari Tanggal
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sampai Tanggal
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Filter Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white font-medium"
            >
              <option value="all">Semua Status (Hadir, Telat, Absen)</option>
              <option value="HADIR_TEPAT">Hadir Tepat Waktu</option>
              <option value="TELAT">Telat / Terlambat</option>
              <option value="ABSEN">Absen / Tidak Hadir</option>
              <option value="HADIR">Semua Hadir (Tepat &amp; Telat)</option>
              <option value="SAKIT">Sakit</option>
              <option value="IZIN">Izin</option>
              <option value="DINAS_LUAR">Dinas Luar</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pencarian Cepat
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari guru, kelas, mapel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards for the filtered report */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Total Data</span>
          <span className="text-xl font-black text-slate-900 mt-1 block">{total}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 text-center bg-emerald-50/30 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-800 block">Hadir Tepat</span>
          <span className="text-xl font-black text-emerald-700 mt-1 block">{hadirTepat}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-rose-300 text-center bg-rose-50/40 shadow-2xs ring-1 ring-rose-200">
          <div className="flex items-center justify-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span className="text-[11px] font-bold text-rose-800">Telat / Lewat Jam</span>
          </div>
          <span className="text-xl font-black text-rose-600 mt-1 block">{telat}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-rose-200 text-center bg-rose-50/30 shadow-2xs">
          <span className="text-[11px] font-bold text-rose-800 block">Absen (Alpa)</span>
          <span className="text-xl font-black text-rose-700 mt-1 block">{alpa}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-orange-200 text-center bg-orange-50/30 shadow-2xs">
          <span className="text-[11px] font-semibold text-orange-800 block">Sakit &amp; Izin</span>
          <span className="text-xl font-black text-orange-700 mt-1 block">{sakit + izin}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-blue-200 text-center bg-blue-50/30 shadow-2xs">
          <span className="text-[11px] font-semibold text-blue-900 block">% Kehadiran</span>
          <span className="text-xl font-black text-blue-700 mt-1 block">{attendanceRate}%</span>
        </div>
      </div>

      {/* Official Document Preview Frame */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 sm:p-8 space-y-6">
        {/* Kop Surat Sekolah SMA Negeri 1 Julok dengan Logo Pemerintah Aceh & Logo Sekolah */}
        <div className="border-b-2 border-slate-900 pb-4 relative">
          <div className="flex items-center justify-between gap-4">
            {/* Logo Resmi Pemerintah Aceh (Kiri) */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 flex items-center justify-center p-1 bg-white rounded-lg">
              <img
                src={acehLogoUrl}
                alt="Logo Pemerintah Aceh"
                className="w-full h-full object-contain max-h-20"
              />
            </div>

            {/* Teks Kop Surat Dinas & Sekolah (Tengah) */}
            <div className="flex-1 text-center px-2">
              <h4 className="text-xs sm:text-sm font-bold tracking-wider text-slate-800 uppercase font-serif">
                PEMERINTAH ACEH • DINAS PENDIDIKAN
              </h4>
              <h5 className="text-[11px] sm:text-xs font-semibold text-slate-700 uppercase font-serif">
                CABANG DINAS PENDIDIKAN WILAYAH KABUPATEN ACEH TIMUR
              </h5>
              <h3 className="text-base sm:text-xl font-black text-blue-950 mt-0.5 tracking-tight font-serif">
                SMA NEGERI 1 JULOK
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">
                Alamat: Jln Alue Ie Mirah Desa Buket Seuraja Kecamatan Julok Kabupaten Aceh Timur - Kode Pos 24457
              </p>
            </div>

            {/* Spacer penyeimbang tengah agar teks kop tetap simetris */}
            <div className="w-16 sm:w-20 shrink-0 hidden sm:block pointer-events-none" aria-hidden="true" />
          </div>

          <div className="h-0.8 bg-slate-900 mt-3"></div>
          <div className="h-0.3 bg-slate-600 mt-0.5"></div>
        </div>

        {/* Subtitle */}
        <div className="text-center">
          <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
            REKAPITULASI PRESENSI & JURNAL MENGAJAR GURU
          </h4>
          <p className="text-xs text-slate-600 mt-0.5">
            {reportType === 'month' && `Periode Bulan: ${selectedMonth}`}
            {reportType === 'teacher' && `Nama Guru: ${selectedTeacher?.name} (NIP: ${selectedTeacher?.nip})`}
            {reportType === 'range' && `Rentang: ${startDate} s/d ${endDate}`}
            {reportType === 'all' && 'Semua Periode Data'}
          </p>
        </div>

        {/* Table Records */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-blue-900 text-white font-semibold">
              <tr>
                <th className="p-2.5 text-center">No</th>
                <th className="p-2.5">Tanggal</th>
                <th className="p-2.5">Nama Guru</th>
                <th className="p-2.5">NIP</th>
                <th className="p-2.5">Kelas</th>
                <th className="p-2.5">Mata Pelajaran</th>
                <th className="p-2.5">Jam Pelajaran</th>
                <th className="p-2.5 text-center">Status &amp; Jam Presensi</th>
                <th className="p-2.5 text-center">Foto Selfie Presensi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    Tidak ada data presensi yang sesuai dengan kriteria filter di atas.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, i) => {
                  const statusInfo = parseAttendanceStatusAndJam(r);
                  return (
                    <tr
                      key={r.id}
                      className={`transition-colors ${
                        statusInfo.isLate
                          ? 'bg-rose-50/40 hover:bg-rose-50/70 border-l-4 border-l-rose-500'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="p-2.5 text-center text-slate-400 font-mono">{i + 1}</td>
                      <td className="p-2.5 font-medium text-slate-700 whitespace-nowrap">
                        {r.date}
                      </td>
                      <td className="p-2.5 font-bold whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {statusInfo.isLate && (
                            <span title="Peringatan: Absensi dilakukan setelah jam pelajaran dimulai" className="shrink-0">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                            </span>
                          )}
                          <span className={statusInfo.isLate ? 'text-rose-950 font-black' : 'text-slate-900'}>
                            {r.teacherName}
                          </span>
                        </div>
                      </td>
                      <td className="p-2.5 font-mono text-slate-500 whitespace-nowrap">{r.nip || '-'}</td>
                      <td className="p-2.5 font-bold text-blue-800">{r.classRoomName}</td>
                      <td className="p-2.5 text-slate-800">{r.subjectName}</td>
                      <td className="p-2.5 text-slate-600 font-mono whitespace-nowrap">
                        <div>
                          <span>{r.timeSlotName.split('(')[0]}</span>
                          {statusInfo.slotStartTime && (
                            <span className="block text-[10px] text-slate-400 font-sans">
                              Mulai: {statusInfo.slotStartTime} WIB
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status : Tampilkan Jam saat absensi dan status (Hadir/telat/absen) */}
                      <td className="p-2.5 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1">
                          {/* Jam saat absensi - Peringatan Visual Merah & Ikon jika Telat */}
                          <span
                            className={`inline-flex items-center gap-1 font-mono text-[11px] font-bold px-2 py-0.5 rounded-md border shadow-2xs ${
                              statusInfo.isLate
                                ? 'text-rose-700 bg-rose-50 border-rose-300 ring-1 ring-rose-300'
                                : 'text-slate-800 bg-slate-100 border-slate-200'
                            }`}
                            title={statusInfo.isLate ? `Peringatan: Absensi dilakukan pukul ${statusInfo.jamText}, setelah jam pelajaran dimulai (${statusInfo.slotStartTime || ''})` : undefined}
                          >
                            {statusInfo.isLate ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 animate-pulse" />
                            ) : (
                              <Clock className="w-3 h-3 text-blue-600 shrink-0" />
                            )}
                            <span className={statusInfo.isLate ? 'text-rose-700 font-black' : ''}>
                              {statusInfo.jamText}
                            </span>
                          </span>

                          {/* Status Badge (Hadir / Telat / Absen) */}
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] ${statusInfo.badgeClass} shadow-2xs`}>
                            {statusInfo.isLate && <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />}
                            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`}></span>
                            <span>{statusInfo.isLate ? 'TERLAMBAT' : statusInfo.label}</span>
                            {statusInfo.lateMinutes && (
                              <span className="text-[9px] font-bold text-rose-900 bg-rose-200/90 px-1 rounded">
                                +{statusInfo.lateMinutes}m
                              </span>
                            )}
                          </span>

                          {/* Keterangan Tambahan Peringatan Lewat Jam Masuk */}
                          {statusInfo.isLate && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-rose-600 bg-rose-100/80 border border-rose-200 px-1.5 py-0.2 rounded">
                              Lewat Jam Mulai
                            </span>
                          )}

                          {/* GPS Validation status if available */}
                          {r.locationStatus && (
                            <span className={`block text-[9px] font-medium ${
                              r.locationStatus === 'VALID' ? 'text-emerald-700' : 'text-rose-700'
                            }`}>
                              {r.locationStatus === 'VALID' ? `GPS Sah (~${r.distanceMeters ?? 0}m)` : `Luar (~${r.distanceMeters ?? 0}m)`}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Foto saat selfie dengan penanda peringatan jika telat */}
                      <td className="p-2.5 text-center">
                        {r.photoUrl ? (
                          <div className="flex flex-col items-center gap-1 group">
                            <div
                              onClick={() => setSelectedPhotoRecord(r)}
                              className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 shadow-2xs cursor-pointer transition-all hover:scale-105 bg-slate-900 flex items-center justify-center shrink-0 ${
                                statusInfo.isLate
                                  ? 'border-rose-400 ring-2 ring-rose-200'
                                  : 'border-slate-200 hover:border-blue-500'
                              }`}
                              title={statusInfo.isLate ? 'Foto selfie presensi (Terlambat) - Klik untuk memperbesar' : 'Klik untuk memperbesar foto selfie kehadiran'}
                            >
                              <img
                                src={r.photoUrl}
                                alt={`Foto selfie ${r.teacherName}`}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <Maximize2 className="w-4 h-4 drop-shadow-md" />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedPhotoRecord(r)}
                              className={`text-[10px] hover:underline font-bold flex items-center gap-0.5 cursor-pointer ${
                                statusInfo.isLate ? 'text-rose-600' : 'text-blue-600'
                              }`}
                            >
                              <span>Lihat Foto</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-slate-400 py-1">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                              <Camera className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium">Tanpa Foto</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Daftar Guru & Staff yang Tidak Melakukan Absensi */}
        {(!statusFilter || statusFilter.toUpperCase() === 'ALL') && (!selectedTeacherId || selectedTeacherId === 'all') && (() => {
          const unattended = teachers.filter(
            (t) => t.status === 'Aktif' && !filteredRecords.some((r) => r.teacherId === t.id)
          );
          if (unattended.length === 0) return null;
          return (
            <div className="pt-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Daftar Guru &amp; Staff yang Tidak Melakukan Absensi ({unattended.length} Orang)
                </h4>
              </div>
              <div className="overflow-x-auto border border-rose-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-rose-700 text-white text-[11px] uppercase tracking-wider">
                      <th className="p-2.5 text-center w-10">No</th>
                      <th className="p-2.5">Nama Guru / Staff</th>
                      <th className="p-2.5 text-center">NIP</th>
                      <th className="p-2.5 text-center">Kategori</th>
                      <th className="p-2.5">Jabatan</th>
                      <th className="p-2.5 text-center">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-100 bg-rose-50/30">
                    {unattended.map((t, idx) => (
                      <tr key={t.id} className="hover:bg-rose-50/70">
                        <td className="p-2.5 text-center font-mono text-slate-600">{idx + 1}</td>
                        <td className="p-2.5 font-bold text-slate-900">{t.name}</td>
                        <td className="p-2.5 text-center font-mono text-slate-600">{t.nip || '-'}</td>
                        <td className="p-2.5 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {t.category === 'GURU_BK'
                              ? 'Guru BK (Harian)'
                              : t.category === 'STAFF_TU'
                              ? 'Staff TU (Harian)'
                              : 'Guru Mapel'}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-600">{t.jabatan || '-'}</td>
                        <td className="p-2.5 text-center font-bold text-rose-700">
                          Tidak / Belum Melakukan Absensi
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* Tanda Tangan Resmi Pengesahan */}
        <div className="pt-8 flex flex-col sm:flex-row justify-between gap-8 text-xs text-slate-800">
          <div className="text-center sm:text-left">
            <p>Mengetahui,</p>
            <p className="font-semibold">Wakil Kepala Kurikulum</p>
            <div className="h-16"></div>
            <p className="font-bold underline">Desi Muliana, S.Pd</p>
            <p className="text-[11px] text-slate-500 font-mono">NIP. 19862025212030</p>
          </div>

          <div className="text-center sm:text-right">
            <p>
              Julok, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p className="font-semibold">Kepala SMA Negeri 1 Julok</p>
            <div className="h-16"></div>
            <p className="font-bold underline">Irmi, S.Pd, M.Pd</p>
            <p className="text-[11px] text-slate-500 font-mono">NIP : 19800102 200504 2 001</p>
          </div>
        </div>
      </div>

      {/* Modal Pratinjau Foto Selfie Ukuran Besar */}
      {selectedPhotoRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Camera className="w-4 h-4 text-blue-200" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Foto Bukti Selfie Presensi Guru</h3>
                  <p className="text-[11px] text-blue-200">SMA Negeri 1 Julok • Pemerintah Aceh</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPhotoRecord(null)}
                className="p-1.5 hover:bg-white/20 rounded-xl transition-colors cursor-pointer text-white/90 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Full Image Preview */}
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center shadow-inner">
                <img
                  src={selectedPhotoRecord.photoUrl}
                  alt={`Selfie ${selectedPhotoRecord.teacherName}`}
                  className="w-full h-auto max-h-80 object-contain mx-auto"
                />
              </div>

              {/* Detail Ringkas */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                  <span className="text-slate-500 font-medium">Nama Guru:</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedPhotoRecord.teacherName}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                  <span className="text-slate-500 font-medium">NIP:</span>
                  <span className="font-mono text-slate-700">{selectedPhotoRecord.nip || '-'}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                  <span className="text-slate-500 font-medium">Tanggal &amp; Waktu:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedPhotoRecord.date} • {parseAttendanceStatusAndJam(selectedPhotoRecord).jamText}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                  <span className="text-slate-500 font-medium">Status Kehadiran:</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] ${parseAttendanceStatusAndJam(selectedPhotoRecord).badgeClass}`}>
                      {parseAttendanceStatusAndJam(selectedPhotoRecord).label}
                    </span>
                    {parseAttendanceStatusAndJam(selectedPhotoRecord).lateMinutes && (
                      <span className="text-[10px] text-amber-700 font-bold">
                        (Terlambat {parseAttendanceStatusAndJam(selectedPhotoRecord).lateMinutes} menit)
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/80">
                  <span className="text-slate-500 font-medium">Kelas &amp; Mata Pelajaran:</span>
                  <span className="font-semibold text-blue-900">
                    {selectedPhotoRecord.classRoomName} — {selectedPhotoRecord.subjectName}
                  </span>
                </div>
                {selectedPhotoRecord.locationAddress && (
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Lokasi GPS:
                    </span>
                    <span className="text-emerald-700 font-bold">{selectedPhotoRecord.locationAddress}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                {selectedPhotoRecord.photoUrl && (
                  <a
                    href={selectedPhotoRecord.photoUrl}
                    download={`selfie_${selectedPhotoRecord.teacherName.replace(/\s+/g, '_')}_${selectedPhotoRecord.date}.jpg`}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh Foto Selfie</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedPhotoRecord(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
