import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { ClassRoom } from '../types';
import {
  Camera,
  X,
  RefreshCw,
  Upload,
  CheckCircle2,
  AlertCircle,
  ScanLine,
  Volume2,
  Sparkles,
  School
} from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassRoom[];
  onClassScanned: (classRoom: ClassRoom, rawData?: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  classes,
  onClassScanned
}) => {
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<ClassRoom | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-reader-container';

  // Play crisp positive beep sound with Web Audio API
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15); // E6 note

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.25);

      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
    } catch {
      // Audio not permitted or supported
    }
  };

  const handleScanSuccess = async (decodedText: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      let matchedClass: ClassRoom | undefined;

      // 1. Try parsing JSON payload
      try {
        const parsed = JSON.parse(decodedText);
        if (parsed.classId) {
          matchedClass = classes.find((c) => c.id === parsed.classId);
        }
        if (!matchedClass && parsed.className) {
          const norm = parsed.className.trim().toLowerCase();
          matchedClass = classes.find((c) => c.name.trim().toLowerCase() === norm);
        }
      } catch {
        // Not JSON, continue to fallback parsers
      }

      // 2. Try text search / ID / class name matching
      if (!matchedClass) {
        const textLower = decodedText.trim().toLowerCase();
        matchedClass = classes.find(
          (c) =>
            c.id.toLowerCase() === textLower ||
            c.name.trim().toLowerCase() === textLower ||
            textLower.includes(c.id.toLowerCase()) ||
            textLower.includes(c.name.trim().toLowerCase())
        );
      }

      if (matchedClass) {
        playBeep();
        setScannedResult(matchedClass);
        await stopScanner();

        // Brief delay for visual satisfaction
        setTimeout(() => {
          onClassScanned(matchedClass!, decodedText);
          onClose();
        }, 1200);
      } else {
        setErrorMessage(
          `QR Code terbaca: "${decodedText.substring(0, 60)}...", namun tidak cocok dengan data kelas SMA NEGERI 1 JULOK yang terdaftar.`
        );
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Scan processing error:', err);
      setIsProcessing(false);
    }
  };

  const startScanner = async () => {
    setErrorMessage(null);
    setScannedResult(null);
    setIsProcessing(false);

    try {
      if (scannerRef.current) {
        await stopScanner();
      }

      const html5QrCode = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false
      });
      scannerRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      await html5QrCode.start(
        { facingMode: facingMode },
        config,
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {
          // ignore frame errors while scanning
        }
      );

      setIsScanning(true);
    } catch (err: unknown) {
      console.warn('QR Scanner start failed:', err);
      setIsScanning(false);
      setErrorMessage(
        'Kamera tidak dapat dimulai. Pastikan izin kamera telah diberikan di browser atau gunakan tombol "Upload Gambar QR" di bawah.'
      );
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
  };

  // Toggle camera facing mode
  const handleToggleCamera = async () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    await stopScanner();
    setTimeout(startScanner, 200);
  };

  // Scan from uploaded file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false
        });
      }
      const decodedText = await scannerRef.current.scanFile(file, true);
      handleScanSuccess(decodedText);
    } catch (err: unknown) {
      console.warn('File QR scan failed:', err);
      setErrorMessage('Tidak ditemukan QR Code yang valid pada gambar tersebut. Coba gambar yang lebih jelas.');
    }
  };

  // Handle open / close lifecycle
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        startScanner();
      }, 250);
    } else {
      stopScanner();
    }
    return () => {
      stopScanner();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">
                Pindai QR Code Ruang Kelas
              </h3>
              <p className="text-blue-100 text-[11px]">
                Arahkan kamera ke QR Code yang tertempel di kelas
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-1.5 text-blue-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* Success overlay state */}
          {scannedResult ? (
            <div className="p-6 bg-emerald-50 border-2 border-emerald-500 rounded-2xl text-center space-y-3 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner ring-4 ring-emerald-200">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h4 className="text-lg font-extrabold text-slate-800">
                QR Code Berhasil Terbaca!
              </h4>
              <div className="inline-block px-4 py-2 bg-emerald-600 text-white font-black text-xl rounded-xl shadow-md">
                {scannedResult.name}
              </div>
              <p className="text-xs text-slate-600">
                Tingkat {scannedResult.grade} • Jurusan {scannedResult.major}
              </p>
              <div className="text-xs text-emerald-700 font-semibold flex items-center justify-center gap-1.5 pt-1">
                <Sparkles className="w-4 h-4 animate-spin text-amber-500" />
                Menerapkan kelas ke formulir absensi...
              </div>
            </div>
          ) : (
            <>
              {/* Camera Scanner Viewport */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-square max-w-[320px] mx-auto shadow-lg border-2 border-slate-700 flex items-center justify-center">
                <div id={scannerContainerId} className="w-full h-full"></div>

                {/* Animated Scanner Reticle / Target Overlay */}
                {isScanning && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    {/* Reticle border */}
                    <div className="w-52 h-52 border-2 border-blue-400 rounded-2xl relative shadow-2xl">
                      {/* Corner Accents */}
                      <span className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg"></span>
                      <span className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg"></span>
                      <span className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg"></span>
                      <span className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg"></span>

                      {/* Moving laser scan line */}
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-pulse absolute top-1/2 -translate-y-1/2"></div>
                    </div>
                  </div>
                )}

                {!isScanning && !errorMessage && (
                  <div className="text-center p-4 text-slate-400 text-xs flex flex-col items-center gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
                    <span>Mengaktifkan kamera pemindai...</span>
                  </div>
                )}
              </div>

              {/* Error Callout */}
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{errorMessage}</div>
                </div>
              )}

              {/* Scanner Control Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleToggleCamera}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Putar Kamera ({facingMode === 'environment' ? 'Belakang' : 'Depan'})
                </button>

                <label className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl border border-blue-200 transition-colors cursor-pointer flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  Upload Gambar QR
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>

              {/* Quick Class Selection Helper */}
              {classes.length > 0 && (
                <div className="pt-2 border-t border-slate-100 text-center">
                  <p className="text-[11px] text-slate-400 mb-2">
                    Atau jika kamera tidak dapat memindai, pilih langsung kelas:
                  </p>
                  <div className="flex flex-wrap gap-1.5 justify-center max-h-24 overflow-y-auto p-1">
                    {classes.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          playBeep();
                          setScannedResult(c);
                          stopScanner();
                          setTimeout(() => {
                            onClassScanned(c);
                            onClose();
                          }, 600);
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded-lg transition-colors border border-slate-200"
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="flex items-center gap-1 text-[11px]">
            <Volume2 className="w-3.5 h-3.5 text-blue-600" />
            Bunyi bip otomatis aktif
          </span>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
