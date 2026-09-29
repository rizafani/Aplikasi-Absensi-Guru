import React, { useState } from 'react';
import { Teacher, ClassRoom, Subject, TimeSlot, ScheduleItem, AttendanceRecord, UserSession, AttendanceStatus, DayOfWeek } from '../types';
import { getTodayDayName, getTodayDateString, INDONESIAN_DAYS } from '../data/initialData';
import {
  ClipboardList,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  Trash2,
  Clock,
  UserPlus,
  FileText,
  ShieldAlert,
  Info
} from 'lucide-react';

interface PiketPanelProps {
  session: UserSession;
  teachers: Teacher[];
  classes: ClassRoom[];
  subjects: Subject[];
  timeSlots: TimeSlot[];
  schedules: ScheduleItem[];
  attendanceRecords: AttendanceRecord[];
  onRecordAttendance: (record: AttendanceRecord) => void;
  onDeleteRecord: (id: string) => void;
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

  // Schedules for selected day
  const daySchedules = schedules.filter((s) => s.day === selectedDay);
  const scheduledTeacherIds = Array.from(new Set(daySchedules.map((s) => s.teacherId)));
  const scheduledTeachers = teachers.filter((t) => scheduledTeacherIds.includes(t.id));

  // Today's attendance records
  const dateAttendance = attendanceRecords.filter((r) => r.date === selectedDate);
  const unattendedTeachers = scheduledTeachers.filter((t) => {
    // Has not self-attended and has no piket note yet
    return !dateAttendance.some((r) => r.teacherId === t.id);
  });

  // Piket notes recorded for this date
  const piketRecords = dateAttendance.filter((r) => r.status !== 'HADIR');

  const handleSubmitPiket = (e: React.FormEvent) => {
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
    const ts = timeSlots.find((slot) => slot.id === teacherSched?.timeSlotId);

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
      timeSlotName: ts ? `${ts.label} (${ts.period})` : 'Jadwal Hari Ini',
      status: status,
      photoUrl: '',
      timestamp: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      notes: reason.trim(),
      recordedBy: 'GURU_PIKET',
      piketOfficerName: officerNameInput.trim() || session.piketName || 'Petugas Piket',
      piketNotes: reason.trim() || `Keterangan tercatat: ${status}`,
      substituteTeacherName: substituteTeacher ? substituteTeacher.name : undefined
    };

    onRecordAttendance(newPiketRecord);
    setIsSuccessMsg(`Keterangan ketidakhadiran untuk ${teacher.name} berhasil disimpan.`);
    setReason('');
    setTargetTeacherId('');
    setSubstituteTeacherId('');

    setTimeout(() => {
      setIsSuccessMsg(null);
    }, 4000);
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
              Catat alasan ketidakhadiran guru yang belum absen, atur guru pengganti (inval), dan pastikan KBM di SMA NEGERI 1 JULOK tetap berjalan tertib.
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
                className="mt-1 text-[11px] text-amber-200 hover:text-white underline font-semibold"
              >
                Login Akun Petugas Piket
              </button>
            )}
          </div>
        </div>
      </div>

      {isSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{isSuccessMsg}</span>
        </div>
      )}

      {/* Grid: Form Catat Piket & Daftar Guru Belum Absen */}
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
                    className={`p-2 rounded-xl text-xs font-bold border transition-all text-center ${
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
                placeholder="Contoh: Sakit demam berdarah / Mengikuti Bimtek Kurikulum di Banda Aceh / Surat terlampir"
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
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Simpan Keterangan Piket
            </button>
          </form>
        </div>

        {/* Right Column: Daftar Guru Belum Absen & Rekap Piket (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* List: Guru Terjadwal Belum Absen Hari Ini */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  Guru Terjadwal yang Belum Absen ({unattendedTeachers.length})
                </h4>
                <p className="text-[11px] text-slate-500">
                  Guru yang memiliki jam mengajar hari {selectedDay} dan belum presensi mandiri.
                </p>
              </div>
            </div>

            {unattendedTeachers.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">Semua guru terjadwal telah melakukan presensi atau telah dicatat piket.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {unattendedTeachers.map((t) => {
                  const tScheds = daySchedules.filter((s) => s.teacherId === t.id);
                  return (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3 hover:bg-amber-50/50 hover:border-amber-200 transition-colors"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800">{t.name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">NIP: {t.nip}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {tScheds.map((sch) => {
                            const c = classes.find((cl) => cl.id === sch.classRoomId);
                            const sub = subjects.find((sb) => sb.id === sch.subjectId);
                            return (
                              <span key={sch.id} className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600">
                                {c?.name}: {sub?.name}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        onClick={() => setTargetTeacherId(t.id)}
                        className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-semibold rounded-lg shrink-0 transition-colors"
                      >
                        Beri Alasan
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* List: Log Keterangan Piket Hari Ini */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-indigo-600" />
                Catatan Guru Tidak Hadir Terverifikasi Piket ({piketRecords.length})
              </h4>
              <span className="text-xs text-slate-400">Tanggal: {selectedDate}</span>
            </div>

            {piketRecords.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                Belum ada catatan guru berhalangan untuk tanggal {selectedDate}.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {piketRecords.map((rec) => (
                  <div key={rec.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{rec.teacherName}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
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
                      <p className="text-xs text-slate-600">
                        {rec.piketNotes || rec.notes}
                      </p>
                      {rec.substituteTeacherName && (
                        <p className="text-[11px] font-semibold text-emerald-700">
                          Guru Inval: {rec.substituteTeacherName}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400">
                        Dicatat pukul {rec.timestamp} WIB oleh {rec.piketOfficerName || 'Petugas Piket'}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        if (confirm(`Hapus catatan piket untuk ${rec.teacherName}?`)) {
                          onDeleteRecord(rec.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                      title="Hapus data ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
