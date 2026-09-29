import React, { useState, useEffect } from 'react';
import {
  Teacher,
  ClassRoom,
  Subject,
  TimeSlot,
  ScheduleItem,
  AttendanceRecord,
  UserSession
} from './types';
import { Storage } from './utils/storage';
import { Navbar } from './components/Navbar';
import { SelfAttendance } from './components/SelfAttendance';
import { TodayStats } from './components/TodayStats';
import { PiketPanel } from './components/PiketPanel';
import { AdminDashboard } from './components/AdminDashboard';
import { ReportsPage } from './components/ReportsPage';
import { AuthModal } from './components/AuthModal';

export default function App() {
  const [teachers, setTeachers] = useState<Teacher[]>(() => Storage.getTeachers());
  const [classes, setClasses] = useState<ClassRoom[]>(() => Storage.getClasses());
  const [subjects, setSubjects] = useState<Subject[]>(() => Storage.getSubjects());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(() => Storage.getTimeSlots());
  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => Storage.getSchedules());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() =>
    Storage.getAttendance()
  );
  const [session, setSession] = useState<UserSession>(() => Storage.getSession());

  // Default active tab is 'self-attendance' (Halaman awal tanpa login guru langsung bisa presensi mandiri)
  const [activeTab, setActiveTab] = useState<string>('self-attendance');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Persistence hooks
  useEffect(() => {
    Storage.saveTeachers(teachers);
  }, [teachers]);

  useEffect(() => {
    Storage.saveClasses(classes);
  }, [classes]);

  useEffect(() => {
    Storage.saveSubjects(subjects);
  }, [subjects]);

  useEffect(() => {
    Storage.saveTimeSlots(timeSlots);
  }, [timeSlots]);

  useEffect(() => {
    Storage.saveSchedules(schedules);
  }, [schedules]);

  useEffect(() => {
    Storage.saveAttendance(attendanceRecords);
  }, [attendanceRecords]);

  useEffect(() => {
    Storage.saveSession(session);
  }, [session]);

  // Handlers
  const handleRecordAttendance = (record: AttendanceRecord) => {
    setAttendanceRecords((prev) => [record, ...prev]);
  };

  const handleDeleteRecord = (id: string) => {
    setAttendanceRecords((prev) => prev.filter((r) => r.id !== id));
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

  const handleResetDefaults = () => {
    Storage.resetAllToDefault();
    setTeachers(Storage.getTeachers());
    setClasses(Storage.getClasses());
    setSubjects(Storage.getSubjects());
    setTimeSlots(Storage.getTimeSlots());
    setSchedules(Storage.getSchedules());
    setAttendanceRecords(Storage.getAttendance());
    setSession({ role: 'ADMIN', email: 'rizafani@gmail.com', name: 'Riza Fani, S.Pd., M.Pd.' });
  };

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        session={session}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

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
            onUpdateTeachers={setTeachers}
            onUpdateClasses={setClasses}
            onUpdateSubjects={setSubjects}
            onUpdateTimeSlots={setTimeSlots}
            onUpdateSchedules={setSchedules}
            onResetDefaults={handleResetDefaults}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-semibold text-slate-700">
            Aplikasi Absensi & Jurnal Mengajar Guru • SMA NEGERI 1 JULOK
          </p>
          <p className="text-slate-400">
            Pemerintah Aceh • Dinas Pendidikan Cabang Wilayah Kabupaten Aceh Timur
          </p>
          <div className="pt-2 flex items-center justify-center gap-4 text-[11px] text-slate-400">
            <span>Admin: rizafani@gmail.com</span>
            <span>•</span>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="text-blue-600 hover:underline font-medium"
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
      />
    </div>
  );
}
