import React, { useState, useEffect, useMemo } from 'react';
import {
  Teacher,
  ClassRoom,
  Subject,
  TimeSlot,
  ScheduleItem,
  AttendanceRecord,
  PiketAccount,
  DayOfWeek,
  SchoolLogos,
  AttendanceStatus
} from '../types';
import {
  getTodayDayName,
  getTodayDateString,
  INDONESIAN_DAYS,
  formatScheduleTimeSlots
} from '../data/initialData';
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
  Radio,
  RefreshCw,
  Camera,
  MessageCircle,
  Sparkles,
  School,
  BookOpen,
  UserCheck,
  ShieldAlert,
  ChevronRight,
  TrendingUp,
  LayoutGrid,
  Table as TableIcon,
  PlusCircle,
  ExternalLink,
  Award,
  Check,
  HelpCircle,
  Workflow,
  MapPin
} from 'lucide-react';
import { WorkflowModal } from './WorkflowModal';

interface AdminRealtimeDashboardProps {
  teachers: Teacher[];
  classes: ClassRoom[];
  subjects: Subject[];
  timeSlots: TimeSlot[];
  schedules: ScheduleItem[];
  attendanceRecords: AttendanceRecord[];
  piketAccounts: PiketAccount[];
  logos?: SchoolLogos;
  onRecordAttendance?: (record: AttendanceRecord) => void;
  onDeleteRecord?: (id: string) => void;
  onSwitchTab?: (tab: string) => void;
}

