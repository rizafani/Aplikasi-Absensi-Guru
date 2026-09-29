import React, { useState } from 'react';
import {
  Teacher,
  ClassRoom,
  Subject,
  TimeSlot,
  ScheduleItem,
  UserSession,
  DayOfWeek
} from '../types';
import { INDONESIAN_DAYS } from '../data/initialData';
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
  LogIn
} from 'lucide-react';

interface AdminDashboardProps {
  session: UserSession;
  onOpenAuth: () => void;
  teachers: Teacher[];
  classes: ClassRoom[];
  subjects: Subject[];
  timeSlots: TimeSlot[];
  schedules: ScheduleItem[];
  onUpdateTeachers: (data: Teacher[]) => void;
  onUpdateClasses: (data: ClassRoom[]) => void;
  onUpdateSubjects: (data: Subject[]) => void;
  onUpdateTimeSlots: (data: TimeSlot[]) => void;
  onUpdateSchedules: (data: ScheduleItem[]) => void;
  onResetDefaults: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  session,
  onOpenAuth,
  teachers,
  classes,
  subjects,
  timeSlots,
  schedules,
  onUpdateTeachers,
  onUpdateClasses,
  onUpdateSubjects,
  onUpdateTimeSlots,
  onUpdateSchedules,
  onResetDefaults
}) => {
  const [adminTab, setAdminTab] = useState<'teachers' | 'classes' | 'subjects' | 'schedules' | 'timeslots' | 'import'>('schedules');
  const [searchQuery, setSearchQuery] = useState<string>('');

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
  const [scheduleForm, setScheduleForm] = useState<Partial<ScheduleItem>>({
    teacherId: teachers[0]?.id || '',
    day: 'Senin',
    classRoomId: classes[0]?.id || '',
    subjectId: subjects[0]?.id || '',
    timeSlotId: timeSlots[0]?.id || '',
    notes: ''
  });

  // Filter for schedule tab
  const [scheduleFilterDay, setScheduleFilterDay] = useState<string>('all');
  const [scheduleFilterTeacher, setScheduleFilterTeacher] = useState<string>('all');

  // Bulk Import state
  const [importType, setImportType] = useState<'teachers' | 'classes' | 'subjects'>('teachers');
  const [importText, setImportText] = useState<string>('');
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

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
            Halaman pengaturan guru, kelas, mapel, dan jadwal mengajar ini hanya dapat diakses melalui login Google dengan akun resmi:
          </p>
          <div className="my-4 inline-block px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl font-mono font-bold text-blue-900 text-sm">
            rizafani@gmail.com
          </div>
          <div className="pt-2">
            <button
              onClick={onOpenAuth}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all inline-flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Masuk dengan Google (rizafani@gmail.com)
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

    if (editingTeacher) {
      const updated = teachers.map((t) =>
        t.id === editingTeacher.id ? ({ ...t, ...teacherForm } as Teacher) : t
      );
      onUpdateTeachers(updated);
    } else {
      const newTeacher: Teacher = {
        id: `t-${Date.now()}`,
        name: teacherForm.name!,
        nip: teacherForm.nip!,
        gender: teacherForm.gender || 'L',
        email: teacherForm.email,
        phone: teacherForm.phone,
        status: teacherForm.status || 'Aktif'
      };
      onUpdateTeachers([...teachers, newTeacher]);
    }
    setIsTeacherModalOpen(false);
  };

  const handleDeleteTeacher = (id: string, name: string) => {
    if (confirm(`Yakin ingin menghapus guru "${name}"? Jadwal terkait juga akan disesuaikan.`)) {
      onUpdateTeachers(teachers.filter((t) => t.id !== id));
      onUpdateSchedules(schedules.filter((s) => s.teacherId !== id));
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

    if (editingClass) {
      onUpdateClasses(
        classes.map((c) => (c.id === editingClass.id ? ({ ...c, ...classForm } as ClassRoom) : c))
      );
    } else {
      const newClass: ClassRoom = {
        id: `c-${Date.now()}`,
        name: classForm.name!,
        grade: classForm.grade || 'X',
        major: classForm.major || 'Umum'
      };
      onUpdateClasses([...classes, newClass]);
    }
    setIsClassModalOpen(false);
  };

  const handleDeleteClass = (id: string, name: string) => {
    if (confirm(`Hapus kelas "${name}"?`)) {
      onUpdateClasses(classes.filter((c) => c.id !== id));
      onUpdateSchedules(schedules.filter((s) => s.classRoomId !== id));
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

    if (editingSubject) {
      onUpdateSubjects(
        subjects.map((s) => (s.id === editingSubject.id ? ({ ...s, ...subjectForm } as Subject) : s))
      );
    } else {
      const newSubj: Subject = {
        id: `s-${Date.now()}`,
        code: subjectForm.code || subjectForm.name!.substr(0, 3).toUpperCase(),
        name: subjectForm.name!,
        category: subjectForm.category || 'Wajib'
      };
      onUpdateSubjects([...subjects, newSubj]);
    }
    setIsSubjectModalOpen(false);
  };

  const handleDeleteSubject = (id: string, name: string) => {
    if (confirm(`Hapus mata pelajaran "${name}"?`)) {
      onUpdateSubjects(subjects.filter((s) => s.id !== id));
      onUpdateSchedules(schedules.filter((s) => s.subjectId !== id));
    }
  };

  // --- CRUD: SCHEDULES ---
  const handleOpenScheduleModal = (sch?: ScheduleItem) => {
    if (sch) {
      setEditingSchedule(sch);
      setScheduleForm(sch);
    } else {
      setEditingSchedule(null);
      setScheduleForm({
        teacherId: teachers[0]?.id || '',
        day: 'Senin',
        classRoomId: classes[0]?.id || '',
        subjectId: subjects[0]?.id || '',
        timeSlotId: timeSlots[0]?.id || '',
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
      !scheduleForm.subjectId ||
      !scheduleForm.timeSlotId
    ) {
      alert('Lengkapi seluruh data jadwal.');
      return;
    }

    if (editingSchedule) {
      onUpdateSchedules(
        schedules.map((s) =>
          s.id === editingSchedule.id ? ({ ...s, ...scheduleForm } as ScheduleItem) : s
        )
      );
    } else {
      const newSchedule: ScheduleItem = {
        id: `sch-${Date.now()}`,
        teacherId: scheduleForm.teacherId!,
        day: scheduleForm.day as DayOfWeek,
        classRoomId: scheduleForm.classRoomId!,
        subjectId: scheduleForm.subjectId!,
        timeSlotId: scheduleForm.timeSlotId!,
        notes: scheduleForm.notes
      };
      onUpdateSchedules([...schedules, newSchedule]);
    }
    setIsScheduleModalOpen(false);
  };

  const handleDeleteSchedule = (id: string) => {
    if (confirm('Hapus jadwal mengajar ini?')) {
      onUpdateSchedules(schedules.filter((s) => s.id !== id));
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
          onUpdateTeachers([...teachers, ...newTeachers]);
          setImportSuccessMsg(`Berhasil mengimpor ${newTeachers.length} data guru baru.`);
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
          onUpdateClasses([...classes, ...newClasses]);
          setImportSuccessMsg(`Berhasil mengimpor ${newClasses.length} data kelas.`);
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
          onUpdateSubjects([...subjects, ...newSubjects]);
          setImportSuccessMsg(`Berhasil mengimpor ${newSubjects.length} data mata pelajaran.`);
          setImportText('');
        }
      }
    } catch {
      alert('Format import tidak valid. Pastikan data dipisahkan dengan koma atau tab.');
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
            Kelola data guru, kelas, mata pelajaran, dan master jadwal mengajar per hari/jam pelajaran.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (confirm('Kembalikan seluruh data ke contoh bawaan SMAN 1 Julok?')) {
                onResetDefaults();
              }
            }}
            className="px-3.5 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            Reset ke Data Default
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap gap-1">
        {[
          { id: 'schedules', label: 'Jadwal Mengajar', icon: Calendar, count: schedules.length },
          { id: 'teachers', label: 'Data Guru', icon: Users, count: teachers.length },
          { id: 'classes', label: 'Data Kelas', icon: School, count: classes.length },
          { id: 'subjects', label: 'Mata Pelajaran', icon: BookOpen, count: subjects.length },
          { id: 'timeslots', label: 'Jam Pelajaran', icon: Clock, count: timeSlots.length },
          { id: 'import', label: 'Import Guru & Data', icon: Upload, count: null }
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
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
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

            <button
              onClick={() => handleOpenScheduleModal()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              Tambah Jadwal Baru
            </button>
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
                {schedules
                  .filter((s) => scheduleFilterDay === 'all' || s.day === scheduleFilterDay)
                  .filter((s) => scheduleFilterTeacher === 'all' || s.teacherId === scheduleFilterTeacher)
                  .map((s) => {
                    const teacher = teachers.find((t) => t.id === s.teacherId);
                    const cls = classes.find((c) => c.id === s.classRoomId);
                    const sub = subjects.find((sb) => sb.id === s.subjectId);
                    const slot = timeSlots.find((sl) => sl.id === s.timeSlotId);

                    return (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-blue-700">{s.day}</td>
                        <td className="p-3 font-semibold text-slate-900">{teacher?.name || '-'}</td>
                        <td className="p-3 font-bold text-slate-700">{cls?.name || '-'}</td>
                        <td className="p-3 text-slate-800">{sub?.name || '-'}</td>
                        <td className="p-3 text-slate-600 font-mono">
                          {slot ? `${slot.label} (${slot.period})` : '-'}
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
            <button
              onClick={() => handleOpenClassModal()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Tambah Kelas
            </button>
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
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Pengaturan Jam Pelajaran</h3>
              <p className="text-xs text-slate-500">Rentang jam pelajaran KBM sekolah</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {timeSlots.map((ts) => (
              <div key={ts.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <span className="font-bold text-blue-700 text-sm block">{ts.label}</span>
                <span className="text-slate-800 font-mono text-xs mt-1 block font-bold">
                  {ts.period} WIB
                </span>
                <span className="text-[11px] text-slate-500">
                  {ts.startTime} s/d {ts.endTime}
                </span>
              </div>
            ))}
          </div>
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

          <div className="flex gap-2">
            {[
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
                className={`px-3 py-2 text-xs font-bold rounded-xl transition-all ${
                  importType === it.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {it.label}
              </button>
            ))}
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
            <strong>Format Baris (Pisahkan dengan koma atau Tab/Excel):</strong>
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

      {/* MODAL: GURU */}
      {isTeacherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="font-bold text-sm text-slate-900">
                {editingSchedule ? 'Edit Jadwal Mengajar' : 'Tambah Jadwal Mengajar'}
              </h4>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveSchedule} className="space-y-3">
              <div>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mata Pelajaran *
                  </label>
                  <select
                    value={scheduleForm.subjectId || ''}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, subjectId: e.target.value })}
                    className="w-full px-3 py-2 text-xs border rounded-lg"
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jam Pelajaran *
                  </label>
                  <select
                    value={scheduleForm.timeSlotId || ''}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, timeSlotId: e.target.value })}
                    className="w-full px-3 py-2 text-xs border rounded-lg font-mono"
                  >
                    {timeSlots.map((ts) => (
                      <option key={ts.id} value={ts.id}>
                        {ts.label} ({ts.period})
                      </option>
                    ))}
                  </select>
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

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg"
                >
                  Simpan Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
