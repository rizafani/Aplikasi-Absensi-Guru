import React, { useState } from 'react';
import {
  Teacher,
  ClassRoom,
  Subject,
  TimeSlot,
  ScheduleItem,
  AttendanceRecord,
  UserSession,
  AttendanceStatus,
  DayOfWeek
} from '../types';
import {
  getTodayDayName,
  getTodayDateString,
  formatScheduleTimeSlots
} from '../data/initialData';
import { analyzeRecordLateness, isScheduleOverdue } from '../utils/latenessHelper';
import {
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Clock,
  FileText,
  UserCheck,
  Camera,
  Maximize2,
  X,
  Search,
  Filter,
  MapPin,
  Calendar
} from 'lucide-react';

interface PiketPanelProps {
  session: UserSession;
  teachers: Teacher[];
  classes: ClassRoom[];
  subjects: Subject[];
  timeSlots: TimeSlot[];
  schedules: ScheduleItem[];
  attendanceRecords: AttendanceRecord[];
  onRecordAttendance: (record: AttendanceRecord) => Promise<void> | void;
  onDeleteRecord: (id: string) => Promise<void> | void;
  onOpenAuth: () => void;
}

export const PiketPanel: React.FC<PiketPanelProps> = ({
  session,
  teachers,
  classes,
  subjects,
  timeSlots,
  schedules,
  attendanceRecords,
  onRecordAttendance,
  onDeleteRecord,
  onOpenAuth
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(getTodayDayName());

  // Form State
  const [targetTeacherId, setTargetTeacherId] = useState<string>('');
  const [status, setStatus] = useState<AttendanceStatus>('SAKIT');
  const [reason, setReason] = useState<string>('');
  const [substituteTeacherId, setSubstituteTeacherId] = useState<string>('');
  const [officerNameInput, setOfficerNameInput] = useState<string>(
    session.piketName || 'Petugas Guru Piket'
  );
  const [isSuccessMsg, setIsSuccessMsg] = useState<string | null>(null);

  // Active right column tab: 'attended' | 'unattended' | 'piket-notes'
  const [activeListTab, setActiveListTab] = useState<'attended' | 'unattended' | 'piket-notes'>('attended');
  const [attendedFilter, setAttendedFilter] = useState<'all' | 'late-only' | 'on-time-only'>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [selectedPhotoRecord, setSelectedPhotoRecord] = useState<AttendanceRecord | null>(null);

  const handleDateChange = (val: string) => {
    setSelectedDate(val);
    try {
      const d = new Date(val + 'T00:00:00');
      const idx = d.getDay();
      let dName: DayOfWeek = 'Senin';
      if (idx === 1) dName = 'Senin';
      else if (idx === 2) dName = 'Selasa';
      else if (idx === 3) dName = 'Rabu';
      else if (idx === 4) dName = 'Kamis';
      else if (idx === 5) dName = 'Jumat';
      else if (idx === 6) dName = 'Sabtu';
      setSelectedDay(dName);
    } catch {
      // ignore
    }
  };

  // Schedules for selected day
  const daySchedules = schedules.filter((s) => s.day === selectedDay);
  const scheduledTeacherIds = Array.from(new Set(daySchedules.map((s) => s.teacherId)));
  const scheduledTeachers = teachers.filter((t) => scheduledTeacherIds.includes(t.id));

  // Attendance records for the selected date
  const dateAttendance = attendanceRecords.filter((r) => r.date === selectedDate);
  const attendedRecords = dateAttendance.filter((r) => r.status === 'HADIR');
  const piketRecords = dateAttendance.filter((r) => r.status !== 'HADIR');

  // Teachers who have not self-attended and have no piket note yet
  const unattendedTeachers = scheduledTeachers.filter((t) => {
    return !dateAttendance.some((r) => r.teacherId === t.id);
  });

  // Analyze lateness for attended records
  const attendedWithLateness = attendedRecords.map((rec) => ({
    record: rec,
    lateness: analyzeRecordLateness(rec, timeSlots)
  }));

  const lateRecords = attendedWithLateness.filter((x) => x.lateness.isLate);
  const onTimeRecords = attendedWithLateness.filter((x) => !x.lateness.isLate);

  // Filter attended list based on sub-filter & search
  const filteredAttended = attendedWithLateness.filter((item) => {
    if (attendedFilter === 'late-only' && !item.lateness.isLate) return false;
    if (attendedFilter === 'on-time-only' && item.lateness.isLate) return false;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const match =
        item.record.teacherName.toLowerCase().includes(q) ||
        item.record.classRoomName.toLowerCase().includes(q) ||
        item.record.subjectName.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleSubmitPiket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTeacherId) {
      alert('Silakan pilih guru yang berhalangan hadir.');
      return;
    }

    const teacher = teachers.find((t) => t.id === targetTeacherId);
    if (!teacher) return;

    // Find first schedule for this teacher today to capture class & subject
    const teacherSched = daySchedules.find((s) => s.teacherId === targetTeacherId);
    const c = classes.find((cl) => cl.id === teacherSched?.classRoomId);
    const sub = subjects.find((sb) => sb.id === teacherSched?.subjectId);
    const slotInfo = teacherSched ? formatScheduleTimeSlots(teacherSched, timeSlots) : null;

    const substituteTeacher = teachers.find((t) => t.id === substituteTeacherId);

    const now = new Date();
    const newPiketRecord: AttendanceRecord = {
      id: `piket-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      teacherId: teacher.id,
      teacherName: teacher.name,
      nip: teacher.nip,
      date: selectedDate,
      dayName: selectedDay,
      classRoomName: c?.name || 'Seluruh Kelas Hari Ini',
      subjectName: sub?.name || 'Mata Pelajaran Terjadwal',
      timeSlotName: slotInfo ? slotInfo.fullText : 'Jadwal Hari Ini',
      status: status,
      photoUrl: '',
      timestamp: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      notes: reason.trim(),
      recordedBy: 'GURU_PIKET',
      piketOfficerName: officerNameInput.trim() || session.piketName || 'Petugas Piket',
      piketNotes: reason.trim() || `Keterangan tercatat: ${status}`,
      substituteTeacherName: substituteTeacher ? substituteTeacher.name : ''
    };

    try {
      await onRecordAttendance(newPiketRecord);
      setIsSuccessMsg(`Keterangan ketidakhadiran untuk ${teacher.name} berhasil disimpan.`);
      setReason('');
      setTargetTeacherId('');
      setSubstituteTeacherId('');

      setTimeout(() => {
        setIsSuccessMsg(null);
      }, 4000);
    } catch (err) {
      console.error('Failed to save piket record:', err);
      alert('Gagal menyimpan keterangan piket. Silakan coba lagi.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold text-amber-100">
              <ClipboardList className="w-3.5 h-3.5" />
              Buku Agenda Guru Piket
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Portal Tindak Lanjut Guru Piket
            </h2>
            <p className="text-amber-100 text-xs sm:text-sm max-w-2xl">
              Pantau guru yang sudah presensi, deteksi otomatis keterlambatan jam masuk, atur guru pengganti (inval), dan tindak lanjuti KBM SMA NEGERI 1 JULOK.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end justify-center bg-white/10 p-3 rounded-xl backdrop-blur-xs border border-white/20">
            <span className="text-[11px] text-amber-200">Petugas Piket Aktif:</span>
            <span className="text-sm font-bold text-white">
              {session.role === 'PIKET' ? session.piketName : officerNameInput}
            </span>
            {session.role !== 'PIKET' && (
              <button
                onClick={onOpenAuth}
                className="mt-1 text-[11px] text-amber-200 hover:text-white underline font-semibold cursor-pointer"
              >
                Login Akun Petugas Piket
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Date Filter & Quick Notification */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-bold text-slate-700">Tanggal Pemantauan Piket:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-slate-50 font-mono font-bold text-slate-800"
          />
          <span className="text-xs px-2.5 py-0.5 bg-amber-100 text-amber-900 rounded-full font-bold">
            Hari {selectedDay}
          </span>
        </div>

        {lateRecords.length > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs font-bold animate-pulse">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Peringatan: {lateRecords.length} guru melakukan absensi setelah jam pelajaran dimulai!</span>
          </div>
        )}
      </div>

      {/* KPI Monitoring Cards for Piket */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Guru Terjadwal</span>
          <span className="text-xl font-black text-slate-900 mt-1 block">{scheduledTeachers.length}</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 text-center bg-emerald-50/30 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-800 block">Hadir Tepat Waktu</span>
          <span className="text-xl font-black text-emerald-700 mt-1 block">{onTimeRecords.length}</span>
        </div>

        {/* Highlighted Warning Card: Hadir Terlambat */}
        <div
          onClick={() => {
            setActiveListTab('attended');
            setAttendedFilter('late-only');
          }}
          className="bg-white p-3.5 rounded-xl border-2 border-rose-300 text-center bg-rose-50/50 shadow-xs cursor-pointer hover:bg-rose-100/70 transition-colors ring-2 ring-rose-200/60"
          title="Klik untuk melihat daftar guru yang absen terlambat"
        >
          <div className="flex items-center justify-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
            <span className="text-[11px] font-black text-rose-700">Hadir Terlambat</span>
          </div>
          <span className="text-2xl font-black text-rose-600 mt-0.5 block">{lateRecords.length}</span>
          <span className="text-[9px] text-rose-800 font-semibold block">Lewat Jam Mulai</span>
        </div>

        <div
          onClick={() => setActiveListTab('unattended')}
          className="bg-white p-3.5 rounded-xl border border-amber-200 text-center bg-amber-50/30 shadow-2xs cursor-pointer hover:bg-amber-100/60 transition-colors"
        >
          <span className="text-[11px] font-bold text-amber-800 block">Belum Absen</span>
          <span className="text-xl font-black text-amber-700 mt-1 block">{unattendedTeachers.length}</span>
        </div>

        <div
          onClick={() => setActiveListTab('piket-notes')}
          className="bg-white p-3.5 rounded-xl border border-indigo-200 text-center bg-indigo-50/30 shadow-2xs cursor-pointer hover:bg-indigo-100/60 transition-colors"
        >
          <span className="text-[11px] font-bold text-indigo-800 block">Dicatat Piket</span>
          <span className="text-xl font-black text-indigo-700 mt-1 block">{piketRecords.length}</span>
        </div>
      </div>

      {isSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{isSuccessMsg}</span>
        </div>
      )}

      {/* Grid: Form Catat Piket & Tabbed Monitoring List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Entri Keterangan Guru Tidak Hadir (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" />
              Catat Keterangan Ketidakhadiran
            </h3>
            <span className="text-[11px] px-2 py-0.5 bg-amber-50 text-amber-700 font-bold rounded">
              Hari {selectedDay}
            </span>
          </div>

          <form onSubmit={handleSubmitPiket} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pilih Guru yang Tidak Hadir
              </label>
              <select
                required
                value={targetTeacherId}
                onChange={(e) => setTargetTeacherId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-slate-800"
              >
                <option value="">-- Pilih Nama Guru --</option>
                {unattendedTeachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (NIP: {t.nip})
                  </option>
                ))}
                {/* Allow any teacher if needed */}
                <optgroup label="Guru Lainnya">
                  {teachers
                    .filter((t) => !unattendedTeachers.some((ut) => ut.id === t.id))
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status Ketidakhadiran
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'SAKIT', label: 'Sakit', color: 'border-rose-200 text-rose-700 bg-rose-50/50' },
                  { id: 'IZIN', label: 'Izin Resmi', color: 'border-orange-200 text-orange-700 bg-orange-50/50' },
                  { id: 'DINAS_LUAR', label: 'Dinas Luar', color: 'border-blue-200 text-blue-700 bg-blue-50/50' },
                  { id: 'ALPA', label: 'Alpa / Tanpa Ket.', color: 'border-red-200 text-red-700 bg-red-50/50' }
                ].map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => setStatus(s.id as AttendanceStatus)}
                    className={`p-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                      status === s.id
                        ? 'border-amber-600 bg-amber-500 text-white shadow-xs'
                        : `${s.color} hover:bg-slate-100`
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Keterangan / Alasan Resmi
              </label>
              <textarea
                required
                rows={3}
                placeholder="Contoh: Sakit demam berdarah / Mengikuti Bimtek Kurikulum di Banda Aceh / Surat dinas terlampir"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Guru Pengganti / Inval (Opsional)
              </label>
              <select
                value={substituteTeacherId}
                onChange={(e) => setSubstituteTeacherId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">-- Tidak ada guru pengganti --</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Petugas Piket Penginput
              </label>
              <input
                type="text"
                value={officerNameInput}
                onChange={(e) => setOfficerNameInput(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Simpan Keterangan Piket
            </button>
          </form>
        </div>

        {/* Right Column: Tabbed Monitoring (Presensi Hadir, Belum Absen, Catatan Piket) (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Tabs Navigation */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveListTab('attended')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeListTab === 'attended'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Sudah Presensi ({attendedRecords.length})</span>
              {lateRecords.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-600 text-white font-extrabold animate-pulse">
                  {lateRecords.length} Telat
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveListTab('unattended')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeListTab === 'unattended'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Belum Absen ({unattendedTeachers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveListTab('piket-notes')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeListTab === 'piket-notes'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-indigo-600" />
              <span>Dicatat Piket ({piketRecords.length})</span>
            </button>
          </div>

          {/* TAB 1: DAFTAR GURU SUDAH PRESENSI DENGAN PERINGATAN VISUAL TERLAMBAT */}
          {activeListTab === 'attended' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    Daftar Presensi Guru Masuk Hari Ini
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Guru dengan presensi mandiri yang masuk setelah jam pelajaran dimulai ditandai warna merah &amp; ikon peringatan.
                  </p>
                </div>

                {/* Sub-Filter Buttons */}
                <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 shrink-0">
                  <button
                    type="button"
                    onClick={() => setAttendedFilter('all')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                      attendedFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Semua ({attendedWithLateness.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttendedFilter('late-only')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 ${
                      attendedFilter === 'late-only'
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'text-rose-600 hover:bg-rose-50'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    Terlambat ({lateRecords.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttendedFilter('on-time-only')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                      attendedFilter === 'on-time-only'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    Tepat Waktu ({onTimeRecords.length})
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari guru presensi, kelas, mata pelajaran..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                />
              </div>

              {/* Records List */}
              {filteredAttended.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold">Tidak ada catatan presensi yang sesuai kriteria filter.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {filteredAttended.map(({ record: rec, lateness }) => (
                    <div
                      key={rec.id}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        lateness.isLate
                          ? 'bg-rose-50/50 border-rose-300 ring-1 ring-rose-300/60 shadow-xs'
                          : 'bg-slate-50/50 border-slate-200/80 hover:bg-white'
                      }`}
                    >
                      {/* Teacher & Schedule Details */}
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Visual Alert Icon for Late Attendance */}
                          {lateness.isLate && (
                            <span
                              title={lateness.warningText}
                              className="p-1 bg-rose-100 rounded-lg text-rose-600 shrink-0 border border-rose-300 animate-pulse"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </span>
                          )}

                          <h5 className={`font-bold text-xs ${lateness.isLate ? 'text-rose-950 font-black' : 'text-slate-900'}`}>
                            {rec.teacherName}
                          </h5>

                          <span className="text-[10px] font-mono text-slate-500 bg-white border border-slate-200 px-1.5 py-0.2 rounded">
                            NIP: {rec.nip || '-'}
                          </span>
                        </div>

                        {/* Class & Subject */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                          <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {rec.classRoomName}
                          </span>
                          <span>•</span>
                          <span className="font-medium text-slate-700">{rec.subjectName}</span>
                          <span>•</span>
                          <span className="font-mono text-slate-500">{rec.timeSlotName.split('(')[0]}</span>
                        </div>

                        {/* Visual Warning Details */}
                        {lateness.isLate ? (
                          <div className="pt-1 flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-700 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-md">
                              <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                              TERLAMBAT (+{lateness.lateMinutes} menit)
                            </span>
                            <span className="text-[10px] font-bold text-rose-600">
                              Absen: <strong className="underline">{lateness.checkinTime} WIB</strong> (Jam Mulai: {lateness.slotStartTime} WIB)
                            </span>
                          </div>
                        ) : (
                          <div className="pt-1 flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Tepat Waktu (Absen: {lateness.checkinTime} WIB)</span>
                          </div>
                        )}
                      </div>

                      {/* Right: Selfie Thumbnail with Late Warning Border */}
                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        {rec.photoUrl ? (
                          <div
                            onClick={() => setSelectedPhotoRecord(rec)}
                            className={`relative w-12 h-12 rounded-xl overflow-hidden border-2 shadow-2xs cursor-pointer hover:scale-105 transition-transform bg-slate-900 shrink-0 flex items-center justify-center ${
                              lateness.isLate
                                ? 'border-rose-400 ring-2 ring-rose-200'
                                : 'border-slate-300 hover:border-blue-500'
                            }`}
                            title="Klik untuk melihat foto selfie"
                          >
                            <img
                              src={rec.photoUrl}
                              alt={`Selfie ${rec.teacherName}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Maximize2 className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Tanpa foto</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: GURU TERJADWAL BELUM ABSEN (DENGAN PERINGATAN JIKA SUDAH LEWAT JAM MULAI) */}
          {activeListTab === 'unattended' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    Guru Terjadwal yang Belum Absen ({unattendedTeachers.length})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Guru dengan jam mengajar hari {selectedDay} yang belum melakukan presensi mandiri.
                  </p>
                </div>
              </div>

              {unattendedTeachers.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">
                    Semua guru terjadwal telah melakukan presensi atau telah dicatat piket.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {unattendedTeachers.map((t) => {
                    const tScheds = daySchedules.filter((s) => s.teacherId === t.id);
                    // Check if any schedule for this teacher has already started
                    const overdueSched = tScheds.find((s) => isScheduleOverdue(s, timeSlots).isOverdue);
                    const overdueInfo = overdueSched ? isScheduleOverdue(overdueSched, timeSlots) : null;

                    return (
                      <div
                        key={t.id}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          overdueInfo?.isOverdue
                            ? 'bg-rose-50/40 border-rose-300 ring-1 ring-rose-200'
                            : 'bg-slate-50/50 border-slate-200 hover:bg-amber-50/40'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {overdueInfo?.isOverdue && (
                              <span title="Jam pelajaran sudah dimulai tetapi guru belum absen" className="shrink-0">
                                <AlertTriangle className="w-4 h-4 text-rose-600 animate-bounce" />
                              </span>
                            )}
                            <p className={`text-xs font-bold ${overdueInfo?.isOverdue ? 'text-rose-950 font-black' : 'text-slate-800'}`}>
                              {t.name}
                            </p>
                          </div>
                          <p className="text-[11px] text-slate-500 font-mono">NIP: {t.nip}</p>

                          <div className="flex flex-wrap gap-1 mt-1">
                            {tScheds.map((sch) => {
                              const c = classes.find((cl) => cl.id === sch.classRoomId);
                              const sub = subjects.find((sb) => sb.id === sch.subjectId);
                              const slotInfo = formatScheduleTimeSlots(sch, timeSlots);
                              return (
                                <span
                                  key={sch.id}
                                  className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600"
                                >
                                  <strong>{c?.name}</strong>: {sub?.name} ({slotInfo.label})
                                </span>
                              );
                            })}
                          </div>

                          {/* Visual Warning: Overdue Lesson Start */}
                          {overdueInfo?.isOverdue && (
                            <div className="pt-1 flex items-center gap-1 text-[10px] font-bold text-rose-600">
                              <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                              <span>
                                Peringatan: Jam pelajaran sudah dimulai sejak {overdueInfo.startTime} WIB (Terlambat {overdueInfo.overdueMinutes} mnt)!
                              </span>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setTargetTeacherId(t.id);
                            window.scrollTo({ top: 300, behavior: 'smooth' });
                          }}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl shrink-0 transition-all cursor-pointer ${
                            overdueInfo?.isOverdue
                              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                              : 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                          }`}
                        >
                          Catat Keterangan
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CATATAN GURU TIDAK HADIR TERVERIFIKASI PIKET */}
          {activeListTab === 'piket-notes' && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-indigo-600" />
                  Catatan Guru Tidak Hadir Terverifikasi Piket ({piketRecords.length})
                </h4>
                <span className="text-xs text-slate-400">Tanggal: {selectedDate}</span>
              </div>

              {piketRecords.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">
                  Belum ada catatan guru berhalangan untuk tanggal {selectedDate}.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                  {piketRecords.map((rec) => (
                    <div key={rec.id} className="py-3.5 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{rec.teacherName}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              rec.status === 'SAKIT'
                                ? 'bg-rose-100 text-rose-800'
                                : rec.status === 'IZIN'
                                ? 'bg-orange-100 text-orange-800'
                                : rec.status === 'DINAS_LUAR'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {rec.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{rec.piketNotes || rec.notes}</p>
                        {rec.substituteTeacherName && (
                          <p className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                            Guru Inval: {rec.substituteTeacherName}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400">
                          Dicatat pukul {rec.timestamp} WIB oleh {rec.piketOfficerName || 'Petugas Piket'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Hapus catatan piket untuk ${rec.teacherName}?`)) {
                            onDeleteRecord(rec.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        title="Hapus data ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Selfie Photo Preview Modal */}
      {selectedPhotoRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl space-y-4">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm">{selectedPhotoRecord.teacherName}</h4>
                <p className="text-[11px] text-slate-400">
                  {selectedPhotoRecord.classRoomName} • {selectedPhotoRecord.subjectName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPhotoRecord(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 space-y-3">
              <div className="w-full aspect-4/3 rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 shadow-inner flex items-center justify-center">
                <img
                  src={selectedPhotoRecord.photoUrl}
                  alt={`Selfie ${selectedPhotoRecord.teacherName}`}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Attendance Lateness Details in Modal */}
              {(() => {
                const lateness = analyzeRecordLateness(selectedPhotoRecord, timeSlots);
                return (
                  <div className={`p-3 rounded-xl border text-xs ${
                    lateness.isLate
                      ? 'bg-rose-50 border-rose-300 text-rose-900'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}>
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      {lateness.isLate ? (
                        <>
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span className="text-rose-700 font-black">
                            Presensi Terlambat (+{lateness.lateMinutes} menit)
                          </span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Presensi Tepat Waktu</span>
                        </>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Waktu Absen: <strong>{lateness.checkinTime} WIB</strong> | Jadwal Mulai: <strong>{lateness.slotStartTime} WIB</strong>
                    </p>
                  </div>
                );
              })()}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPhotoRecord(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
