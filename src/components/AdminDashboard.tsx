import React, { useState, useRef, useEffect } from 'react';
import {
  Teacher,
  ClassRoom,
  Subject,
  TimeSlot,
  ScheduleItem,
  UserSession,
  DayOfWeek,
  AttendanceRecord,
  SchoolLogos,
  PiketAccount,
  SchoolLocationConfig
} from '../types';
import { INDONESIAN_DAYS, INITIAL_TIME_SLOTS, formatScheduleTimeSlots, getTodayDayName } from '../data/initialData';
import { DEFAULT_LOGOS } from '../utils/storage';
import { DEFAULT_SCHOOL_LOCATION, formatDistanceMeters, getGoogleMapsUrl } from '../utils/geo';
import {
  cleanTeacherNameForUsername,
  generateDefaultPiketPassword,
  formatPiketAccountsForSharing
} from '../utils/piketAuth';
import {
  Users,
  BookOpen,
  School,
  Clock,
  Calendar,
  Plus,
  Trash2,
  Edit2,
  Upload,
  Download,
  Search,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  X,
  ShieldCheck,
  ShieldAlert,
  LogIn,
  QrCode,
  Check,
  RefreshCw,
  Award,
  Image as ImageIcon,
  RotateCcw,
  UserCheck,
  KeyRound,
  CheckCheck,
  Copy,
  Eye,
  EyeOff,
  Share2,
  Lock,
  Sparkles,
  Radio,
  ArrowUp,
  ArrowDown,
  CopyPlus,
  SlidersHorizontal,
  Table as TableIcon,
  LayoutGrid,
  Wand2,
  ListOrdered,
  MapPin,
  Navigation,
  Compass,
  ExternalLink,
  Globe,
  Crosshair
} from 'lucide-react';
import { ClassQRCodeModal } from './ClassQRCodeModal';
import { ReportsPage } from './ReportsPage';
import { AdminRealtimeDashboard } from './AdminRealtimeDashboard';
import { ScheduleExcelImportModal } from './ScheduleExcelImportModal';
import {
  downloadScheduleExcelTemplate,
  exportSchedulesToExcel,
  normalizeDay,
  matchTeacher,
  matchClass,
  matchSubject,
  matchTimeSlots
} from '../utils/scheduleExcel';

