import React, { useState, useEffect } from 'react';
import { UserSession, SchoolLogos } from '../types';
import {
  GraduationCap,
  CalendarCheck,
  BarChart3,
  ClipboardList,
  FileSpreadsheet,
  Settings,
  LogIn,
  LogOut,
  Shield,
  Clock,
  CloudCheck,
  RefreshCw,
  Workflow,
  Download,
  Database
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  session: UserSession;
  onOpenAuth: () => void;
  onLogout: () => void;
  databaseMode?: 'direct' | 'cloud';
  onToggleDatabaseMode?: () => void;
  onExportBackup?: () => void;
  isCloudSynced?: boolean;
  onManualSync?: () => void;
  isManualSyncing?: boolean;
  logos?: SchoolLogos;
  onOpenWorkflow?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  session,
  onOpenAuth,
  onLogout,
  databaseMode = 'direct',
  onToggleDatabaseMode,
  onExportBackup,
  isCloudSynced = false,
  onManualSync,
  isManualSyncing = false,
  logos,
  onOpenWorkflow
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentTime.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const formattedTime = currentTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const navItems = [
    { id: 'self-attendance', label: 'Absensi Mandiri', icon: CalendarCheck, badge: 'Utama' },
    { id: 'today-stats', label: 'Statistik Harian', icon: BarChart3 },
    ...(session.role === 'ADMIN'
      ? [
          { id: 'admin', label: 'Menu Admin', icon: Settings },
          { id: 'reports', label: 'Laporan & PDF', icon: FileSpreadsheet }
        ]
      : [])
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      {/* Top Banner with School Identity */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-4 py-2 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-medium">
            <img
              src={logos?.acehLogo || '/logo-aceh.svg'}
              alt="Logo Pemerintah Aceh"
              className="w-4 h-4 object-contain inline-block shrink-0"
            />
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>PEMERINTAH ACEH • DINAS PENDIDIKAN • CABDIN ACEH TIMUR</span>
            {databaseMode === 'direct' ? (
              <div className="flex items-center gap-1.5 ml-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/25 text-emerald-300 border border-emerald-400/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <Database className="w-3 h-3 text-emerald-400 inline" />
                  <span>Database Langsung (Lokal Aktif)</span>
                </span>
                {onExportBackup && (
                  <button
                    onClick={onExportBackup}
                    title="Cadangkan seluruh data ke file JSON di komputer"
                    className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 bg-white/10 hover:bg-white/20 active:scale-95 text-blue-200 hover:text-white rounded text-[10px] font-medium border border-white/20 transition-all cursor-pointer"
                  >
                    <Download className="w-3 h-3 text-blue-300" />
                    <span>Backup DB</span>
                  </button>
                )}
                {onManualSync && (
                  <button
                    onClick={onManualSync}
                    disabled={isManualSyncing}
                    title="Segarkan / Muat ulang data database lokal"
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 active:scale-95 text-emerald-200 hover:text-white rounded text-[10px] font-medium border border-emerald-500/40 transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isManualSyncing ? 'animate-spin text-amber-300' : 'text-emerald-400'}`} />
                    <span>Segarkan</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 ml-2">
                <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                  isCloudSynced
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-200 border-amber-500/30'
                }`}>
                  <CloudCheck className={`w-3 h-3 ${isCloudSynced ? 'text-emerald-400' : 'text-amber-400'}`} />
                  {isCloudSynced ? 'Cloud Aktif' : 'Mode Offline / Sinkron Lokal'}
                </span>
                {onManualSync && (
                  <button
                    onClick={onManualSync}
                    disabled={isManualSyncing}
                    title="Perbarui & sinkronkan ulang data dari Google Cloud Firestore"
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 active:scale-95 text-emerald-200 hover:text-white rounded text-[11px] font-medium border border-emerald-500/40 transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isManualSyncing ? 'animate-spin text-amber-300' : 'text-emerald-400'}`} />
                    <span>{isManualSyncing ? 'Menyinkronkan...' : 'Sinkron Cloud'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 text-blue-200 font-mono text-[11px]">
            <span className="hidden sm:inline">{formattedDate}</span>
            <span className="flex items-center gap-1 text-white bg-white/10 px-2 py-0.5 rounded">
              <Clock className="w-3 h-3 text-amber-300" />
              {formattedTime} WIB
            </span>
          </div>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo & School Name */}
          <div 
            onClick={() => setActiveTab('self-attendance')}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group"
          >
            {/* Logo Resmi (Pemerintah Aceh) */}
            <div
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white p-1 border border-slate-200/90 shadow-xs flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
              title="Logo Pemerintah Aceh (Pancacita)"
            >
              <img
                src={logos?.acehLogo || '/logo-aceh.svg'}
                alt="Logo Pemerintah Aceh"
                className="w-full h-full object-contain"
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 group-hover:text-blue-700 transition-colors">
                  SMA NEGERI 1 JULOK
                </h1>
                <span className="hidden md:inline-block px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded-full">
                  Presensi Mandiri
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Sistem Absensi Guru & Jurnal Mengajar di Kelas
              </p>
            </div>
          </div>

          {/* Right Action / Auth Status */}
          <div className="flex items-center gap-2 sm:gap-3">
            {onOpenWorkflow && (
              <button
                onClick={onOpenWorkflow}
                title="Lihat Gambar & Diagram Alur Kerja Sistem"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all border border-slate-200 shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
              >
                <Workflow className="w-4 h-4 text-blue-600" />
                <span className="hidden sm:inline">Alur Kerja</span>
              </button>
            )}

            {session.role === 'ADMIN' ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setActiveTab('admin')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === 'admin'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-200/80'
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Admin</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('reports')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === 'reports'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-200/80'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Laporan</span>
                  </button>
                </div>

                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-[11px] font-bold text-blue-900 flex items-center gap-1 justify-end">
                    <Shield className="w-3 h-3 text-blue-600" />
                    Admin
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 max-w-[120px] truncate">{session.email}</span>
                </div>
                <button
                  onClick={onLogout}
                  title="Keluar dari mode admin"
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              </div>
            ) : session.role === 'PIKET' ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('piket-panel')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'piket-panel'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span>Panel Piket</span>
                </button>
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1 justify-end">
                    <ClipboardList className="w-3.5 h-3.5 text-amber-600" />
                    Guru Piket
                  </span>
                  <span className="text-[11px] text-slate-600 truncate max-w-[140px]">{session.piketName}</span>
                </div>
                <button
                  onClick={onLogout}
                  title="Selesai tugas piket"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Ganti</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenAuth}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all border border-blue-200 shadow-2xs hover:shadow-xs"
                >
                  <LogIn className="w-4 h-4 text-blue-600" />
                  <span>Login Petugas / Admin</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs - Menu Utama hanya Absensi Mandiri & Statistik Harian */}
        <nav className="flex space-x-1 sm:space-x-2 border-t border-slate-100 py-1.5 overflow-x-auto scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                    isActive ? 'bg-blue-500 text-white' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
