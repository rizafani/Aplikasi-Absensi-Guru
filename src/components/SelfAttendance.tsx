import React, { useState, useEffect, useRef } from 'react';
import { Teacher, ClassRoom, Subject, TimeSlot, ScheduleItem, AttendanceRecord, DayOfWeek, SchoolLogos } from '../types';
import { INDONESIAN_DAYS, getTodayDayName, getTodayDateString, formatScheduleTimeSlots } from '../data/initialData';
import confetti from 'canvas-confetti';
import {
  Camera,
  CheckCircle2,
  Calendar,
  Clock,
  BookOpen,
  School,
  Sparkles,
  RefreshCw,
  AlertCircle,
  FileText,
  User,
  Check,
  QrCode,
  ScanLine,
  Printer,
  X
} from 'lucide-react';
import { ClassQRCodeModal } from './ClassQRCodeModal';
import { QRScannerModal } from './QRScannerModal';

interface SelfAttendanceProps {
  teachers: Teacher[];
  classes: ClassRoom[];
  subjects: Subject[];
  timeSlots: TimeSlot[];
  schedules: ScheduleItem[];
  onRecordAttendance: (record: AttendanceRecord) => Promise<void> | void;
  onGoToStats: () => void;
  logos?: SchoolLogos;
}

export const SelfAttendance: React.FC<SelfAttendanceProps> = ({
  teachers,
  classes,
  subjects,
  timeSlots,
  schedules,
  onRecordAttendance,
  onGoToStats,
  logos
}) => {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(getTodayDayName());
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');
  
  // Custom manual schedule inputs if supplementary / no official schedule
  const [customClassId, setCustomClassId] = useState<string>('');
  const [customSubjectId, setCustomSubjectId] = useState<string>('');
  const [customTimeSlotId, setCustomTimeSlotId] = useState<string>('');

  // Classroom photo
  const [photoDataUrl, setPhotoDataUrl] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Lesson log
  const [topic, setTopic] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  // State submission
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedRecord, setSubmittedRecord] = useState<AttendanceRecord | null>(null);

  // QR Code Modals & Scanned State
  const [isQRModalOpen, setIsQRModalOpen] = useState<boolean>(false);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [qrModalInitialClassId, setQrModalInitialClassId] = useState<string>('');
  const [scannedClassNotice, setScannedClassNotice] = useState<{ classId: string; className: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Determine day name when date changes
  const handleDateChange = (dateStr: string) => {
    setSelectedDate(dateStr);
    try {
      const d = new Date(dateStr + 'T00:00:00');
      const dayIdx = d.getDay();
      let dayName: DayOfWeek = 'Senin';
      if (dayIdx === 1) dayName = 'Senin';
      else if (dayIdx === 2) dayName = 'Selasa';
      else if (dayIdx === 3) dayName = 'Rabu';
      else if (dayIdx === 4) dayName = 'Kamis';
      else if (dayIdx === 5) dayName = 'Jumat';
      else if (dayIdx === 6) dayName = 'Sabtu';
      setSelectedDay(dayName);
    } catch {
      // ignore
    }
  };

  // Find schedules for this teacher on this day (sorted chronologically per jam)
  const teacherSchedules = schedules
    .filter((s) => s.teacherId === selectedTeacherId && s.day === selectedDay)
    .sort((a, b) => {
      const slotAIdx = timeSlots.findIndex((t) => t.id === a.timeSlotId);
      const slotBIdx = timeSlots.findIndex((t) => t.id === b.timeSlotId);
      return (slotAIdx >= 0 ? slotAIdx : 999) - (slotBIdx >= 0 ? slotBIdx : 999);
    });

  // Handle class scanned from QR Code
  const handleClassScanned = (classRoom: ClassRoom) => {
    setScannedClassNotice({ classId: classRoom.id, className: classRoom.name });
    
    // Check if current selected teacher has a schedule in this class today
    if (selectedTeacherId) {
      const matchingSched = schedules.find(
        (s) =>
          s.teacherId === selectedTeacherId &&
          s.day === selectedDay &&
          s.classRoomId === classRoom.id
      );
      if (matchingSched) {
        setSelectedScheduleId(matchingSched.id);
      } else {
        setSelectedScheduleId('');
        setCustomClassId(classRoom.id);
        if (subjects.length > 0 && !customSubjectId) setCustomSubjectId(subjects[0].id);
        if (timeSlots.length > 0 && !customTimeSlotId) setCustomTimeSlotId(timeSlots[0].id);
      }
    } else {
      setCustomClassId(classRoom.id);
    }
  };

  // Auto-select schedule matching scanned class or first available schedule
  useEffect(() => {
    if (scannedClassNotice) {
      const match = teacherSchedules.find((s) => s.classRoomId === scannedClassNotice.classId);
      if (match) {
        setSelectedScheduleId(match.id);
        return;
      } else {
        setSelectedScheduleId('');
        setCustomClassId(scannedClassNotice.classId);
        if (subjects.length > 0 && !customSubjectId) setCustomSubjectId(subjects[0].id);
        if (timeSlots.length > 0 && !customTimeSlotId) setCustomTimeSlotId(timeSlots[0].id);
        return;
      }
    }

    if (teacherSchedules.length > 0) {
      setSelectedScheduleId(teacherSchedules[0].id);
    } else {
      setSelectedScheduleId('');
      if (classes.length > 0 && !customClassId) setCustomClassId(classes[0].id);
      if (subjects.length > 0 && !customSubjectId) setCustomSubjectId(subjects[0].id);
      if (timeSlots.length > 0 && !customTimeSlotId) setCustomTimeSlotId(timeSlots[0].id);
    }
  }, [selectedTeacherId, selectedDay, scannedClassNotice]);

  // Clean camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Camera handler with automatic fallback & instant video element stream attachment
  const startCamera = async (targetFacing?: 'user' | 'environment') => {
    const facingMode = targetFacing || cameraFacing;
    stopCamera();
    setCameraError(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Browser ini tidak mendukung akses kamera langsung. Pastikan Anda membuka melalui browser modern (Chrome, Safari, Firefox, Edge) dengan koneksi HTTPS.');
      return;
    }

    try {
      let stream: MediaStream;
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (primaryErr) {
        console.warn('Initial camera constraints failed, attempting basic constraint fallback:', primaryErr);
        // Fallback for browsers/webcams that fail on width/height or exact facingMode
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      streamRef.current = stream;
      setIsCameraActive(true);

      // Attach stream immediately to video if mounted
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => console.warn('Video play error in startCamera:', err));
      }
    } catch (err: unknown) {
      console.error('Camera access error:', err);
      const errStr = String(err);
      if (errStr.includes('NotAllowedError') || errStr.includes('Permission')) {
        setCameraError('Izin akses kamera diblokir atau belum diberikan. Silakan izinkan akses kamera di pengaturan browser/perangkat Anda.');
      } else if (errStr.includes('NotFoundError') || errStr.includes('DevicesNotFoundError')) {
        setCameraError('Tidak ditemukan perangkat kamera yang terhubung pada HP/Laptop ini.');
      } else {
        setCameraError('Gagal membuka kamera: ' + (err instanceof Error ? err.message : 'Pastikan kamera tidak dipakai aplikasi lain.'));
      }
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Ref callback ensures srcObject is assigned the exact moment the <video> element mounts to the DOM
  const setVideoRef = (el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current) {
      if (el.srcObject !== streamRef.current) {
        el.srcObject = streamRef.current;
      }
      el.play().catch((err) => console.warn('Ref callback video play error:', err));
    }
  };

  // Watch for stream and video mount
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch((err) => console.warn('useEffect video play error:', err));
    }
  }, [isCameraActive, cameraFacing]);

  const handleToggleCameraFacing = () => {
    const nextFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(nextFacing);
    startCamera(nextFacing);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    
    // Scale down to max 480px to guarantee fast cloud sync and comply with Firestore limits
    const maxDim = 480;
    let w = video.videoWidth || 640;
    let h = video.videoHeight || 480;
    if (w > maxDim || h > maxDim) {
      if (w > h) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      } else {
        w = Math.round((w * maxDim) / h);
        h = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If using user/front camera, flip horizontally so selfie looks like a mirror
    if (cameraFacing === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform for watermark text
    } else {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    // Add smart watermark overlay
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    const teacher = teachers.find(t => t.id === selectedTeacherId);

    // Semi-transparent bottom banner
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, canvas.height - 52, canvas.width, 52);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`SMA NEGERI 1 JULOK • ${dateStr} ${timeStr} WIB`, 12, canvas.height - 30);

    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`Guru: ${teacher?.name || 'Guru'} | Presensi Mandiri di Kelas`, 12, canvas.height - 12);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    setPhotoDataUrl(dataUrl);
    stopCamera();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTeacherId) {
      alert('Silakan pilih nama guru terlebih dahulu.');
      return;
    }

    if (!photoDataUrl) {
      alert('Silakan ambil foto selfie di kelas terlebih dahulu sebagai bukti kehadiran fisik.');
      return;
    }

    setIsSubmitting(true);

    const teacher = teachers.find(t => t.id === selectedTeacherId)!;
    let className = '';
    let subjectName = '';
    let timeSlotName = '';

    if (selectedScheduleId) {
      const sched = schedules.find(s => s.id === selectedScheduleId);
      const c = classes.find(cl => cl.id === sched?.classRoomId);
      const sub = subjects.find(sb => sb.id === sched?.subjectId);
      const slotInfo = sched ? formatScheduleTimeSlots(sched, timeSlots) : null;

      className = c?.name || 'Kelas Terjadwal';
      subjectName = sub?.name || 'Mata Pelajaran';
      timeSlotName = slotInfo ? slotInfo.fullText : 'Jam Pelajaran Terjadwal';
    } else {
      const c = classes.find(cl => cl.id === customClassId);
      const sub = subjects.find(sb => sb.id === customSubjectId);
      const ts = timeSlots.find(slot => slot.id === customTimeSlotId);

      className = c?.name || 'Kelas Tambahan';
      subjectName = sub?.name || 'Mata Pelajaran';
      timeSlotName = ts ? `${ts.label} (${ts.period})` : 'Jam Tambahan';
    }

    const now = new Date();
    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      teacherId: teacher.id,
      teacherName: teacher.name,
      nip: teacher.nip,
      date: selectedDate,
      dayName: selectedDay,
      classRoomName: className,
      subjectName: subjectName,
      timeSlotName: timeSlotName,
      status: 'HADIR',
      photoUrl: photoDataUrl,
      timestamp: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      topic: topic.trim() || 'Pembelajaran Tatap Muka Sesuai RPP / Modul Ajar',
      notes: notes.trim(),
      recordedBy: 'MANDIRI'
    };

    try {
      await onRecordAttendance(newRecord);
      setSubmittedRecord(newRecord);
      setIsSubmitting(false);

      // Trigger Confetti!
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // ignore
      }
    } catch (err) {
      console.error('Submission error:', err);
      setIsSubmitting(false);
      alert('Gagal menyinkronkan presensi ke Cloud Firestore. Silakan periksa jaringan dan coba lagi.');
    }
  };

  const handleResetForm = () => {
    setSubmittedRecord(null);
    setPhotoDataUrl('');
    setTopic('');
    setNotes('');
    setScannedClassNotice(null);
  };

  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6">
      {/* Hero Welcome Card */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white rounded-2xl p-6 sm:p-8 shadow-xl shadow-blue-900/10 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            {/* Logo Resmi Pemerintah Aceh */}
            <div className="shrink-0">
              <div
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white p-1.5 shadow-lg shadow-black/10 flex items-center justify-center border border-white/50 hover:scale-105 transition-transform"
                title="Logo Pemerintah Aceh (Pancacita)"
              >
                <img
                  src={logos?.acehLogo || '/logo-aceh.svg'}
                  alt="Logo Pemerintah Aceh"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold text-blue-100">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Presensi Mandiri Guru Tanpa Login</span>
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight">
                Absensi Guru SMA NEGERI 1 JULOK
              </h2>
              <p className="text-blue-100 text-xs sm:text-sm max-w-xl leading-relaxed">
                Pemerintah Aceh • Cabang Dinas Pendidikan Kab. Aceh Timur. Silakan pilih nama guru, verifikasi jadwal mengajar otomatis, dan ambil foto selfie kelas.
              </p>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between border-t md:border-t-0 md:border-l border-white/20 pt-4 md:pt-0 md:pl-6 text-right shrink-0">
            <span className="text-xs text-blue-200">Hari ini:</span>
            <span className="text-base sm:text-lg font-bold text-white font-mono">{selectedDay}</span>
            <span className="text-xs text-blue-200">{selectedDate}</span>
          </div>
        </div>
      </div>

      {/* Quick QR Attendance Action Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {/* Button Scan QR */}
        <div
          onClick={() => setIsScannerOpen(true)}
          className="group relative bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-5 border border-blue-500/30 shadow-lg shadow-blue-950/20 cursor-pointer hover:border-blue-400 hover:shadow-blue-500/10 transition-all flex items-center justify-between overflow-hidden active:scale-[0.99]"
        >
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-28 h-28 bg-blue-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-blue-500/20 transition-all"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/30 group-hover:scale-105 transition-transform">
              <ScanLine className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">Scan QR Code Kelas</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Cepat
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Pindai QR unik di dinding ruang kelas untuk absensi instan
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/80 group-hover:bg-blue-500 group-hover:text-white transition-all shrink-0">
            <QrCode className="w-4 h-4" />
          </div>
        </div>

        {/* Button Display / Generate Class QR Code */}
        <div
          onClick={() => {
            setQrModalInitialClassId(customClassId || (classes[0]?.id ?? ''));
            setIsQRModalOpen(true);
          }}
          className="group bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 cursor-pointer transition-all flex items-center justify-between active:scale-[0.99]"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shadow-xs group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900">Tampilkan / Cetak QR Kelas</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  Semua Kelas
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate QR unik per kelas untuk proyektor atau dicetak
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shrink-0">
            <Printer className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Scanned QR Class Active Badge */}
      {scannedClassNotice && (
        <div className="mb-6 p-4 bg-emerald-50 border-2 border-emerald-500/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md shadow-emerald-500/5 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                  QR Code Ruang Kelas Terverifikasi
                </span>
                <span className="text-[10px] bg-emerald-200/80 text-emerald-950 font-extrabold px-2 py-0.5 rounded-full">
                  Scan Sukses
                </span>
              </div>
              <p className="text-sm font-extrabold text-slate-900">
                Ruang Kelas: <span className="text-emerald-700">{scannedClassNotice.className}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={() => {
                setQrModalInitialClassId(scannedClassNotice.classId);
                setIsQRModalOpen(true);
              }}
              className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 text-xs font-semibold rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5" />
              Lihat QR
            </button>
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
            >
              <ScanLine className="w-3.5 h-3.5" />
              Scan Ulang
            </button>
            <button
              type="button"
              onClick={() => setScannedClassNotice(null)}
              className="px-2 py-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg text-xs"
              title="Hapus filter QR"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* If Attendance is successfully submitted, show celebration summary card */}
      {submittedRecord ? (
        <div className="bg-white rounded-2xl border border-emerald-200 p-6 sm:p-8 shadow-lg shadow-emerald-500/5 text-center animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800">
            Absensi Berhasil Dicatat!
          </h3>
          <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
            Terima kasih Bapak/Ibu <strong>{submittedRecord.teacherName}</strong>. Presensi mengajar Anda telah tersimpan ke sistem SMA NEGERI 1 JULOK.
          </p>

          <div className="mt-6 max-w-md mx-auto bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2 text-xs">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Waktu Absen:</span>
              <span className="font-semibold text-slate-800">{submittedRecord.timestamp} WIB ({submittedRecord.date})</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Mata Pelajaran:</span>
              <span className="font-semibold text-blue-700">{submittedRecord.subjectName}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Kelas & Jam:</span>
              <span className="font-semibold text-slate-800">{submittedRecord.classRoomName} • {submittedRecord.timeSlotName}</span>
            </div>
            {submittedRecord.topic && (
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Topik / Materi:</span>
                <span className="font-medium text-slate-700 text-right max-w-[220px]">{submittedRecord.topic}</span>
              </div>
            )}
            <div className="pt-2 flex items-center gap-3">
              <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-300 shrink-0 bg-slate-200">
                <img src={submittedRecord.photoUrl} alt="Selfie Kelas" className="w-full h-full object-cover" />
              </div>
              <div className="text-[11px] text-slate-500">
                <span className="font-semibold text-emerald-700 block">Bukti Selfie Terverifikasi</span>
                Tersimpan di pangkalan data presensi sekolah.
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleResetForm}
              className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
            >
              Absen untuk Guru / Jam Lain
            </button>
            <button
              onClick={onGoToStats}
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
            >
              Lihat Statistik Kehadiran Hari Ini
            </button>
          </div>
        </div>
      ) : (
        /* The main self attendance form */
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 sm:p-8 space-y-8">
          {/* Step 1: Teacher Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Pilih Nama Guru
              </h3>
              <span className="text-xs text-rose-500 font-semibold">*wajib</span>
            </div>

            {teachers.length === 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Database Master Guru Masih Kosong</p>
                  <p className="mt-0.5 text-amber-700 leading-relaxed">
                    Belum ada data guru yang diimpor ke database. Administrator (<strong>rizafani@gmail.com</strong>) dapat masuk ke menu <strong>Pengaturan Admin</strong> untuk mengimpor atau menambahkan data guru, kelas, mata pelajaran, dan jadwal mengajar.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Lengkap Guru (Data Terdaftar)
                </label>
                <select
                  required
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-medium text-slate-800"
                >
                  <option value="">-- Pilih Nama Bapak/Ibu Guru --</option>
                  {teachers
                    .filter((t) => t.status === 'Aktif')
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (NIP: {t.nip})
                      </option>
                    ))}
                </select>
              </div>

              {selectedTeacher && (
                <div className="bg-blue-50/70 border border-blue-200/60 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0">
                    {selectedTeacher.name.charAt(0)}
                  </div>
                  <div className="text-xs overflow-hidden">
                    <p className="font-bold text-slate-800 truncate">{selectedTeacher.name}</p>
                    <p className="text-slate-500 font-mono text-[11px]">NIP: {selectedTeacher.nip}</p>
                    <p className="text-blue-700 text-[11px] font-medium">Status: Guru Aktif</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Date & Day Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                Pilih Tanggal & Hari
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tanggal Presensi
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Hari Mengajar (Otomatis Sesuai Tanggal)
                </label>
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value as DayOfWeek)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-semibold text-slate-800"
                >
                  {INDONESIAN_DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Step 3: Automatic Schedule (Kelas, Mapel, Jam Pelajaran) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Jadwal Mengajar Otomatis ({selectedDay})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-lg border border-blue-200 transition-colors flex items-center gap-1.5"
                >
                  <ScanLine className="w-3.5 h-3.5 text-blue-600" />
                  <span>Scan QR Kelas</span>
                </button>
                <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium hidden sm:inline-block">
                  Auto-sync Jadwal
                </span>
              </div>
            </div>

            {!selectedTeacherId ? (
              <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-xs text-slate-500 text-center">
                Pilih nama guru di Langkah 1 untuk memunculkan otomatis jadwal mengajar (kelas, mapel, & jam pelajaran).
              </div>
            ) : teacherSchedules.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  Ditemukan <strong>{teacherSchedules.length} jadwal mengajar</strong> untuk Bapak/Ibu <strong>{selectedTeacher?.name}</strong> pada hari <strong>{selectedDay}</strong>. Silakan pilih kelas/jam yang sedang berlangsung:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {teacherSchedules.map((sch) => {
                    const c = classes.find(cl => cl.id === sch.classRoomId);
                    const sub = subjects.find(sb => sb.id === sch.subjectId);
                    const slotInfo = formatScheduleTimeSlots(sch, timeSlots);
                    const isSelected = selectedScheduleId === sch.id;

                    return (
                      <div
                        key={sch.id}
                        onClick={() => setSelectedScheduleId(sch.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold text-xs">
                              {c?.name || 'Kelas'}
                            </span>
                            <span className="font-semibold text-xs text-slate-800">
                              {sub?.name || 'Mata Pelajaran'}
                            </span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                        </div>
                        <div className="mt-2 text-[11px] text-slate-600 flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold text-blue-700">{slotInfo.label}</span>
                          <span className="text-slate-500">({slotInfo.period} WIB)</span>
                        </div>
                        {sch.notes && (
                          <div className="mt-1 text-[11px] text-slate-500 italic">
                            Ket: {sch.notes}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Tidak ada jadwal reguler terdaftar di sistem untuk hari {selectedDay}.</span>
                    Bila Bapak/Ibu masuk sebagai guru pengganti (inval) atau jam tambahan, Anda dapat memilih kelas dan mapel secara manual di bawah ini:
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Kelas
                    </label>
                    <select
                      value={customClassId}
                      onChange={(e) => setCustomClassId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mata Pelajaran
                    </label>
                    <select
                      value={customSubjectId}
                      onChange={(e) => setCustomSubjectId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Jam Pelajaran
                    </label>
                    <select
                      value={customTimeSlotId}
                      onChange={(e) => setCustomTimeSlotId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      {timeSlots.map((ts) => (
                        <option key={ts.id} value={ts.id}>{ts.label} ({ts.period})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Step 4: Foto Selfie di Kelas */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  4
                </div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-blue-600" />
                  Foto Selfie di Kelas
                </h3>
              </div>
              <span className="text-xs text-rose-500 font-semibold">*wajib selfie fisik</span>
            </div>

            <p className="text-xs text-slate-500">
              Ambil foto selfie di depan kelas/bersama siswa sebagai bukti otentik kehadiran mengajar.
            </p>

            {/* Photo preview or live camera */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
              {photoDataUrl ? (
                <div className="space-y-3">
                  <div className="relative max-w-md mx-auto aspect-4/3 rounded-xl overflow-hidden border-2 border-emerald-500 shadow-md bg-black">
                    <img
                      src={photoDataUrl}
                      alt="Selfie Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3 bg-emerald-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Foto Siap
                    </div>
                  </div>

                  <div className="flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setPhotoDataUrl('')}
                      className="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200 flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Ambil Ulang Foto
                    </button>
                  </div>
                </div>
              ) : isCameraActive ? (
                <div className="space-y-3">
                  <div className="relative max-w-md mx-auto aspect-4/3 rounded-xl overflow-hidden bg-black shadow-inner border border-slate-700">
                    <video
                      ref={setVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${cameraFacing === 'user' ? 'scale-x-[-1]' : ''}`}
                    />
                    <div className="absolute top-3 left-3 bg-red-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                      <span>Kamera Aktif</span>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 text-center pointer-events-none">
                      <span className="text-[11px] text-white/90 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs">
                        Arahkan wajah & ruang kelas ke dalam layar
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 active:scale-95 transition-all"
                    >
                      <Camera className="w-4 h-4" />
                      Ambil Foto Selfie
                    </button>
                    <button
                      type="button"
                      onClick={handleToggleCameraFacing}
                      className="px-3.5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-colors"
                      title="Ganti ke kamera depan / belakang"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Putar Kamera ({cameraFacing === 'user' ? 'Depan' : 'Belakang'})
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-xl transition-colors"
                    >
                      Tutup Kamera
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-center py-6 px-4">
                  {cameraError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl max-w-md mx-auto text-left flex items-start gap-2.5 mb-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span className="font-semibold block mb-0.5">Kendala Akses Kamera:</span>
                        <span>{cameraError}</span>
                      </div>
                    </div>
                  )}

                  <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto shadow-inner">
                    <Camera className="w-8 h-8" />
                  </div>

                  <div className="max-w-md mx-auto">
                    <h4 className="text-sm font-bold text-slate-800">
                      Ambil Foto Selfie Langsung di Kelas
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Wajib mengambil foto selfie fisik langsung di kelas saat jam pelajaran. Opsi upload dari galeri ditiadakan demi menjaga integritas kehadiran.
                    </p>
                  </div>

                  <div className="flex items-center justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <Camera className="w-4 h-4" />
                      <span>{cameraError ? 'Coba Buka Kamera Lagi' : 'Buka Kamera Selfie Langsung'}</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Sistem otomatis menyematkan tanggal, jam WIB, dan watermark SMA NEGERI 1 JULOK pada foto.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Step 5: Jurnal Mengajar Singkat */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                5
              </div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Jurnal Pembelajaran (Materi & Catatan)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Materi Pokok / Pembahasan Hari Ini
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Bab 3 - Persamaan Kuadrat & Latihan"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Tambahan (Kondisi Kelas / Siswa)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 30 siswa hadir, 2 orang izin lomba"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Menyimpan Presensi & Foto...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                  <span>Kirim Absensi Mandiri Sekarang</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-slate-400 mt-2">
              Dengan menekan tombol di atas, data presensi dan bukti foto selfie kelas akan langsung tercatat pada statistik kehadiran hari ini.
            </p>
          </div>
        </form>
      )}

      {/* QR Code Generator & Viewer Modal */}
      <ClassQRCodeModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        classes={classes}
        initialClassId={qrModalInitialClassId}
        onSelectClassForAttendance={(cls) => {
          handleClassScanned(cls);
        }}
      />

      {/* QR Code Camera Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        classes={classes}
        onClassScanned={(cls) => {
          handleClassScanned(cls);
        }}
      />
    </div>
  );
};
