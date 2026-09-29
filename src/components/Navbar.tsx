import React, { useState, useEffect } from 'react';
import { UserSession } from '../types';
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
  Clock
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  session: UserSession;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  session,
  onOpenAuth,
  onLogout
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
    { id: 'piket-panel', label: 'Guru Piket', icon: ClipboardList },
    { id: 'reports', label: 'Laporan & PDF', icon: FileSpreadsheet },
    { id: 'admin', label: 'Pengaturan Admin', icon: Settings, restricted: true }
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      {/* Top Banner with School Identity */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-4 py-2 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>PEMERINTAH ACEH • DINAS PENDIDIKAN • CABDIN ACEH TIMUR</span>
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
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
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
          <div className="flex items-center gap-3">
            {session.role === 'ADMIN' ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-blue-900 flex items-center gap-1 justify-end">
                    <Shield className="w-3.5 h-3.5 text-blue-600" />
                    Admin (Google)
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">{session.email}</span>
                </div>
                <button
                  onClick={onLogout}
                  title="Keluar dari mode admin"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              </div>
            ) : session.role === 'PIKET' ? (
              <div className="flex items-center gap-2">
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

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 sm:space-x-2 border-t border-slate-100 py-1.5 overflow-x-auto scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isLocked = item.restricted && session.role !== 'ADMIN';

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (isLocked) {
                    onOpenAuth();
                  } else {
                    setActiveTab(item.id);
                  }
                }}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
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
                {isLocked && (
                  <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 text-slate-600 rounded">
                    Admin
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
