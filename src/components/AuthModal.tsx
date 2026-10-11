import React, { useState } from 'react';
import { UserSession, Teacher, PiketAccount } from '../types';
import {
  X,
  ShieldCheck,
  Mail,
  LogIn,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  Search,
  HelpCircle,
  Lock
} from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { Storage } from '../utils/storage';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSession: UserSession;
  onLogin: (session: UserSession) => void;
  teachers: Teacher[];
  piketAccounts: PiketAccount[];
}

const AUTHORIZED_ADMIN_EMAIL = 'rizafani@gmail.com';
const DEFAULT_ADMIN_PASSWORD = 'Kutabinjei88*';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentSession: _currentSession,
  onLogin,
  teachers: _teachers,
  piketAccounts
}) => {
  const [tab, setTab] = useState<'admin' | 'piket'>('admin');
  const [isSigningInGoogle, setIsSigningInGoogle] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Admin manual form state
  const [adminEmail, setAdminEmail] = useState<string>(AUTHORIZED_ADMIN_EMAIL);
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [showAdminPassword, setShowAdminPassword] = useState<boolean>(false);

  // Piket form state
  const [piketUsername, setPiketUsername] = useState<string>('');
  const [piketPassword, setPiketPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showUsernameHelper, setShowUsernameHelper] = useState<boolean>(false);
  const [helperSearch, setHelperSearch] = useState<string>('');

  if (!isOpen) return null;

  // 1. ADMIN MANUAL LOGIN (Email: rizafani@gmail.com & Password: Kutabinjei88*)
  const handleManualAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const inputEmail = adminEmail.trim().toLowerCase();
    const inputPassword = adminPassword.trim();

    if (!inputEmail || !inputPassword) {
      setAuthError('Silakan masukkan email dan password Administrator.');
      return;
    }

    if (inputEmail !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
      setAuthError(
        `Akses Ditolak: Hanya email ${AUTHORIZED_ADMIN_EMAIL} yang berhak login sebagai Admin. Akun "${adminEmail}" tidak memiliki izin akses Administrator SMAN 1 JULOK.`
      );
      return;
    }

    const validPassword = Storage.getAdminPassword() || DEFAULT_ADMIN_PASSWORD;
    if (inputPassword !== validPassword) {
      setAuthError(
        'Password Administrator salah. Pastikan penulisan huruf besar, kecil, angka, dan simbol (Kutabinjei88*) dimasukkan dengan benar.'
      );
      return;
    }

    // Validated Admin Session
    onLogin({
      role: 'ADMIN',
      email: AUTHORIZED_ADMIN_EMAIL,
      name: 'Riza Fani, S.Pd., M.Pd. (Admin)'
    });
    onClose();
  };

  // 2. ADMIN GOOGLE SIGN IN (ALTERNATIVE QUICK LOGIN: ONLY rizafani@gmail.com)
  const handleGoogleAdminLogin = async () => {
    setIsSigningInGoogle(true);
    setAuthError(null);

    try {
      const res = await signInWithPopup(auth, googleProvider);
      const user = res.user;
      const email = (user.email || '').toLowerCase().trim();

      // STRICT VALIDATION: Reject any email that is NOT rizafani@gmail.com
      if (email !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
        await signOut(auth);
        setAuthError(
          `Akses Ditolak: Hanya email ${AUTHORIZED_ADMIN_EMAIL} yang berhak login sebagai Admin. Akun Google Anda (${email || 'tidak terdeteksi'}) tidak memiliki izin akses Administrator SMAN 1 JULOK.`
        );
        return;
      }

      // Validated Admin
      onLogin({
        role: 'ADMIN',
        email: AUTHORIZED_ADMIN_EMAIL,
        name: user.displayName || 'Riza Fani, S.Pd., M.Pd. (Admin)',
        avatar: user.photoURL || undefined
      });
      onClose();
    } catch (err: unknown) {
      console.warn('Google sign-in attempt error:', err);
      const errorObj = err as { code?: string; message?: string };
      if (errorObj?.code === 'auth/popup-closed-by-user') {
        setAuthError('Jendela login Google ditutup sebelum autentikasi selesai.');
      } else if (errorObj?.code === 'auth/cancelled-popup-request') {
        setAuthError('Permintaan login Google dibatalkan.');
      } else {
        setAuthError(
          `Gagal login dengan Google: ${errorObj?.message || 'Terjadi kesalahan pada jendela autentikasi'}. Pastikan koneksi internet stabil dan pop-up diizinkan.`
        );
      }
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  // 2. PIKET LOGIN (AUTO-GENERATED USERNAME & PASSWORD PER TEACHER)
  const handlePiketLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const cleanInputUsername = piketUsername.trim().toLowerCase();
    const cleanInputPassword = piketPassword.trim();

    if (!cleanInputUsername || !cleanInputPassword) {
      setAuthError('Silakan masukkan username dan password akun piket Anda.');
      return;
    }

    // Match against teacher piket accounts
    const matchedAccount = piketAccounts.find(
      (acc) => acc.username.toLowerCase().trim() === cleanInputUsername
    );

    if (!matchedAccount) {
      setAuthError(
        `Username "${piketUsername}" tidak terdaftar. Username dibuat otomatis dari nama guru (misal: "aniskurli", "rizafani"). Silakan gunakan fitur "Bantuan / Cari Username Guru" di bawah.`
      );
      return;
    }

    // Check password
    if (matchedAccount.password !== cleanInputPassword) {
      setAuthError(
        `Password untuk akun ${matchedAccount.teacherName} salah. Silakan periksa kembali atau hubungi Admin (${AUTHORIZED_ADMIN_EMAIL}) untuk mereset password.`
      );
      return;
    }

    // Check account status
    if (matchedAccount.isActive === false) {
      setAuthError(
        `Akun piket untuk ${matchedAccount.teacherName} saat ini berstatus NONAKTIF oleh Admin. Hubungi Admin (${AUTHORIZED_ADMIN_EMAIL}) untuk mengaktifkan kembali.`
      );
      return;
    }

    // Successfully authenticated as Piket
    onLogin({
      role: 'PIKET',
      piketName: matchedAccount.teacherName,
      name: matchedAccount.teacherName,
      teacherId: matchedAccount.teacherId,
      username: matchedAccount.username
    });
    onClose();
  };

  const filteredHelperAccounts = helperSearch.trim()
    ? piketAccounts.filter(
        (a) =>
          a.teacherName.toLowerCase().includes(helperSearch.toLowerCase()) ||
          a.username.toLowerCase().includes(helperSearch.toLowerCase()) ||
          (a.nip && a.nip.includes(helperSearch))
      )
    : piketAccounts;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 p-6 text-white relative shrink-0">
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
              onClick={() => {
                setTab('admin');
                setAuthError(null);
              }}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                tab === 'admin'
                  ? 'bg-white text-blue-900 shadow-sm'
                  : 'text-blue-100 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Admin
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('piket');
                setAuthError(null);
              }}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                tab === 'piket'
                  ? 'bg-white text-blue-900 shadow-sm'
                  : 'text-blue-100 hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              Guru Piket
            </button>
          </div>
        </div>

        {/* Body (scrollable if needed) */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Error Banner */}
          {authError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <span className="font-semibold block mb-0.5">Autentikasi Gagal:</span>
                {authError}
              </div>
            </div>
          )}

          {tab === 'admin' ? (
            /* ADMIN TAB - MANUAL LOGIN WITH EMAIL & PASSWORD */
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold text-blue-950 mb-1">
                  <Lock className="w-4 h-4 text-blue-600" />
                  <span>Login Manual Administrator</span>
                </div>
                <p className="text-slate-600 text-[11.5px] leading-relaxed">
                  Masukkan Email dan Password resmi Administrator untuk mengakses panel master guru, kelas, mata pelajaran, dan jadwal mengajar.
                </p>
              </div>

              <form onSubmit={handleManualAdminLogin} className="space-y-3.5">
                {/* Email Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email Administrator
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      autoCapitalize="none"
                      autoCorrect="off"
                      placeholder="rizafani@gmail.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-slate-400 font-mono"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Email resmi: <strong className="text-blue-800 font-mono font-semibold">rizafani@gmail.com</strong>
                  </p>
                </div>

                {/* Password Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Password Administrator
                    </label>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type={showAdminPassword ? 'text' : 'password'}
                      required
                      placeholder="Masukkan password admin"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-slate-400 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      tabIndex={-1}
                      title={showAdminPassword ? 'Sembunyikan password' : 'Lihat password'}
                    >
                      {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Password default: <strong className="text-slate-700 font-mono">Kutabinjei88*</strong></span>
                    <button
                      type="button"
                      onClick={() => setAdminPassword('Kutabinjei88*')}
                      className="text-blue-600 hover:underline font-medium text-[11px] cursor-pointer"
                    >
                      Isi Otomatis
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-xl shadow-md transition-all active:scale-[0.99] cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  Masuk sebagai Administrator
                </button>
              </form>

              {/* Divider & Google Sign-In Fallback */}
              <div className="pt-2 border-t border-slate-200">
                <div className="text-center text-[11px] text-slate-400 mb-2">
                  Atau login cepat menggunakan Akun Google:
                </div>
                <button
                  type="button"
                  disabled={isSigningInGoogle}
                  onClick={handleGoogleAdminLogin}
                  className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 border border-slate-300 rounded-xl bg-slate-50 hover:bg-white active:bg-slate-100 text-slate-700 font-medium text-xs shadow-2xs transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                  <span>
                    {isSigningInGoogle
                      ? 'Memverifikasi Akun Google...'
                      : `Masuk Cepat Google (${AUTHORIZED_ADMIN_EMAIL})`}
                  </span>
                </button>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 leading-relaxed text-center">
                Hak akses admin mencakup import master data guru, jadwal, kredensial piket, dan laporan presensi.
              </div>
            </div>
          ) : (
            /* PIKET TAB */
            <form onSubmit={handlePiketLogin} className="space-y-4">
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                <strong>Login Guru Piket:</strong> Masuk menggunakan <strong>username</strong> dan{' '}
                <strong>password</strong> masing-masing guru yang telah dibuatkan otomatis oleh sistem.
              </div>

              {/* Username Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Username Guru Piket
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    autoCapitalize="none"
                    autoCorrect="off"
                    placeholder="Contoh: rizafani, aniskurli"
                    value={piketUsername}
                    onChange={(e) => setPiketUsername(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-slate-400 font-mono"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Format otomatis: nama guru tanpa gelar & huruf kecil semua.
                </p>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password Piket
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Default: piket + 4 digit NIP
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Masukkan password akun piket"
                    value={piketPassword}
                    onChange={(e) => setPiketPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                Masuk Sebagai Guru Piket
              </button>

              {/* Helper Accordion to search own username */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUsernameHelper(!showUsernameHelper)}
                  className="w-full text-xs text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1.5 py-1 font-medium transition-colors cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{showUsernameHelper ? 'Tutup Panduan Username' : 'Cek Username Guru Anda'}</span>
                </button>

                {showUsernameHelper && (
                  <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 animate-in fade-in">
                    <div className="text-[11px] font-semibold text-slate-700">
                      Cari Nama Guru untuk Melihat Username Otomatis:
                    </div>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Ketik nama atau NIP..."
                        value={helperSearch}
                        onChange={(e) => setHelperSearch(e.target.value)}
                        className="w-full pl-8 pr-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1 divide-y divide-slate-100">
                      {filteredHelperAccounts.length === 0 ? (
                        <div className="text-[11px] text-slate-400 py-2 text-center">
                          Tidak ditemukan nama guru yang cocok.
                        </div>
                      ) : (
                        filteredHelperAccounts.slice(0, 10).map((acc) => (
                          <div
                            key={acc.id}
                            onClick={() => {
                              setPiketUsername(acc.username);
                              setShowUsernameHelper(false);
                            }}
                            className="pt-1.5 pb-1 flex items-center justify-between text-xs hover:bg-blue-50/60 px-1.5 rounded cursor-pointer transition-colors"
                          >
                            <div className="truncate max-w-[190px]">
                              <p className="font-medium text-slate-800 truncate">{acc.teacherName}</p>
                              <p className="text-[10px] text-slate-400 font-mono">NIP: {acc.nip || '-'}</p>
                            </div>
                            <div className="text-right">
                              <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded">
                                {acc.username}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 text-center italic">
                      Klik salah satu nama untuk mengisi username otomatis.
                    </p>
                  </div>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