interface AdminDashboardProps {
  session: UserSession;
  onOpenAuth: () => void;
  teachers: Teacher[];
  classes: ClassRoom[];
  subjects: Subject[];
  timeSlots: TimeSlot[];
  schedules: ScheduleItem[];
  attendanceRecords?: AttendanceRecord[];
  piketAccounts?: PiketAccount[];
  onSavePiketAccount?: (data: PiketAccount) => void;
  onBulkSavePiketAccounts?: (data: PiketAccount[]) => void;
  onSaveTeacher: (data: Teacher) => void;
  onDeleteTeacher: (id: string, name: string) => void;
  onBulkSaveTeachers: (data: Teacher[]) => void;
  onSaveClass: (data: ClassRoom) => void;
  onDeleteClass: (id: string, name: string) => void;
  onBulkSaveClasses: (data: ClassRoom[]) => void;
  onSaveSubject: (data: Subject) => void;
  onDeleteSubject: (id: string, name: string) => void;
  onBulkSaveSubjects: (data: Subject[]) => void;
  onSaveSchedule: (data: ScheduleItem) => void;
  onDeleteSchedule: (id: string) => void;
  onBulkSaveSchedules?: (data: ScheduleItem[]) => void;
  onReplaceAllSchedules?: (data: ScheduleItem[]) => void;
  onSaveTimeSlot?: (data: TimeSlot) => void;
  onDeleteTimeSlot?: (id: string) => void;
  onBulkSaveTimeSlots?: (data: TimeSlot[]) => void;
  logos?: SchoolLogos;
  onSaveLogos?: (logos: SchoolLogos) => void;
  locationConfig?: SchoolLocationConfig;
  onSaveLocationConfig?: (config: SchoolLocationConfig) => void;
  onRecordAttendance?: (record: AttendanceRecord) => void;
  onDeleteAttendanceRecord?: (id: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  session,
  onOpenAuth,
  teachers,
  classes,
  subjects,
  timeSlots,
  schedules,
  attendanceRecords = [],
  piketAccounts = [],
  onSavePiketAccount,
  onBulkSavePiketAccounts,
  onSaveTeacher,
  onDeleteTeacher,
  onBulkSaveTeachers,
  onSaveClass,
  onDeleteClass,
  onBulkSaveClasses,
  onSaveSubject,
  onDeleteSubject,
  onBulkSaveSubjects,
  onSaveSchedule,
  onDeleteSchedule,
  onBulkSaveSchedules,
  onReplaceAllSchedules,
  onSaveTimeSlot,
  onDeleteTimeSlot,
  onBulkSaveTimeSlots,
  logos = DEFAULT_LOGOS,
  onSaveLogos,
  locationConfig = DEFAULT_SCHOOL_LOCATION,
  onSaveLocationConfig,
  onRecordAttendance,
  onDeleteAttendanceRecord
}) => {
  const [adminTab, setAdminTab] = useState<'realtime' | 'teachers' | 'classes' | 'subjects' | 'schedules' | 'timeslots' | 'piket' | 'location' | 'import' | 'branding' | 'reports'>('realtime');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Schedule Excel Import Modal State
  const [isScheduleExcelModalOpen, setIsScheduleExcelModalOpen] = useState<boolean>(false);

  // GPS Geofence Location Configuration State
  const [locationForm, setLocationForm] = useState<SchoolLocationConfig>(locationConfig);
  const [isDetectingCurrentGps, setIsDetectingCurrentGps] = useState<boolean>(false);
  const [locationSavedToast, setLocationSavedToast] = useState<string | null>(null);

  useEffect(() => {
    if (locationConfig) {
      setLocationForm(locationConfig);
    }
  }, [locationConfig]);

  // Piket Management State
  const [piketSearch, setPiketSearch] = useState<string>('');
  const [piketStatusFilter, setPiketStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'TODAY'>('ALL');
  const [piketDayFilter, setPiketDayFilter] = useState<'ALL' | DayOfWeek>('ALL');
  const [visiblePasswordIds, setVisiblePasswordIds] = useState<Set<string>>(new Set());
  const [copiedPiketId, setCopiedPiketId] = useState<string | null>(null);
  const [copiedAllMsg, setCopiedAllMsg] = useState<boolean>(false);
  const [isPiketModalOpen, setIsPiketModalOpen] = useState<boolean>(false);
  const [editingPiketAccount, setEditingPiketAccount] = useState<PiketAccount | null>(null);
  const [piketForm, setPiketForm] = useState<{
    username: string;
    password: string;
    assignedDays: DayOfWeek[];
    isActive: boolean;
    notes: string;
  }>({
    username: '',
    password: '',
    assignedDays: ['Senin'],
    isActive: true,
    notes: ''
  });
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  // Modals & form state
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [teacherForm, setTeacherForm] = useState<Partial<Teacher>>({
    name: '',
    nip: '',
    gender: 'L',
    email: '',
    phone: '',
    status: 'Aktif'
  });

  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRoom | null>(null);
  const [classForm, setClassForm] = useState<Partial<ClassRoom>>({
    name: '',
    grade: 'X',
    major: 'Umum'
  });

  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectForm, setSubjectForm] = useState<Partial<Subject>>({
    code: '',
    name: '',
    category: 'Wajib'
  });

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null);
  const [scheduleForm, setScheduleForm] = useState<{
    teacherId: string;
    day: DayOfWeek;
    classRoomId: string;
    subjectId: string;
    timeSlotId: string;
    selectedTimeSlotIds: string[];
    notes: string;
  }>({
    teacherId: teachers[0]?.id || '',
    day: 'Senin',
    classRoomId: classes[0]?.id || '',
    subjectId: subjects[0]?.id || '',
    timeSlotId: timeSlots[0]?.id || '',
    selectedTimeSlotIds: timeSlots[0]?.id ? [timeSlots[0].id] : [],
    notes: ''
  });

  // TimeSlot Modal & Management State
  const [isTimeSlotModalOpen, setIsTimeSlotModalOpen] = useState(false);
  const [editingTimeSlot, setEditingTimeSlot] = useState<TimeSlot | null>(null);
  const [timeSlotViewMode, setTimeSlotViewMode] = useState<'grid' | 'table'>('grid');
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [shiftMinutes, setShiftMinutes] = useState<number>(15);
  const [shiftDirection, setShiftDirection] = useState<'forward' | 'backward'>('forward');
  const [timeSlotForm, setTimeSlotForm] = useState<Partial<TimeSlot>>({
    label: '',
    startTime: '07:30',
    endTime: '08:15',
    period: '07:30 - 08:15'
  });

  // Filter for schedule tab
  const [scheduleFilterDay, setScheduleFilterDay] = useState<string>('all');
  const [scheduleFilterTeacher, setScheduleFilterTeacher] = useState<string>('all');

  // Bulk Import state
  const [importType, setImportType] = useState<'schedules' | 'teachers' | 'classes' | 'subjects'>('schedules');
  const [importText, setImportText] = useState<string>('');
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  // QR Code preview modal
  const [isClassQRModalOpen, setIsClassQRModalOpen] = useState(false);
  const [selectedQRClassId, setSelectedQRClassId] = useState('');

  // Branding State (Single Official Logo: Pemerintah Aceh)
  const [currentLogos, setCurrentLogos] = useState<SchoolLogos>(logos);
  const [logoSuccessMsg, setLogoSuccessMsg] = useState<string | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setCurrentLogos(logos);
  }, [logos]);

  const handleApplyLogo = (updated: SchoolLogos) => {
    setCurrentLogos(updated);
    if (onSaveLogos) {
      onSaveLogos(updated);
    }
    setLogoSuccessMsg('Logo resmi sekolah berhasil diperbarui!');
    setTimeout(() => setLogoSuccessMsg(null), 3500);
  };

  const handleUploadFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        handleApplyLogo({ ...currentLogos, acehLogo: result });
      }
    };
    reader.readAsDataURL(file);
  };

  // If user is not logged in as Admin, show Google login gate
  if (session.role !== 'ADMIN') {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-xl shadow-slate-200/50">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Area Khusus Administrator
          </h2>
          <p className="text-slate-600 text-sm mt-2 max-w-md mx-auto leading-relaxed">
            Halaman pengaturan master guru, kelas, mapel, dan jadwal mengajar ini hanya dapat diakses melalui login Administrator dengan email resmi:
          </p>
          <div className="my-4 inline-block px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl font-mono font-bold text-blue-900 text-sm">
            rizafani@gmail.com
          </div>
          <div className="pt-2">
            <button
              onClick={onOpenAuth}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-xl shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              Login Administrator (rizafani@gmail.com)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- CRUD: TEACHERS ---
  const handleOpenTeacherModal = (teacher?: Teacher) => {
    if (teacher) {
      setEditingTeacher(teacher);
      setTeacherForm(teacher);
    } else {
      setEditingTeacher(null);
      setTeacherForm({
        name: '',
        nip: '',
        gender: 'L',
        email: '',
        phone: '',
        status: 'Aktif'
      });
    }
    setIsTeacherModalOpen(true);
  };

  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherForm.name || !teacherForm.nip) return;

    const teacherData: Teacher = {
      id: editingTeacher ? editingTeacher.id : `t-${Date.now()}`,
      name: teacherForm.name!,
      nip: teacherForm.nip!,
      gender: teacherForm.gender || 'L',
      email: teacherForm.email || '',
      phone: teacherForm.phone || '',
      status: teacherForm.status || 'Aktif'
    };
    onSaveTeacher(teacherData);
    setIsTeacherModalOpen(false);
  };

  const handleDeleteTeacher = (id: string, name: string) => {
    if (confirm(`Yakin ingin menghapus guru "${name}"? Jadwal terkait juga akan disesuaikan.`)) {
      onDeleteTeacher(id, name);
    }
  };

  // --- CRUD: CLASSES ---
  const handleOpenClassModal = (cls?: ClassRoom) => {
    if (cls) {
      setEditingClass(cls);
      setClassForm(cls);
    } else {
      setEditingClass(null);
      setClassForm({ name: '', grade: 'X', major: 'Umum' });
    }
    setIsClassModalOpen(true);
  };

  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!classForm.name) return;

    const classData: ClassRoom = {
      id: editingClass ? editingClass.id : `c-${Date.now()}`,
      name: classForm.name!,
      grade: classForm.grade || 'X',
      major: classForm.major || 'Umum'
    };
    onSaveClass(classData);
    setIsClassModalOpen(false);
  };

  const handleDeleteClass = (id: string, name: string) => {
    if (confirm(`Hapus kelas "${name}"?`)) {
      onDeleteClass(id, name);
    }
  };

  // --- CRUD: SUBJECTS ---
  const handleOpenSubjectModal = (subj?: Subject) => {
    if (subj) {
      setEditingSubject(subj);
      setSubjectForm(subj);
    } else {
      setEditingSubject(null);
      setSubjectForm({ code: '', name: '', category: 'Wajib' });
    }
    setIsSubjectModalOpen(true);
  };

  const handleSaveSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectForm.name) return;

    const subjectData: Subject = {
      id: editingSubject ? editingSubject.id : `s-${Date.now()}`,
      code: subjectForm.code || subjectForm.name!.substr(0, 3).toUpperCase(),
      name: subjectForm.name!,
      category: subjectForm.category || 'Wajib'
    };
    onSaveSubject(subjectData);
    setIsSubjectModalOpen(false);
  };

  const handleDeleteSubject = (id: string, name: string) => {
    if (confirm(`Hapus mata pelajaran "${name}"?`)) {
      onDeleteSubject(id, name);
    }
  };

  // --- CRUD: SCHEDULES ---
  const handleOpenScheduleModal = (sch?: ScheduleItem) => {
    if (sch) {
      setEditingSchedule(sch);
      const initialSlotIds = sch.timeSlotIds && sch.timeSlotIds.length > 0
        ? sch.timeSlotIds
        : (sch.timeSlotId ? [sch.timeSlotId] : []);
      setScheduleForm({
        teacherId: sch.teacherId,
        day: sch.day,
        classRoomId: sch.classRoomId,
        subjectId: sch.subjectId,
        timeSlotId: sch.timeSlotId,
        selectedTimeSlotIds: initialSlotIds,
        notes: sch.notes || ''
      });
    } else {
      setEditingSchedule(null);
      const defaultTs = timeSlots[0]?.id || '';
      setScheduleForm({
        teacherId: teachers[0]?.id || '',
        day: 'Senin',
        classRoomId: classes[0]?.id || '',
        subjectId: subjects[0]?.id || '',
        timeSlotId: defaultTs,
        selectedTimeSlotIds: defaultTs ? [defaultTs] : [],
        notes: ''
      });
    }
    setIsScheduleModalOpen(true);
  };

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !scheduleForm.teacherId ||
      !scheduleForm.day ||
      !scheduleForm.classRoomId ||
      !scheduleForm.subjectId
    ) {
      alert('Lengkapi seluruh data guru, hari mengajar, kelas, dan mata pelajaran.');
      return;
    }

    const selectedSlots = scheduleForm.selectedTimeSlotIds.length > 0
      ? scheduleForm.selectedTimeSlotIds
      : (scheduleForm.timeSlotId ? [scheduleForm.timeSlotId] : []);

    if (selectedSlots.length === 0) {
      alert('Pilih minimal satu jam pelajaran untuk jadwal mengajar ini.');
      return;
    }

    // Sort selected slots by their order in timeSlots
    const sortedSlotIds = [...selectedSlots].sort((a, b) => {
      const idxA = timeSlots.findIndex((t) => t.id === a);
      const idxB = timeSlots.findIndex((t) => t.id === b);
      return idxA - idxB;
    });

    // Keep as ONE single schedule item (never split into multiple records)
    const scheduleData: ScheduleItem = {
      id: editingSchedule ? editingSchedule.id : `sch-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      teacherId: scheduleForm.teacherId,
      day: scheduleForm.day,
      classRoomId: scheduleForm.classRoomId,
      subjectId: scheduleForm.subjectId,
      timeSlotId: sortedSlotIds[0],
      timeSlotIds: sortedSlotIds,
      notes: scheduleForm.notes || ''
    };

    onSaveSchedule(scheduleData);
    setIsScheduleModalOpen(false);
  };

  const handleDeleteSchedule = (id: string) => {
    if (confirm('Hapus jadwal mengajar ini?')) {
      onDeleteSchedule(id);
    }
  };

  // --- TIME SLOTS UTILITIES & PRESETS ---
  const timeStrToMinutes = (t?: string): number => {
    if (!t || !t.includes(':')) return 0;
    const [h, m] = t.split(':').map((n) => parseInt(n, 10) || 0);
    return h * 60 + m;
  };

  const minutesToTimeStr = (totalMinutes: number): string => {
    const norm = ((totalMinutes % 1440) + 1440) % 1440;
    const h = Math.floor(norm / 60);
    const m = norm % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const addMinutesToTime = (t: string, minutes: number): string => {
    return minutesToTimeStr(timeStrToMinutes(t) + minutes);
  };

  const getSlotDuration = (start?: string, end?: string): number => {
    if (!start || !end) return 0;
    const diff = timeStrToMinutes(end) - timeStrToMinutes(start);
    return diff >= 0 ? diff : diff + 1440;
  };

  // --- CRUD: TIME SLOTS (JAM PELAJARAN) ---
  const handleOpenTimeSlotModal = (slot?: TimeSlot) => {
    if (slot) {
      setEditingTimeSlot(slot);
      setTimeSlotForm({
        id: slot.id,
        label: slot.label,
        startTime: slot.startTime,
        endTime: slot.endTime,
        period: slot.period
      });
    } else {
      setEditingTimeSlot(null);
      // Smart default: based on the last slot
      const lastSlot = timeSlots[timeSlots.length - 1];
      const nextNum = timeSlots.length + 1;
      let start = '07:30';
      let end = '08:15';
      if (lastSlot && lastSlot.endTime) {
        start = lastSlot.endTime;
        end = addMinutesToTime(lastSlot.endTime, 45);
      }
      setTimeSlotForm({
        label: `Jam ${nextNum}`,
        startTime: start,
        endTime: end,
        period: `${start} - ${end}`
      });
    }
    setIsTimeSlotModalOpen(true);
  };

  const handleSetDurationForForm = (minutes: number) => {
    const start = timeSlotForm.startTime || '07:30';
    const newEnd = addMinutesToTime(start, minutes);
    setTimeSlotForm((prev) => ({
      ...prev,
      endTime: newEnd,
      period: `${start} - ${newEnd}`
    }));
  };

  const handleSaveTimeSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!timeSlotForm.label || !timeSlotForm.startTime || !timeSlotForm.endTime) {
      alert('Mohon isi label nama jam, jam mulai, dan jam selesai.');
      return;
    }

    const trimmedLabel = timeSlotForm.label.trim();
    const start = timeSlotForm.startTime.trim();
    const end = timeSlotForm.endTime.trim();
    const periodStr = `${start} - ${end}`;

    const slotData: TimeSlot = {
      id: editingTimeSlot ? editingTimeSlot.id : `ts-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      label: trimmedLabel,
      startTime: start,
      endTime: end,
      period: periodStr
    };

    if (onSaveTimeSlot) {
      onSaveTimeSlot(slotData);
    }
    setIsTimeSlotModalOpen(false);
  };

  const handleDeleteTimeSlot = (id: string, label: string) => {
    const connected = schedules.filter((s) => s.timeSlotId === id || s.timeSlotIds?.includes(id)).length;
    const warning = connected > 0
      ? `Hapus ${label}? Perhatian: ada ${connected} jadwal mengajar guru yang terhubung ke jam ini.`
      : `Yakin ingin menghapus ${label}?`;

    if (confirm(warning)) {
      if (onDeleteTimeSlot) {
        onDeleteTimeSlot(id);
      }
    }
  };

  const handleDuplicateTimeSlot = (slot: TimeSlot) => {
    const duration = getSlotDuration(slot.startTime, slot.endTime) || 45;
    const newStart = slot.endTime;
    const newEnd = addMinutesToTime(newStart, duration);

    // Try to increment number from label if present
    const match = slot.label.match(/\d+/);
    let newLabel = `${slot.label} (Salinan)`;
    if (match) {
      const num = parseInt(match[0], 10) + 1;
      newLabel = slot.label.replace(/\d+/, num.toString());
    }

    const newSlot: TimeSlot = {
      id: `ts-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      label: newLabel,
      startTime: newStart,
      endTime: newEnd,
      period: `${newStart} - ${newEnd}`
    };

    if (onSaveTimeSlot) {
      onSaveTimeSlot(newSlot);
    }
  };

  const handleMoveTimeSlot = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= timeSlots.length) return;

    const updated = [...timeSlots];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    if (onBulkSaveTimeSlots) {
      onBulkSaveTimeSlots(updated);
    }
  };

  const handleSortTimeSlots = () => {
    const sorted = [...timeSlots].sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (onBulkSaveTimeSlots) {
      onBulkSaveTimeSlots(sorted);
    }
  };

  const handleShiftAllTimeSlots = () => {
    const delta = shiftDirection === 'forward' ? shiftMinutes : -shiftMinutes;
    const shifted = timeSlots.map((ts) => {
      const newStart = addMinutesToTime(ts.startTime, delta);
      const newEnd = addMinutesToTime(ts.endTime, delta);
      return {
        ...ts,
        startTime: newStart,
        endTime: newEnd,
        period: `${newStart} - ${newEnd}`
      };
    });

    if (onBulkSaveTimeSlots) {
      onBulkSaveTimeSlots(shifted);
    }
    setIsShiftModalOpen(false);
  };

  const handleApplyPreset = (preset: 'standar' | 'jumat' | 'ramadhan' | 'jam0') => {
    if (preset === 'jam0') {
      const exists = timeSlots.some((ts) => ts.label.toLowerCase().includes('jam 0') || ts.label.toLowerCase().includes('upacara'));
      if (exists) {
        alert('Jam 0 atau Upacara/Literasi sudah ada pada daftar jam pelajaran.');
        return;
      }
      const firstSlot = timeSlots[0];
      const end = firstSlot ? firstSlot.startTime : '07:30';
      const start = addMinutesToTime(end, -30);
      const slotZero: TimeSlot = {
        id: `ts-zero-${Date.now()}`,
        label: 'Jam 0 (Upacara / Literasi Pagi)',
        startTime: start,
        endTime: end,
        period: `${start} - ${end}`
      };
      const updated = [slotZero, ...timeSlots];
      if (onBulkSaveTimeSlots) {
        onBulkSaveTimeSlots(updated);
      }
      return;
    }

    let presetSlots: TimeSlot[] = [];
    let presetTitle = '';

    if (preset === 'standar') {
      presetTitle = 'Standar SMA SMAN 1 JULOK (10 JP @ 45 Menit)';
      presetSlots = INITIAL_TIME_SLOTS;
    } else if (preset === 'jumat') {
      presetTitle = 'Khusus Hari Jumat (6 JP @ 35-40 Menit, Pulang sebelum Sholat Jumat)';
      presetSlots = [
        { id: `ts-j-1-${Date.now()}`, label: 'Jam 1', startTime: '07:30', endTime: '08:10', period: '07:30 - 08:10' },
        { id: `ts-j-2-${Date.now()}`, label: 'Jam 2', startTime: '08:10', endTime: '08:50', period: '08:10 - 08:50' },
        { id: `ts-j-3-${Date.now()}`, label: 'Jam 3', startTime: '08:50', endTime: '09:30', period: '08:50 - 09:30' },
        { id: `ts-j-4-${Date.now()}`, label: 'Jam 4', startTime: '09:45', endTime: '10:20', period: '09:45 - 10:20' },
        { id: `ts-j-5-${Date.now()}`, label: 'Jam 5', startTime: '10:20', endTime: '10:55', period: '10:20 - 10:55' },
        { id: `ts-j-6-${Date.now()}`, label: 'Jam 6', startTime: '10:55', endTime: '11:30', period: '10:55 - 11:30' }
      ];
    } else if (preset === 'ramadhan') {
      presetTitle = 'Jadwal Bulan Ramadhan (8 JP @ 35 Menit)';
      presetSlots = [
        { id: `ts-r-1-${Date.now()}`, label: 'Jam 1', startTime: '08:00', endTime: '08:35', period: '08:00 - 08:35' },
        { id: `ts-r-2-${Date.now()}`, label: 'Jam 2', startTime: '08:35', endTime: '09:10', period: '08:35 - 09:10' },
        { id: `ts-r-3-${Date.now()}`, label: 'Jam 3', startTime: '09:10', endTime: '09:45', period: '09:10 - 09:45' },
        { id: `ts-r-4-${Date.now()}`, label: 'Jam 4', startTime: '09:55', endTime: '10:30', period: '09:55 - 10:30' },
        { id: `ts-r-5-${Date.now()}`, label: 'Jam 5', startTime: '10:30', endTime: '11:05', period: '10:30 - 11:05' },
        { id: `ts-r-6-${Date.now()}`, label: 'Jam 6', startTime: '11:05', endTime: '11:40', period: '11:05 - 11:40' },
        { id: `ts-r-7-${Date.now()}`, label: 'Jam 7', startTime: '11:40', endTime: '12:15', period: '11:40 - 12:15' },
        { id: `ts-r-8-${Date.now()}`, label: 'Jam 8', startTime: '12:45', endTime: '13:20', period: '12:45 - 13:20' }
      ];
    }

    if (confirm(`Terapkan preset "${presetTitle}"? Seluruh jam pelajaran yang ada saat ini akan diganti dengan susunan preset ini.`)) {
      if (onBulkSaveTimeSlots) {
        onBulkSaveTimeSlots(presetSlots);
      }
    }
  };

  const handleResetDefaultTimeSlots = () => {
    if (confirm('Atur ulang seluruh jam pelajaran ke format standar SMAN 1 JULOK (Jam 1 s/d Jam 10 @ 45 Menit)? Jam pelajaran yang ada akan diperbarui.')) {
      if (onBulkSaveTimeSlots) {
        onBulkSaveTimeSlots(INITIAL_TIME_SLOTS);
      }
    }
  };

  // --- BULK IMPORT HANDLER ---
  const handleProcessImport = () => {
    if (!importText.trim()) return;
    const lines = importText.trim().split('\n');

    try {
      if (importType === 'teachers') {
        const newTeachers: Teacher[] = [];
        lines.forEach((line) => {
          const parts = line.split(/[,;\t]/).map((p) => p.trim());
          if (parts.length >= 2) {
            const [name, nip, gender, phone, email] = parts;
            newTeachers.push({
              id: `t-imp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              name,
              nip: nip || '-',
              gender: (gender?.toUpperCase() === 'P' ? 'P' : 'L') as 'L' | 'P',
              phone: phone || '',
              email: email || '',
              status: 'Aktif'
            });
          }
        });
        if (newTeachers.length > 0) {
          onBulkSaveTeachers(newTeachers);
          setImportSuccessMsg(`Berhasil mengimpor ${newTeachers.length} data guru baru ke Cloud Database.`);
          setImportText('');
        }
      } else if (importType === 'classes') {
        const newClasses: ClassRoom[] = [];
        lines.forEach((line) => {
          const parts = line.split(/[,;\t]/).map((p) => p.trim());
          if (parts.length >= 1 && parts[0]) {
            const [name, grade, major] = parts;
            newClasses.push({
              id: `c-imp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              name,
              grade: (grade as 'X' | 'XI' | 'XII') || 'X',
              major: (major as 'MIPA' | 'IPS' | 'Umum') || 'Umum'
            });
          }
        });
        if (newClasses.length > 0) {
          onBulkSaveClasses(newClasses);
          setImportSuccessMsg(`Berhasil mengimpor ${newClasses.length} data kelas ke Cloud Database.`);
          setImportText('');
        }
      } else if (importType === 'subjects') {
        const newSubjects: Subject[] = [];
        lines.forEach((line) => {
          const parts = line.split(/[,;\t]/).map((p) => p.trim());
          if (parts.length >= 1 && parts[0]) {
            const [name, code, cat] = parts;
            newSubjects.push({
              id: `s-imp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              name,
              code: code || name.substr(0, 3).toUpperCase(),
              category: (cat as 'Wajib' | 'Peminatan') || 'Wajib'
            });
          }
        });
        if (newSubjects.length > 0) {
          onBulkSaveSubjects(newSubjects);
          setImportSuccessMsg(`Berhasil mengimpor ${newSubjects.length} data mata pelajaran ke Cloud Database.`);
          setImportText('');
        }
      } else if (importType === 'schedules') {
        const newSchedules: ScheduleItem[] = [];
        lines.forEach((line) => {
          const parts = line.split(/[,;\t]/).map((p) => p.trim());
          if (parts.length >= 5) {
            const [dayStr, teacherStr, classStr, subjStr, timeStr, roomStr, notesStr] = parts;
            const matchedDay = normalizeDay(dayStr);
            const matchedTeacher = matchTeacher(teacherStr, teachers);
            const matchedClass = matchClass(classStr, classes);
            const matchedSubj = matchSubject(subjStr, subjects);
            const matchedTime = matchTimeSlots(timeStr, timeSlots);

            if (matchedDay && matchedTeacher && matchedClass && matchedSubj && matchedTime.primarySlotId) {
              newSchedules.push({
                id: `sch-imp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                day: matchedDay,
                teacherId: matchedTeacher.id,
                classRoomId: matchedClass.id,
                subjectId: matchedSubj.id,
                timeSlotId: matchedTime.primarySlotId,
                timeSlotIds: matchedTime.allSlotIds,
                room: roomStr || '',
                notes: notesStr || ''
              });
            }
          }
        });

        if (newSchedules.length > 0) {
          if (onBulkSaveSchedules) {
            onBulkSaveSchedules(newSchedules);
            setImportSuccessMsg(`Berhasil mengimpor ${newSchedules.length} data jadwal mengajar ke Cloud Database.`);
            setImportText('');
          }
        } else {
          alert('Tidak ada baris jadwal yang cocok. Pastikan kolom: Hari, Guru, Kelas, Mapel, dan Jam sesuai dengan data master.');
        }
      }
    } catch {
      alert('Format import tidak valid. Pastikan data dipisahkan dengan koma atau tab.');
    }
  };

  // --- CRUD & ACTIONS: ADMIN PIKET ---
  const todayDayName = getTodayDayName();

  const toggleShowPassword = (id: string) => {
    setVisiblePasswordIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCopyPiketAccount = (acc: PiketAccount) => {
    const text = `*AKUN LOGIN PIKET GURU SMAN 1 JULOK*\nNama: ${acc.teacherName}\nNIP: ${acc.nip || '-'}\nUsername: ${acc.username}\nPassword: ${acc.password}\nJadwal Tugas: ${acc.assignedDays && acc.assignedDays.length > 0 ? acc.assignedDays.join(', ') : 'Belum diatur'}`;
    navigator.clipboard.writeText(text);
    setCopiedPiketId(acc.id);
    setTimeout(() => setCopiedPiketId(null), 2500);
  };

  const handleCopyAllPiketAccounts = () => {
    const text = formatPiketAccountsForSharing(piketAccounts);
    navigator.clipboard.writeText(text);
    setCopiedAllMsg(true);
    setTimeout(() => setCopiedAllMsg(false), 3000);
  };

  const handleResetAllPiketPasswords = () => {
    if (
      !confirm(
        'Apakah Anda yakin ingin mereset password SEMUA akun piket ke format otomatis default (piket + 4 digit NIP)? Password khusus yang pernah diedit akan dikembalikan ke default.'
      )
    ) {
      return;
    }

    const updated = piketAccounts.map((acc) => ({
      ...acc,
      password: generateDefaultPiketPassword(acc.nip, acc.teacherName),
      updatedAt: new Date().toISOString()
    }));

    if (onBulkSavePiketAccounts) {
      onBulkSavePiketAccounts(updated);
    }
  };

  const handleQuickResetSinglePassword = (acc: PiketAccount) => {
    const defaultPass = generateDefaultPiketPassword(acc.nip, acc.teacherName);
    const updated: PiketAccount = {
      ...acc,
      password: defaultPass,
      updatedAt: new Date().toISOString()
    };
    if (onSavePiketAccount) {
      onSavePiketAccount(updated);
    }
  };

  const handleQuickTogglePiketStatus = (acc: PiketAccount) => {
    const updated: PiketAccount = {
      ...acc,
      isActive: !acc.isActive,
      updatedAt: new Date().toISOString()
    };
    if (onSavePiketAccount) {
      onSavePiketAccount(updated);
    }
  };

  const handleOpenPiketEditModal = (acc: PiketAccount) => {
    setEditingPiketAccount(acc);
    setPiketForm({
      username: acc.username,
      password: acc.password,
      assignedDays: acc.assignedDays || ['Senin'],
      isActive: acc.isActive,
      notes: acc.notes || ''
    });
    setIsPiketModalOpen(true);
  };

  const handleSavePiketForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPiketAccount) return;

    const trimmedUsername = piketForm.username.trim().toLowerCase();
    if (!trimmedUsername) {
      alert('Username tidak boleh kosong.');
      return;
    }

    if (!piketForm.password.trim()) {
      alert('Password tidak boleh kosong.');
      return;
    }

    // Check duplicate username among other accounts
    const duplicate = piketAccounts.find(
      (a) => a.id !== editingPiketAccount.id && a.username.toLowerCase() === trimmedUsername
    );
    if (duplicate) {
      alert(`Username "${trimmedUsername}" sudah digunakan oleh guru lain (${duplicate.teacherName}). Silakan gunakan username yang berbeda.`);
      return;
    }

    const updatedAccount: PiketAccount = {
      ...editingPiketAccount,
      username: trimmedUsername,
      password: piketForm.password.trim(),
      assignedDays: piketForm.assignedDays,
      isActive: piketForm.isActive,
      notes: piketForm.notes,
      updatedAt: new Date().toISOString()
    };

    if (onSavePiketAccount) {
      onSavePiketAccount(updatedAccount);
    }
    setIsPiketModalOpen(false);
  };

  // --- ACTIONS: PENGATURAN LOKASI GPS & GEOFENCE ---
  const handleGetCurrentGpsLocation = () => {
    if (!navigator.geolocation) {
      alert('Perangkat Anda tidak mendukung fitur geolokasi GPS.');
      return;
    }
    setIsDetectingCurrentGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsDetectingCurrentGps(false);
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setLocationForm((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng
        }));
        alert(`Koordinat GPS berhasil diambil dari perangkat saat ini:\nLintang: ${lat}\nBujur: ${lng}\nAkurasi: ±${Math.round(pos.coords.accuracy)} meter`);
      },
      (err) => {
        setIsDetectingCurrentGps(false);
        alert(`Gagal mendeteksi lokasi GPS perangkat: ${err.message}. Pastikan izin lokasi aktif di browser.`);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleResetDefaultLocation = () => {
    if (confirm('Kembalikan titik koordinat dan radius ke koordinat resmi SMA Negeri 1 Julok?')) {
      setLocationForm(DEFAULT_SCHOOL_LOCATION);
    }
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onSaveLocationConfig) {
      await onSaveLocationConfig(locationForm);
      setLocationSavedToast('Pengaturan Lokasi GPS & Geofence berhasil disimpan ke Cloud Database!');
      setTimeout(() => setLocationSavedToast(null), 4000);
    }
  };

  const handleImportSchedulesFromExcel = async (newSchedules: ScheduleItem[], replaceAll: boolean) => {
    if (replaceAll && onReplaceAllSchedules) {
      await onReplaceAllSchedules(newSchedules);
    } else if (onBulkSaveSchedules) {
      await onBulkSaveSchedules(newSchedules);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-600 text-white">
              Administrator Master
            </span>
            <span className="text-xs text-slate-300 font-mono">rizafani@gmail.com</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight mt-1">
            Panel Pengaturan Master SMAN 1 JULOK
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Kelola data guru, kelas, mata pelajaran, master jadwal, dan geofencing lokasi GPS sekolah.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap gap-1">
        {[
          { id: 'realtime', label: 'Dashboard Realtime', icon: Radio, count: null, isLive: true },
          { id: 'schedules', label: 'Jadwal Mengajar', icon: Calendar, count: schedules.length },
          { id: 'teachers', label: 'Data Guru', icon: Users, count: teachers.length },
          { id: 'piket', label: 'Kelola Admin Piket', icon: UserCheck, count: piketAccounts.length },
          { id: 'classes', label: 'Data Kelas', icon: School, count: classes.length },
          { id: 'subjects', label: 'Mata Pelajaran', icon: BookOpen, count: subjects.length },
          { id: 'timeslots', label: 'Jam Pelajaran', icon: Clock, count: timeSlots.length },
          { id: 'location', label: 'Lokasi GPS & Geofence', icon: MapPin, count: null },
          { id: 'branding', label: 'Logo & Identitas', icon: Award, count: null },
          { id: 'import', label: 'Import Guru & Data', icon: Upload, count: null },
          { id: 'reports', label: 'Laporan & Rekap PDF', icon: FileSpreadsheet, count: attendanceRecords.length }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = adminTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setAdminTab(tab.id as typeof adminTab);
                setSearchQuery('');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-4 h-4 ${tab.isLive ? (isActive ? 'text-emerald-300 animate-pulse' : 'text-emerald-500 animate-pulse') : ''}`} />
              <span>{tab.label}</span>
              {tab.isLive && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold uppercase tracking-wider flex items-center gap-1 ${
                    isActive ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Live
                </span>
              )}
              {tab.count !== null && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                    isActive ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: 0. DASHBOARD REALTIME MONITORING */}
      {adminTab === 'realtime' && (
        <AdminRealtimeDashboard
          teachers={teachers}
          classes={classes}
          subjects={subjects}
          timeSlots={timeSlots}
          schedules={schedules}
          attendanceRecords={attendanceRecords}
          piketAccounts={piketAccounts}
          logos={logos}
          onRecordAttendance={onRecordAttendance}
          onDeleteRecord={onDeleteAttendanceRecord}
          onSwitchTab={(tabId) => setAdminTab(tabId as typeof adminTab)}
        />
      )}

      {/* TAB CONTENT: 1. JADWAL MENGAJAR */}
      {adminTab === 'schedules' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Pengaturan Jadwal Mengajar Guru
              </h3>
              <p className="text-xs text-slate-500">
                Hubungkan Guru, Hari Mengajar, Kelas, Mapel, dan Jam Pelajaran.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() =>
                  downloadScheduleExcelTemplate(teachers, classes, subjects, timeSlots)
                }
                className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Unduh template Excel dengan sheet referensi guru, kelas, mapel & jam"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Template Excel</span>
              </button>

              <button
                type="button"
                onClick={() => setIsScheduleExcelModalOpen(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Import jadwal dari file .xlsx / .xls"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                <span>Import Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  exportSchedulesToExcel(schedules, teachers, classes, subjects, timeSlots)
                }
                disabled={schedules.length === 0}
                className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                title="Ekspor seluruh jadwal mengajar saat ini ke file Excel"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export Excel ({schedules.length})</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenScheduleModal()}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Jadwal</span>
              </button>
            </div>
          </div>

          {/* Filter options */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-600">Filter Hari:</span>
              <select
                value={scheduleFilterDay}
                onChange={(e) => setScheduleFilterDay(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
              >
                <option value="all">Semua Hari</option>
                {INDONESIAN_DAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-600">Filter Guru:</span>
              <select
                value={scheduleFilterTeacher}
                onChange={(e) => setScheduleFilterTeacher(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white max-w-xs truncate"
              >
                <option value="all">Semua Guru ({teachers.length})</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Schedule Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Hari</th>
                  <th className="p-3">Guru Pengampu</th>
                  <th className="p-3">Kelas</th>
                  <th className="p-3">Mata Pelajaran</th>
                  <th className="p-3">Jam Pelajaran</th>
                  <th className="p-3">Catatan / Ruang</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...schedules]
                  .filter((s) => scheduleFilterDay === 'all' || s.day === scheduleFilterDay)
                  .filter((s) => scheduleFilterTeacher === 'all' || s.teacherId === scheduleFilterTeacher)
                  .sort((a, b) => {
                    const dayDiff = INDONESIAN_DAYS.indexOf(a.day) - INDONESIAN_DAYS.indexOf(b.day);
                    if (dayDiff !== 0) return dayDiff;
                    const slotAIdx = timeSlots.findIndex((t) => t.id === a.timeSlotId);
                    const slotBIdx = timeSlots.findIndex((t) => t.id === b.timeSlotId);
                    return (slotAIdx >= 0 ? slotAIdx : 999) - (slotBIdx >= 0 ? slotBIdx : 999);
                  })
                  .map((s) => {
                    const teacher = teachers.find((t) => t.id === s.teacherId);
                    const cls = classes.find((c) => c.id === s.classRoomId);
                    const sub = subjects.find((sb) => sb.id === s.subjectId);
                    const slotInfo = formatScheduleTimeSlots(s, timeSlots);

                    return (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-blue-700">{s.day}</td>
                        <td className="p-3 font-semibold text-slate-900">{teacher?.name || '-'}</td>
                        <td className="p-3 font-bold text-slate-700">{cls?.name || '-'}</td>
                        <td className="p-3 text-slate-800">{sub?.name || '-'}</td>
                        <td className="p-3 text-slate-700 font-mono">
                          <span className="font-bold text-blue-800">{slotInfo.label}</span>
                          <span className="text-slate-500 ml-1.5 text-[11px]">({slotInfo.period} WIB)</span>
                        </td>
                        <td className="p-3 text-slate-500 italic">{s.notes || '-'}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenScheduleModal(s)}
                              className="p-1 text-slate-500 hover:text-blue-600 rounded transition-colors"
                              title="Edit Jadwal"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSchedule(s.id)}
                              className="p-1 text-slate-500 hover:text-rose-600 rounded transition-colors"
                              title="Hapus Jadwal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 2. DATA GURU */}
      {adminTab === 'teachers' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Data Master Guru</h3>
              <p className="text-xs text-slate-500">
                Kelola daftar nama dan NIP guru SMA NEGERI 1 JULOK untuk presensi mandiri.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setAdminTab('import')}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4" />
                Import Sekaligus
              </button>
              <button
                onClick={() => handleOpenTeacherModal()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Tambah Guru
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama guru atau NIP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">No</th>
                  <th className="p-3">Nama Lengkap Guru</th>
                  <th className="p-3">NIP</th>
                  <th className="p-3">L/P</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachers
                  .filter((t) =>
                    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    t.nip.includes(searchQuery)
                  )
                  .map((t, idx) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-900">{t.name}</td>
                      <td className="p-3 font-mono text-slate-600">{t.nip}</td>
                      <td className="p-3 text-slate-600">{t.gender}</td>
                      <td className="p-3 text-slate-500">{t.email || '-'}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {t.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenTeacherModal(t)}
                            className="p-1 text-slate-500 hover:text-blue-600 rounded transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTeacher(t.id, t.name)}
                            className="p-1 text-slate-500 hover:text-rose-600 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: KELOLA ADMIN PIKET (GURU PIKET) */}
      {adminTab === 'piket' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6 animate-in fade-in">
          {/* Header & Subtitle */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100/80 rounded-xl text-blue-700">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Kelola Admin &amp; Kredensial Guru Piket
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Username dibuat otomatis dari nama guru (huruf kecil tanpa gelar). Setiap guru memiliki akun untuk mencatat kehadiran &amp; ketidakhadiran di Panel Piket.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCopyAllPiketAccounts}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs ${
                  copiedAllMsg
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                }`}
                title="Salin daftar akun guru piket dalam format teks WhatsApp"
              >
                {copiedAllMsg ? <CheckCheck className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                <span>{copiedAllMsg ? 'Tersalin ke Clipboard!' : 'Salin Semua Akun (Format WA)'}</span>
              </button>

              <button
                onClick={() => setIsShareModalOpen(true)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 border border-slate-200"
              >
                <FileSpreadsheet className="w-4 h-4 text-slate-600" />
                <span>Format Teks / Cetak</span>
              </button>

              <button
                onClick={handleResetAllPiketPasswords}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 border border-rose-200"
                title="Kembalikan semua password ke format otomatis (piket + 4 digit NIP)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Semua Password</span>
              </button>
            </div>
          </div>

          {/* Stat Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90">
              <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
                Total Akun Guru
              </span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {piketAccounts.length}
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Tersinkron dengan Data Guru
              </span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
              <span className="text-[11px] font-semibold text-emerald-700 block uppercase tracking-wider">
                Akun Piket Aktif
              </span>
              <span className="text-2xl font-black text-emerald-800 mt-1 block">
                {piketAccounts.filter((a) => a.isActive).length}
              </span>
              <span className="text-[11px] text-emerald-600 mt-0.5 block">
                Dapat login ke sistem
              </span>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
              <span className="text-[11px] font-semibold text-amber-700 block uppercase tracking-wider">
                Akun Non-Aktif
              </span>
              <span className="text-2xl font-black text-amber-800 mt-1 block">
                {piketAccounts.filter((a) => !a.isActive).length}
              </span>
              <span className="text-[11px] text-amber-600 mt-0.5 block">
                Akses login dibatasi
              </span>
            </div>

            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200">
              <span className="text-[11px] font-semibold text-blue-700 block uppercase tracking-wider">
                Tugas Hari Ini ({todayDayName})
              </span>
              <span className="text-2xl font-black text-blue-800 mt-1 block">
                {piketAccounts.filter((a) => a.isActive && a.assignedDays?.includes(todayDayName)).length}
              </span>
              <span className="text-[11px] text-blue-600 mt-0.5 block">
                Guru terjadwal piket
              </span>
            </div>
          </div>

          {/* Info Banner */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Aturan Pembuatan Akun Otomatis:</strong> Username dibuat secara otomatis dari nama lengkap guru dengan menghapus gelar akademik (misal: <em>"Anis Kurli, S.Pd"</em> &rarr; <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-blue-300">aniskurli</span>). Password akun menggunakan prefix <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-blue-300">piket</span> diikuti 4 digit terakhir NIP. Anda dapat menyesuaikan username, password, dan hari tugas pada tombol <strong>Edit</strong>.
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Cari nama guru, NIP, atau username piket..."
                value={piketSearch}
                onChange={(e) => setPiketSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {piketSearch && (
                <button
                  onClick={() => setPiketSearch('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={piketStatusFilter}
                onChange={(e) => setPiketStatusFilter(e.target.value as typeof piketStatusFilter)}
                className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Semua Status</option>
                <option value="ACTIVE">Hanya Aktif</option>
                <option value="INACTIVE">Hanya Non-Aktif</option>
                <option value="TODAY">Bertugas Hari Ini ({todayDayName})</option>
              </select>

              <select
                value={piketDayFilter}
                onChange={(e) => setPiketDayFilter(e.target.value as typeof piketDayFilter)}
                className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Semua Hari Jadwal</option>
                {INDONESIAN_DAYS.map((d) => (
                  <option key={d} value={d}>
                    Hari {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Accounts Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3 w-12 text-center">No</th>
                  <th className="p-3">Nama Guru &amp; NIP</th>
                  <th className="p-3">Username Login (Otomatis)</th>
                  <th className="p-3">Password Piket</th>
                  <th className="p-3">Jadwal Tugas Piket</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {piketAccounts
                  .filter((acc) => {
                    // Search
                    const q = piketSearch.toLowerCase().trim();
                    if (q) {
                      const matchName = acc.teacherName.toLowerCase().includes(q);
                      const matchNip = acc.nip && acc.nip.includes(q);
                      const matchUser = acc.username.toLowerCase().includes(q);
                      if (!matchName && !matchNip && !matchUser) return false;
                    }

                    // Status filter
                    if (piketStatusFilter === 'ACTIVE' && !acc.isActive) return false;
                    if (piketStatusFilter === 'INACTIVE' && acc.isActive) return false;
                    if (
                      piketStatusFilter === 'TODAY' &&
                      (!acc.isActive || !acc.assignedDays?.includes(todayDayName))
                    ) {
                      return false;
                    }

                    // Day filter
                    if (piketDayFilter !== 'ALL') {
                      if (!acc.assignedDays?.includes(piketDayFilter)) return false;
                    }

                    return true;
                  })
                  .map((acc, idx) => {
                    const isPasswordVisible = visiblePasswordIds.has(acc.id);
                    const isCopied = copiedPiketId === acc.id;

                    return (
                      <tr key={acc.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{acc.teacherName}</div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            NIP: {acc.nip || '-'}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                            <span className="font-mono font-bold text-blue-900 text-xs">
                              {acc.username}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(acc.username);
                                setCopiedPiketId(acc.id);
                                setTimeout(() => setCopiedPiketId(null), 2000);
                              }}
                              className="text-blue-500 hover:text-blue-800 p-0.5"
                              title="Salin username"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg text-xs font-semibold text-slate-800 min-w-[90px] inline-block">
                              {isPasswordVisible ? acc.password : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleShowPassword(acc.id)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded"
                              title={isPasswordVisible ? 'Sembunyikan password' : 'Lihat password'}
                            >
                              {isPasswordVisible ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(acc.password);
                                setCopiedPiketId(acc.id);
                                setTimeout(() => setCopiedPiketId(null), 2000);
                              }}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded"
                              title="Salin password"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickResetSinglePassword(acc)}
                              className="p-1 text-slate-400 hover:text-amber-600 rounded"
                              title="Reset password ke default (piket + 4 digit NIP)"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {acc.assignedDays && acc.assignedDays.length > 0 ? (
                              acc.assignedDays.map((day) => (
                                <span
                                  key={day}
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                                    day === todayDayName
                                      ? 'bg-blue-600 text-white font-bold ring-2 ring-blue-300'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {day}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Belum diatur</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleQuickTogglePiketStatus(acc)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                              acc.isActive
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            }`}
                            title="Klik untuk mengubah status aktif/nonaktif"
                          >
                            {acc.isActive ? 'Aktif' : 'Nonaktif'}
                          </button>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleCopyPiketAccount(acc)}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                isCopied
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : 'text-slate-500 hover:text-emerald-700 bg-white hover:bg-emerald-50 border-slate-200'
                              }`}
                              title="Salin kredensial guru ini"
                            >
                              {isCopied ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <Share2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleOpenPiketEditModal(acc)}
                              className="p-1.5 text-slate-600 hover:text-blue-600 rounded-lg hover:bg-blue-50 bg-white border border-slate-200 transition-colors"
                              title="Edit Username, Password, atau Jadwal Hari Piket"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {piketAccounts.length === 0 && (
            <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <UserCheck className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600 text-sm">Belum ada akun guru piket.</p>
              <p className="text-xs text-slate-400 mt-1">
                Data akun piket akan dibuat secara otomatis begitu data guru diinput atau diimpor.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 3. DATA KELAS */}
      {adminTab === 'classes' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Data Master Kelas</h3>
              <p className="text-xs text-slate-500">
                Kelola ruang kelas (Tingkat X, XI, XII dan Jurusan).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedQRClassId(classes[0]?.id || '');
                  setIsClassQRModalOpen(true);
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
              >
                <QrCode className="w-4 h-4 text-blue-600" />
                Cetak / Lihat QR Kelas
              </button>
              <button
                onClick={() => handleOpenClassModal()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Tambah Kelas
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {classes.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between"
              >
                <div>
                  <h4 className="text-base font-black text-slate-900">{c.name}</h4>
                  <p className="text-xs text-slate-500">
                    Tingkat: {c.grade} • Jurusan: {c.major || 'Umum'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setSelectedQRClassId(c.id);
                      setIsClassQRModalOpen(true);
                    }}
                    className="p-1.5 text-blue-600 hover:text-blue-800 rounded-lg hover:bg-blue-50 transition-colors"
                    title="Lihat & Cetak QR Code Kelas"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenClassModal(c)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-white"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteClass(c.id, c.name)}
                    className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-white"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 4. MATA PELAJARAN */}
      {adminTab === 'subjects' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Data Master Mata Pelajaran (Mapel)</h3>
              <p className="text-xs text-slate-500">
                Kelola mata pelajaran kurikulum merdeka / reguler SMA NEGERI 1 JULOK.
              </p>
            </div>
            <button
              onClick={() => handleOpenSubjectModal()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Tambah Mapel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {subjects.map((sub) => (
              <div
                key={sub.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                      {sub.code}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">{sub.name}</h4>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Kategori: {sub.category || 'Wajib'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenSubjectModal(sub)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-white"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteSubject(sub.id, sub.name)}
                    className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-white"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 5. JAM PELAJARAN */}
      {adminTab === 'timeslots' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
          {/* Header & Overview Stats */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                  <Clock className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Pengaturan &amp; Master Jam Pelajaran
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Sesuaikan nama jam, jam mulai, jam selesai, durasi menit, serta terapkan preset jadwal sekolah (Standar, Jumat, Ramadhan, Apel/Upacara).
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Stats Badges */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Total Jam:</span>
                <span className="font-bold text-blue-700 font-mono text-sm">{timeSlots.length} JP</span>
              </div>
              <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Rentang Waktu:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {timeSlots[0]?.startTime || '07:30'} - {timeSlots[timeSlots.length - 1]?.endTime || '15:45'} WIB
                </span>
              </div>
              {timeSlots.length > 0 && (
                <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2">
                  <span className="text-[11px] text-emerald-600 font-semibold uppercase tracking-wider">Rata-rata:</span>
                  <span className="font-bold font-mono">
                    {Math.round(
                      timeSlots.reduce((acc, ts) => acc + (getSlotDuration(ts.startTime, ts.endTime) || 45), 0) /
                        timeSlots.length
                    )}{' '}
                    Menit/JP
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Toolbar & Preset Shortcuts */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenTimeSlotModal()}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Jam Pelajaran</span>
              </button>

              <button
                type="button"
                onClick={() => setIsShiftModalOpen(true)}
                className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Geser jam mulai & selesai seluruh jam pelajaran serentak (misal +15 menit)"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                <span>Geser Waktu (± Menit)</span>
              </button>

              <button
                type="button"
                onClick={handleSortTimeSlots}
                className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Urutkan jam pelajaran secara kronologis dari pagi hingga sore berdasarkan jam mulai"
              >
                <ListOrdered className="w-3.5 h-3.5 text-indigo-600" />
                <span>Urutkan Jam</span>
              </button>

              {/* Preset Selector */}
              <div className="relative inline-block group">
                <button
                  type="button"
                  className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Wand2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Preset Jadwal Sekolah ▾</span>
                </button>
                <div className="hidden group-hover:block hover:block absolute left-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-2 space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                    Pilihan Preset Cepat
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('standar')}
                    className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors flex flex-col"
                  >
                    <span>Standar SMAN 1 JULOK (10 JP)</span>
                    <span className="text-[10px] text-slate-400 font-normal">07:30 - 15:45 WIB @ 45 Menit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('jumat')}
                    className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg transition-colors flex flex-col"
                  >
                    <span>Khusus Hari Jumat (6 JP)</span>
                    <span className="text-[10px] text-slate-400 font-normal">07:30 - 11:30 WIB (Pulang cepat)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('ramadhan')}
                    className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition-colors flex flex-col"
                  >
                    <span>Jadwal Ramadhan (8 JP)</span>
                    <span className="text-[10px] text-slate-400 font-normal">08:00 - 13:20 WIB @ 35 Menit</span>
                  </button>
                  <div className="border-t border-slate-100 my-1 pt-1">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('jam0')}
                      className="w-full text-left px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 rounded-lg transition-colors flex flex-col"
                    >
                      <span>+ Tambah Jam Ke-0 (07:00 - 07:30)</span>
                      <span className="text-[10px] text-amber-600/70 font-normal">Upacara Bendera / Literasi Pagi</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 self-end md:self-auto">
              <button
                type="button"
                onClick={() => setTimeSlotViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  timeSlotViewMode === 'grid'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Tampilan Kartu Grid"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setTimeSlotViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  timeSlotViewMode === 'table'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Tampilan Tabel Ringkas"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* GRID VIEW */}
          {timeSlotViewMode === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {timeSlots.map((ts, idx) => {
                const connectedSchedulesCount = schedules.filter(
                  (s) => s.timeSlotId === ts.id || s.timeSlotIds?.includes(ts.id)
                ).length;
                const duration = getSlotDuration(ts.startTime, ts.endTime);

                return (
                  <div
                    key={ts.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-[10px] font-bold text-slate-400 font-mono">#{idx + 1}</span>
                          <span className="font-bold text-blue-700 text-sm px-2.5 py-0.5 bg-blue-50 border border-blue-200 rounded-lg truncate">
                            {ts.label}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md whitespace-nowrap">
                          {duration} Menit
                        </span>
                      </div>

                      <div className="mt-3.5 space-y-1.5">
                        <div className="flex items-baseline justify-between">
                          <span className="text-slate-900 font-mono text-base font-black">
                            {ts.period} <span className="text-xs font-normal text-slate-500">WIB</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{connectedSchedulesCount} Jadwal Guru Terhubung</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
                      {/* Reorder Buttons */}
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleMoveTimeSlot(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                          title="Geser Urutan Naik"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveTimeSlot(idx, 'down')}
                          disabled={idx === timeSlots.length - 1}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                          title="Geser Urutan Turun"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDuplicateTimeSlot(ts)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Duplikasi jam pelajaran ini"
                        >
                          <CopyPlus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenTimeSlotModal(ts)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          title="Edit nama jam & waktu"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTimeSlot(ts.id, ts.label)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus jam pelajaran ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TABLE VIEW */}
          {timeSlotViewMode === 'table' && (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3.5 text-center w-12">No</th>
                    <th className="py-3 px-3.5">Nama Jam Pelajaran</th>
                    <th className="py-3 px-3.5">Rentang Waktu (WIB)</th>
                    <th className="py-3 px-3.5">Jam Mulai</th>
                    <th className="py-3 px-3.5">Jam Selesai</th>
                    <th className="py-3 px-3.5">Durasi</th>
                    <th className="py-3 px-3.5">Jadwal Terhubung</th>
                    <th className="py-3 px-3.5 text-center w-48">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {timeSlots.map((ts, idx) => {
                    const connected = schedules.filter(
                      (s) => s.timeSlotId === ts.id || s.timeSlotIds?.includes(ts.id)
                    ).length;
                    const duration = getSlotDuration(ts.startTime, ts.endTime);

                    return (
                      <tr key={ts.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3.5 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-3 px-3.5 font-bold text-slate-900">
                          <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                            {ts.label}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 font-mono font-bold text-slate-800">{ts.period}</td>
                        <td className="py-3 px-3.5 font-mono text-slate-600">{ts.startTime}</td>
                        <td className="py-3 px-3.5 font-mono text-slate-600">{ts.endTime}</td>
                        <td className="py-3 px-3.5">
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {duration} Menit
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-slate-600">{connected} Jadwal Guru</td>
                        <td className="py-3 px-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveTimeSlot(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors disabled:opacity-20 cursor-pointer"
                              title="Geser Naik"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveTimeSlot(idx, 'down')}
                              disabled={idx === timeSlots.length - 1}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors disabled:opacity-20 cursor-pointer"
                              title="Geser Turun"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicateTimeSlot(ts)}
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors cursor-pointer"
                              title="Duplikasi Jam"
                            >
                              <CopyPlus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenTimeSlotModal(ts)}
                              className="px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTimeSlot(ts.id, ts.label)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 6. BULK IMPORT */}
      {adminTab === 'import' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-600" />
              Pusat Import Data (Guru, Kelas, Mapel)
            </h3>
            <p className="text-xs text-slate-500">
              Salin dan tempel (paste) data dari Excel / Spreadsheet untuk mengimpor banyak data sekaligus secara instan.
            </p>
          </div>

          {importSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{importSuccessMsg}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {[
              { id: 'schedules', label: 'Import Jadwal Mengajar (Excel .xlsx)' },
              { id: 'teachers', label: 'Import Data Guru' },
              { id: 'classes', label: 'Import Data Kelas' },
              { id: 'subjects', label: 'Import Mata Pelajaran' }
            ].map((it) => (
              <button
                key={it.id}
                onClick={() => {
                  setImportType(it.id as typeof importType);
                  setImportSuccessMsg(null);
                }}
                className={`px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  importType === it.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {it.label}
              </button>
            ))}
          </div>

          {importType === 'schedules' && (
            <div className="p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-300 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-950">
                      Import File Excel Jadwal Mengajar (.xlsx / .xls)
                    </h4>
                    <p className="text-xs text-emerald-800">
                      Unggah dokumen Excel jadwal resmi mingguan atau semester SMA NEGERI 1 JULOK.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      downloadScheduleExcelTemplate(teachers, classes, subjects, timeSlots)
                    }
                    className="px-3 py-2 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Unduh Template Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsScheduleExcelModalOpen(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Buka Dialog Unggah Excel</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
            <strong>Format Baris (Pisahkan dengan koma atau Tab/Excel):</strong>
            {importType === 'schedules' && (
              <p className="font-mono text-[11px] text-slate-800 bg-white p-2 rounded border border-slate-200">
                Hari, Nama Guru / NIP, Kelas, Mata Pelajaran, Jam Pelajaran, Ruang/Catatan<br />
                Contoh:<br />
                Senin, Ahmad Dahlan, S.Pd., X-1, Bahasa Indonesia, Jam 1-2, R.101<br />
                Selasa, Siti Aminah, M.Pd., XI MIPA 1, Matematika Wajib, Jam 3-4, Lab Komputer
              </p>
            )}
            {importType === 'teachers' && (
              <p className="font-mono text-[11px] text-slate-800 bg-white p-2 rounded border border-slate-200">
                Nama Guru, NIP, Jenis Kelamin(L/P), No HP, Email<br />
                Contoh: <br />
                Ahmad Dahlan, S.Pd., 19850101 200801 1 002, L, 08123456789, ahmad@sman1julok.sch.id<br />
                Siti Aminah, M.Pd., 19890202 201101 2 004, P, 08129876543, siti@sman1julok.sch.id
              </p>
            )}
            {importType === 'classes' && (
              <p className="font-mono text-[11px] text-slate-800 bg-white p-2 rounded border border-slate-200">
                Nama Kelas, Tingkat(X/XI/XII), Jurusan(MIPA/IPS/Umum)<br />
                Contoh:<br />
                X-4, X, Umum<br />
                XI MIPA 3, XI, MIPA
              </p>
            )}
            {importType === 'subjects' && (
              <p className="font-mono text-[11px] text-slate-800 bg-white p-2 rounded border border-slate-200">
                Nama Mapel, Kode Mapel, Kategori(Wajib/Peminatan)<br />
                Contoh:<br />
                Geografi, GEO, Peminatan<br />
                Sosiologi, SOS, Peminatan
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tempel / Paste Teks Data Disini:
            </label>
            <textarea
              rows={6}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste data dari Excel atau CSV di sini..."
              className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleProcessImport}
            disabled={!importText.trim()}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Proses & Tambahkan ke Database
          </button>
        </div>
      )}

      {/* TAB CONTENT: 6. LOGO & IDENTITAS RESMI SEKOLAH */}
      {adminTab === 'branding' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Logo &amp; Identitas Resmi Sekolah
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                  Satu Logo Resmi (Pemerintah Aceh)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Atur dan sesuaikan logo resmi yang tampil pada Topbar, Navbar, Halaman Absensi Guru, serta Kop Surat Cetak PDF Laporan.
              </p>
            </div>

            <button
              onClick={() => handleApplyLogo(DEFAULT_LOGOS)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset ke Logo Standar</span>
            </button>
          </div>

          {logoSuccessMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{logoSuccessMsg}</span>
            </div>
          )}

          {/* Single Official Logo Configuration */}
          <div className="max-w-2xl">
            <div className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-slate-50/50 hover:border-blue-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Logo Resmi (Pemerintah Aceh)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-200/70 text-slate-700 rounded-md">
                  Satu Logo Utama
                </span>
              </div>

              {/* Preview Box */}
              <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="w-20 h-20 rounded-xl bg-slate-50 p-2 border border-slate-200 flex items-center justify-center shrink-0">
                  <img
                    src={currentLogos.acehLogo}
                    alt="Logo Pemerintah Aceh Preview"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-900">
                    Lambang Aceh &ldquo;Pancacita&rdquo;
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Lambang resmi Pemerintah Aceh dengan perisai kupiah, rencong, dacin, padi kapas, dan kubah masjid. Digunakan sebagai logo tunggal di seluruh aplikasi.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <div className="text-[11px] font-semibold text-slate-700">Pilihan Cepat / Preset:</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyLogo({ ...currentLogos, acehLogo: '/logo-aceh.svg' })}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                      currentLogos.acehLogo === '/logo-aceh.svg'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ✓ Pancacita Vektor Resmi (Default)
                  </button>
                </div>

                <div className="pt-2">
                  <input
                    type="file"
                    ref={logoFileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadFile(file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => logoFileInputRef.current?.click()}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 hover:border-blue-400 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Unggah File Logo Baru (PNG / JPG / SVG)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Live Kop Surat Preview (Single Logo) */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-600" />
              <span>Pratinjau Kop Dokumen Resmi (Satu Logo):</span>
            </h4>
            <div className="bg-white border-2 border-slate-300 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between gap-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 flex items-center justify-center">
                  <img
                    src={currentLogos.acehLogo}
                    alt="Logo Aceh"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1 text-center">
                  <div className="text-[11px] sm:text-xs font-bold uppercase text-slate-800">
                    PEMERINTAH ACEH • DINAS PENDIDIKAN
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-semibold uppercase text-slate-700">
                    CABANG DINAS PENDIDIKAN WILAYAH KABUPATEN ACEH TIMUR
                  </div>
                  <div className="text-sm sm:text-base font-black text-blue-950">
                    SMA NEGERI 1 JULOK
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-slate-500">
                    Jln Alue Ie Mirah Desa Buket Seuraja Kecamatan Julok Kabupaten Aceh Timur - Kode Pos 24457
                  </div>
                </div>
                <div className="w-14 sm:w-16 shrink-0 hidden sm:block pointer-events-none" aria-hidden="true" />
              </div>
              <div className="h-0.8 bg-slate-900 mt-2.5"></div>
              <div className="h-0.3 bg-slate-500 mt-0.5"></div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: PENGATURAN LOKASI GPS & GEOFENCE */}
      {adminTab === 'location' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                <h3 className="text-base font-bold text-slate-900">
                  Pengaturan Lokasi GPS &amp; Radius Geofence Sekolah
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Tentukan koordinat pusat kampus SMA Negeri 1 Julok dan radius jarak aman kehadiran presensi mandiri guru.
              </p>
            </div>

            {locationSavedToast && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{locationSavedToast}</span>
              </div>
            )}
          </div>

          {/* Location Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">Titik Koordinat Sekolah</span>
                <span className="text-xs font-mono font-bold text-slate-900 block mt-0.5">
                  {locationForm.latitude.toFixed(6)}, {locationForm.longitude.toFixed(6)}
                </span>
                <a
                  href={getGoogleMapsUrl(locationForm.latitude, locationForm.longitude)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 mt-1 font-medium"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Lihat di Google Maps</span>
                </a>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">Radius Geofence</span>
                <span className="text-sm font-black text-indigo-900 block mt-0.5">
                  {locationForm.radiusMeters} meter
                </span>
                <span className="text-[11px] text-slate-500">
                  Menjangkau area seluruh kelas, kantor guru &amp; lapangan
                </span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                locationForm.strictValidation ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {locationForm.strictValidation ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">Status Validasi</span>
                <span className={`text-xs font-bold block mt-0.5 ${
                  locationForm.strictValidation ? 'text-emerald-700' : 'text-amber-700'
                }`}>
                  {locationForm.strictValidation ? 'Wajib di Sekolah (Ketat)' : 'Fleksibel (Catat Saja)'}
                </span>
                <span className="text-[11px] text-slate-500">
                  {locationForm.strictValidation ? 'Presensi terkunci jika di luar radius' : 'Peringatan saja'}
                </span>
              </div>
            </div>
          </div>

          {/* Form Configuration */}
          <form onSubmit={handleSaveLocation} className="space-y-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Titik Sekolah
                </label>
                <input
                  type="text"
                  required
                  value={locationForm.schoolName}
                  onChange={(e) => setLocationForm({ ...locationForm, schoolName: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl font-bold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alamat Lengkap Lingkungan Sekolah
                </label>
                <input
                  type="text"
                  required
                  value={locationForm.address}
                  onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Coordinates and Quick Actions */}
            <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-blue-600" />
                  Koordinat Titik Pusat GPS
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleGetCurrentGpsLocation}
                    disabled={isDetectingCurrentGps}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    <Crosshair className={`w-3.5 h-3.5 ${isDetectingCurrentGps ? 'animate-spin' : ''}`} />
                    <span>{isDetectingCurrentGps ? 'Mendeteksi...' : 'Ambil Titik dari GPS Saya'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetDefaultLocation}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Koordinat SMAN 1 Julok</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lintang (Latitude / North) *
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={locationForm.latitude}
                    onChange={(e) => setLocationForm({ ...locationForm, latitude: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Default SMAN 1 Julok: 5.0309</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bujur (Longitude / East) *
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={locationForm.longitude}
                    onChange={(e) => setLocationForm({ ...locationForm, longitude: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Default SMAN 1 Julok: 97.6235</span>
                </div>
              </div>
            </div>

            {/* Radius Geofence Selection */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                Batas Radius Toleransi Absensi (Meter)
              </label>

              <div className="flex flex-wrap gap-2">
                {[50, 100, 150, 200, 300, 500].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setLocationForm({ ...locationForm, radiusMeters: r })}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      locationForm.radiusMeters === r
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {r} meter {r === 200 ? '(Rekomendasi)' : ''}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-1">
                <input
                  type="range"
                  min="30"
                  max="1000"
                  step="10"
                  value={locationForm.radiusMeters}
                  onChange={(e) => setLocationForm({ ...locationForm, radiusMeters: parseInt(e.target.value) || 200 })}
                  className="flex-1 accent-blue-600"
                />
                <span className="font-mono text-xs font-black text-slate-800 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                  {locationForm.radiusMeters} m
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Jarak 200 meter dihitung merata dari titik pusat sekolah sehingga seluruh ruang kelas, lab, perpustakaan, kantor dewan guru, dan lapangan olahraga tercakup secara akurat.
              </p>
            </div>

            {/* Strict Validation Toggle */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={locationForm.strictValidation}
                  onChange={(e) => setLocationForm({ ...locationForm, strictValidation: e.target.checked })}
                  className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Wajibkan Validasi Lokasi GPS (Kunci Presensi di Luar Radius)
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Bila opsi ini diaktifkan, guru yang berada di luar radius sekolah (misalnya masih di rumah atau di luar lingkungan SMAN 1 Julok) tidak dapat mengirim absensi mandiri.
                  </p>
                </div>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Pengaturan Geofence &amp; GPS</span>
              </button>
            </div>
          </form>
        </div>
      )}
      {adminTab === 'reports' && (
        <div className="pt-2">
          <ReportsPage
            teachers={teachers}
            attendanceRecords={attendanceRecords}
            logos={currentLogos}
          />
        </div>
      )}

      {/* MODAL: GURU */}
      {isTeacherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full my-auto max-h-[92vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="font-bold text-sm text-slate-900">
                {editingTeacher ? 'Edit Data Guru' : 'Tambah Guru Baru'}
              </h4>
              <button
                onClick={() => setIsTeacherModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveTeacher} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap & Gelar *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Drs. Muhammad Yusuf"
                  value={teacherForm.name || ''}
                  onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  NIP / No. Pegawai *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 19710315 199801 1 001"
                  value={teacherForm.nip || ''}
                  onChange={(e) => setTeacherForm({ ...teacherForm, nip: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-lg font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={teacherForm.gender || 'L'}
                    onChange={(e) =>
                      setTeacherForm({ ...teacherForm, gender: e.target.value as 'L' | 'P' })
                    }
                    className="w-full px-3 py-2 text-xs border rounded-lg"
                  >
                    <option value="L">Laki-Laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={teacherForm.status || 'Aktif'}
                    onChange={(e) =>
                      setTeacherForm({ ...teacherForm, status: e.target.value as 'Aktif' | 'Nonaktif' })
                    }
                    className="w-full px-3 py-2 text-xs border rounded-lg"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="email@sman1julok.sch.id"
                  value={teacherForm.email || ''}
                  onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor HP</label>
                <input
                  type="text"
                  placeholder="0812xxxxxxxx"
                  value={teacherForm.phone || ''}
                  onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-lg"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTeacherModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg"
                >
                  Simpan Data Guru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: KELAS */}
      {isClassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-sm w-full my-auto max-h-[92vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="font-bold text-sm text-slate-900">
                {editingClass ? 'Edit Kelas' : 'Tambah Kelas'}
              </h4>
              <button
                onClick={() => setIsClassModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveClass} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Kelas *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: XI MIPA 1"
                  value={classForm.name || ''}
                  onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tingkat</label>
                  <select
                    value={classForm.grade || 'X'}
                    onChange={(e) =>
                      setClassForm({ ...classForm, grade: e.target.value as 'X' | 'XI' | 'XII' })
                    }
                    className="w-full px-3 py-2 text-xs border rounded-lg"
                  >
                    <option value="X">Kelas X</option>
                    <option value="XI">Kelas XI</option>
                    <option value="XII">Kelas XII</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jurusan</label>
                  <select
                    value={classForm.major || 'Umum'}
                    onChange={(e) =>
                      setClassForm({
                        ...classForm,
                        major: e.target.value as 'MIPA' | 'IPS' | 'Umum'
                      })
                    }
                    className="w-full px-3 py-2 text-xs border rounded-lg"
                  >
                    <option value="Umum">Umum</option>
                    <option value="MIPA">MIPA</option>
                    <option value="IPS">IPS</option>
                  </select>
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsClassModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MAPEL */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-sm w-full my-auto max-h-[92vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="font-bold text-sm text-slate-900">
                {editingSubject ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'}
              </h4>
              <button
                onClick={() => setIsSubjectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveSubject} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Mata Pelajaran *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Matematika Peminatan"
                  value={subjectForm.name || ''}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Mapel</label>
                  <input
                    type="text"
                    placeholder="Contoh: MAT-P"
                    value={subjectForm.code || ''}
                    onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                    className="w-full px-3 py-2 text-xs border rounded-lg uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={subjectForm.category || 'Wajib'}
                    onChange={(e) =>
                      setSubjectForm({
                        ...subjectForm,
                        category: e.target.value as 'Wajib' | 'Peminatan'
                      })
                    }
                    className="w-full px-3 py-2 text-xs border rounded-lg"
                  >
                    <option value="Wajib">Wajib</option>
                    <option value="Peminatan">Peminatan</option>
                  </select>
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSubjectModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg"
                >
                  Simpan Mapel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: JADWAL */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full my-auto shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 sm:px-6 py-3.5 sm:py-4 shrink-0 bg-white">
              <h4 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>{editingSchedule ? 'Edit Jadwal Mengajar' : 'Tambah Jadwal Mengajar'}</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveSchedule} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div
                className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 overscroll-contain touch-pan-y divide-y divide-slate-100/80"
                style={{ WebkitOverflowScrolling: 'touch', maxHeight: 'calc(90vh - 120px)' }}
              >
              <div className="pb-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Guru *</label>
                <select
                  required
                  value={scheduleForm.teacherId || ''}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, teacherId: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-lg"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (NIP: {t.nip})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hari Mengajar *</label>
                  <select
                    value={scheduleForm.day || 'Senin'}
                    onChange={(e) =>
                      setScheduleForm({ ...scheduleForm, day: e.target.value as DayOfWeek })
                    }
                    className="w-full px-3 py-2 text-xs border rounded-lg font-bold"
                  >
                    {INDONESIAN_DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kelas *</label>
                  <select
                    value={scheduleForm.classRoomId || ''}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, classRoomId: e.target.value })}
                    className="w-full px-3 py-2 text-xs border rounded-lg"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mata Pelajaran *
                </label>
                <select
                  value={scheduleForm.subjectId || ''}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, subjectId: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-lg font-semibold text-slate-800"
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Pilihan Jam Pelajaran (Pemisahan per jam saat memilih, tetap disimpan satu jadwal) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>Pilihan Jam Pelajaran (Per Masing-Masing Jam) *</span>
                  </label>
                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        const allIds = timeSlots.map((t) => t.id);
                        setScheduleForm((prev) => ({
                          ...prev,
                          selectedTimeSlotIds: allIds,
                          timeSlotId: allIds[0] || ''
                        }));
                      }}
                      className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded border border-blue-200 transition-colors"
                    >
                      Pilih Semua Jam
                    </button>
                    {scheduleForm.selectedTimeSlotIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setScheduleForm((prev) => ({
                            ...prev,
                            selectedTimeSlotIds: [],
                            timeSlotId: ''
                          }));
                        }}
                        className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded border border-rose-200 transition-colors"
                      >
                        Kosongkan
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-2.5 bg-blue-50/70 border border-blue-200/90 rounded-xl text-[11px] text-blue-900 leading-relaxed">
                  <span className="font-bold">Format Jam Pelajaran:</span> Pilihan jam ditampilkan per masing-masing jam mandiri (<em>Jam 1</em>, <em>Jam 2</em>, <em>Jam 3</em>, dst.). Jika guru mengajar beberapa jam (contoh: Jam 1 dan Jam 2), klik masing-masing jam tersebut. <strong>Jadwal tetap dijadikan SATU JADWAL mengajar utuh (tidak dipisahkan).</strong>
                </div>

                {/* Quick single jam toggle pills */}
                {timeSlots.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[11px] font-semibold text-slate-500">Pilih Cepat:</span>
                    {timeSlots.map((ts) => {
                      const isChecked = scheduleForm.selectedTimeSlotIds.includes(ts.id);
                      return (
                        <button
                          key={ts.id}
                          type="button"
                          onClick={() => {
                            setScheduleForm((prev) => {
                              const exists = prev.selectedTimeSlotIds.includes(ts.id);
                              const updated = exists
                                ? prev.selectedTimeSlotIds.filter((id) => id !== ts.id)
                                : [...prev.selectedTimeSlotIds, ts.id];
                              return {
                                ...prev,
                                selectedTimeSlotIds: updated,
                                timeSlotId: updated[0] || ''
                              };
                            });
                          }}
                          className={`px-2 py-0.5 rounded-md text-xs font-bold transition-all border ${
                            isChecked
                              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:border-blue-400 hover:bg-blue-50'
                          }`}
                        >
                          {isChecked ? `✓ ${ts.label}` : `+ ${ts.label}`}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Interactive grid of time slots per jam */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-1.5 border border-slate-200 rounded-xl bg-slate-50/50">
                  {timeSlots.map((ts) => {
                    const isSelected = scheduleForm.selectedTimeSlotIds.includes(ts.id);

                    return (
                      <div
                        key={ts.id}
                        onClick={() => {
                          setScheduleForm((prev) => {
                            const exists = prev.selectedTimeSlotIds.includes(ts.id);
                            const updated = exists
                              ? prev.selectedTimeSlotIds.filter((id) => id !== ts.id)
                              : [...prev.selectedTimeSlotIds, ts.id];
                            return {
                              ...prev,
                              selectedTimeSlotIds: updated,
                              timeSlotId: updated[0] || ''
                            };
                          });
                        }}
                        className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all select-none flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100/70'
                        }`}
                      >
                        <div className="truncate">
                          <span className={`text-xs font-black block ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                            {ts.label}
                          </span>
                          <span className={`text-[10px] font-mono block ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                            {ts.period} WIB
                          </span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-white shrink-0 ml-1" />}
                      </div>
                    );
                  })}
                </div>

                {/* Selection feedback */}
                <div className="flex items-center justify-between text-[11px] pt-1 px-1">
                  <div className="text-slate-600">
                    <span>Terpilih: </span>
                    <strong className="text-blue-700 font-bold">
                      {scheduleForm.selectedTimeSlotIds.length} Jam Pelajaran
                    </strong>
                    {scheduleForm.selectedTimeSlotIds.length > 0 && (
                      <span className="text-slate-500 ml-1">
                        ({timeSlots.filter((t) => scheduleForm.selectedTimeSlotIds.includes(t.id)).map((t) => t.label).join(', ')})
                      </span>
                    )}
                    {scheduleForm.selectedTimeSlotIds.length > 0 && (
                      <span className="block text-emerald-700 font-semibold mt-0.5">
                        ✓ Tetap disimpan sebagai 1 jadwal ({
                          formatScheduleTimeSlots(
                            { timeSlotId: scheduleForm.timeSlotId, timeSlotIds: scheduleForm.selectedTimeSlotIds },
                            timeSlots
                          ).period
                        } WIB).
                      </span>
                    )}
                  </div>
                  {scheduleForm.selectedTimeSlotIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setScheduleForm((prev) => ({ ...prev, selectedTimeSlotIds: [], timeSlotId: '' }))}
                      className="text-rose-600 hover:underline shrink-0 ml-2"
                    >
                      Kosongkan
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Ruang / Keterangan Tambahan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Ruang Lab IPA / Lapangan"
                  value={scheduleForm.notes || ''}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs border rounded-lg"
                />
              </div>

              </div>

              {/* Modal Sticky Footer */}
              <div className="px-5 sm:px-6 py-3 sm:py-3.5 border-t border-slate-100 bg-slate-50/90 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
                >
                  Simpan Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TIME SLOT (EDIT / TAMBAH JAM PELAJARAN) */}
      {isTimeSlotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full my-auto max-h-[92vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                {editingTimeSlot ? 'Edit Jam Pelajaran' : 'Tambah Jam Pelajaran Baru'}
              </h4>
              <button
                type="button"
                onClick={() => setIsTimeSlotModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTimeSlot} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama / Label Jam Pelajaran *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Jam 1, Jam 2, Jam 0 (Upacara), Istirahat..."
                  value={timeSlotForm.label || ''}
                  onChange={(e) => setTimeSlotForm({ ...timeSlotForm, label: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                
                {/* Quick Label Chips */}
                <div className="mt-2">
                  <span className="text-[10px] font-semibold text-slate-400 block mb-1">Pilihan Cepat:</span>
                  <div className="flex flex-wrap gap-1">
                    {[
                      'Jam 1',
                      'Jam 2',
                      'Jam 3',
                      'Jam 4',
                      'Jam 5',
                      'Jam 6',
                      'Jam 7',
                      'Jam 8',
                      'Jam 9',
                      'Jam 10',
                      'Jam 0 (Upacara / Literasi)',
                      'Istirahat Pagi',
                      'Sholat Dzuhur'
                    ].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setTimeSlotForm({ ...timeSlotForm, label: chip })}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jam Mulai *
                  </label>
                  <input
                    type="time"
                    required
                    value={timeSlotForm.startTime || '07:30'}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      const curDuration = getSlotDuration(timeSlotForm.startTime, timeSlotForm.endTime) || 45;
                      const newEnd = addMinutesToTime(newStart, curDuration);
                      setTimeSlotForm({
                        ...timeSlotForm,
                        startTime: newStart,
                        endTime: newEnd,
                        period: `${newStart} - ${newEnd}`
                      });
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jam Selesai *
                  </label>
                  <input
                    type="time"
                    required
                    value={timeSlotForm.endTime || '08:15'}
                    onChange={(e) => {
                      const newEnd = e.target.value;
                      setTimeSlotForm({
                        ...timeSlotForm,
                        endTime: newEnd,
                        period: `${timeSlotForm.startTime || '07:30'} - ${newEnd}`
                      });
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Quick Duration Buttons */}
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                  Set Durasi Otomatis dari Jam Mulai:
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {[30, 35, 40, 45, 50, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => handleSetDurationForForm(mins)}
                      className="px-2 py-1.5 text-[11px] font-bold rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-colors cursor-pointer text-center"
                    >
                      +{mins} mnt
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview & Duration Indicator */}
              {(() => {
                const duration = getSlotDuration(timeSlotForm.startTime, timeSlotForm.endTime);
                const isInvalid = duration <= 0 || duration > 360;

                return (
                  <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                    isInvalid
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : 'bg-blue-50/80 border-blue-200 text-blue-900'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Pratinjau Jam Pelajaran:</span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                        isInvalid
                          ? 'bg-rose-600 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}>
                        {isInvalid ? 'Periksa Jam' : `${duration} Menit`}
                      </span>
                    </div>
                    <div className="text-slate-800 font-bold font-mono text-sm">
                      {timeSlotForm.label || 'Jam'}: {timeSlotForm.startTime || '00:00'} - {timeSlotForm.endTime || '00:00'} WIB
                    </div>
                    {isInvalid ? (
                      <p className="text-[11px] text-rose-600 font-medium">
                        Jam Selesai harus lebih lambat dari Jam Mulai.
                      </p>
                    ) : (
                      <p className="text-[11px] text-blue-700">
                        Format ini akan tampil otomatis pada pilihan jadwal mengajar guru dan laporan absensi.
                      </p>
                    )}
                  </div>
                );
              })()}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTimeSlotModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Simpan Jam Pelajaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GESER WAKTU SELURUH JAM PELAJARAN (BULK TIME SHIFT) */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-sm w-full my-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                Geser Waktu Seluruh Jam
              </h4>
              <button
                type="button"
                onClick={() => setIsShiftModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Fitur ini akan menggeser <strong>jam mulai &amp; jam selesai seluruh {timeSlots.length} jam pelajaran</strong> secara serentak tanpa mengubah durasi per jam.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Arah Pergeseran Waktu
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShiftDirection('forward')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      shiftDirection === 'forward'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    + Mundurkan (+ Waktu)
                  </button>
                  <button
                    type="button"
                    onClick={() => setShiftDirection('backward')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      shiftDirection === 'backward'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    - Awalkan (- Waktu)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jumlah Menit Pergeseran
                </label>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {[5, 10, 15, 30].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setShiftMinutes(m)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        shiftMinutes === m
                          ? 'bg-blue-100 text-blue-800 border-blue-400'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {m} Menit
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={shiftMinutes}
                  onChange={(e) => setShiftMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-bold font-mono"
                  placeholder="Ketik jumlah menit bebas"
                />
              </div>

              {/* Preview */}
              {timeSlots.length > 0 && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-[11px]">
                  <span className="font-bold text-slate-700 block">Contoh Hasil Pergeseran:</span>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>{timeSlots[0].label}:</span>
                    <span className="font-mono">
                      <span className="line-through text-slate-400">{timeSlots[0].period}</span>
                      {' → '}
                      <strong className="text-blue-700">
                        {addMinutesToTime(timeSlots[0].startTime, shiftDirection === 'forward' ? shiftMinutes : -shiftMinutes)} - {addMinutesToTime(timeSlots[0].endTime, shiftDirection === 'forward' ? shiftMinutes : -shiftMinutes)}
                      </strong>
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsShiftModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleShiftAllTimeSlots}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Terapkan Pergeseran
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT AKUN GURU PIKET */}
      {isPiketModalOpen && editingPiketAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-sm">Pengaturan Akun Piket Guru</h3>
              </div>
              <button
                onClick={() => setIsPiketModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePiketForm} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Teacher Info */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Guru Terpilih
                </span>
                <p className="font-bold text-slate-900 text-sm">{editingPiketAccount.teacherName}</p>
                <p className="text-xs text-slate-500 font-mono">NIP: {editingPiketAccount.nip || '-'}</p>
              </div>

              {/* Username Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Username Piket *
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setPiketForm((prev) => ({
                        ...prev,
                        username: cleanTeacherNameForUsername(editingPiketAccount.teacherName)
                      }))
                    }
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Reset dari Nama
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={piketForm.username}
                  onChange={(e) =>
                    setPiketForm({ ...piketForm, username: e.target.value.toLowerCase().replace(/\s+/g, '') })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Contoh: rizafani"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Hanya huruf kecil dan angka, tanpa spasi dan tanpa gelar.
                </span>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password Akun Piket *
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setPiketForm((prev) => ({
                        ...prev,
                        password: generateDefaultPiketPassword(editingPiketAccount.nip, editingPiketAccount.teacherName)
                      }))
                    }
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Generate Default
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={piketForm.password}
                  onChange={(e) => setPiketForm({ ...piketForm, password: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Masukkan password piket"
                />
              </div>

              {/* Assigned Days */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Jadwal Tugas Hari Piket
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {INDONESIAN_DAYS.map((day) => {
                    const isChecked = piketForm.assignedDays.includes(day);
                    return (
                      <label
                        key={day}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-blue-50 border-blue-400 text-blue-900 font-semibold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setPiketForm((prev) => ({
                                ...prev,
                                assignedDays: [...prev.assignedDays, day]
                              }));
                            } else {
                              setPiketForm((prev) => ({
                                ...prev,
                                assignedDays: prev.assignedDays.filter((d) => d !== day)
                              }));
                            }
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                        />
                        <span>{day}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Status Toggle */}
              <div>
                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={piketForm.isActive}
                    onChange={(e) => setPiketForm({ ...piketForm, isActive: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Status Akun Aktif
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Jika dinonaktifkan, guru ini tidak dapat login ke Portal Piket.
                    </span>
                  </div>
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  value={piketForm.notes}
                  onChange={(e) => setPiketForm({ ...piketForm, notes: e.target.value })}
                  placeholder="Contoh: Koordinator piket hari Rabu"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPiketModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SHARE / CETAK AKUN PIKET */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm">Daftar Kredensial Guru Piket</h3>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <p className="text-xs text-slate-600">
                Format teks siap dibagikan ke grup WhatsApp guru atau dicetak untuk arsip petugas piket SMAN 1 JULOK:
              </p>

              <textarea
                readOnly
                rows={12}
                value={formatPiketAccountsForSharing(piketAccounts)}
                className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl select-all focus:outline-none"
              />

              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <span className="text-[11px] text-slate-500">
                  Total {piketAccounts.filter((a) => a.isActive).length} akun aktif
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(formatPiketAccountsForSharing(piketAccounts));
                      alert('Daftar akun guru piket berhasil disalin ke Clipboard!');
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Salin ke Clipboard
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsShareModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Class QR Code Modal for Admin */}
      <ClassQRCodeModal
        isOpen={isClassQRModalOpen}
        onClose={() => setIsClassQRModalOpen(false)}
        classes={classes}
        initialClassId={selectedQRClassId}
      />

      {/* Schedule Excel Import Modal */}
      <ScheduleExcelImportModal
        isOpen={isScheduleExcelModalOpen}
        onClose={() => setIsScheduleExcelModalOpen(false)}
        teachers={teachers}
        classes={classes}
        subjects={subjects}
        timeSlots={timeSlots}
        onImportSchedules={handleImportSchedulesFromExcel}
      />
    </div>
  );
};
