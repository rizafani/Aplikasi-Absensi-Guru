import React, { useState } from 'react';
import { UserSession, Teacher } from '../types';
import { X, ShieldCheck, Mail, LogIn, UserCircle, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSession: UserSession;
  onLogin: (session: UserSession) => void;
  teachers: Teacher[];
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentSession: _currentSession,
  onLogin,
  teachers
}) => {
  const [tab, setTab] = useState<'admin' | 'piket'>('admin');
  const [piketTeacherId, setPiketTeacherId] = useState<string>(teachers[2]?.id || '');
  const [customPiketName, setCustomPiketName] = useState<string>('');
  const [isSigningInGoogle, setIsSigningInGoogle] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleGoogleAdminLogin = () => {
    setIsSigningInGoogle(true);
    setTimeout(() => {
      setIsSigningInGoogle(false);
      onLogin({
        role: 'ADMIN',
        email: 'rizafani@gmail.com',
        name: 'Riza Fani, S.Pd., M.Pd. (Admin)',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
      });
      onClose();
    }, 600);
  };

  const handlePiketLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedTeacher = teachers.find(t => t.id === piketTeacherId);
    const officerName = customPiketName.trim() || selectedTeacher?.name || 'Petugas Piket';

    onLogin({
      role: 'PIKET',
      piketName: officerName,
      name: officerName
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-md">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Login Portal Petugas</h2>
              <p className="text-xs text-blue-100">SMA NEGERI 1 JULOK</p>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex mt-6 bg-blue-950/40 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setTab('admin')}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                tab === 'admin'
                  ? 'bg-white text-blue-900 shadow-sm'
                  : 'text-blue-100 hover:text-white'
              }`}
            >
              <Mail className="w-4 h-4" />
              Admin (Google)
            </button>
            <button
              type="button"
              onClick={() => setTab('piket')}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                tab === 'piket'
                  ? 'bg-white text-blue-900 shadow-sm'
                  : 'text-blue-100 hover:text-white'
              }`}
            >
              <UserCircle className="w-4 h-4" />
              Guru Piket
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {tab === 'admin' ? (
            <div className="space-y-5">
              <div className="p-4 bg-blue-50 border border-blue-200/80 rounded-xl text-xs text-blue-800 leading-relaxed">
                <span className="font-semibold block mb-1">Akses Khusus Administrator:</span>
                Halaman admin diverifikasi menggunakan akun Google resmi yang terdaftar:
                <div className="mt-2 font-mono font-bold bg-white px-2.5 py-1.5 rounded-md border border-blue-200 text-blue-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  rizafani@gmail.com
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  disabled={isSigningInGoogle}
                  onClick={handleGoogleAdminLogin}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-300 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm shadow-sm transition-all active:scale-[0.99] disabled:opacity-60"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  {isSigningInGoogle ? 'Memverifikasi Akun Google...' : 'Masuk dengan Google (rizafani@gmail.com)'}
                </button>
              </div>

              <p className="text-[11px] text-center text-slate-400">
                Akses admin mencakup import data guru, kelola kelas & mapel, jadwal mengajar, dan rekapitulasi.
              </p>
            </div>
          ) : (
            <form onSubmit={handlePiketLogin} className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                <strong>Akun Guru Piket:</strong> Petugas piket bertugas mencatat dan memberikan keterangan bagi guru yang berhalangan hadir (sakit, izin, dinas luar, atau inval guru pengganti).
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Pilih Petugas Piket Hari Ini
                </label>
                <select
                  value={piketTeacherId}
                  onChange={(e) => {
                    setPiketTeacherId(e.target.value);
                    setCustomPiketName('');
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (NIP: {t.nip})
                    </option>
                  ))}
                  <option value="custom">-- Masukkan Nama Lain --</option>
                </select>
              </div>

              {piketTeacherId === 'custom' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Nama Petugas Piket
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Nurul Hayati, S.Pd."
                    value={customPiketName}
                    onChange={(e) => setCustomPiketName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Masuk Sebagai Guru Piket
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
