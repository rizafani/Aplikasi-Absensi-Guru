import React, { useState } from 'react';
import {
  X,
  Download,
  Maximize2,
  ZoomIn,
  ZoomOut,
  CalendarCheck,
  ClipboardList,
  CloudCheck,
  BarChart3,
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  School,
  ExternalLink
} from 'lucide-react';

interface WorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkflowModal: React.FC<WorkflowModalProps> = ({ isOpen, onClose }) => {
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const imageUrl = '/src/assets/images/alur_kerja_aplikasi_1792214415096.jpg';

  if (!isOpen) return null;

  const steps = [
    {
      num: '1',
      title: 'Presensi Mandiri Guru',
      role: 'Semua Dewan Guru',
      icon: CalendarCheck,
      color: 'blue',
      badge: 'Tanpa Ribet Login',
      desc: 'Guru mengakses halaman utama web dari smartphone atau tablet sekolah. Cukup pilih nama guru, pilih kelas & mata pelajaran sesuai jadwal hari ini, lalu klik Simpan Presensi.'
    },
    {
      num: '2',
      title: 'Pemantauan Guru Piket',
      role: 'Petugas Piket Hari Ini',
      icon: ClipboardList,
      color: 'amber',
      badge: 'Verifikasi & Pengganti',
      desc: 'Petugas piket memantau ketepatan waktu guru masuk kelas, menginput izin/sakit jika guru menyerahkan surat keterangan, serta mengatur guru pengganti untuk kelas yang kosong.'
    },
    {
      num: '3',
      title: 'Sinkronisasi Cloud Real-Time',
      role: 'Google Cloud Firestore',
      icon: CloudCheck,
      color: 'emerald',
      badge: 'Instan Antar Perangkat',
      desc: 'Data absensi tersimpan otomatis dan disinkronkan secara langsung ke semua layar (smartphone guru, laptop piket, komputer kepala sekolah) dalam hitungan detik.'
    },
    {
      num: '4',
      title: 'Dashboard Realtime Admin',
      role: 'Kepala Sekolah & Kurikulum',
      icon: BarChart3,
      color: 'indigo',
      badge: 'Monitoring Langsung',
      desc: 'Pimpinan sekolah memantau rekap kehadiran harian secara langsung, persentase kehadiran, status jam mengajar per kelas, serta master data jadwal pembelajaran.'
    },
    {
      num: '5',
      title: 'Rekapitulasi & Laporan PDF',
      role: 'Tata Usaha & Kurikulum',
      icon: FileSpreadsheet,
      color: 'purple',
      badge: 'Dokumen Resmi Siap Cetak',
      desc: 'Otomatisasi cetak laporan bulanan & semester berformat resmi dengan Kop Surat SMA Negeri 1 Julok serta tanda tangan Kepala Sekolah dan Waka Kurikulum.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <School className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold">Alur Kerja Sistem Absensi & Jurnal Guru</h3>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  SOP Terintegrasi
                </span>
              </div>
              <p className="text-xs text-blue-200">
                SMA Negeri 1 Julok • Alur Operasional Digital Dari Presensi Hingga Laporan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Top Actions: Download Image & Status */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-slate-700">
                Gambar Infografis Alur Kerja Sistem (Flowchart Resmi)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsZoomed(!isZoomed)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
              >
                {isZoomed ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
                <span>{isZoomed ? 'Kecilkan' : 'Perbesar Tampilan'}</span>
              </button>
              <a
                href={imageUrl}
                download="Alur_Kerja_Absensi_SMAN1_Julok.jpg"
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Gambar HD</span>
              </a>
            </div>
          </div>

          {/* Workflow Diagram Image Display */}
          <div className={`relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-300 shadow-md transition-all ${
            isZoomed ? 'max-h-none' : 'max-h-[480px]'
          } flex items-center justify-center p-2 sm:p-4 group`}>
            <img
              src={imageUrl}
              alt="Diagram Alur Kerja Sistem Absensi Guru SMAN 1 Julok"
              referrerPolicy="no-referrer"
              className={`w-full h-auto object-contain rounded-xl transition-all duration-300 ${
                isZoomed ? 'scale-100' : 'group-hover:scale-[1.01]'
              }`}
            />
            <div className="absolute top-4 right-4 bg-slate-900/75 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] text-white flex items-center gap-1.5 opacity-90">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Format Gambar HD • SMAN 1 Julok</span>
            </div>
          </div>

          {/* Step-by-Step Detailed Breakdown */}
          <div className="space-y-3 pt-2">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-4 rounded-full bg-blue-600"></span>
              Penjelasan Tahapan Kerja Aplikasi (5 Langkah Utama)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {steps.map((st) => {
                const Icon = st.icon;
                return (
                  <div
                    key={st.num}
                    className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-sm transition-all hover:border-blue-300 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-2xs">
                            {st.num}
                          </span>
                          <span className="text-xs font-bold text-slate-800">{st.title}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          {st.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed mb-3">
                        {st.desc}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-blue-700 font-semibold">
                      <span>{st.badge}</span>
                      <Icon className="w-4 h-4 text-blue-500" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* School Contact & Address Footer Card */}
          <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs text-blue-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="font-bold text-blue-950">SMA NEGERI 1 JULOK</span>
              <p className="text-blue-800 text-[11px]">
                Jln Alue Ie Mirah Desa Buket Seuraja Kecamatan Julok Kabupaten Aceh Timur - Kode Pos 24457
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-blue-300 hover:bg-blue-100 text-blue-800 rounded-lg text-xs font-semibold transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka Tab Baru</span>
              </a>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
