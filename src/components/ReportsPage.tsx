import React, { useState } from 'react';
import { Teacher, AttendanceRecord } from '../types';
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
  FileCheck
} from 'lucide-react';

interface ReportsPageProps {
  teachers: Teacher[];
  attendanceRecords: AttendanceRecord[];
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  teachers,
  attendanceRecords
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

    // 2. By Status
    if (statusFilter !== 'all') {
      if (rec.status !== statusFilter) return false;
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
  const hadir = filteredRecords.filter((r) => r.status === 'HADIR').length;
  const sakit = filteredRecords.filter((r) => r.status === 'SAKIT').length;
  const izin = filteredRecords.filter((r) => r.status === 'IZIN').length;
  const dinas = filteredRecords.filter((r) => r.status === 'DINAS_LUAR').length;
  const alpa = filteredRecords.filter((r) => r.status === 'ALPA').length;
  const attendanceRate = total > 0 ? ((hadir / total) * 100).toFixed(1) : '0';

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

    setTimeout(() => {
      try {
        generateAttendancePDF(filteredRecords, filterOptions, {
          name: 'SMA NEGERI 1 JULOK',
          address: 'Jl. Medan - Banda Aceh, Km. 360, Desa Julok Tunong, Kec. Julok, Kab. Aceh Timur',
          headmasterName: 'Riza Fani, S.Pd., M.Pd.',
          headmasterNip: '19750812 200212 1 002',
          piketOfficer: 'Cut Mutia, S.Pd.'
        });
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
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white"
            >
              <option value="all">Semua Status Kehadiran</option>
              <option value="HADIR">Hadir Saja</option>
              <option value="SAKIT">Sakit</option>
              <option value="IZIN">Izin</option>
              <option value="DINAS_LUAR">Dinas Luar</option>
              <option value="ALPA">Alpa / Tanpa Keterangan</option>
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
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center">
          <span className="text-[11px] font-semibold text-slate-500 block">Total Data</span>
          <span className="text-xl font-black text-slate-900 mt-1 block">{total}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 text-center bg-emerald-50/20">
          <span className="text-[11px] font-semibold text-emerald-800 block">Hadir</span>
          <span className="text-xl font-black text-emerald-700 mt-1 block">{hadir}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-rose-200 text-center bg-rose-50/20">
          <span className="text-[11px] font-semibold text-rose-800 block">Sakit</span>
          <span className="text-xl font-black text-rose-700 mt-1 block">{sakit}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-orange-200 text-center bg-orange-50/20">
          <span className="text-[11px] font-semibold text-orange-800 block">Izin</span>
          <span className="text-xl font-black text-orange-700 mt-1 block">{izin}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-blue-200 text-center bg-blue-50/20">
          <span className="text-[11px] font-semibold text-blue-800 block">Dinas Luar</span>
          <span className="text-xl font-black text-blue-700 mt-1 block">{dinas}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center bg-indigo-50/30">
          <span className="text-[11px] font-semibold text-indigo-900 block">% Kehadiran</span>
          <span className="text-xl font-black text-indigo-700 mt-1 block">{attendanceRate}%</span>
        </div>
      </div>

      {/* Official Document Preview Frame */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 sm:p-8 space-y-6">
        {/* Kop Surat Sekolah SMA Negeri 1 Julok */}
        <div className="text-center border-b-2 border-slate-900 pb-4 relative">
          <h4 className="text-xs sm:text-sm font-bold tracking-wider text-slate-800 uppercase">
            PEMERINTAH ACEH • DINAS PENDIDIKAN
          </h4>
          <h5 className="text-xs font-semibold text-slate-700 uppercase">
            CABANG DINAS PENDIDIKAN WILAYAH KABUPATEN ACEH TIMUR
          </h5>
          <h3 className="text-lg sm:text-xl font-black text-blue-950 mt-0.5 tracking-tight">
            SMA NEGERI 1 JULOK
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">
            Alamat: Jl. Medan - Banda Aceh, Km. 360, Desa Julok Tunong, Kec. Julok, Kab. Aceh Timur, Kode Pos 24458
          </p>
          <div className="h-0.5 bg-slate-900 mt-3"></div>
          <div className="h-px bg-slate-500 mt-0.5"></div>
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
                <th className="p-2.5 text-center">Status</th>
                <th className="p-2.5">Materi / Keterangan</th>
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
                filteredRecords.map((r, i) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="p-2.5 text-center text-slate-400 font-mono">{i + 1}</td>
                    <td className="p-2.5 font-medium text-slate-700 whitespace-nowrap">
                      {r.date}
                    </td>
                    <td className="p-2.5 font-bold text-slate-900 whitespace-nowrap">
                      {r.teacherName}
                    </td>
                    <td className="p-2.5 font-mono text-slate-500 whitespace-nowrap">{r.nip}</td>
                    <td className="p-2.5 font-bold text-blue-800">{r.classRoomName}</td>
                    <td className="p-2.5 text-slate-800">{r.subjectName}</td>
                    <td className="p-2.5 text-slate-600 font-mono whitespace-nowrap">
                      {r.timeSlotName.split('(')[0]}
                    </td>
                    <td className="p-2.5 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.status === 'HADIR'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'SAKIT'
                            ? 'bg-rose-100 text-rose-800'
                            : r.status === 'IZIN'
                            ? 'bg-orange-100 text-orange-800'
                            : r.status === 'DINAS_LUAR'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-600 max-w-xs truncate">
                      {r.topic || r.piketNotes || r.notes || (r.recordedBy === 'MANDIRI' ? 'Selfie Hadir' : '-')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Tanda Tangan Resmi Pengesahan */}
        <div className="pt-8 flex flex-col sm:flex-row justify-between gap-8 text-xs text-slate-800">
          <div className="text-center sm:text-left">
            <p>Mengetahui / Memeriksa,</p>
            <p className="font-semibold">Petugas Guru Piket Harian</p>
            <div className="h-16"></div>
            <p className="font-bold underline">Cut Mutia, S.Pd.</p>
            <p className="text-[11px] text-slate-500 font-mono">NIP. 19801104 200801 2 008</p>
          </div>

          <div className="text-center sm:text-right">
            <p>
              Julok, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p className="font-semibold">Kepala SMA Negeri 1 Julok</p>
            <div className="h-16"></div>
            <p className="font-bold underline">Riza Fani, S.Pd., M.Pd.</p>
            <p className="text-[11px] text-slate-500 font-mono">NIP. 19750812 200212 1 002</p>
          </div>
        </div>
      </div>
    </div>
  );
};
