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
  SchoolLocationConfig
} from './types';
import { Storage } from './utils/storage';
import { INITIAL_TIME_SLOTS } from './data/initialData';
import { syncPiketAccountsWithTeachers } from './utils/piketAuth';
import { FirestoreService } from './services/firestoreService';
import { testFirestoreConnection, isQuotaExceededError } from './firebase';
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
  // Database Mode: 'direct' (Lokal Standalone) or 'cloud' (Google Cloud Firestore)
  // Sesuai permintaan pengguna: mode langsung tanpa singkron cloud
  const [databaseMode, setDatabaseMode] = useState<'direct' | 'cloud'>(() => Storage.getDatabaseMode());
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);
  const [isManualSyncing, setIsManualSyncing] = useState<boolean>(false);
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

  // REAL-TIME FIRESTORE DATABASE LISTENER (Only subscribes when databaseMode === 'cloud')
  useEffect(() => {
    if (databaseMode !== 'cloud') {
      setIsCloudSynced(false);
      return;
    }

    testFirestoreConnection();

    const unsubscribe = FirestoreService.subscribeToAll({
      onTeachers: (data) => {
        setTeachers((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
          Storage.saveTeachers(data);
          return data;
        });
      },
      onClasses: (data) => {
        setClasses((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
          Storage.saveClasses(data);
          return data;
        });
      },
      onSubjects: (data) => {
        setSubjects((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
          Storage.saveSubjects(data);
          return data;
        });
      },
      onTimeSlots: (data) => {
        if (data.length > 0) {
          setTimeSlots((prev) => {
            if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
            Storage.saveTimeSlots(data);
            return data;
          });
        }
      },
      onSchedules: (data) => {
        setSchedules((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
          Storage.saveSchedules(data);
          return data;
        });
      },
      onAttendance: (data) => {
        setAttendanceRecords((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
          Storage.saveAttendance(data);
          return data;
        });
      },
      onPiketAccounts: (data) => {
        if (data && data.length > 0) {
          setPiketAccounts((prev) => {
            const synced = syncPiketAccountsWithTeachers(teachersRef.current, data);
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
        }
      },
      onLocationConfig: (config) => {
        if (config) {
          setLocationConfig(config);
          Storage.saveLocationConfig(config);
        }
      },
      onSyncStatus: (status) => {
        setIsCloudSynced(status);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [databaseMode]);

  // Manual trigger to force reload directly from Local Storage or Cloud Firestore
  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      if (databaseMode === 'direct') {
        // Direct Mode: Reload data from local storage database
        setTeachers(Storage.getTeachers());
        setClasses(Storage.getClasses());
        setSubjects(Storage.getSubjects());
        setTimeSlots(Storage.getTimeSlots());
        setSchedules(Storage.getSchedules());
        setAttendanceRecords(Storage.getAttendance());
        setPiketAccounts(Storage.getPiketAccounts());
        setLocationConfig(Storage.getLocationConfig());
        setSyncToastMessage('Database Langsung Diperbarui: Seluruh data lokal termuat dengan sukses!');
      } else {
        const data = await FirestoreService.fetchAllDirect();
        if (data.teachers.length > 0) {
          setTeachers(data.teachers);
          Storage.saveTeachers(data.teachers);
        }
        if (data.classes.length > 0) {
          setClasses(data.classes);
          Storage.saveClasses(data.classes);
        }
        if (data.subjects.length > 0) {
          setSubjects(data.subjects);
          Storage.saveSubjects(data.subjects);
        }
        if (data.timeSlots.length > 0) {
          setTimeSlots(data.timeSlots);
          Storage.saveTimeSlots(data.timeSlots);
        }
        if (data.schedules.length > 0) {
          setSchedules(data.schedules);
          Storage.saveSchedules(data.schedules);
        }
        setAttendanceRecords(data.attendance);
        Storage.saveAttendance(data.attendance);

        if (data.piketAccounts && data.piketAccounts.length > 0) {
          const synced = syncPiketAccountsWithTeachers(
            data.teachers.length > 0 ? data.teachers : teachers,
            data.piketAccounts
          );
          setPiketAccounts(synced);
          Storage.savePiketAccounts(synced);
        }

        setIsCloudSynced(true);
        setSyncToastMessage('Sinkronisasi Sukses: Seluruh data terbaru berhasil dimuat dari Google Cloud Firestore!');
      }
    } catch (err) {
      if (isQuotaExceededError(err)) {
        console.warn('Manual sync: Kuota harian Cloud Firestore sedang penuh. Data aplikasi aktif menggunakan penyimpanan lokal.');
        setSyncToastMessage('Mode Offline: Kuota harian Cloud Firestore sedang penuh. Data tetap aktif tersinkron di penyimpanan lokal.');
      } else {
        console.error('Manual sync failed:', err);
        setSyncToastMessage('Gagal sinkronisasi data dari Cloud. Periksa koneksi internet.');
      }
    } finally {
      setIsManualSyncing(false);
      setTimeout(() => setSyncToastMessage(null), 4000);
    }
  };

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
    setTimeout(() => setSyncToastMessage(null), 4000);
  };

  const handleRestoreBackup = (jsonString: string) => {
    const ok = Storage.importFullDatabase(jsonString);
    if (ok) {
      setTeachers(Storage.getTeachers());
      setClasses(Storage.getClasses());
      setSubjects(Storage.getSubjects());
      setTimeSlots(Storage.getTimeSlots());
      setSchedules(Storage.getSchedules());
      setAttendanceRecords(Storage.getAttendance());
      setPiketAccounts(Storage.getPiketAccounts());
      setLocationConfig(Storage.getLocationConfig());
      setLogos(Storage.getSchoolLogos());
      setSyncToastMessage('Database berhasil dipulihkan dari file cadangan!');
      setTimeout(() => setSyncToastMessage(null), 4000);
    } else {
      alert('Format file backup tidak valid. Pastikan file JSON yang dipilih sesuai.');
    }
  };

  const handleToggleDatabaseMode = () => {
    const nextMode = databaseMode === 'direct' ? 'cloud' : 'direct';
    setDatabaseMode(nextMode);
    Storage.saveDatabaseMode(nextMode);
    setSyncToastMessage(
      nextMode === 'direct'
        ? 'Mode Database Langsung Aktif: Berjalan cepat tanpa singkron cloud.'
        : 'Mode Cloud Aktif: Menghubungkan ke Google Cloud Firestore.'
    );
    setTimeout(() => setSyncToastMessage(null), 4000);
  };

  // Save session changes
  useEffect(() => {
    Storage.saveSession(session);
  }, [session]);

  // Attendance Handlers (Direct local database + optional cloud sync)
  const handleRecordAttendance = async (record: AttendanceRecord) => {
    setAttendanceRecords((prev) => {
      const updated = [record, ...prev.filter((r) => r.id !== record.id)];
      Storage.saveAttendance(updated);
      return updated;
    });
    if (databaseMode === 'cloud') {
      await FirestoreService.saveAttendanceRecord(record);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    setAttendanceRecords((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      Storage.saveAttendance(updated);
      return updated;
    });
    if (databaseMode === 'cloud') {
      await FirestoreService.deleteAttendanceRecord(id);
    }
  };

  // Admin CRUD Handlers (Direct local database + optional cloud sync)
  const handleSaveTeacher = async (teacher: Teacher) => {
    setTeachers((prev) => {
      const exists = prev.some((t) => t.id === teacher.id);
      const updated = exists ? prev.map((t) => (t.id === teacher.id ? teacher : t)) : [...prev, teacher];
      Storage.saveTeachers(updated);
      return updated;
    });
    if (databaseMode === 'cloud') {
      await FirestoreService.saveTeacher(teacher);
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    setTeachers((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      Storage.saveTeachers(updated);
      return updated;
    });
    const toDeleteSchedules = schedules.filter((s) => s.teacherId === id);
    setSchedules((prev) => {
      const updated = prev.filter((s) => s.teacherId !== id);
      Storage.saveSchedules(updated);
      return updated;
    });
    if (databaseMode === 'cloud') {
      await FirestoreService.deleteTeacher(id);
      for (const sch of toDeleteSchedules) {
        await FirestoreService.deleteSchedule(sch.id);
      }
    }
  };

  const handleBulkSaveTeachers = async (newTeachers: Teacher[]) => {
    setTeachers((prev) => {
      const updated = [...prev, ...newTeachers];
      Storage.saveTeachers(updated);
      return updated;
    });
    if (databaseMode === 'cloud') {
      await FirestoreService.bulkSaveTeachers(newTeachers);
    }
  };

  const handleSaveClass = async (cls: ClassRoom) => {
    setClasses((prev) => {
      const exists = prev.some((c) => c.id === cls.id);
      const updated = exists ? prev.map((c) => (c.id === cls.id ? cls : c)) : [...prev, cls];
      Storage.saveClasses(updated);
      return updated;
    });
    if (databaseMode === 'cloud') {
      await FirestoreService.saveClass(cls);
    }
  };

  const handleDeleteClass = async (id: string) => {
    setClasses((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      Storage.saveClasses(updated);
      return updated;
    });
    const toDeleteSchedules = schedules.filter((s) => s.classRoomId === id);
    setSchedules((prev) => {
      const updated = prev.filter((s) => s.classRoomId !== id);
      Storage.saveSchedules(updated);
      return updated;
    });
    if (databaseMode === 'cloud') {
      await FirestoreService.deleteClass(id);
      for (const sch of toDeleteSchedules) {
        await FirestoreService.deleteSchedule(sch.id);
      }
    }
  };

  const handleBulkSaveClasses = async (newClasses: ClassRoom[]) => {
    setClasses((prev) => {
      const updated = [...prev, ...newClasses];
      Storage.saveClasses(updated);
      return updated;
    });
    if (databaseMode === 'cloud') {
      await FirestoreService.bulkSaveClasses(newClasses);
    }
  };

  const handleSaveSubject = async (sub: Subject) => {
    setSubjects((prev) => {
      const exists = prev.some((s) => s.id === sub.id);
      const updated = exists ? prev.map((s) => (s.id === sub.id ? sub : s)) : [...prev, sub];
      Storage.saveSubjects(updated);
      return updated;
    });
    if (databaseMode === 'cloud') {
      await FirestoreService.saveSubject(sub);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    setSubjects((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      Storage.saveSubjects(updated);
      return updated;
    });
    const toDeleteSchedules = schedules.filter((s) => s.subjectId === id);
    setSchedules((prev) => {
      const updated = prev.filter((s) => s.subjectId !== id);
      Storage.saveSchedules(updated);
      return updated;
    });
    if (databaseMode === 'cloud') {
      await FirestoreService.deleteSubject(id);
      for (const sch of toDeleteSchedules) {
        await FirestoreService.deleteSchedule(sch.id);
      }
    }
  };

  const handleBulkSaveSubjects = async (newSubjects: Subject[]) => {
    setSubjects((prev) => {
      const updated = [...prev, ...newSubjects];
      Storage.saveSubjects(updated);
      return updated;
    });
    if (databaseMode === 'cloud') {
      await FirestoreService.bulkSaveSubjects(newSubjects);
    }
  };

  const handleSaveSchedule = async (schedule: ScheduleItem) => {
    setSchedules((prev) => {
      const exists = prev.some((s) => s.id === schedule.id);
      const updated = exists ? prev.map((s) => (s.id === schedule.id ? schedule : s)) : [...prev, schedule];
      Storage.saveSchedules(updated);
      return updated;
    });
    if (databaseMode === 'cloud') {
      await FirestoreService.saveSchedule(schedule);
    }
  };

  const handleBulkSaveSchedules = async (newSchedules: ScheduleItem[]) => {
    setSchedules((prev) => {
      const updated = [...prev, ...newSchedules];
      Storage.saveSchedules(updated);
      return updated;
    });
    if (databaseMode === 'cloud') {
      await FirestoreService.bulkSaveSchedules(newSchedules);
    }
  };

  const handleReplaceAllSchedules = async (newSchedules: ScheduleItem[]) => {
    setSchedules(newSchedules);
    Storage.saveSchedules(newSchedules);
    if (databaseMode === 'cloud') {
      await FirestoreService.replaceAllSchedules(newSchedules);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    setSchedules((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      Storage.saveSchedules(updated);
      return updated;
    });
    if (databaseMode === 'cloud') {
      await FirestoreService.deleteSchedule(id);
    }
  };

  const handleSaveTimeSlot = async (slot: TimeSlot) => {
    setTimeSlots((prev) => {
      const exists = prev.some((ts) => ts.id === slot.id);
      const updated = exists ? prev.map((ts) => (ts.id === slot.id ? slot : ts)) : [...prev, slot];
      updated.sort((a, b) => a.startTime.localeCompare(b.startTime));
      Storage.saveTimeSlots(updated);
      return updated;
    });
    if (databaseMode === 'cloud') {
      await FirestoreService.saveTimeSlot(slot);
    }
  };

  const handleDeleteTimeSlot = async (id: string) => {
    setTimeSlots((prev) => {
      const updated = prev.filter((ts) => ts.id !== id);
      Storage.saveTimeSlots(updated);
      return updated;
    });
    if (databaseMode === 'cloud') {
      await FirestoreService.deleteTimeSlot(id);
    }
  };

  const handleBulkSaveTimeSlots = async (newSlots: TimeSlot[]) => {
    setTimeSlots(newSlots);
    Storage.saveTimeSlots(newSlots);
    if (databaseMode === 'cloud') {
      await FirestoreService.bulkSaveTimeSlots(newSlots);
    }
  };

  // Piket Account Handlers
  const handleSavePiketAccount = async (account: PiketAccount) => {
    setPiketAccounts((prev) => {
      const exists = prev.some((a) => a.id === account.id);
      const updated = exists ? prev.map((a) => (a.id === account.id ? account : a)) : [...prev, account];
      Storage.savePiketAccounts(updated);
      return updated;
    });
    if (databaseMode === 'cloud') {
      await FirestoreService.savePiketAccount(account);
    }
  };

  const handleBulkSavePiketAccounts = async (accounts: PiketAccount[]) => {
    setPiketAccounts(accounts);
    Storage.savePiketAccounts(accounts);
    if (databaseMode === 'cloud') {
      await FirestoreService.bulkSavePiketAccounts(accounts);
    }
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
  };

  const handleSaveLocationConfig = async (newConfig: SchoolLocationConfig) => {
    setLocationConfig(newConfig);
    Storage.saveLocationConfig(newConfig);
    if (databaseMode === 'cloud') {
      await FirestoreService.saveLocationConfig(newConfig);
    }
    setSyncToastMessage('Pengaturan Lokasi GPS & Geofencing Berhasil Disimpan!');
    setTimeout(() => setSyncToastMessage(null), 3500);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Navigation with Cloud Sync Status & Official Logos */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        session={session}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        databaseMode={databaseMode}
        onToggleDatabaseMode={handleToggleDatabaseMode}
        onExportBackup={handleExportBackup}
        isCloudSynced={isCloudSynced}
        onManualSync={handleManualSync}
        isManualSyncing={isManualSyncing}
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
            onSaveClass={handleSaveClass}
            onDeleteClass={handleDeleteClass}
            onBulkSaveClasses={handleBulkSaveClasses}
            onSaveSubject={handleSaveSubject}
            onDeleteSubject={handleDeleteSubject}
            onBulkSaveSubjects={handleBulkSaveSubjects}
            onSaveSchedule={handleSaveSchedule}
            onDeleteSchedule={handleDeleteSchedule}
            onBulkSaveSchedules={handleBulkSaveSchedules}
            onReplaceAllSchedules={handleReplaceAllSchedules}
            onSaveTimeSlot={handleSaveTimeSlot}
            onDeleteTimeSlot={handleDeleteTimeSlot}
            onBulkSaveTimeSlots={handleBulkSaveTimeSlots}
            piketAccounts={piketAccounts}
            onSavePiketAccount={handleSavePiketAccount}
            onBulkSavePiketAccounts={handleBulkSavePiketAccounts}
            logos={logos}
            onSaveLogos={handleSaveLogos}
            locationConfig={locationConfig}
            onSaveLocationConfig={handleSaveLocationConfig}
            onRecordAttendance={handleRecordAttendance}
            onDeleteAttendanceRecord={handleDeleteRecord}
            databaseMode={databaseMode}
            onToggleDatabaseMode={handleToggleDatabaseMode}
            onExportBackup={handleExportBackup}
            onRestoreBackup={handleRestoreBackup}
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
              <span className={`inline-block w-2 h-2 rounded-full ${databaseMode === 'direct' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
              {databaseMode === 'direct'
                ? 'Database: Langsung (Penyimpanan Lokal Standalone • Tanpa Kuota Cloud)'
                : 'Cloud Database: Firebase Firestore'}
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
