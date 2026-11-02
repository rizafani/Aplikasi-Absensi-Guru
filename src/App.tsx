import React, { useState, useEffect, useRef } from 'react';
import {
  Teacher,
  ClassRoom,
  Subject,
  TimeSlot,
  ScheduleItem,
  AttendanceRecord,
  UserSession,
  SchoolLogos,
  PiketAccount,
  SchoolLocationConfig,
  TeacherFaceProfile,
  SmileCaptureConfig
} from './types';
import { Storage } from './utils/storage';
import { syncPiketAccountsWithTeachers } from './utils/piketAuth';
import { CentralSync } from './services/centralSyncService';
import { Navbar } from './components/Navbar';
import { SelfAttendance } from './components/SelfAttendance';
import { TodayStats } from './components/TodayStats';
import { PiketPanel } from './components/PiketPanel';
import { AdminDashboard } from './components/AdminDashboard';
import { ReportsPage } from './components/ReportsPage';
import { AuthModal } from './components/AuthModal';
import { WorkflowModal } from './components/WorkflowModal';

export default function App() {
  const [teachers, setTeachers] = useState<Teacher[]>(() => Storage.getTeachers());
  const [classes, setClasses] = useState<ClassRoom[]>(() => Storage.getClasses());
  const [subjects, setSubjects] = useState<Subject[]>(() => Storage.getSubjects());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(() => Storage.getTimeSlots());
  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => Storage.getSchedules());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() =>
    Storage.getAttendance()
  );
  const [piketAccounts, setPiketAccounts] = useState<PiketAccount[]>(() =>
    syncPiketAccountsWithTeachers(Storage.getTeachers(), Storage.getPiketAccounts())
  );
  const [session, setSession] = useState<UserSession>(() => {
    const saved = Storage.getSession();
    // STRICT SECURITY: If saved session is ADMIN, verify email is rizafani@gmail.com
    if (saved.role === 'ADMIN' && saved.email?.toLowerCase().trim() !== 'rizafani@gmail.com') {
      return { role: 'GUEST' };
    }
    return saved;
  });
  const [logos, setLogos] = useState<SchoolLogos>(() => Storage.getSchoolLogos());
  const [locationConfig, setLocationConfig] = useState<SchoolLocationConfig>(() =>
    Storage.getLocationConfig()
  );
  const [smileConfig, setSmileConfig] = useState<SmileCaptureConfig>(() =>
    Storage.getSmileCaptureConfig()
  );
  const [faceProfiles, setFaceProfiles] = useState<TeacherFaceProfile[]>(() =>
    Storage.getFaceProfiles()
  );
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);

  // Default active tab is 'self-attendance' (Halaman awal guru presensi mandiri tanpa login)
  const [activeTab, setActiveTab] = useState<string>('self-attendance');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState<boolean>(false);

  // Keep track of latest teachers for listeners without causing effect re-triggers
  const teachersRef = useRef(teachers);
  teachersRef.current = teachers;

  // Keep Piket accounts synchronized whenever teachers list updates
  useEffect(() => {
    setPiketAccounts((prev) => {
      const synced = syncPiketAccountsWithTeachers(teachers, prev);
      const isSame =
        prev.length === synced.length &&
        prev.every(
          (p, i) =>
            p.id === synced[i]?.id &&
            p.username === synced[i]?.username &&
            p.password === synced[i]?.password &&
            p.isActive === synced[i]?.isActive &&
            p.teacherName === synced[i]?.teacherName &&
            p.nip === synced[i]?.nip &&
            JSON.stringify(p.assignedDays) === JSON.stringify(synced[i]?.assignedDays)
        );
      if (isSame) return prev;
      Storage.savePiketAccounts(synced);
      return synced;
    });
  }, [teachers]);

  // CENTRAL MULTI-DEVICE REAL-TIME SYNCHRONIZATION
  useEffect(() => {
    const unsubscribe = CentralSync.initRealTimeSync((db) => {
      if (Array.isArray(db.teachers)) setTeachers(db.teachers);
      if (Array.isArray(db.classes)) setClasses(db.classes);
      if (Array.isArray(db.subjects)) setSubjects(db.subjects);
      if (Array.isArray(db.timeSlots)) setTimeSlots(db.timeSlots);
      if (Array.isArray(db.schedules)) setSchedules(db.schedules);
      if (Array.isArray(db.attendance)) setAttendanceRecords(db.attendance);
      if (Array.isArray(db.piketAccounts)) setPiketAccounts(db.piketAccounts);
      if (db.locationConfig) setLocationConfig(db.locationConfig);
      if (db.logos) setLogos(db.logos);
      if (db.smileCaptureConfig) setSmileConfig(db.smileCaptureConfig);
      if (Array.isArray(db.faceProfiles)) setFaceProfiles(db.faceProfiles);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Full Database Backup & Restore Handlers
  const handleExportBackup = () => {
    const json = Storage.exportFullDatabase();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `backup_database_sman1julok_${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSyncToastMessage('Cadangan seluruh database berhasil diunduh ke komputer!');
    setTimeout(() => setSyncToastMessage(null), 3000);
  };

  const handleRestoreBackup = (jsonString: string) => {
    const ok = Storage.importFullDatabase(jsonString);
    if (ok) {
      try {
        const parsed = JSON.parse(jsonString);
        CentralSync.syncFullDatabase(parsed).catch(() => {});
      } catch {
        // ignore parse error
      }
      setTeachers(Storage.getTeachers());
      setClasses(Storage.getClasses());
      setSubjects(Storage.getSubjects());
      setTimeSlots(Storage.getTimeSlots());
      setSchedules(Storage.getSchedules());
      setAttendanceRecords(Storage.getAttendance());
      setPiketAccounts(Storage.getPiketAccounts());
      setLocationConfig(Storage.getLocationConfig());
      setLogos(Storage.getSchoolLogos());
      setSyncToastMessage('Database berhasil dipulihkan!');
      setTimeout(() => setSyncToastMessage(null), 3000);
    } else {
      alert('Format file backup tidak valid. Pastikan file JSON yang dipilih sesuai.');
    }
  };

  // Clear all master data (clean slate)
  const handleClearAllMasterData = async () => {
    Storage.clearAll();
    await CentralSync.clearAllMasterData().catch(() => {});
    setTeachers([]);
    setClasses([]);
    setSubjects([]);
    setTimeSlots([]);
    setSchedules([]);
    setAttendanceRecords([]);
    setPiketAccounts([]);
    setFaceProfiles([]);
    setSyncToastMessage('Seluruh data master berhasil dikosongkan!');
    setTimeout(() => setSyncToastMessage(null), 3000);
  };

  // Save session changes
  useEffect(() => {
    Storage.saveSession(session);
  }, [session]);

  // Attendance Handlers (Direct central database + local cache)
  const handleRecordAttendance = async (record: AttendanceRecord) => {
    setAttendanceRecords((prev) => {
      const updated = [record, ...prev.filter((r) => r.id !== record.id)];
      Storage.saveAttendance(updated);
      return updated;
    });
    CentralSync.saveAttendance(record).catch(() => {});
  };

  const handleDeleteRecord = async (id: string) => {
    setAttendanceRecords((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      Storage.saveAttendance(updated);
      return updated;
    });
    CentralSync.deleteAttendance(id).catch(() => {});
  };

  // Admin CRUD Handlers (Synchronized centrally across all devices)
  const handleSaveTeacher = async (teacher: Teacher) => {
    setTeachers((prev) => {
      const exists = prev.some((t) => t.id === teacher.id);
      const updated = exists ? prev.map((t) => (t.id === teacher.id ? teacher : t)) : [...prev, teacher];
      Storage.saveTeachers(updated);
      return updated;
    });
    CentralSync.saveTeacher(teacher).catch(() => {});
  };

  const handleDeleteTeacher = async (id: string) => {
    setTeachers((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      Storage.saveTeachers(updated);
      return updated;
    });
    setSchedules((prev) => {
      const updated = prev.filter((s) => s.teacherId !== id);
      Storage.saveSchedules(updated);
      return updated;
    });
    CentralSync.deleteTeacher(id).catch(() => {});
  };

  const handleBulkSaveTeachers = async (newTeachers: Teacher[]) => {
    setTeachers((prev) => {
      const map = new Map(prev.map((t) => [t.id, t]));
      newTeachers.forEach((t) => {
        // Also check if any existing teacher has matching NIP
        const existingByNip = prev.find(
          (x) => x.nip && t.nip && x.nip.replace(/\D/g, '') === t.nip.replace(/\D/g, '')
        );
        if (existingByNip) {
          map.set(existingByNip.id, { ...t, id: existingByNip.id });
        } else {
          map.set(t.id, t);
        }
      });
      const updated = Array.from(map.values());
      Storage.saveTeachers(updated);
      return updated;
    });
    CentralSync.bulkSaveTeachers(newTeachers).catch(() => {});
  };

  const handleReplaceAllTeachers = async (newTeachers: Teacher[]) => {
    setTeachers(newTeachers);
    Storage.saveTeachers(newTeachers);
    CentralSync.syncFullDatabase({ teachers: newTeachers }).catch(() => {});
  };

  const handleSaveClass = async (cls: ClassRoom) => {
    setClasses((prev) => {
      const exists = prev.some((c) => c.id === cls.id);
      const updated = exists ? prev.map((c) => (c.id === cls.id ? cls : c)) : [...prev, cls];
      Storage.saveClasses(updated);
      return updated;
    });
    CentralSync.saveClass(cls).catch(() => {});
  };

  const handleDeleteClass = async (id: string) => {
    setClasses((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      Storage.saveClasses(updated);
      return updated;
    });
    setSchedules((prev) => {
      const updated = prev.filter((s) => s.classRoomId !== id);
      Storage.saveSchedules(updated);
      return updated;
    });
    CentralSync.deleteClass(id).catch(() => {});
  };

  const handleBulkSaveClasses = async (newClasses: ClassRoom[]) => {
    setClasses((prev) => {
      const map = new Map(prev.map((c) => [c.id, c]));
      newClasses.forEach((c) => {
        const existingByName = prev.find((x) => x.name.toLowerCase() === c.name.toLowerCase());
        if (existingByName) {
          map.set(existingByName.id, { ...c, id: existingByName.id });
        } else {
          map.set(c.id, c);
        }
      });
      const updated = Array.from(map.values());
      Storage.saveClasses(updated);
      return updated;
    });
    CentralSync.bulkSaveClasses(newClasses).catch(() => {});
  };

  const handleReplaceAllClasses = async (newClasses: ClassRoom[]) => {
    setClasses(newClasses);
    Storage.saveClasses(newClasses);
    CentralSync.syncFullDatabase({ classes: newClasses }).catch(() => {});
  };

  const handleSaveSubject = async (sub: Subject) => {
    setSubjects((prev) => {
      const exists = prev.some((s) => s.id === sub.id);
      const updated = exists ? prev.map((s) => (s.id === sub.id ? sub : s)) : [...prev, sub];
      Storage.saveSubjects(updated);
      return updated;
    });
    CentralSync.saveSubject(sub).catch(() => {});
  };

  const handleDeleteSubject = async (id: string) => {
    setSubjects((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      Storage.saveSubjects(updated);
      return updated;
    });
    setSchedules((prev) => {
      const updated = prev.filter((s) => s.subjectId !== id);
      Storage.saveSchedules(updated);
      return updated;
    });
    CentralSync.deleteSubject(id).catch(() => {});
  };

  const handleBulkSaveSubjects = async (newSubjects: Subject[]) => {
    setSubjects((prev) => {
      const map = new Map(prev.map((s) => [s.id, s]));
      newSubjects.forEach((s) => {
        const existingByName = prev.find(
          (x) => x.name.toLowerCase() === s.name.toLowerCase() || (x.code && s.code && x.code.toLowerCase() === s.code.toLowerCase())
        );
        if (existingByName) {
          map.set(existingByName.id, { ...s, id: existingByName.id });
        } else {
          map.set(s.id, s);
        }
      });
      const updated = Array.from(map.values());
      Storage.saveSubjects(updated);
      return updated;
    });
    CentralSync.bulkSaveSubjects(newSubjects).catch(() => {});
  };

  const handleReplaceAllSubjects = async (newSubjects: Subject[]) => {
    setSubjects(newSubjects);
    Storage.saveSubjects(newSubjects);
    CentralSync.syncFullDatabase({ subjects: newSubjects }).catch(() => {});
  };

  const handleSaveSchedule = async (schedule: ScheduleItem) => {
    setSchedules((prev) => {
      const exists = prev.some((s) => s.id === schedule.id);
      const updated = exists ? prev.map((s) => (s.id === schedule.id ? schedule : s)) : [...prev, schedule];
      Storage.saveSchedules(updated);
      return updated;
    });
    CentralSync.saveSchedule(schedule).catch(() => {});
  };

  const handleBulkSaveSchedules = async (newSchedules: ScheduleItem[]) => {
    setSchedules((prev) => {
      const updated = [...prev, ...newSchedules];
      Storage.saveSchedules(updated);
      return updated;
    });
    CentralSync.bulkSaveSchedules(newSchedules).catch(() => {});
  };

  const handleReplaceAllSchedules = async (newSchedules: ScheduleItem[]) => {
    setSchedules(newSchedules);
    Storage.saveSchedules(newSchedules);
    CentralSync.replaceAllSchedules(newSchedules).catch(() => {});
  };

  const handleDeleteSchedule = async (id: string) => {
    setSchedules((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      Storage.saveSchedules(updated);
      return updated;
    });
    CentralSync.deleteSchedule(id).catch(() => {});
  };

  const handleSaveTimeSlot = async (slot: TimeSlot) => {
    setTimeSlots((prev) => {
      const exists = prev.some((ts) => ts.id === slot.id);
      const updated = exists ? prev.map((ts) => (ts.id === slot.id ? slot : ts)) : [...prev, slot];
      updated.sort((a, b) => a.startTime.localeCompare(b.startTime));
      Storage.saveTimeSlots(updated);
      return updated;
    });
    CentralSync.saveTimeSlot(slot).catch(() => {});
  };

  const handleDeleteTimeSlot = async (id: string) => {
    setTimeSlots((prev) => {
      const updated = prev.filter((ts) => ts.id !== id);
      Storage.saveTimeSlots(updated);
      return updated;
    });
    CentralSync.deleteTimeSlot(id).catch(() => {});
  };

  const handleBulkSaveTimeSlots = async (newSlots: TimeSlot[]) => {
    const sorted = [...newSlots].sort((a, b) => a.startTime.localeCompare(b.startTime));
    setTimeSlots(sorted);
    Storage.saveTimeSlots(sorted);
    CentralSync.bulkSaveTimeSlots(sorted).catch(() => {});
  };

  const handleReplaceAllTimeSlots = async (newSlots: TimeSlot[]) => {
    const sorted = [...newSlots].sort((a, b) => a.startTime.localeCompare(b.startTime));
    setTimeSlots(sorted);
    Storage.saveTimeSlots(sorted);
    CentralSync.syncFullDatabase({ timeSlots: sorted }).catch(() => {});
  };

  // Piket Account Handlers
  const handleSavePiketAccount = async (account: PiketAccount) => {
    setPiketAccounts((prev) => {
      const exists = prev.some((a) => a.id === account.id);
      const updated = exists ? prev.map((a) => (a.id === account.id ? account : a)) : [...prev, account];
      Storage.savePiketAccounts(updated);
      return updated;
    });
    CentralSync.savePiketAccount(account).catch(() => {});
  };

  const handleBulkSavePiketAccounts = async (accounts: PiketAccount[]) => {
    setPiketAccounts((prev) => {
      const map = new Map(prev.map((p) => [p.id, p]));
      accounts.forEach((acc) => {
        const existingByTeacher = prev.find((x) => x.teacherId === acc.teacherId);
        if (existingByTeacher) {
          map.set(existingByTeacher.id, { ...acc, id: existingByTeacher.id });
        } else {
          map.set(acc.id, acc);
        }
      });
      const updated = Array.from(map.values());
      Storage.savePiketAccounts(updated);
      return updated;
    });
    CentralSync.bulkSavePiketAccounts(accounts).catch(() => {});
  };

  const handleReplaceAllPiketAccounts = async (newPiket: PiketAccount[]) => {
    setPiketAccounts(newPiket);
    Storage.savePiketAccounts(newPiket);
    CentralSync.syncFullDatabase({ piketAccounts: newPiket }).catch(() => {});
  };

  const handleLogin = (newSession: UserSession) => {
    setSession(newSession);
    if (newSession.role === 'ADMIN') {
      setActiveTab('admin');
    } else if (newSession.role === 'PIKET') {
      setActiveTab('piket-panel');
    }
  };

  const handleLogout = () => {
    Storage.clearSession();
    setSession({ role: 'GUEST' });
    if (activeTab === 'admin') {
      setActiveTab('self-attendance');
    }
  };

  const handleSaveLogos = (newLogos: SchoolLogos) => {
    setLogos(newLogos);
    Storage.saveSchoolLogos(newLogos);
    CentralSync.saveLogos(newLogos).catch(() => {});
  };

  const handleSaveLocationConfig = async (newConfig: SchoolLocationConfig) => {
    setLocationConfig(newConfig);
    Storage.saveLocationConfig(newConfig);
    CentralSync.saveLocationConfig(newConfig).catch(() => {});
    setSyncToastMessage('Pengaturan Lokasi GPS & Geofencing Berhasil Disimpan & Tersinkron!');
    setTimeout(() => setSyncToastMessage(null), 3500);
  };

  const handleSaveSmileConfig = (newConfig: SmileCaptureConfig) => {
    setSmileConfig(newConfig);
    Storage.saveSmileCaptureConfig(newConfig);
    CentralSync.saveSmileConfig(newConfig).catch(() => {});
  };

  const handleSaveFaceProfile = (profile: TeacherFaceProfile) => {
    Storage.saveFaceProfile(profile);
    CentralSync.saveFaceProfile(profile).catch(() => {});
    setFaceProfiles(Storage.getFaceProfiles());
  };

  const handleDeleteFaceProfile = (teacherId: string) => {
    Storage.deleteFaceProfile(teacherId);
    CentralSync.deleteFaceProfile(teacherId).catch(() => {});
    setFaceProfiles(Storage.getFaceProfiles());
  };

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        session={session}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        logos={logos}
        onOpenWorkflow={() => setIsWorkflowModalOpen(true)}
      />

      {/* Sync Toast Notification */}
      {syncToastMessage && (
        <div className="bg-emerald-600 text-white text-xs font-semibold px-4 py-2.5 text-center shadow-md animate-in fade-in flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
          <span>{syncToastMessage}</span>
        </div>
      )}

      {/* Main App Content */}
      <main className="flex-1 pb-16">
        {activeTab === 'self-attendance' && (
          <SelfAttendance
            teachers={teachers}
            classes={classes}
            subjects={subjects}
            timeSlots={timeSlots}
            schedules={schedules}
            onRecordAttendance={handleRecordAttendance}
            onGoToStats={() => setActiveTab('today-stats')}
            logos={logos}
            locationConfig={locationConfig}
            smileConfig={smileConfig}
            faceProfiles={faceProfiles}
            onSaveFaceProfile={handleSaveFaceProfile}
          />
        )}

        {activeTab === 'today-stats' && (
          <TodayStats
            teachers={teachers}
            classes={classes}
            subjects={subjects}
            timeSlots={timeSlots}
            schedules={schedules}
            attendanceRecords={attendanceRecords}
            onOpenPiket={() => setActiveTab('piket-panel')}
            logos={logos}
          />
        )}

        {activeTab === 'piket-panel' && (
          <PiketPanel
            session={session}
            teachers={teachers}
            classes={classes}
            subjects={subjects}
            timeSlots={timeSlots}
            schedules={schedules}
            attendanceRecords={attendanceRecords}
            onRecordAttendance={handleRecordAttendance}
            onDeleteRecord={handleDeleteRecord}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsPage
            teachers={teachers}
            attendanceRecords={attendanceRecords}
            logos={logos}
          />
        )}

        {activeTab === 'admin' && (
          <AdminDashboard
            session={session}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            teachers={teachers}
            classes={classes}
            subjects={subjects}
            timeSlots={timeSlots}
            schedules={schedules}
            attendanceRecords={attendanceRecords}
            onSaveTeacher={handleSaveTeacher}
            onDeleteTeacher={handleDeleteTeacher}
            onBulkSaveTeachers={handleBulkSaveTeachers}
            onReplaceAllTeachers={handleReplaceAllTeachers}
            onSaveClass={handleSaveClass}
            onDeleteClass={handleDeleteClass}
            onBulkSaveClasses={handleBulkSaveClasses}
            onReplaceAllClasses={handleReplaceAllClasses}
            onSaveSubject={handleSaveSubject}
            onDeleteSubject={handleDeleteSubject}
            onBulkSaveSubjects={handleBulkSaveSubjects}
            onReplaceAllSubjects={handleReplaceAllSubjects}
            onSaveSchedule={handleSaveSchedule}
            onDeleteSchedule={handleDeleteSchedule}
            onBulkSaveSchedules={handleBulkSaveSchedules}
            onReplaceAllSchedules={handleReplaceAllSchedules}
            onSaveTimeSlot={handleSaveTimeSlot}
            onDeleteTimeSlot={handleDeleteTimeSlot}
            onBulkSaveTimeSlots={handleBulkSaveTimeSlots}
            onReplaceAllTimeSlots={handleReplaceAllTimeSlots}
            piketAccounts={piketAccounts}
            onSavePiketAccount={handleSavePiketAccount}
            onBulkSavePiketAccounts={handleBulkSavePiketAccounts}
            onReplaceAllPiketAccounts={handleReplaceAllPiketAccounts}
            logos={logos}
            onSaveLogos={handleSaveLogos}
            locationConfig={locationConfig}
            onSaveLocationConfig={handleSaveLocationConfig}
            onRecordAttendance={handleRecordAttendance}
            onDeleteAttendanceRecord={handleDeleteRecord}
            onExportBackup={handleExportBackup}
            onRestoreBackup={handleRestoreBackup}
            onClearAllData={handleClearAllMasterData}
            smileConfig={smileConfig}
            onSaveSmileConfig={handleSaveSmileConfig}
            faceProfiles={faceProfiles}
            onSaveFaceProfile={handleSaveFaceProfile}
            onDeleteFaceProfile={handleDeleteFaceProfile}
          />
        )}
      </main>

      {/* Footer with School and Aceh Logos */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <div className="flex items-center justify-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-50 p-1 border border-slate-200 flex items-center justify-center">
              <img src={logos.acehLogo} alt="Logo Pemerintah Aceh" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-slate-800 text-sm">SMA NEGERI 1 JULOK</span>
          </div>
          <p className="font-medium text-slate-600">
            Aplikasi Absensi &amp; Jurnal Mengajar Guru • Sistem Informasi Presensi Digital
          </p>
          <p className="text-slate-400">
            Pemerintah Aceh • Dinas Pendidikan Cabang Wilayah Kabupaten Aceh Timur
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              Sistem Presensi Mandiri Terpadu SMAN 1 Julok
            </span>
            <span>•</span>
            <span>Admin: rizafani@gmail.com</span>
            <span>•</span>
            <button
              onClick={() => setIsWorkflowModalOpen(true)}
              className="text-blue-600 hover:underline font-semibold cursor-pointer"
            >
              Diagram Alur Kerja
            </button>
            <span>•</span>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="text-blue-600 hover:underline font-medium cursor-pointer"
            >
              Login Petugas / Admin
            </button>
          </div>
        </div>
      </footer>

      {/* Auth Modal for Google Admin & Piket */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentSession={session}
        onLogin={handleLogin}
        teachers={teachers}
        piketAccounts={piketAccounts}
      />

      {/* Workflow Diagram & SOP Modal */}
      <WorkflowModal
        isOpen={isWorkflowModalOpen}
        onClose={() => setIsWorkflowModalOpen(false)}
      />
    </div>
  );
}
