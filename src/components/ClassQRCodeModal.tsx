import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { ClassRoom } from '../types';
import {
  QrCode,
  X,
  Printer,
  Download,
  Maximize2,
  Minimize2,
  School,
  CheckCircle,
  Copy,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';

interface ClassQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassRoom[];
  initialClassId?: string;
  onSelectClassForAttendance?: (classRoom: ClassRoom) => void;
}

export const ClassQRCodeModal: React.FC<ClassQRCodeModalProps> = ({
  isOpen,
  onClose,
  classes,
  initialClassId,
  onSelectClassForAttendance
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialClassId && classes.some((c) => c.id === initialClassId)) {
      setSelectedClassId(initialClassId);
    } else if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [initialClassId, classes]);

  const activeClass = classes.find((c) => c.id === selectedClassId) || classes[0];

  useEffect(() => {
    if (!activeClass) return;

    // Payload formatted as standard structured JSON for secure validation
    const qrPayload = JSON.stringify({
      app: 'SMAN1JULOK_ABSENSI',
      version: '1.0',
      type: 'CLASS_ATTENDANCE_QR',
      classId: activeClass.id,
      className: activeClass.name,
      grade: activeClass.grade,
      major: activeClass.major,
      school: 'SMA NEGERI 1 JULOK'
    });

    QRCode.toDataURL(qrPayload, {
      width: 400,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H'
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code', err));
  }, [activeClass]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!qrDataUrl || !activeClass) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QR-Kelas-${activeClass.name.replace(/\s+/g, '_')}-SMAN1Julok.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    if (!activeClass) return;
    const payloadText = `QR Presensi Kelas: ${activeClass.name} - SMA Negeri 1 Julok`;
    navigator.clipboard.writeText(payloadText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentIndex = classes.findIndex((c) => c.id === activeClass?.id);
  const handlePrevClass = () => {
    if (currentIndex > 0) {
      setSelectedClassId(classes[currentIndex - 1].id);
    }
  };
  const handleNextClass = () => {
    if (currentIndex < classes.length - 1) {
      setSelectedClassId(classes[currentIndex + 1].id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`bg-white rounded-3xl shadow-2xl flex flex-col w-full transition-all duration-300 ${
          isFullscreen
            ? 'fixed inset-2 max-w-none h-[calc(100vh-1rem)]'
            : 'max-w-2xl max-h-[92vh]'
        } overflow-hidden border border-slate-200`}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                QR Code Presensi Unik Kelas
              </h3>
              <p className="text-blue-100 text-xs">
                SMA NEGERI 1 JULOK • Tempel di ruang kelas atau tampilkan di proyektor
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-blue-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title={isFullscreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh / Proyektor'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-blue-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {classes.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              <Info className="w-8 h-8 mx-auto text-amber-500 mb-2" />
              <p className="font-semibold text-slate-800">Belum ada data kelas di sistem.</p>
              <p className="text-xs text-slate-500 mt-1">
                Admin dapat menambahkan data kelas di menu Pengaturan Admin terlebih dahulu.
              </p>
            </div>
          ) : (
            <>
              {/* Class Selector Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handlePrevClass}
                    disabled={currentIndex <= 0}
                    className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    title="Kelas Sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-700" />
                  </button>

                  <div className="flex-1 sm:w-64">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">
                      Pilih Kelas:
                    </label>
                    <select
                      value={activeClass?.id || ''}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name} ({cls.grade} - {cls.major})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleNextClass}
                    disabled={currentIndex >= classes.length - 1}
                    className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    title="Kelas Berikutnya"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-700" />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-600 w-full sm:w-auto justify-end">
                  <span className="px-2.5 py-1 bg-blue-100 text-blue-800 font-semibold rounded-lg text-[11px]">
                    Kelas {currentIndex + 1} dari {classes.length}
                  </span>
                  {onSelectClassForAttendance && activeClass && (
                    <button
                      onClick={() => {
                        onSelectClassForAttendance(activeClass);
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Pilih untuk Absen
                    </button>
                  )}
                </div>
              </div>

              {/* Printable QR Card Container */}
              <div
                ref={printAreaRef}
                className="max-w-md mx-auto bg-white border-2 border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200 text-center relative overflow-hidden print:border-none print:shadow-none"
              >
                {/* Decorative Top Bar */}
                <div className="w-full h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 absolute top-0 left-0"></div>

                {/* School Header Badge */}
                <div className="flex items-center justify-center gap-2 text-slate-800 mb-1">
                  <School className="w-5 h-5 text-blue-700" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                    SMA NEGERI 1 JULOK
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  Sistem Presensi & Jurnal Mengajar Digital Guru
                </p>

                {/* Big Class Badge */}
                <div className="my-4 py-2 px-6 bg-slate-900 text-white rounded-2xl inline-block shadow-md">
                  <span className="text-xs uppercase tracking-widest text-slate-300 block font-medium">
                    Ruang Kelas
                  </span>
                  <span className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    {activeClass?.name}
                  </span>
                </div>

                {/* QR Code Canvas/Image */}
                <div className="relative mx-auto my-3 p-3 bg-white border border-slate-200 rounded-2xl shadow-inner inline-block ring-8 ring-slate-100">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR Code Kelas ${activeClass?.name}`}
                      className="w-56 h-56 sm:w-64 sm:h-64 object-contain mx-auto"
                    />
                  ) : (
                    <div className="w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center text-slate-400 text-xs">
                      Membuat QR Code...
                    </div>
                  )}
                  {/* Center School Badge */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-md border-2 border-blue-600 flex items-center justify-center">
                      <School className="w-5 h-5 text-blue-700" />
                    </div>
                  </div>
                </div>

                {/* Scan Instruction */}
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-bold text-slate-800">
                    Pindai dengan Menu "Scan QR" di HP Anda
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                    Arahkan kamera ke QR Code ini saat masuk kelas untuk mencatat kehadiran mengajar secara otomatis.
                  </p>
                </div>

                {/* Footer Meta */}
                <div className="mt-4 pt-3 border-t border-slate-200 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>ID: {activeClass?.id}</span>
                  <span>Tingkat: {activeClass?.grade} • {activeClass?.major}</span>
                </div>
              </div>

              {/* Action Buttons: Print, Download, Copy */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  Unduh Gambar QR (PNG)
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Cetak / Print QR Card
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all flex items-center gap-2"
                >
                  {copied ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Tersalin!' : 'Salin Identitas Kelas'}
                </button>
              </div>

              {/* Tips Callout */}
              <div className="bg-blue-50 border border-blue-200/80 rounded-2xl p-4 text-xs text-blue-900 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Tips Penggunaan di Sekolah:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-blue-800/90 text-[11px]">
                    <li>
                      <strong>Cetak & Tempel:</strong> Cetak QR Code tiap kelas lalu laminasi dan tempel di dekat pintu masuk atau meja guru ruang kelas.
                    </li>
                    <li>
                      <strong>Tampilkan di Proyektor:</strong> Gunakan tombol <em>Mode Layar Penuh</em> di pojok kanan atas untuk menampilkan QR Code di proyektor / layar sentuh saat jam pelajaran dimulai.
                    </li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