export const AdminRealtimeDashboard: React.FC<AdminRealtimeDashboardProps> = ({
  teachers,
  classes,
  subjects,
  timeSlots,
  schedules,
  attendanceRecords,
  piketAccounts,
  logos,
  onRecordAttendance,
  onDeleteRecord,
  onSwitchTab
}) => {
  // Live clock
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Selected date & day filter (defaults to today)
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(getTodayDayName());

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'HADIR' | 'BELUM_ABSEN' | 'EXCUSED' | 'ALL_TEACHERS'>('ALL');
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [selectedTimeSlotId, setSelectedTimeSlotId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Modal states
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState<boolean>(false);
  const [previewPhotoRecord, setPreviewPhotoRecord] = useState<AttendanceRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [modalTargetTeacher, setModalTargetTeacher] = useState<Teacher | null>(null);
  const [modalForm, setModalForm] = useState<{
    status: AttendanceStatus;
    classRoomId: string;
    subjectId: string;
    timeSlotId: string;
    topic: string;
    notes: string;
    substituteTeacherId: string;
  }>({
    status: 'HADIR',
    classRoomId: '',
    subjectId: '',
    timeSlotId: '',
    topic: '',
    notes: '',
    substituteTeacherId: ''
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Helper: derive DayOfWeek from selected date string
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    try {
      const parts = newDate.split('-').map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
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
      // fallback
    }
  };

  const isViewingToday = selectedDate === getTodayDateString();

  // Determine current active time slot based on current time
  const activeTimeSlot = useMemo(() => {
    if (!isViewingToday) return null;
    const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    for (const slot of timeSlots) {
      if (!slot.startTime || !slot.endTime) continue;
      const [sh, sm] = slot.startTime.split(':').map(Number);
      const [eh, em] = slot.endTime.split(':').map(Number);
      const slotStart = sh * 60 + sm;
      const slotEnd = eh * 60 + em;
      if (nowMinutes >= slotStart && nowMinutes <= slotEnd) {
        return slot;
      }
    }
    return null;
  }, [currentTime, timeSlots, isViewingToday]);

  // Data calculations for selected date & day
  const daySchedules = useMemo(() => {
    return schedules.filter((s) => s.day === selectedDay);
  }, [schedules, selectedDay]);

  const scheduledTeacherIds = useMemo(() => {
    return Array.from(new Set(daySchedules.map((s) => s.teacherId)));
  }, [daySchedules]);

  const scheduledTeachers = useMemo(() => {
    return teachers.filter((t) => scheduledTeacherIds.includes(t.id));
  }, [teachers, scheduledTeacherIds]);

  const dateAttendance = useMemo(() => {
    return attendanceRecords.filter((r) => r.date === selectedDate);
  }, [attendanceRecords, selectedDate]);

  // Piket on duty for selected day
  const activePiketOfficers = useMemo(() => {
    return piketAccounts.filter((acc) => acc.isActive && acc.assignedDays?.includes(selectedDay));
  }, [piketAccounts, selectedDay]);

  // Compiled teacher status objects
  const compiledTeachers = useMemo(() => {
    // Teachers to list: either scheduled teachers or all teachers if filter is ALL_TEACHERS
    const baseList = statusFilter === 'ALL_TEACHERS' ? teachers : scheduledTeachers;

    return baseList.map((teacher) => {
      const records = dateAttendance.filter((r) => r.teacherId === teacher.id);
      const teacherScheds = daySchedules.filter((s) => s.teacherId === teacher.id);

      const hadirRecords = records.filter((r) => r.status === 'HADIR');
      const excuseRecord = records.find((r) => r.status !== 'HADIR');

      let currentStatus: 'HADIR' | 'SAKIT' | 'IZIN' | 'DINAS_LUAR' | 'ALPA' | 'BELUM_ABSEN' = 'BELUM_ABSEN';
      if (hadirRecords.length > 0) {
        currentStatus = 'HADIR';
      } else if (excuseRecord) {
        currentStatus = excuseRecord.status;
      }

      // Check if teacher is scheduled in active time slot
      const isCurrentlyScheduled = activeTimeSlot
        ? teacherScheds.some((s) => {
            const ids = s.timeSlotIds && s.timeSlotIds.length > 0 ? s.timeSlotIds : [s.timeSlotId];
            return ids.includes(activeTimeSlot.id);
          })
        : false;

      // Primary attendance record if any
      const primaryRecord = hadirRecords[0] || excuseRecord || null;

      // Schedules formatted
      const scheduleDetails = teacherScheds.map((sched) => {
        const cls = classes.find((c) => c.id === sched.classRoomId);
        const sub = subjects.find((s) => s.id === sched.subjectId);
        const timeInfo = formatScheduleTimeSlots(sched, timeSlots);
        const recordForSched = records.find(
          (r) =>
            (cls && r.classRoomName === cls.name) ||
            (sub && r.subjectName === sub.name)
        );
        return {
          sched,
          classRoom: cls,
          subject: sub,
          timeInfo,
          record: recordForSched
        };
      });

      return {
        teacher,
        status: currentStatus,
        records,
        hadirRecords,
        excuseRecord,
        primaryRecord,
        schedules: teacherScheds,
        scheduleDetails,
        isCurrentlyScheduled,
        isScheduledToday: teacherScheds.length > 0
      };
    });
  }, [
    statusFilter,
    teachers,
    scheduledTeachers,
    dateAttendance,
    daySchedules,
    activeTimeSlot,
    classes,
    subjects,
    timeSlots
  ]);

  // Executive stats counts
  const totalScheduledCount = scheduledTeachers.length;
  const hadirCount = compiledTeachers.filter((t) => t.isScheduledToday && t.status === 'HADIR').length;
  const excusedCount = compiledTeachers.filter(
    (t) => t.isScheduledToday && ['SAKIT', 'IZIN', 'DINAS_LUAR'].includes(t.status)
  ).length;
  const belumAbsenCount = compiledTeachers.filter(
    (t) => t.isScheduledToday && t.status === 'BELUM_ABSEN'
  ).length;

  const attendanceRate = totalScheduledCount > 0 ? Math.round((hadirCount / totalScheduledCount) * 100) : 0;

  // Filtered teachers based on UI controls
  const filteredTeachers = useMemo(() => {
    return compiledTeachers.filter((item) => {
      // Status filter
      if (statusFilter === 'HADIR' && item.status !== 'HADIR') return false;
      if (statusFilter === 'BELUM_ABSEN' && item.status !== 'BELUM_ABSEN') return false;
      if (statusFilter === 'EXCUSED' && !['SAKIT', 'IZIN', 'DINAS_LUAR'].includes(item.status)) return false;

      // Class filter
      if (selectedClassId !== 'ALL') {
        const hasClass = item.schedules.some((s) => s.classRoomId === selectedClassId);
        if (!hasClass) return false;
      }

      // TimeSlot filter
      if (selectedTimeSlotId !== 'ALL') {
        const hasTimeSlot = item.schedules.some((s) => {
          const ids = s.timeSlotIds && s.timeSlotIds.length > 0 ? s.timeSlotIds : [s.timeSlotId];
          return ids.includes(selectedTimeSlotId);
        });
        if (!hasTimeSlot) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = item.teacher.name.toLowerCase().includes(query);
        const matchNip = item.teacher.nip.includes(query);
        const matchSubject = item.scheduleDetails.some((sd) =>
          sd.subject?.name.toLowerCase().includes(query)
        );
        const matchClass = item.scheduleDetails.some((sd) =>
          sd.classRoom?.name.toLowerCase().includes(query)
        );
        if (!matchName && !matchNip && !matchSubject && !matchClass) return false;
      }

      return true;
    });
  }, [compiledTeachers, statusFilter, selectedClassId, selectedTimeSlotId, searchQuery]);

  // Teachers currently scheduled right now who haven't clocked in
  const urgentUnattendedNow = useMemo(() => {
    if (!activeTimeSlot || !isViewingToday) return [];
    return compiledTeachers.filter((t) => t.isCurrentlyScheduled && t.status === 'BELUM_ABSEN');
  }, [activeTimeSlot, isViewingToday, compiledTeachers]);

  // Recent attendance stream (latest 5 records today)
  const recentAttendanceStream = useMemo(() => {
    return [...dateAttendance].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 5);
  }, [dateAttendance]);

  // Action: Open Modal to Edit/Record attendance
  const handleOpenEditModal = (teacher: Teacher) => {
    setModalTargetTeacher(teacher);
    // Find today's schedule for defaults
    const teacherSched = daySchedules.find((s) => s.teacherId === teacher.id);
    const existingRecord = dateAttendance.find((r) => r.teacherId === teacher.id);

    setModalForm({
      status: existingRecord ? existingRecord.status : 'HADIR',
      classRoomId: teacherSched ? teacherSched.classRoomId : classes[0]?.id || '',
      subjectId: teacherSched ? teacherSched.subjectId : subjects[0]?.id || '',
      timeSlotId: teacherSched ? teacherSched.timeSlotId : timeSlots[0]?.id || '',
      topic: existingRecord?.topic || '',
      notes: existingRecord?.notes || existingRecord?.piketNotes || '',
      substituteTeacherId: ''
    });
    setIsEditModalOpen(true);
  };

  const handleSaveModalAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTargetTeacher || !onRecordAttendance) return;

    const cls = classes.find((c) => c.id === modalForm.classRoomId);
    const sub = subjects.find((s) => s.id === modalForm.subjectId);
    const ts = timeSlots.find((t) => t.id === modalForm.timeSlotId);
    const substituteTeacher = teachers.find((t) => t.id === modalForm.substituteTeacherId);

    const now = new Date();
    const newRecord: AttendanceRecord = {
      id: `admin-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      teacherId: modalTargetTeacher.id,
      teacherName: modalTargetTeacher.name,
      nip: modalTargetTeacher.nip,
      date: selectedDate,
      dayName: selectedDay,
      classRoomName: cls?.name || 'Seluruh Kelas',
      subjectName: sub?.name || 'Mata Pelajaran',
      timeSlotName: ts ? `${ts.label} (${ts.period})` : 'Jadwal Hari Ini',
      status: modalForm.status,
      photoUrl: '',
      timestamp: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      topic: modalForm.topic.trim() || `Tercatat oleh Administrator pada ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`,
      notes: modalForm.notes.trim(),
      recordedBy: 'ADMIN',
      piketOfficerName: 'Administrator SMAN 1 Julok',
      piketNotes: modalForm.notes.trim() || `Diperbarui via Dashboard Admin: ${modalForm.status}`,
      substituteTeacherName: substituteTeacher ? substituteTeacher.name : ''
    };

    onRecordAttendance(newRecord);
    setIsEditModalOpen(false);
    setToastMessage(`Presensi guru ${modalTargetTeacher.name} berhasil disimpan ke Cloud Database.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Generate WhatsApp reminder link
  const getWhatsAppLink = (teacher: Teacher, schedDetails: any[]) => {
    if (!teacher.phone) return null;
    let cleanPhone = teacher.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }
    const schedInfo = schedDetails
      .map((sd) => `${sd.classRoom?.name || 'Kelas'} (${sd.subject?.name || 'Mapel'})`)
      .join(', ');

    const text = encodeURIComponent(
      `Assalamu'alaikum wr. wb. Yth. Bapak/Ibu ${teacher.name}.\n\nMohon konfirmasi dan melakukan absensi mengajar untuk jadwal hari ini di SMAN 1 JULOK: ${schedInfo || 'Jadwal Mengajar'}.\n\nTerima kasih.`
    );
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-medium animate-bounce border border-emerald-400">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner / Live Monitoring Header */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white rounded-2xl p-5 sm:p-7 shadow-lg border border-blue-900/40 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute right-40 top-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <Radio className="w-3.5 h-3.5" />
                <span>Monitoring Real-Time Cloud Aktif</span>
              </span>
              <span className="text-xs text-blue-300 font-mono">
                SMA NEGERI 1 JULOK
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Dashboard Realtime Kehadiran Guru
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Pantau langsung presensi mengajar guru yang telah masuk kelas, verifikasi foto bukti tatap muka, deteksi kelas tanpa guru secara langsung, dan kelola penugasan guru pengganti.
            </p>
          </div>

          {/* Right live widgets */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Live Clock Card */}
            <div className="bg-white/10 backdrop-blur-md border border-white/15 px-4 py-3 rounded-xl flex items-center gap-3 shadow-inner">
              <div className="w-10 h-10 rounded-lg bg-blue-600/50 flex items-center justify-center text-amber-300">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">
                  Waktu Sistem
                </div>
                <div className="text-lg sm:text-xl font-mono font-bold text-white tracking-wider">
                  {currentTime.toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}{' '}
                  <span className="text-xs text-amber-300">WIB</span>
                </div>
              </div>
            </div>

            {/* Date Selector */}
            <div className="bg-white/10 backdrop-blur-md border border-white/15 p-2 rounded-xl flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-300 ml-2" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="bg-slate-900/80 text-white text-xs font-semibold px-3 py-2 rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {!isViewingToday && (
                <button
                  onClick={() => handleDateChange(getTodayDateString())}
                  className="px-2.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all"
                  title="Kembali ke Hari Ini"
                >
                  Hari Ini
                </button>
              )}
            </div>

            {/* Workflow Diagram SOP Button */}
            <button
              onClick={() => setIsWorkflowModalOpen(true)}
              className="bg-blue-600/70 hover:bg-blue-600 text-white border border-blue-400/40 px-3.5 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Lihat Gambar Diagram Alur Kerja & SOP Sistem"
            >
              <Workflow className="w-4 h-4 text-amber-300" />
              <span>Alur Kerja Sistem</span>
            </button>
          </div>
        </div>

        {/* Sub-bar: Active Time Slot & Piket Officers */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Active Session Status */}
          <div className="flex items-center gap-2">
            <span className="text-slate-300">Sesi KBM Saat Ini:</span>
            {activeTimeSlot ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-200 font-bold border border-emerald-500/40">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                {activeTimeSlot.label} ({activeTimeSlot.period} WIB) Sedang Berlangsung
              </span>
            ) : isViewingToday ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Di Luar Jam Sesi Pelajaran Aktif
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-900/60 text-blue-200 border border-blue-800">
                <Calendar className="w-3.5 h-3.5" />
                Melihat Arsip Hari {selectedDay}, {selectedDate}
              </span>
            )}
          </div>

          {/* Piket Officers On Duty */}
          <div className="flex items-center gap-2">
            <span className="text-slate-300">Guru Piket Bertugas ({selectedDay}):</span>
            {activePiketOfficers.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {activePiketOfficers.map((piket) => (
                  <span
                    key={piket.id}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-200 font-medium border border-blue-500/30 text-[11px]"
                  >
                    <UserCheck className="w-3 h-3 text-blue-400" />
                    {piket.teacherName}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-slate-400 italic text-[11px]">Belum diatur untuk hari {selectedDay}</span>
            )}
          </div>
        </div>
      </div>

      {/* Urgent Warning Banner: Classes without teacher right now */}
      {urgentUnattendedNow.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-rose-500/10 border-2 border-rose-400/60 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm animate-pulse">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-rose-950 flex items-center gap-2">
                Peringatan Kelas Berlangsung: {urgentUnattendedNow.length} Guru Belum Melakukan Absensi pada Sesi Ini!
              </h4>
              <p className="text-xs text-rose-800 mt-0.5">
                Guru berikut terjadwal mengajar pada{' '}
                <strong>
                  {activeTimeSlot?.label} ({activeTimeSlot?.period} WIB)
                </strong>{' '}
                namun belum tercatat masuk kelas:
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {urgentUnattendedNow.map((t) => (
                  <button
                    key={t.teacher.id}
                    onClick={() => handleOpenEditModal(t.teacher)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-rose-300 rounded-lg text-xs font-semibold text-rose-900 shadow-xs hover:bg-rose-50 transition-colors"
                  >
                    <span>{t.teacher.name}</span>
                    <span className="text-[10px] text-rose-600 font-mono">
                      (
                      {t.schedules
                        .map((s) => classes.find((c) => c.id === s.classRoomId)?.name)
                        .filter(Boolean)
                        .join(', ')}
                      )
                    </span>
                    <ChevronRight className="w-3 h-3 text-rose-500" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <span className="text-xs text-rose-800 font-medium hidden sm:inline">
              Klik nama guru untuk tindak lanjut / isi izin / guru pengganti
            </span>
          </div>
        </div>
      )}

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Terjadwal */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-blue-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Terjadwal Hari Ini
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {totalScheduledCount}
            </span>
            <span className="text-xs font-medium text-slate-500">Guru</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
            <span>Total guru aktif:</span>
            <strong className="text-slate-700">{teachers.length} guru</strong>
          </div>
        </div>

        {/* Card 2: Sudah Absen (Hadir) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-emerald-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Sudah Masuk (Hadir)
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
              {hadirCount}
            </span>
            <span className="text-xs font-medium text-slate-500">
              / {totalScheduledCount} Guru ({attendanceRate}%)
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-2 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${attendanceRate}%` }}
            ></div>
          </div>
        </div>

        {/* Card 3: Izin / Sakit / Dinas Luar */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-amber-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Izin / Sakit / DL
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-600">
              {excusedCount}
            </span>
            <span className="text-xs font-medium text-slate-500">Guru</span>
          </div>
          <div className="mt-2 text-[11px] text-amber-700 flex items-center gap-1 font-medium">
            <span>Tercatat berhalangan hadir</span>
          </div>
        </div>

        {/* Card 4: Belum Absen */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-rose-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
              Belum Melakukan Absensi
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <UserX className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-600">
              {belumAbsenCount}
            </span>
            <span className="text-xs font-medium text-slate-500">Guru</span>
          </div>
          <div className="mt-2 text-[11px] text-rose-600 flex items-center gap-1">
            {belumAbsenCount > 0 ? (
              <span className="font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                Perlu konfirmasi guru piket
              </span>
            ) : (
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Semua guru telah terdata
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Activity Feed / Terakhir Melakukan Presensi */}
      {recentAttendanceStream.length > 0 && (
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Aktivitas Presensi Terbaru Masuk ({recentAttendanceStream.length} Terakhir)
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Realtime Feed</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {recentAttendanceStream.map((record) => (
              <div
                key={record.id}
                className="p-3 bg-slate-50 hover:bg-blue-50/50 rounded-xl border border-slate-200/80 transition-all flex items-start gap-2.5 relative group"
              >
                {/* Thumbnail / Avatar */}
                <div className="relative shrink-0">
                  {record.photoUrl ? (
                    <button
                      type="button"
                      onClick={() => setPreviewPhotoRecord(record)}
                      className="w-10 h-10 rounded-lg overflow-hidden border border-slate-300 relative group/photo cursor-pointer"
                      title="Klik untuk melihat foto bukti penuh"
                    >
                      <img
                        src={record.photoUrl}
                        alt={record.teacherName}
                        className="w-full h-full object-cover group-hover/photo:scale-110 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/photo:opacity-100 flex items-center justify-center transition-opacity text-white">
                        <Eye className="w-3 h-3" />
                      </div>
                    </button>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                      {record.teacherName.charAt(0)}
                    </div>
                  )}
                  {/* Status dot */}
                  <span
                    className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                      record.status === 'HADIR' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  ></span>
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <h5 className="text-xs font-bold text-slate-900 truncate" title={record.teacherName}>
                    {record.teacherName}
                  </h5>
                  <div className="text-[11px] text-slate-500 truncate">
                    {record.classRoomName} • {record.subjectName}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-semibold">
                      {record.timestamp} WIB
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        record.recordedBy === 'MANDIRI'
                          ? 'bg-blue-100 text-blue-800'
                          : record.recordedBy === 'GURU_PIKET'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {record.recordedBy === 'MANDIRI' ? 'QR Code' : record.recordedBy === 'GURU_PIKET' ? 'Piket' : 'Admin'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Monitoring Section: Controls & Filter Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Filter Navigation Bar */}
        <div className="p-4 border-b border-slate-200/80 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'ALL', label: 'Semua Terjadwal', count: totalScheduledCount },
                { id: 'HADIR', label: 'Sudah Absen (Hadir)', count: hadirCount, color: 'text-emerald-700 bg-emerald-100' },
                { id: 'BELUM_ABSEN', label: 'Belum Absen', count: belumAbsenCount, color: 'text-rose-700 bg-rose-100' },
                { id: 'EXCUSED', label: 'Izin / Sakit / DL', count: excusedCount, color: 'text-amber-700 bg-amber-100' },
                { id: 'ALL_TEACHERS', label: 'Seluruh Guru Sekolah', count: teachers.length }
              ].map((tab) => {
                const isActive = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id as typeof statusFilter)}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                        isActive
                          ? 'bg-blue-500 text-white'
                          : tab.color || 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start lg:self-auto">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === 'table' ? 'bg-white shadow-xs text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Tampilan Tabel Rinci"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tabel</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === 'cards' ? 'bg-white shadow-xs text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Tampilan Kartu Grid"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kartu</span>
              </button>
            </div>
          </div>

          {/* Search & Select Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
            {/* Search Input */}
            <div className="sm:col-span-6 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari nama guru, NIP, mata pelajaran, atau kelas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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

            {/* Filter Kelas */}
            <div className="sm:col-span-3">
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full py-2 px-3 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="ALL">Semua Kelas</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    Kelas {cls.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Jam Pelajaran */}
            <div className="sm:col-span-3">
              <select
                value={selectedTimeSlotId}
                onChange={(e) => setSelectedTimeSlotId(e.target.value)}
                className="w-full py-2 px-3 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="ALL">Semua Jam Pelajaran</option>
                {timeSlots.map((ts) => (
                  <option key={ts.id} value={ts.id}>
                    {ts.label} ({ts.period})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Content Display: Table View or Cards View */}
        {filteredTeachers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <UserX className="w-12 h-12 mx-auto text-slate-300" />
            <h4 className="text-base font-bold text-slate-700">Tidak ada data guru yang cocok</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Cobalah ubah kata kunci pencarian atau sesuaikan filter status, kelas, dan jam pelajaran di atas.
            </p>
            <button
              onClick={() => {
                setStatusFilter('ALL');
                setSearchQuery('');
                setSelectedClassId('ALL');
                setSelectedTimeSlotId('ALL');
              }}
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              Reset Semua Filter
            </button>
          </div>
        ) : viewMode === 'table' ? (
          /* Table View */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3 w-12 text-center">Foto</th>
                  <th className="py-3 px-4">Nama Guru & NIP</th>
                  <th className="py-3 px-4">Jadwal Hari Ini</th>
                  <th className="py-3 px-4">Status Kehadiran</th>
                  <th className="py-3 px-4">Materi / Topik KBM</th>
                  <th className="py-3 px-3 text-center">Metode / Pencatat</th>
                  <th className="py-3 px-4">Keterangan / Pengganti</th>
                  <th className="py-3 px-3 text-center">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {filteredTeachers.map((item, idx) => {
                  const { teacher, status, primaryRecord, scheduleDetails } = item;
                  const waLink = getWhatsAppLink(teacher, scheduleDetails);

                  return (
                    <tr
                      key={teacher.id}
                      className={`hover:bg-blue-50/40 transition-colors ${
                        item.isCurrentlyScheduled && status === 'BELUM_ABSEN'
                          ? 'bg-rose-50/50'
                          : idx % 2 === 1
                          ? 'bg-slate-50/30'
                          : ''
                      }`}
                    >
                      {/* Photo Thumbnail */}
                      <td className="py-3 px-3 text-center">
                        {primaryRecord?.photoUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewPhotoRecord(primaryRecord)}
                            className="w-10 h-10 rounded-xl overflow-hidden border border-slate-300 relative group cursor-pointer inline-block shadow-2xs"
                            title="Klik untuk melihat foto bukti besar"
                          >
                            <img
                              src={primaryRecord.photoUrl}
                              alt={teacher.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                              <Eye className="w-4 h-4" />
                            </div>
                          </button>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 font-bold text-xs flex items-center justify-center mx-auto border border-slate-200">
                            {teacher.name.charAt(0)}
                          </div>
                        )}
                      </td>

                      {/* Name & NIP */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          <span>{teacher.name}</span>
                          {item.isCurrentlyScheduled && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                              Sesi Aktif
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                          <span>NIP: {teacher.nip || '-'}</span>
                          <span>•</span>
                          <span>{teacher.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                        </div>
                      </td>

                      {/* Schedules Today */}
                      <td className="py-3 px-4">
                        {scheduleDetails.length > 0 ? (
                          <div className="space-y-1">
                            {scheduleDetails.map((sd, sIdx) => (
                              <div
                                key={sIdx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-[11px] font-medium text-slate-700 mr-1 mb-0.5 border border-slate-200"
                              >
                                <School className="w-3 h-3 text-blue-600" />
                                <strong>{sd.classRoom?.name || 'Kelas'}</strong>
                                <span className="text-slate-400">•</span>
                                <span>{sd.subject?.name || 'Mapel'}</span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  ({sd.timeInfo.label})
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            Tidak ada jadwal hari {selectedDay}
                          </span>
                        )}
                      </td>

                      {/* Attendance Status */}
                      <td className="py-3 px-4">
                        {status === 'HADIR' ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              HADIR
                            </span>
                            {primaryRecord?.timestamp && (
                              <div className="text-[11px] text-slate-500 font-mono">
                                Pukul {primaryRecord.timestamp} WIB
                              </div>
                            )}
                          </div>
                        ) : status === 'SAKIT' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            SAKIT
                          </span>
                        ) : status === 'IZIN' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                            <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                            IZIN
                          </span>
                        ) : status === 'DINAS_LUAR' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
                            <Award className="w-3.5 h-3.5 text-purple-600" />
                            DINAS LUAR
                          </span>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              <Clock className="w-3.5 h-3.5 text-rose-600" />
                              BELUM ABSEN
                            </span>
                            {item.isCurrentlyScheduled && (
                              <div className="text-[10px] text-rose-600 font-bold">
                                Kelas sedang berlangsung!
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Topic / Materi */}
                      <td className="py-3 px-4 max-w-xs">
                        {primaryRecord?.topic ? (
                          <div className="text-xs text-slate-700 line-clamp-2" title={primaryRecord.topic}>
                            {primaryRecord.topic}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">-</span>
                        )}
                      </td>

                      {/* Recorder / Verification */}
                      <td className="py-3 px-3 text-center">
                        {primaryRecord ? (
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                primaryRecord.recordedBy === 'MANDIRI'
                                  ? 'bg-blue-100 text-blue-800'
                                  : primaryRecord.recordedBy === 'GURU_PIKET'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {primaryRecord.recordedBy === 'MANDIRI'
                                ? 'Presensi Mandiri'
                                : primaryRecord.recordedBy === 'GURU_PIKET'
                                ? `Piket: ${primaryRecord.piketOfficerName || 'Piket'}`
                                : 'Admin'}
                            </span>
                            {primaryRecord.locationStatus && (
                              <span
                                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                                  primaryRecord.locationStatus === 'VALID'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                                title={`Jarak GPS: ~${primaryRecord.distanceMeters ?? 0}m`}
                              >
                                <MapPin className="w-2.5 h-2.5" />
                                <span>{primaryRecord.locationStatus === 'VALID' ? `GPS Sah (~${primaryRecord.distanceMeters ?? 0}m)` : `Luar (~${primaryRecord.distanceMeters ?? 0}m)`}</span>
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Notes / Substitute Teacher */}
                      <td className="py-3 px-4">
                        {primaryRecord?.substituteTeacherName ? (
                          <div className="text-xs">
                            <span className="text-amber-700 font-semibold block">
                              Inval: {primaryRecord.substituteTeacherName}
                            </span>
                            {primaryRecord.notes && (
                              <span className="text-slate-500 text-[11px]">
                                {primaryRecord.notes}
                              </span>
                            )}
                          </div>
                        ) : primaryRecord?.notes || primaryRecord?.piketNotes ? (
                          <div className="text-xs text-slate-600">
                            {primaryRecord.notes || primaryRecord.piketNotes}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Preview photo button if available */}
                          {primaryRecord?.photoUrl && (
                            <button
                              type="button"
                              onClick={() => setPreviewPhotoRecord(primaryRecord)}
                              className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                              title="Lihat Foto Bukti"
                            >
                              <Camera className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit / Record button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(teacher)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Catat atau Ubah Presensi"
                          >
                            <FileCheck className="w-4 h-4" />
                          </button>

                          {/* WhatsApp Reminder if unattended */}
                          {status === 'BELUM_ABSEN' && waLink && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                              title="Kirim Pengingat WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Cards Grid View */
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredTeachers.map((item) => {
              const { teacher, status, primaryRecord, scheduleDetails } = item;
              const waLink = getWhatsAppLink(teacher, scheduleDetails);

              return (
                <div
                  key={teacher.id}
                  className={`p-4 rounded-xl border transition-all shadow-xs flex flex-col justify-between ${
                    status === 'HADIR'
                      ? 'bg-emerald-50/20 border-emerald-200'
                      : status === 'BELUM_ABSEN'
                      ? item.isCurrentlyScheduled
                        ? 'bg-rose-50/50 border-rose-300'
                        : 'bg-white border-slate-200'
                      : 'bg-amber-50/20 border-amber-200'
                  }`}
                >
                  <div>
                    {/* Header: Photo + Info + Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {primaryRecord?.photoUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewPhotoRecord(primaryRecord)}
                            className="w-12 h-12 rounded-xl overflow-hidden border border-slate-300 relative group cursor-pointer shrink-0 shadow-2xs"
                          >
                            <img
                              src={primaryRecord.photoUrl}
                              alt={teacher.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white">
                              <Eye className="w-4 h-4" />
                            </div>
                          </button>
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm flex items-center justify-center shrink-0 border border-slate-200">
                            {teacher.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm leading-snug">
                            {teacher.name}
                          </h4>
                          <span className="text-[11px] text-slate-500 font-mono block">
                            NIP: {teacher.nip || '-'}
                          </span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold border shrink-0 ${
                          status === 'HADIR'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : status === 'SAKIT'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : status === 'IZIN'
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : status === 'DINAS_LUAR'
                            ? 'bg-purple-100 text-purple-800 border-purple-300'
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}
                      >
                        {status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Schedule Pills */}
                    <div className="mt-3 pt-2 border-t border-slate-200/60">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Jadwal Mengajar Hari Ini:
                      </span>
                      {scheduleDetails.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {scheduleDetails.map((sd, sIdx) => (
                            <span
                              key={sIdx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-[11px] font-medium text-slate-700 border border-slate-200"
                            >
                              <strong>{sd.classRoom?.name}</strong> • {sd.subject?.name} (
                              {sd.timeInfo.label})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Tidak ada jadwal</span>
                      )}
                    </div>

                    {/* Details if recorded */}
                    {primaryRecord && (
                      <div className="mt-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                          <span>Waktu: {primaryRecord.timestamp} WIB</span>
                          <span className="font-semibold text-blue-600">
                            {primaryRecord.recordedBy}
                          </span>
                        </div>
                        {primaryRecord.locationStatus && (
                          <div className={`flex items-center justify-between px-2 py-1 rounded text-[10px] font-semibold ${
                            primaryRecord.locationStatus === 'VALID'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <span>{primaryRecord.locationStatus === 'VALID' ? 'Lokasi Sah di SMAN 1 Julok' : 'Di Luar Radius Sekolah'}</span>
                            </span>
                            <span className="font-mono">~{primaryRecord.distanceMeters ?? 0}m</span>
                          </div>
                        )}
                        {primaryRecord.topic && (
                          <div className="text-slate-800 font-medium">
                            <span className="text-slate-500">Materi:</span> {primaryRecord.topic}
                          </div>
                        )}
                        {primaryRecord.substituteTeacherName && (
                          <div className="text-amber-800 font-semibold text-[11px]">
                            Guru Pengganti: {primaryRecord.substituteTeacherName}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions footer */}
                  <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(teacher)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Input / Ubah Presensi</span>
                    </button>

                    {status === 'BELUM_ABSEN' && waLink && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-300 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Kirim WA</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Preview Foto Bukti Absensi */}
      {previewPhotoRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  Foto Bukti Absensi Guru
                </h3>
                <p className="text-xs text-slate-300">
                  {previewPhotoRecord.teacherName} (NIP: {previewPhotoRecord.nip})
                </p>
              </div>
              <button
                onClick={() => setPreviewPhotoRecord(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Photo Container */}
            <div className="bg-slate-950 flex items-center justify-center relative min-h-[300px] max-h-[460px] overflow-hidden">
              <img
                src={previewPhotoRecord.photoUrl}
                alt={previewPhotoRecord.teacherName}
                className="w-full h-full object-contain"
              />
              {/* Timestamp Watermark Overlay */}
              <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs text-white px-3 py-1 rounded text-[11px] font-mono border border-white/20">
                <span>{previewPhotoRecord.date} • {previewPhotoRecord.timestamp} WIB</span>
              </div>
            </div>

            {/* Modal Body / Info Details */}
            <div className="p-5 space-y-3 bg-white text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Kelas</span>
                  <span className="font-bold text-slate-900">{previewPhotoRecord.classRoomName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Mata Pelajaran</span>
                  <span className="font-bold text-slate-900">{previewPhotoRecord.subjectName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Jam Pelajaran</span>
                  <span className="font-bold text-slate-900">{previewPhotoRecord.timeSlotName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Metode Pencatatan</span>
                  <span className="font-bold text-blue-600">
                    {previewPhotoRecord.recordedBy === 'MANDIRI' ? 'Presensi Mandiri QR' : previewPhotoRecord.recordedBy}
                  </span>
                </div>
              </div>

              {/* GPS Location Status Card */}
              {previewPhotoRecord.locationStatus && (
                <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                  previewPhotoRecord.locationStatus === 'VALID'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      previewPhotoRecord.locationStatus === 'VALID' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                    }`}>
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold block text-xs">
                        {previewPhotoRecord.locationStatus === 'VALID'
                          ? '✓ Lokasi GPS Terverifikasi di SMAN 1 Julok'
                          : '⚠️ Lokasi di Luar Radius Sekolah'}
                      </span>
                      <span className="text-[11px] opacity-80 block">
                        Jarak: ~{previewPhotoRecord.distanceMeters ?? 0} meter dari titik sekolah
                        {previewPhotoRecord.accuracy ? ` (Akurasi: ±${previewPhotoRecord.accuracy}m)` : ''}
                      </span>
                    </div>
                  </div>
                  {previewPhotoRecord.latitude && previewPhotoRecord.longitude && (
                    <a
                      href={`https://www.google.com/maps?q=${previewPhotoRecord.latitude},${previewPhotoRecord.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-[11px] font-bold text-blue-700 hover:bg-blue-50 flex items-center gap-1 shrink-0 shadow-xs"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Maps</span>
                    </a>
                  )}
                </div>
              )}

              {previewPhotoRecord.topic && (
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold mb-0.5">
                    Materi Pembelajaran / Topik:
                  </span>
                  <p className="text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-medium leading-relaxed">
                    {previewPhotoRecord.topic}
                  </p>
                </div>
              )}

              {previewPhotoRecord.notes && (
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold mb-0.5">
                    Catatan Tambahan:
                  </span>
                  <p className="text-slate-700 italic bg-slate-50 p-2 rounded-lg border border-slate-200">
                    {previewPhotoRecord.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewPhotoRecord(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Input / Edit Presensi dari Admin */}
      {isEditModalOpen && modalTargetTeacher && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-blue-600 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <FileCheck className="w-5 h-5" />
                  Presensi / Keterangan Guru (Admin)
                </h3>
                <p className="text-xs text-blue-100">
                  {modalTargetTeacher.name} • NIP: {modalTargetTeacher.nip}
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-blue-200 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModalAttendance} className="p-5 space-y-4">
              {/* Status Radio */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Status Presensi Hari Ini ({selectedDate})
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['HADIR', 'SAKIT', 'IZIN', 'DINAS_LUAR'] as AttendanceStatus[]).map((st) => (
                    <label
                      key={st}
                      className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                        modalForm.status === st
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name="modalStatus"
                        value={st}
                        checked={modalForm.status === st}
                        onChange={(e) =>
                          setModalForm({ ...modalForm, status: e.target.value as AttendanceStatus })
                        }
                        className="sr-only"
                      />
                      <span>{st.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Class & Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kelas
                  </label>
                  <select
                    value={modalForm.classRoomId}
                    onChange={(e) => setModalForm({ ...modalForm, classRoomId: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mata Pelajaran
                  </label>
                  <select
                    value={modalForm.subjectId}
                    onChange={(e) => setModalForm({ ...modalForm, subjectId: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* TimeSlot */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jam Pelajaran
                </label>
                <select
                  value={modalForm.timeSlotId}
                  onChange={(e) => setModalForm({ ...modalForm, timeSlotId: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                >
                  {timeSlots.map((ts) => (
                    <option key={ts.id} value={ts.id}>
                      {ts.label} ({ts.period})
                    </option>
                  ))}
                </select>
              </div>

              {/* Substitute teacher if absent */}
              {modalForm.status !== 'HADIR' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Guru Pengganti (Inval) - Opsional
                  </label>
                  <select
                    value={modalForm.substituteTeacherId}
                    onChange={(e) =>
                      setModalForm({ ...modalForm, substituteTeacherId: e.target.value })
                    }
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Tidak Ada Guru Pengganti --</option>
                    {teachers
                      .filter((t) => t.id !== modalTargetTeacher.id)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} (NIP: {t.nip})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Topic / Materi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Materi / Topik Pembelajaran
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Bab 2 Trigonometri / Tugas Mandiri"
                  value={modalForm.topic}
                  onChange={(e) => setModalForm({ ...modalForm, topic: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan / Keterangan
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan surat dokter, izin dinas, atau catatan piket..."
                  value={modalForm.notes}
                  onChange={(e) => setModalForm({ ...modalForm, notes: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
                >
                  Simpan ke Cloud Firestore
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Workflow Diagram & SOP Modal */}
      <WorkflowModal
        isOpen={isWorkflowModalOpen}
        onClose={() => setIsWorkflowModalOpen(false)}
      />
    </div>
  );
};
