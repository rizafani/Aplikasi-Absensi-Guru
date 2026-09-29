import React, { useState } from 'react';
import { Teacher, ClassRoom, Subject, TimeSlot, ScheduleItem, AttendanceRecord, DayOfWeek } from '../types';
import { getTodayDayName, getTodayDateString, INDONESIAN_DAYS } from '../data/initialData';
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  Calendar,
  X,
  FileCheck,
  UserX,
  ArrowRight
} from 'lucide-react';

interface TodayStatsProps {
  teachers: Teacher[];
  classes: ClassRoom[];
  subjects: Subject[];
  timeSlots: TimeSlot[];
  schedules: ScheduleItem[];
  attendanceRecords: AttendanceRecord[];
  onOpenPiket: () => void;
}

export const TodayStats: React.FC<TodayStatsProps> = ({
  teachers,
  classes,
  subjects,
  timeSlots,
  schedules,
  attendanceRecords,
  onOpenPiket
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(getTodayDayName());
  const [filterTab, setFilterTab] = useState<'all' | 'attended' | 'not-yet' | 'piket-noted'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<{ url: string; title: string } | null>(null);

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

  // Get active teachers scheduled for this day
  const daySchedules = schedules.filter((s) => s.day === selectedDay);
  const scheduledTeacherIds = Array.from(new Set(daySchedules.map((s) => s.teacherId)));
  const scheduledTeachers = teachers.filter((t) => scheduledTeacherIds.includes(t.id));

  // Attendance for the selected date
  const dateAttendance = attendanceRecords.filter((r) => r.date === selectedDate);

  // Group status for each scheduled teacher
  const statsList = scheduledTeachers.map((teacher) => {
    const records = dateAttendance.filter((r) => r.teacherId === teacher.id);
    const teacherScheds = daySchedules.filter((s) => s.teacherId === teacher.id);

    const hasAttended = records.some((r) => r.status === 'HADIR');
    const piketRecord = records.find((r) => r.status !== 'HADIR');

    let status: 'HADIR' | 'BELUM_ABSEN' | 'SAKIT' | 'IZIN' | 'DINAS_LUAR' | 'ALPA' = 'BELUM_ABSEN';

    if (hasAttended) {
      status = 'HADIR';
    } else if (piketRecord) {
      status = piketRecord.status;
    }

    return {
      teacher,
      status,
      records,
      schedules: teacherScheds,
      piketRecord
    };
  });

  // Calculate metrics
  const totalScheduled = scheduledTeachers.length;
  const totalAttended = statsList.filter((s) => s.status === 'HADIR').length;
  const totalNotYet = statsList.filter((s) => s.status === 'BELUM_ABSEN').length;
  const totalPiketNoted = statsList.filter(
    (s) => ['SAKIT', 'IZIN', 'DINAS_LUAR', 'ALPA'].includes(s.status)
  ).length;

  const attendancePercentage = totalScheduled > 0 ? Math.round((totalAttended / totalScheduled) * 100) : 0;

  // Filter list
  const filteredList = statsList.filter((item) => {
    const matchesSearch =
      item.teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.teacher.nip.includes(searchQuery);

    if (!matchesSearch) return false;

    if (filterTab === 'attended') return item.status === 'HADIR';
    if (filterTab === 'not-yet') return item.status === 'BELUM_ABSEN';
    if (filterTab === 'piket-noted') return ['SAKIT', 'IZIN', 'DINAS_LUAR', 'ALPA'].includes(item.status);

    return true;
  });

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Header & Date Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Statistik Kehadiran Guru
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
              Live Monitoring
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Data pemantauan presensi dan jurnal mengajar guru SMA NEGERI 1 JULOK secara real-time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Calendar className="w-4 h-4 text-slate-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="text-xs font-semibold bg-transparent focus:outline-none text-slate-700 font-mono"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <span className="text-xs text-slate-500">Hari:</span>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value as DayOfWeek)}
              className="text-xs font-bold text-blue-800 bg-transparent focus:outline-none"
            >
              {INDONESIAN_DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Terjadwal */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Terjadwal
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{totalScheduled}</span>
            <span className="text-xs text-slate-500">Guru Mengajar</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Jadwal hari {selectedDay} di SMA N 1 Julok
          </p>
        </div>

        {/* Sudah Absen (Hadir) */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-200/80 shadow-xs relative overflow-hidden bg-gradient-to-br from-emerald-50/30 to-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
              Sudah Absen
            </span>
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-700">{totalAttended}</span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              {attendancePercentage}%
            </span>
          </div>
          <p className="text-[11px] text-emerald-600 font-medium mt-2">
            Tercatat hadir dengan bukti selfie kelas
          </p>
        </div>

        {/* Belum Absen */}
        <div className="bg-white p-5 rounded-2xl border border-amber-200/80 shadow-xs relative overflow-hidden bg-gradient-to-br from-amber-50/30 to-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
              Belum Absen
            </span>
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-800">{totalNotYet}</span>
            <span className="text-xs text-amber-700">Guru</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-amber-700">Menunggu jam/presensi</span>
            {totalNotYet > 0 && (
              <button
                onClick={onOpenPiket}
                className="text-[11px] font-bold text-blue-700 hover:underline flex items-center gap-0.5"
              >
                Piket <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Izin / Sakit / Piket */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Keterangan Piket
            </span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-800">{totalPiketNoted}</span>
            <span className="text-xs text-slate-500">Izin / Sakit / Dinas</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Divalidasi oleh petugas guru piket
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filterTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua ({totalScheduled})
          </button>
          <button
            onClick={() => setFilterTab('attended')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              filterTab === 'attended'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Sudah Absen ({totalAttended})
          </button>
          <button
            onClick={() => setFilterTab('not-yet')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              filterTab === 'not-yet'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Belum Absen ({totalNotYet})
          </button>
          <button
            onClick={() => setFilterTab('piket-noted')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              filterTab === 'piket-noted'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            Keterangan Piket ({totalPiketNoted})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari nama guru / NIP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Teachers Attendance Cards / Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredList.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <UserX className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold">Tidak ada data guru yang sesuai kriteria.</p>
            <p className="text-xs text-slate-400 mt-1">Coba ubah tanggal atau kata kunci pencarian.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredList.map((item) => {
              const { teacher, status, records, schedules: teacherScheds, piketRecord } = item;

              // Match schedule names
              const scheduleDetails = teacherScheds.map((sch) => {
                const c = classes.find((cl) => cl.id === sch.classRoomId);
                const sub = subjects.find((sb) => sb.id === sch.subjectId);
                const ts = timeSlots.find((slot) => slot.id === sch.timeSlotId);
                return {
                  cls: c?.name || '-',
                  subj: sub?.name || '-',
                  slot: ts ? `${ts.label} (${ts.period})` : '-'
                };
              });

              return (
                <div key={teacher.id} className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Teacher Info & Schedule */}
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-800 font-bold flex items-center justify-center shrink-0 shadow-2xs">
                      {teacher.name.charAt(0)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900">{teacher.name}</h4>
                        <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          NIP. {teacher.nip}
                        </span>
                      </div>

                      {/* Scheduled Classes & Subjects */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {scheduleDetails.map((sd, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200/60 font-medium"
                          >
                            <span className="font-bold text-blue-700">{sd.cls}</span>: {sd.subj} ({sd.slot.split(' ')[0]})
                          </span>
                        ))}
                      </div>

                      {/* Notes / Topic if attended or piket */}
                      {records[0]?.topic && (
                        <p className="text-xs text-slate-600 italic pt-1">
                          Materi: "{records[0].topic}"
                        </p>
                      )}
                      {piketRecord?.piketNotes && (
                        <p className="text-xs text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200/70 inline-block">
                          <strong>Catatan Piket:</strong> {piketRecord.piketNotes}
                          {piketRecord.substituteTeacherName && (
                            <span className="block text-[11px] text-amber-900 font-semibold">
                              Guru Pengganti (Inval): {piketRecord.substituteTeacherName}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Status Badge & Selfie Preview */}
                  <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                    {/* Status Badge */}
                    {status === 'HADIR' ? (
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Hadir di Kelas
                        </span>
                        <div className="text-[11px] font-mono text-slate-500 mt-1">
                          Jam {records[0]?.timestamp} WIB
                        </div>
                      </div>
                    ) : status === 'BELUM_ABSEN' ? (
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          Belum Absen
                        </span>
                        <div className="text-[11px] text-slate-400 mt-1">
                          Menunggu presensi
                        </div>
                      </div>
                    ) : status === 'DINAS_LUAR' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        Dinas Luar
                      </span>
                    ) : status === 'SAKIT' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        Sakit (Surat Dokter)
                      </span>
                    ) : status === 'IZIN' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
                        Izin Resmi
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                        Alpa / Tanpa Keterangan
                      </span>
                    )}

                    {/* Selfie Thumbnail (If Hadir with Photo) */}
                    {records[0]?.photoUrl ? (
                      <button
                        onClick={() =>
                          setPreviewPhotoUrl({
                            url: records[0].photoUrl,
                            title: `Selfie Kelas - ${teacher.name} (${records[0].classRoomName})`
                          })
                        }
                        className="relative group w-12 h-12 rounded-xl overflow-hidden border border-slate-300 shadow-2xs hover:scale-105 transition-transform"
                        title="Klik untuk melihat foto selfie kelas"
                      >
                        <img
                          src={records[0].photoUrl}
                          alt="Selfie"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                          <Eye className="w-4 h-4" />
                        </div>
                      </button>
                    ) : status === 'BELUM_ABSEN' ? (
                      <button
                        onClick={onOpenPiket}
                        className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                      >
                        Catat Piket
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Photo Preview Modal */}
      {previewPhotoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative max-w-lg w-full bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h4 className="text-xs sm:text-sm font-bold truncate pr-4">{previewPhotoUrl.title}</h4>
              <button
                onClick={() => setPreviewPhotoUrl(null)}
                className="p-1 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-black flex items-center justify-center max-h-[75vh] overflow-hidden">
              <img
                src={previewPhotoUrl.url}
                alt="Foto Selfie"
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
              <p className="text-xs text-slate-600">
                Terverifikasi secara digital untuk Sistem Absensi SMA NEGERI 1 JULOK
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
