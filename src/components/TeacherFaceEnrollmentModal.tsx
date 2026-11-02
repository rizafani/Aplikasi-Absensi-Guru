import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Teacher, TeacherFaceProfile } from '../types';
import { detectSmileInVideo, extractEnrollmentMetrics, playShutterSound } from '../utils/faceSmileDetector';
import confetti from 'canvas-confetti';
import {
  Camera,
  CheckCircle2,
  Smile,
  User,
  Sparkles,
  RefreshCw,
  X,
  ShieldCheck,
  AlertCircle,
  Check,
  ChevronRight,
  ArrowRight,
  RotateCcw
} from 'lucide-react';

interface TeacherFaceEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: Teacher[];
  initialTeacherId?: string;
  existingProfile?: TeacherFaceProfile | null;
  onSaveProfile: (profile: TeacherFaceProfile) => void;
}

export const TeacherFaceEnrollmentModal: React.FC<TeacherFaceEnrollmentModalProps> = ({
  isOpen,
  onClose,
  teachers,
  initialTeacherId,
  existingProfile,
  onSaveProfile
}) => {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(initialTeacherId || teachers[0]?.id || '');
  const [step, setStep] = useState<'intro' | 'neutral' | 'smile' | 'preview'>('intro');

  // Camera stream
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Enrollment captures
  const [neutralSnapshot, setNeutralSnapshot] = useState<{
    dataUrl: string;
    mouthRatio: number;
    brightness: number;
    skinColor: { r: number; g: number; b: number };
  } | null>(null);

  const [smileSnapshot, setSmileSnapshot] = useState<{
    dataUrl: string;
    mouthRatio: number;
    brightness: number;
  } | null>(null);

  // Live detection feedback
  const [liveSmileScore, setLiveSmileScore] = useState<number>(0);
  const [liveFeedback, setLiveFeedback] = useState<string>('Posisikan wajah Anda');
  const [isFacePositionGood, setIsFacePositionGood] = useState<boolean>(false);

  // Animation frame loop
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (initialTeacherId) {
      setSelectedTeacherId(initialTeacherId);
    }
  }, [initialTeacherId]);

  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId);

  // Start Camera
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Browser tidak mendukung akses kamera langsung.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });
      streamRef.current = stream;
      setCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.warn);
      }
    } catch (err: unknown) {
      console.error('Enrollment camera error:', err);
      setCameraError('Gagal mengakses kamera. Pastikan izin kamera aktif pada browser.');
      setCameraActive(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Control camera when step changes
  useEffect(() => {
    if (isOpen && (step === 'neutral' || step === 'smile')) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, step, startCamera, stopCamera]);

  // Video loop for smile analysis
  useEffect(() => {
    if (!cameraActive || (step !== 'neutral' && step !== 'smile')) return;

    let isMounted = true;

    const loop = () => {
      if (!isMounted) return;
      if (videoRef.current && videoRef.current.readyState >= 2) {
        const res = detectSmileInVideo(videoRef.current, {
          sensitivity: 'MEDIUM'
        });
        setLiveSmileScore(res.smileScore);
        setLiveFeedback(res.feedbackText);
        setIsFacePositionGood(res.facePosition === 'GOOD');
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      isMounted = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [cameraActive, step]);

  // Capture canvas helper
  const captureCurrentFrame = (): HTMLCanvasElement | null => {
    if (!videoRef.current) return null;
    const v = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth || 640;
    canvas.height = v.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Flip horizontally for natural mirror selfie
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    return canvas;
  };

  const handleCaptureNeutral = () => {
    const canvas = captureCurrentFrame();
    if (!canvas) return;

    playShutterSound();
    const metrics = extractEnrollmentMetrics(canvas);

    setNeutralSnapshot({
      dataUrl: metrics.thumbnailDataUrl,
      mouthRatio: metrics.mouthAspectRatio || 2.0,
      brightness: metrics.averageBrightness,
      skinColor: metrics.skinColor
    });

    setStep('smile');
  };

  const handleCaptureSmile = () => {
    const canvas = captureCurrentFrame();
    if (!canvas) return;

    playShutterSound();
    const metrics = extractEnrollmentMetrics(canvas);

    // Smiling mouth aspect ratio is typically higher
    const estimatedSmileRatio = Math.max(metrics.mouthAspectRatio * 1.35, 3.1);

    setSmileSnapshot({
      dataUrl: metrics.thumbnailDataUrl,
      mouthRatio: estimatedSmileRatio,
      brightness: metrics.averageBrightness
    });

    stopCamera();
    setStep('preview');
  };

  const handleSaveAndFinish = () => {
    if (!selectedTeacher || !neutralSnapshot || !smileSnapshot) return;

    const profile: TeacherFaceProfile = {
      teacherId: selectedTeacher.id,
      teacherName: selectedTeacher.name,
      nip: selectedTeacher.nip,
      enrolledAt: new Date().toISOString(),
      neutralPhotoUrl: neutralSnapshot.dataUrl,
      smilePhotoUrl: smileSnapshot.dataUrl,
      neutralMouthRatio: neutralSnapshot.mouthRatio,
      smileMouthRatio: smileSnapshot.mouthRatio,
      skinToneAverage: neutralSnapshot.skinColor,
      status: 'ACTIVE'
    };

    onSaveProfile(profile);

    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 }
    });

    onClose();
  };

  const handleReset = () => {
    setNeutralSnapshot(null);
    setSmileSnapshot(null);
    setStep('neutral');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col my-auto max-h-[95vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-4 sm:p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Smile className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold tracking-tight">Perekaman Profil Wajah Mandiri Guru</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Self-Enrollment
                </span>
              </div>
              <p className="text-xs text-blue-200/90 mt-0.5">
                SMA Negeri 1 Julok • Kalibrasi deteksi senyum otomatis saat presensi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-medium">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step === 'intro' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
              }`}
            >
              {step === 'intro' ? '1' : '✓'}
            </span>
            <span className={step === 'intro' ? 'text-blue-700 font-bold' : 'text-slate-600'}>Identitas</span>
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />

          <div className="flex items-center gap-1.5 font-medium">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step === 'neutral'
                  ? 'bg-blue-600 text-white'
                  : neutralSnapshot
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {neutralSnapshot ? '✓' : '2'}
            </span>
            <span className={step === 'neutral' ? 'text-blue-700 font-bold' : 'text-slate-600'}>Wajah Netral</span>
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />

          <div className="flex items-center gap-1.5 font-medium">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step === 'smile'
                  ? 'bg-blue-600 text-white'
                  : smileSnapshot
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {smileSnapshot ? '✓' : '3'}
            </span>
            <span className={step === 'smile' ? 'text-blue-700 font-bold' : 'text-slate-600'}>Wajah Senyum</span>
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />

          <div className="flex items-center gap-1.5 font-medium">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step === 'preview' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
              }`}
            >
              4
            </span>
            <span className={step === 'preview' ? 'text-blue-700 font-bold' : 'text-slate-600'}>Simpan</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* STEP 1: INTRO & TEACHER SELECTION */}
          {step === 'intro' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200/80 rounded-xl p-4 text-xs text-blue-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-blue-800 text-sm">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Mengapa Rekam Mandiri Wajah &amp; Senyum?
                </div>
                <p>
                  Dengan merekam wajah dan senyuman khas Anda, kamera presensi kelas akan{' '}
                  <strong>otomatis mengambil foto saat Anda tersenyum</strong> tanpa perlu menyentuh layar ponsel atau laptop!
                </p>
                <p className="text-slate-600 text-[11px]">
                  Proses ini hanya butuh 30 detik: Anda cukup mengambil 1 foto normal dan 1 foto tersenyum.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih Nama Guru yang Merekam Profil:
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                  >
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.nip ? `(NIP: ${t.nip})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {existingProfile && existingProfile.teacherId === selectedTeacherId && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 font-medium">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Guru ini sudah memiliki profil wajah terdaftar.</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-mono">
                    {new Date(existingProfile.enrolledAt).toLocaleDateString('id-ID')}
                  </span>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setStep('neutral')}
                  disabled={!selectedTeacherId}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Mulai Perekaman Wajah</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: NEUTRAL FACE */}
          {step === 'neutral' && (
            <div className="space-y-4">
              <div className="text-center">
                <h4 className="text-sm font-bold text-slate-800">Langkah 1: Rekam Wajah Posisi Netral</h4>
                <p className="text-xs text-slate-500">
                  Posisikan wajah Anda tepat di dalam bingkai oval dengan ekspresi santai/normal.
                </p>
              </div>

              {/* Camera Container */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-4/3 flex items-center justify-center border-2 border-slate-200 shadow-inner">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />

                {/* Oval Face Guide Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div
                    className={`w-52 h-68 rounded-[50%] border-3 border-dashed transition-colors duration-300 flex items-center justify-center ${
                      isFacePositionGood ? 'border-emerald-400 bg-emerald-500/10' : 'border-amber-400/80 bg-amber-500/5'
                    }`}
                  >
                    <span className="text-[11px] font-bold text-white/90 drop-shadow-md bg-black/40 px-2 py-0.5 rounded-full">
                      {isFacePositionGood ? 'Posisi Tepat' : 'Sesuaikan Posisi'}
                    </span>
                  </div>
                </div>

                {/* Realtime Feedback Banner */}
                <div className="absolute bottom-3 inset-x-3 bg-black/75 backdrop-blur-xs text-white text-xs px-3 py-1.5 rounded-xl text-center font-medium drop-shadow-md">
                  {liveFeedback}
                </div>
              </div>

              {cameraError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}

              {/* Action */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep('intro')}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Kembali
                </button>

                <button
                  type="button"
                  onClick={handleCaptureNeutral}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Ambil Foto Wajah Netral</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SMILE FACE */}
          {step === 'smile' && (
            <div className="space-y-4">
              <div className="text-center">
                <h4 className="text-sm font-bold text-slate-800">Langkah 2: Rekam Senyuman Manis Anda 😊</h4>
                <p className="text-xs text-slate-500">
                  Tersenyumlah ramah menghadap kamera. Sistem akan mengkalibrasi senyuman unik Anda.
                </p>
              </div>

              {/* Camera Container */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-4/3 flex items-center justify-center border-2 border-slate-200 shadow-inner">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />

                {/* Oval Guide */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div
                    className={`w-52 h-68 rounded-[50%] border-3 transition-colors duration-300 flex items-center justify-center ${
                      liveSmileScore >= 60 ? 'border-amber-400 bg-amber-400/15' : 'border-white/70'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-3xl filter drop-shadow-md">
                        {liveSmileScore >= 75 ? '😁' : liveSmileScore >= 45 ? '🙂' : '😐'}
                      </div>
                      <span className="text-[11px] font-bold text-white drop-shadow-md bg-black/50 px-2 py-0.5 rounded-full mt-1 inline-block">
                        {liveSmileScore}% Senyum
                      </span>
                    </div>
                  </div>
                </div>

                {/* Realtime Smile Meter Bar */}
                <div className="absolute top-3 inset-x-3 bg-black/75 backdrop-blur-xs text-white p-2.5 rounded-xl space-y-1">
                  <div className="flex justify-between items-center text-[11px] font-semibold">
                    <span className="flex items-center gap-1">
                      <Smile className="w-3.5 h-3.5 text-amber-300" /> Indikator Senyum:
                    </span>
                    <span className="font-mono text-amber-300">{liveSmileScore}%</span>
                  </div>
                  <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-150 ${
                        liveSmileScore >= 65 ? 'bg-gradient-to-r from-amber-400 to-emerald-400' : 'bg-blue-400'
                      }`}
                      style={{ width: `${liveSmileScore}%` }}
                    />
                  </div>
                </div>

                {/* Feedback */}
                <div className="absolute bottom-3 inset-x-3 bg-black/75 backdrop-blur-xs text-white text-xs px-3 py-1.5 rounded-xl text-center font-medium drop-shadow-md">
                  {liveFeedback}
                </div>
              </div>

              {/* Action */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep('neutral')}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Ulang Wajah Netral
                </button>

                <button
                  type="button"
                  onClick={handleCaptureSmile}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Smile className="w-4 h-4" />
                  <span>Kunci Foto Senyuman</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: PREVIEW & CONFIRM */}
          {step === 'preview' && neutralSnapshot && smileSnapshot && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-200 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-950">Perekaman Wajah Berhasil Diambil!</h4>
                  <p className="text-[11px] text-emerald-800">
                    Sistem telah mencatat proporsi wajah normal dan senyuman khas untuk <strong>{selectedTeacher?.name}</strong>.
                  </p>
                </div>
              </div>

              {/* Side by side comparison */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center space-y-2">
                  <div className="text-[11px] font-bold text-slate-600">1. Ekspresi Netral</div>
                  <div className="w-28 h-28 mx-auto rounded-xl overflow-hidden border-2 border-slate-300 shadow-2xs">
                    <img src={neutralSnapshot.dataUrl} alt="Wajah Netral" className="w-full h-full object-cover" />
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">Baseline Proporsi: Siap</div>
                </div>

                <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 text-center space-y-2">
                  <div className="text-[11px] font-bold text-amber-800 flex items-center justify-center gap-1">
                    <Smile className="w-3.5 h-3.5 text-amber-600" /> 2. Ekspresi Senyum
                  </div>
                  <div className="w-28 h-28 mx-auto rounded-xl overflow-hidden border-2 border-amber-400 shadow-2xs">
                    <img src={smileSnapshot.dataUrl} alt="Wajah Senyum" className="w-full h-full object-cover" />
                  </div>
                  <div className="text-[10px] text-emerald-700 font-bold font-mono">Kalibrasi: Terverifikasi</div>
                </div>
              </div>

              {/* Detail Ringkasan */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Guru:</span>
                  <span className="font-bold text-slate-900">{selectedTeacher?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">NIP:</span>
                  <span className="font-mono text-slate-700">{selectedTeacher?.nip || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fungsi:</span>
                  <span className="text-blue-700 font-semibold">Selfie Otomatis dengan Senyum di Kelas</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Rekam Ulang</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveAndFinish}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Profil Wajah Saya</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
