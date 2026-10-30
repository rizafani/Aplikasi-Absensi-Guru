import React, { useState, useMemo } from 'react';
import {
  Teacher,
  ClassRoom,
  Subject,
  TimeSlot,
  ScheduleItem,
  DayOfWeek,
  SchoolLogos
} from '../types';
import { INDONESIAN_DAYS, formatScheduleTimeSlots } from '../data/initialData';
import {
  Calendar,
  School,
  Clock,
  BookOpen,
  User,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Printer,
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
  Layers,
  ChevronRight,
  Info,
  X,
  Check,
  RotateCcw,
  Sparkles,
  MapPin,
  ExternalLink
} from 'lucide-react';

interface ClassTimetableMatrixProps {
  classes: ClassRoom[];
  teachers: Teacher[];
  subjects: Subject[];
  timeSlots: TimeSlot[];
  schedules: ScheduleItem[];
  logos?: SchoolLogos;
  onSaveSchedule: (schedule: ScheduleItem) => void;
  onDeleteSchedule: (id: string) => void;
  onBulkSaveSchedules?: (schedules: ScheduleItem[]) => void;
  onDeleteClassSchedules?: (classRoomId: string) => void;
}

export const ClassTimetableMatrix: React.FC<ClassTimetableMatrixProps> = ({
  classes,
  teachers,
  subjects,
  timeSlots,
  schedules,
  logos,
  onSaveSchedule,
  onDeleteSchedule,
  onBulkSaveSchedules,
  onDeleteClassSchedules
}) => {
  // Selected class
  const [selectedClassId, setSelectedClassId] = useState<string>(
    classes[0]?.id || ''
  );
  const [classGradeFilter, setClassGradeFilter] = useState<'ALL' | 'X' | 'XI' | 'XII'>('ALL');
  const [classSearchQuery, setClassSearchQuery] = useState<string>('');

  // Quick Cell Input Modal State
  const [isCellModalOpen, setIsCellModalOpen] = useState<boolean>(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [modalDay, setModalDay] = useState<DayOfWeek>('Senin');
  const [modalTimeSlotId, setModalTimeSlotId] = useState<string>('');
  const [modalTeacherId, setModalTeacherId] = useState<string>('');
  const [modalSubjectId, setModalSubjectId] = useState<string>('');
  const [modalSelectedSlotIds, setModalSelectedSlotIds] = useState<string[]>([]);
  const [modalRoom, setModalRoom] = useState<string>('');
  const [modalNotes, setModalNotes] = useState<string>('');

  // Copy Schedule to Another Class Modal State
  const [isCopyModalOpen, setIsCopyModalOpen] = useState<boolean>(false);
  const [targetClassId, setTargetClassId] = useState<string>('');
  const [copyMode, setCopyMode] = useState<'REPLACE' | 'APPEND'>('REPLACE');

  // Print Timetable Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Filtered classes list for selection
  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      if (classGradeFilter !== 'ALL' && c.grade !== classGradeFilter) return false;
      if (classSearchQuery.trim()) {
        const q = classSearchQuery.toLowerCase();
        return c.name.toLowerCase().includes(q) || (c.major && c.major.toLowerCase().includes(q));
      }
      return true;
    });
  }, [classes, classGradeFilter, classSearchQuery]);

  // Current active class object
  const currentClass = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId) || classes[0];
  }, [classes, selectedClassId]);

  // Schedules for the selected class
  const classSchedules = useMemo(() => {
    if (!currentClass) return [];
    return schedules.filter((s) => s.classRoomId === currentClass.id);
  }, [schedules, currentClass]);

  // Map of (Day + SlotId) -> ScheduleItem
  const scheduleMatrixMap = useMemo(() => {
    const map = new Map<string, ScheduleItem>();
    classSchedules.forEach((sch) => {
      const slots =
        sch.timeSlotIds && sch.timeSlotIds.length > 0
          ? sch.timeSlotIds
          : [sch.timeSlotId];

      slots.forEach((slotId) => {
        map.set(`${sch.day}_${slotId}`, sch);
      });
    });
    return map;
  }, [classSchedules]);

  // Statistics for current class schedule
  const classStats = useMemo(() => {
    const totalSlots = classSchedules.reduce((acc, s) => {
      const len = s.timeSlotIds && s.timeSlotIds.length > 0 ? s.timeSlotIds.length : 1;
      return acc + len;
    }, 0);

    const uniqueTeachers = new Set(classSchedules.map((s) => s.teacherId)).size;
    const uniqueSubjects = new Set(classSchedules.map((s) => s.subjectId)).size;
    const maxCapacity = timeSlots.length * INDONESIAN_DAYS.length;
    const emptySlots = Math.max(0, maxCapacity - totalSlots);

    return {
      totalSlots,
      uniqueTeachers,
      uniqueSubjects,
      emptySlots,
      maxCapacity
    };
  }, [classSchedules, timeSlots.length]);

  // Teacher Schedule Conflict Checker: Checks if teacher is teaching in another class at day & slotIds
  const checkTeacherConflict = (
    teacherId: string,
    day: DayOfWeek,
    slotIds: string[],
    excludeScheduleId?: string | null
  ) => {
    if (!teacherId || slotIds.length === 0) return null;

    for (const s of schedules) {
      if (excludeScheduleId && s.id === excludeScheduleId) continue;
      if (s.teacherId === teacherId && s.day === day && s.classRoomId !== currentClass?.id) {
        const sSlots = s.timeSlotIds && s.timeSlotIds.length > 0 ? s.timeSlotIds : [s.timeSlotId];
        const hasOverlap = slotIds.some((id) => sSlots.includes(id));
        if (hasOverlap) {
          const conflictingClass = classes.find((c) => c.id === s.classRoomId);
          const conflictingSubject = subjects.find((sub) => sub.id === s.subjectId);
          return {
            conflictingSchedule: s,
            className: conflictingClass?.name || 'Kelas Lain',
            subjectName: conflictingSubject?.name || 'Mapel Lain'
          };
        }
      }
    }
    return null;
  };

  // Open modal for a cell (New or Edit)
  const handleCellClick = (day: DayOfWeek, slot: TimeSlot, existingSchedule?: ScheduleItem) => {
    if (existingSchedule) {
      setEditingScheduleId(existingSchedule.id);
      setModalDay(existingSchedule.day);
      setModalTimeSlotId(existingSchedule.timeSlotId);
      setModalTeacherId(existingSchedule.teacherId);
      setModalSubjectId(existingSchedule.subjectId);
      setModalSelectedSlotIds(
        existingSchedule.timeSlotIds && existingSchedule.timeSlotIds.length > 0
          ? existingSchedule.timeSlotIds
          : [existingSchedule.timeSlotId]
      );
      setModalRoom(existingSchedule.room || '');
      setModalNotes(existingSchedule.notes || '');
    } else {
      setEditingScheduleId(null);
      setModalDay(day);
      setModalTimeSlotId(slot.id);
      setModalSelectedSlotIds([slot.id]);
      setModalTeacherId(teachers[0]?.id || '');
      setModalSubjectId(subjects[0]?.id || '');
      setModalRoom('');
      setModalNotes('');
    }
    setIsCellModalOpen(true);
  };

  // Handle saving the schedule from cell modal
  const handleSaveCellSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClass) return;

    if (!modalTeacherId || !modalSubjectId || modalSelectedSlotIds.length === 0) {
      alert('Pilih Guru, Mata Pelajaran, dan minimal satu Jam Pelajaran.');
      return;
    }

    // Sort selected slots in chronological order
    const sortedSlotIds = [...modalSelectedSlotIds].sort((a, b) => {
      const idxA = timeSlots.findIndex((t) => t.id === a);
      const idxB = timeSlots.findIndex((t) => t.id === b);
      return idxA - idxB;
    });

    // Check conflict warning
    const conflict = checkTeacherConflict(modalTeacherId, modalDay, sortedSlotIds, editingScheduleId);
    if (conflict) {
      const proceed = confirm(
        `PERINGATAN BENTROK JADWAL:\nGuru yang dipilih sudah terdaftar mengajar di ${conflict.className} (${conflict.subjectName}) pada hari ${modalDay} di jam yang sama.\n\nTetap simpan jadwal ini?`
      );
      if (!proceed) return;
    }

    const newSchedule: ScheduleItem = {
      id: editingScheduleId || `sch-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      teacherId: modalTeacherId,
      day: modalDay,
      classRoomId: currentClass.id,
      subjectId: modalSubjectId,
      timeSlotId: sortedSlotIds[0],
      timeSlotIds: sortedSlotIds,
      room: modalRoom.trim(),
      notes: modalNotes.trim()
    };

    onSaveSchedule(newSchedule);
    setIsCellModalOpen(false);
  };

  // Delete single schedule
  const handleDeleteCellSchedule = (scheduleId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm('Hapus jadwal pelajaran ini?')) {
      onDeleteSchedule(scheduleId);
      if (isCellModalOpen) setIsCellModalOpen(false);
    }
  };

  // Clear all schedules in current class
  const handleClearCurrentClass = () => {
    if (!currentClass) return;
    if (classSchedules.length === 0) {
      alert('Belum ada jadwal yang tersimpan di kelas ini.');
      return;
    }

    if (
      confirm(
        `PERINGATAN: Apakah Anda yakin ingin MENGHAPUS SELURUH JADWAL (${classSchedules.length} entri) untuk kelas ${currentClass.name}? Tindakan ini tidak dapat dibatalkan.`
      )
    ) {
      if (onDeleteClassSchedules) {
        onDeleteClassSchedules(currentClass.id);
      } else {
        classSchedules.forEach((s) => onDeleteSchedule(s.id));
      }
    }
  };

  // Copy schedule from current class to another class
  const handleCopyClassSchedule = () => {
    if (!currentClass || !targetClassId) {
      alert('Pilih kelas tujuan duplikasi.');
      return;
    }

    if (classSchedules.length === 0) {
      alert('Kelas asal belum memiliki jadwal untuk disalin.');
      return;
    }

    const targetClass = classes.find((c) => c.id === targetClassId);
    if (!targetClass) return;

    if (
      !confirm(
        `Salin ${classSchedules.length} jadwal dari ${currentClass.name} ke ${targetClass.name}?\n` +
          (copyMode === 'REPLACE'
            ? 'Semua jadwal lama di kelas tujuan akan digantikan.'
            : 'Jadwal akan ditambahkan ke kelas tujuan.')
      )
    ) {
      return;
    }

    const duplicatedSchedules: ScheduleItem[] = classSchedules.map((s) => ({
      ...s,
      id: `sch-dup-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      classRoomId: targetClass.id
    }));

    if (copyMode === 'REPLACE' && onDeleteClassSchedules) {
      onDeleteClassSchedules(targetClass.id);
    }

    if (onBulkSaveSchedules) {
      onBulkSaveSchedules(duplicatedSchedules);
    } else {
      duplicatedSchedules.forEach((s) => onSaveSchedule(s));
    }

    alert(`Berhasil menyalin ${duplicatedSchedules.length} jadwal ke kelas ${targetClass.name}!`);
    setIsCopyModalOpen(false);
  };

  // Helper: Get subject badge color style
  const getSubjectColorClass = (category?: string) => {
    switch (category) {
      case 'Wajib':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Peminatan':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Muatan Lokal':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      default:
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
    }
  };

  // Conflict state for current modal form
  const modalConflict = useMemo(() => {
    return checkTeacherConflict(modalTeacherId, modalDay, modalSelectedSlotIds, editingScheduleId);
  }, [modalTeacherId, modalDay, modalSelectedSlotIds, editingScheduleId, schedules, currentClass]);

  return (
    <div className="space-y-6">
      {/* 1. Class Selection & Power Tools Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-44 h-44 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Class Title & Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500 text-white shadow-xs">
                Visualisasi Matriks Jadwal
              </span>
              <span className="text-xs text-blue-200 font-medium">
                Pilih Kelas untuk Mengisi &amp; Meninjau
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
                <School className="w-7 h-7 text-blue-400" />
                <span>Kelas: {currentClass ? currentClass.name : 'Pilih Kelas'}</span>
              </h2>
              {currentClass && (
                <div className="flex items-center gap-2 text-xs text-blue-200">
                  <span className="px-2 py-0.5 rounded-md bg-white/10 font-bold">
                    Tingkat {currentClass.grade}
                  </span>
                  <span>•</span>
                  <span className="px-2 py-0.5 rounded-md bg-white/10 font-bold">
                    Jurusan {currentClass.major || 'Umum'}
                  </span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Klik pada kotak tabel jam pelajaran untuk <strong>menambah, mengubah, atau menghapus</strong> jadwal guru di kelas ini secara langsung.
            </p>
          </div>

          {/* Top Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              disabled={!currentClass || classSchedules.length === 0}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              title="Cetak jadwal kelas untuk dipajang di dinding ruang kelas"
            >
              <Printer className="w-3.5 h-3.5 text-blue-300" />
              <span>Cetak Jadwal Kelas</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTargetClassId(classes.find((c) => c.id !== selectedClassId)?.id || '');
                setIsCopyModalOpen(true);
              }}
              disabled={!currentClass || classSchedules.length === 0}
              className="px-3.5 py-2 bg-indigo-600/80 hover:bg-indigo-600 text-white border border-indigo-400/30 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              title="Salin seluruh jadwal kelas ini ke kelas paralel lainnya"
            >
              <Copy className="w-3.5 h-3.5 text-indigo-200" />
              <span>Salin ke Kelas Lain</span>
            </button>

            <button
              type="button"
              onClick={handleClearCurrentClass}
              disabled={!currentClass || classSchedules.length === 0}
              className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-30"
              title="Hapus semua jadwal kelas ini"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-300" />
              <span>Kosongkan</span>
            </button>
          </div>
        </div>

        {/* Horizontal Class Selector Pill Buttons */}
        <div className="mt-5 pt-4 border-t border-white/10 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Grade Tabs */}
            <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl">
              {(['ALL', 'X', 'XI', 'XII'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setClassGradeFilter(g)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    classGradeFilter === g
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {g === 'ALL' ? 'Semua Tingkat' : `Kelas ${g}`}
                </button>
              ))}
            </div>

            {/* Quick search input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={classSearchQuery}
                onChange={(e) => setClassSearchQuery(e.target.value)}
                placeholder="Cari kelas..."
                className="pl-8 pr-3 py-1 text-xs bg-white/10 text-white placeholder-slate-400 rounded-lg border border-white/15 focus:outline-none focus:bg-white/20 focus:ring-1 focus:ring-blue-400 w-36 sm:w-48"
              />
            </div>
          </div>

          {/* Class Buttons List */}
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            {filteredClasses.map((c) => {
              const isSelected = c.id === selectedClassId;
              const countForThis = schedules.filter((s) => s.classRoomId === c.id).length;

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedClassId(c.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? 'bg-white text-blue-950 shadow-md ring-2 ring-blue-400 scale-[1.02]'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                  }`}
                >
                  <span>{c.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected ? 'bg-blue-100 text-blue-900' : 'bg-black/30 text-slate-300'
                    }`}
                  >
                    {countForThis} JP
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Stats Bar for Current Class */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Jam Terisi
            </span>
            <span className="text-base font-black text-slate-900">
              {classStats.totalSlots} <span className="text-xs font-medium text-slate-500">JP</span>
            </span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Guru Pengampu
            </span>
            <span className="text-base font-black text-slate-900">
              {classStats.uniqueTeachers} <span className="text-xs font-medium text-slate-500">Guru</span>
            </span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Mata Pelajaran
            </span>
            <span className="text-base font-black text-slate-900">
              {classStats.uniqueSubjects} <span className="text-xs font-medium text-slate-500">Mapel</span>
            </span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Slot Kosong
            </span>
            <span className="text-base font-black text-slate-900">
              {classStats.emptySlots} <span className="text-xs font-medium text-slate-500">Slot</span>
            </span>
          </div>
        </div>
      </div>

      {/* 3. The 2D Interactive Weekly Timetable Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Title Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Matriks Mingguan: <span className="text-blue-700">{currentClass?.name}</span>
            </h3>
            <span className="text-xs text-slate-500">
              (Senin s/d Sabtu • {timeSlots.length} Jam Pelajaran)
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
              <span className="w-2.5 h-2.5 rounded bg-blue-100 border border-blue-300" /> Wajib
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
              <span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-300" /> Peminatan
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
              <span className="w-2.5 h-2.5 rounded bg-purple-100 border border-purple-300" /> Mulok
            </span>
          </div>
        </div>

        {/* Timetable Grid Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            {/* Table Header: Days */}
            <thead>
              <tr className="bg-slate-100/90 text-slate-800 border-b border-slate-200 text-xs">
                <th className="p-3 w-28 text-center font-bold border-r border-slate-200 bg-slate-200/60 sticky left-0 z-10">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-600" />
                    <span>Waktu / Jam</span>
                  </div>
                </th>
                {INDONESIAN_DAYS.map((day) => {
                  const daySchedulesCount = classSchedules.filter((s) => s.day === day).length;
                  return (
                    <th
                      key={day}
                      className="p-3 text-center border-r border-slate-200 last:border-r-0 font-extrabold"
                    >
                      <div className="text-sm font-black text-slate-900">{day}</div>
                      <span className="text-[10px] font-mono font-medium text-slate-500">
                        {daySchedulesCount} Sesi Terjadwal
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Table Body: TimeSlots as Rows */}
            <tbody className="divide-y divide-slate-200 text-xs">
              {timeSlots.map((slot, slotIdx) => (
                <tr key={slot.id} className="hover:bg-slate-50/40 transition-colors">
                  {/* Row Header: Slot Label & Period */}
                  <td className="p-2.5 text-center font-medium border-r border-slate-200 bg-slate-50/80 sticky left-0 z-10 shadow-xs">
                    <span className="font-extrabold text-blue-900 block text-xs">
                      {slot.label}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
                      {slot.period}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      WIB
                    </span>
                  </td>

                  {/* Day Cells */}
                  {INDONESIAN_DAYS.map((day) => {
                    const cellKey = `${day}_${slot.id}`;
                    const schedule = scheduleMatrixMap.get(cellKey);

                    const teacher = schedule
                      ? teachers.find((t) => t.id === schedule.teacherId)
                      : null;
                    const subject = schedule
                      ? subjects.find((s) => s.id === schedule.subjectId)
                      : null;

                    const isFirstSlotOfMulti =
                      schedule &&
                      schedule.timeSlotIds &&
                      schedule.timeSlotIds.length > 1 &&
                      schedule.timeSlotIds[0] === slot.id;

                    const isSpanSlot =
                      schedule &&
                      schedule.timeSlotIds &&
                      schedule.timeSlotIds.length > 1;

                    return (
                      <td
                        key={cellKey}
                        className="p-1.5 border-r border-slate-200 last:border-r-0 align-top transition-all"
                      >
                        {schedule ? (
                          /* Filled Schedule Cell Card */
                          <div
                            onClick={() => handleCellClick(day, slot, schedule)}
                            className={`group relative rounded-xl p-2.5 border transition-all cursor-pointer shadow-2xs hover:shadow-md hover:scale-[1.01] ${getSubjectColorClass(
                              subject?.category
                            )}`}
                          >
                            {/* Top row: Subject Badge & Quick Actions */}
                            <div className="flex items-start justify-between gap-1 mb-1">
                              <span className="font-black text-xs leading-tight truncate">
                                {subject?.name || 'Mata Pelajaran'}
                              </span>

                              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCellClick(day, slot, schedule);
                                  }}
                                  className="p-1 rounded bg-white/80 hover:bg-white text-blue-700 shadow-2xs"
                                  title="Edit Jadwal"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteCellSchedule(schedule.id, e)}
                                  className="p-1 rounded bg-white/80 hover:bg-white text-rose-600 shadow-2xs"
                                  title="Hapus Jadwal"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Teacher info */}
                            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-800 truncate mt-1">
                              <User className="w-3 h-3 shrink-0 opacity-60" />
                              <span className="truncate">{teacher?.name || '-'}</span>
                            </div>

                            {/* Extra info: Multi-Hour / Room / Notes */}
                            <div className="mt-1.5 flex flex-wrap items-center gap-1">
                              {isSpanSlot && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-black/10 text-slate-800">
                                  {schedule.timeSlotIds?.length} JP (Jam {schedule.timeSlotIds?.map(id => timeSlots.find(t => t.id === id)?.label.replace('Jam ', '')).join('-')})
                                </span>
                              )}

                              {schedule.room && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/60 font-medium text-slate-700 truncate max-w-[120px]">
                                  {schedule.room}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          /* Empty Cell: Click to Add */
                          <div
                            onClick={() => handleCellClick(day, slot)}
                            className="group h-full min-h-[72px] rounded-xl border border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 p-2 flex flex-col items-center justify-center text-center cursor-pointer transition-all active:scale-95"
                            title={`Klik untuk mengisi jadwal ${day} ${slot.label}`}
                          >
                            <div className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-blue-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-all mb-1 shadow-2xs">
                              <Plus className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[10px] font-medium text-slate-400 group-hover:text-blue-700 transition-colors">
                              Isi Jadwal
                            </span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Quick Cell Schedule Input / Edit Modal */}
      {isCellModalOpen && currentClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full my-auto shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-200" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold">
                    {editingScheduleId ? 'Edit Jadwal Mengajar' : 'Tambah Jadwal Mengajar'}
                  </h4>
                  <p className="text-xs text-blue-100">
                    Kelas: <strong>{currentClass.name}</strong> • Hari: <strong>{modalDay}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCellModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveCellSchedule} className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
              {/* Conflict Alert Warning */}
              {modalConflict && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2.5 animate-in fade-in">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Peringatan Bentrok Jadwal Guru:</span>
                    <span>
                      Guru ini sudah terdaftar mengajar di <strong>{modalConflict.className}</strong> (Mapel: {modalConflict.subjectName}) pada waktu yang sama.
                    </span>
                  </div>
                </div>
              )}

              {/* Day & Class Summary Pills */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Kelas</span>
                  <span className="font-extrabold text-slate-800 text-sm">{currentClass.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Hari Mengajar</span>
                  <select
                    value={modalDay}
                    onChange={(e) => setModalDay(e.target.value as DayOfWeek)}
                    className="font-bold text-blue-800 bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                  >
                    {INDONESIAN_DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Guru Pengampu */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Guru Pengampu *
                </label>
                <select
                  required
                  value={modalTeacherId}
                  onChange={(e) => setModalTeacherId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Pilih Guru --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (NIP: {t.nip || '-'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Mata Pelajaran */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Mata Pelajaran *
                </label>
                <select
                  required
                  value={modalSubjectId}
                  onChange={(e) => setModalSubjectId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Pilih Mata Pelajaran --</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code}) - {s.category || 'Wajib'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Jam Pelajaran Multi-Select Checkboxes */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                  <span>Pilihan Jam Pelajaran (Bisa Lebih Dari 1 Jam Sekaligus) *</span>
                  <span className="text-[11px] font-normal text-blue-600 font-mono">
                    {modalSelectedSlotIds.length} Jam Dipilih
                  </span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50">
                  {timeSlots.map((ts) => {
                    const isChecked = modalSelectedSlotIds.includes(ts.id);
                    return (
                      <label
                        key={ts.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setModalSelectedSlotIds((prev) => [...prev, ts.id]);
                            } else {
                              setModalSelectedSlotIds((prev) =>
                                prev.filter((id) => id !== ts.id)
                              );
                            }
                          }}
                          className="sr-only"
                        />
                        <div className="truncate">
                          <span className="block">{ts.label}</span>
                          <span className={`text-[10px] block font-mono ${isChecked ? 'text-blue-100' : 'text-slate-400'}`}>
                            {ts.period.split(' - ')[0]}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Ruangan & Catatan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ruangan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={modalRoom}
                    onChange={(e) => setModalRoom(e.target.value)}
                    placeholder="Contoh: Lab Komputer / Ruang 12"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Catatan Tambahan
                  </label>
                  <input
                    type="text"
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    placeholder="Contoh: Praktikum mingguan"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                {editingScheduleId ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteCellSchedule(editingScheduleId)}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCellModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    <span>Simpan Jadwal</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal: Salin Jadwal ke Kelas Lain */}
      {isCopyModalOpen && currentClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-4 bg-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Copy className="w-4 h-4" />
                <h4 className="font-bold text-sm">Salin Jadwal ke Kelas Lain</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsCopyModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Anda akan menduplikasi <strong>{classSchedules.length} jadwal pelajaran</strong> dari kelas{' '}
                <strong className="text-blue-700">{currentClass.name}</strong> ke kelas tujuan di bawah ini.
              </p>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Pilih Kelas Tujuan *</label>
                <select
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-bold bg-white"
                >
                  <option value="">-- Pilih Kelas Tujuan --</option>
                  {classes
                    .filter((c) => c.id !== currentClass.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (Tingkat {c.grade})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1.5">Metode Duplikasi:</label>
                <div className="space-y-2">
                  <label className="flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="copyMode"
                      value="REPLACE"
                      checked={copyMode === 'REPLACE'}
                      onChange={() => setCopyMode('REPLACE')}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">Ganti Seluruh Jadwal (Replace)</span>
                      <span className="text-[11px] text-slate-500">
                        Hapus jadwal lama di kelas tujuan dan gantikan dengan jadwal ini.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="copyMode"
                      value="APPEND"
                      checked={copyMode === 'APPEND'}
                      onChange={() => setCopyMode('APPEND')}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">Gabungkan (Append)</span>
                      <span className="text-[11px] text-slate-500">
                        Tambahkan jadwal ini tanpa menghapus jadwal yang sudah ada di kelas tujuan.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsCopyModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-slate-700 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleCopyClassSchedule}
                  disabled={!targetClassId}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs disabled:opacity-50"
                >
                  Salin Sekarang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal: Print-Ready Timetable for Classroom Wall */}
      {isPrintModalOpen && currentClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Controls */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-400" />
                <h4 className="font-bold text-sm">Pratinjau Cetak Jadwal Kelas: {currentClass.name}</h4>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak / Simpan PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Content with School Letterhead */}
            <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1 bg-white print:p-0 print:m-0">
              {/* Kop Surat Resmi */}
              <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between gap-4">
                <div className="w-16 h-16 shrink-0 flex items-center justify-center">
                  <img
                    src={logos?.acehLogo || '/logo-aceh.svg'}
                    alt="Logo Aceh"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1 text-center">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-serif">
                    PEMERINTAH ACEH • DINAS PENDIDIKAN
                  </h4>
                  <h5 className="text-[11px] font-semibold text-slate-700 uppercase font-serif">
                    CABANG DINAS PENDIDIKAN WILAYAH KABUPATEN ACEH TIMUR
                  </h5>
                  <h3 className="text-lg font-black text-blue-950 tracking-tight font-serif">
                    SMA NEGERI 1 JULOK
                  </h3>
                  <p className="text-[10px] text-slate-500 font-sans">
                    Jln Alue Ie Mirah Desa Buket Seuraja Kecamatan Julok Kabupaten Aceh Timur - Kode Pos 24457
                  </p>
                </div>
                <div className="w-16 shrink-0 hidden sm:block" />
              </div>

              {/* Title */}
              <div className="text-center space-y-1">
                <h3 className="text-base font-black uppercase text-slate-900 tracking-wide font-sans">
                  JADWAL PELAJARAN MINGGUAN KELAS {currentClass.name}
                </h3>
                <p className="text-xs text-slate-600">
                  Tahun Pelajaran 2026/2027 • Semester Ganjil / Genap
                </p>
              </div>

              {/* Static Grid Table for Wall Printing */}
              <div className="overflow-x-auto border border-slate-300 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 border-b border-slate-300">
                      <th className="p-2.5 text-center font-bold border-r border-slate-300 w-24">
                        Jam / Waktu
                      </th>
                      {INDONESIAN_DAYS.map((d) => (
                        <th key={d} className="p-2.5 text-center font-bold border-r border-slate-300 last:border-r-0">
                          {d}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {timeSlots.map((ts) => (
                      <tr key={ts.id}>
                        <td className="p-2 text-center bg-slate-50 border-r border-slate-300 font-mono text-[11px]">
                          <strong className="block text-slate-800">{ts.label}</strong>
                          <span className="text-[10px] text-slate-500">{ts.period}</span>
                        </td>
                        {INDONESIAN_DAYS.map((d) => {
                          const sch = scheduleMatrixMap.get(`${d}_${ts.id}`);
                          const teacher = sch ? teachers.find((t) => t.id === sch.teacherId) : null;
                          const subject = sch ? subjects.find((s) => s.id === sch.subjectId) : null;

                          return (
                            <td
                              key={d}
                              className="p-2 border-r border-slate-300 last:border-r-0 align-top text-center"
                            >
                              {sch ? (
                                <div>
                                  <span className="font-bold text-slate-900 block text-xs">
                                    {subject?.name}
                                  </span>
                                  <span className="text-[11px] text-slate-600 block mt-0.5">
                                    {teacher?.name}
                                  </span>
                                  {sch.room && (
                                    <span className="text-[9px] text-slate-400 italic block">
                                      ({sch.room})
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-300 italic text-[11px]">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signature Footnote for Class Schedule Notice */}
              <div className="pt-6 flex justify-between items-end text-xs text-slate-700">
                <div className="text-center w-56">
                  <p>Mengetahui,</p>
                  <p className="font-semibold">Wakil Kepala Bid. Kurikulum</p>
                  <div className="h-16" />
                  <p className="font-bold underline">Desi Muliana, S.Pd</p>
                  <p className="text-[11px] font-mono text-slate-500">NIP. 19862025212030</p>
                </div>

                <div className="text-center w-56">
                  <p>Julok, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p className="font-semibold">Kepala SMA Negeri 1 Julok</p>
                  <div className="h-16" />
                  <p className="font-bold underline">Irmi, S.Pd, M.Pd</p>
                  <p className="text-[11px] font-mono text-slate-500">NIP. 19800102 200504 2 001</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
