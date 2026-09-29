import React, { useState, useEffect, useRef } from 'react';
import { Teacher, ClassRoom, Subject, TimeSlot, ScheduleItem, AttendanceRecord, DayOfWeek } from '../types';
import { INDONESIAN_DAYS, getTodayDayName, getTodayDateString } from '../data/initialData';
import confetti from 'canvas-confetti';
import {
  Camera,
  CheckCircle2,
  Calendar,
  Clock,
  BookOpen,
  School,
  Sparkles,
  Upload,
  RefreshCw,
  AlertCircle,
  FileText,
  User,
  Check
} from 'lucide-react';

interface SelfAttendanceProps {
  teachers: Teacher[];
  classes: ClassRoom[];
  subjects: Subject[];
  timeSlots: TimeSlot[];
  schedules: ScheduleItem[];
  onRecordAttendance: (record: AttendanceRecord) => void;
  onGoToStats: () => void;
}

export const SelfAttendance: React.FC<SelfAttendanceProps> = ({
  teachers,
  classes,
  subjects,
  timeSlots,
  schedules,
  onRecordAttendance,
  onGoToStats
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

  // Find schedules for this teacher on this day
  const teacherSchedules = schedules.filter(
    (s) => s.teacherId === selectedTeacherId && s.day === selectedDay
  );

  // Auto-select first schedule if available and not yet set
  useEffect(() => {
    if (teacherSchedules.length > 0) {
      setSelectedScheduleId(teacherSchedules[0].id);
    } else {
      setSelectedScheduleId('');
      if (classes.length > 0 && !customClassId) setCustomClassId(classes[0].id);
      if (subjects.length > 0 && !customSubjectId) setCustomSubjectId(subjects[0].id);
      if (timeSlots.length > 0 && !customTimeSlotId) setCustomTimeSlotId(timeSlots[0].id);
    }
  }, [selectedTeacherId, selectedDay]);

  // Clean camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: unknown) {
      console.warn('Camera error:', err);
      setCameraError('Kamera tidak dapat diakses langsung. Anda dapat menggunakan tombol "Upload Foto dari Perangkat" di bawah.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Add smart watermark overlay
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    const teacher = teachers.find(t => t.id === selectedTeacherId);

    // Semi-transparent bottom banner
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, canvas.height - 70, canvas.width, 70);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`SMA NEGERI 1 JULOK • ${dateStr} ${timeStr} WIB`, 16, canvas.height - 42);

    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`Guru: ${teacher?.name || 'Guru'} | Presensi Mandiri di Kelas`, 16, canvas.height - 20);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setPhotoDataUrl(dataUrl);
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // resize if too big
        const maxDim = 1200;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);

        // Watermark
        const now = new Date();
        const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        const teacher = teachers.find(t => t.id === selectedTeacherId);

        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.fillRect(0, h - 60, w, 60);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(`SMA NEGERI 1 JULOK • ${dateStr} ${timeStr} WIB`, 14, h - 35);

        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(`Guru: ${teacher?.name || 'Guru'} | Bukti Hadir Kelas`, 14, h - 16);

        setPhotoDataUrl(canvas.toDataURL('image/jpeg', 0.85));
      };
      if (typeof event.target?.result === 'string') {
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
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
      const ts = timeSlots.find(slot => slot.id === sched?.timeSlotId);

      className = c?.name || 'Kelas Terjadwal';
      subjectName = sub?.name || 'Mata Pelajaran';
      timeSlotName = ts ? `${ts.label} (${ts.period})` : 'Jam Pelajaran Terjadwal';
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

    setTimeout(() => {
      onRecordAttendance(newRecord);
      setIsSubmitting(false);
      setSubmittedRecord(newRecord);

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
    }, 400);
  };

  const handleResetForm = () => {
    setSubmittedRecord(null);
    setPhotoDataUrl('');
    setTopic('');
    setNotes('');
  };

  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6">
      {/* Hero Welcome Card */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white rounded-2xl p-6 sm:p-8 shadow-xl shadow-blue-900/10 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold text-blue-100">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Presensi Mandiri Guru Tanpa Login
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Absensi Guru SMA NEGERI 1 JULOK
            </h2>
            <p className="text-blue-100 text-sm max-w-xl leading-relaxed">
              Bapak/Ibu Guru silakan pilih nama, verifikasi jadwal mengajar otomatis, dan ambil foto selfie di kelas sebagai bukti kehadiran mengajar hari ini.
            </p>
          </div>
          <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 sm:border-l border-white/20 pt-4 sm:pt-0 sm:pl-6 text-right">
            <span className="text-xs text-blue-200">Hari ini:</span>
            <span className="text-base sm:text-lg font-bold text-white font-mono">{selectedDay}</span>
            <span className="text-xs text-blue-200">{selectedDate}</span>
          </div>
        </div>
      </div>

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
              <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium">
                Auto-sync Jadwal
              </span>
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
                    const ts = timeSlots.find(slot => slot.id === sch.timeSlotId);
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
                        <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{ts?.label} ({ts?.period})</span>
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
                  <div className="relative max-w-md mx-auto aspect-4/3 rounded-xl overflow-hidden bg-black shadow-inner">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                      <span className="text-[11px] text-white/90 bg-black/50 px-2 py-1 rounded backdrop-blur-xs">
                        Kamera Aktif
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      Bidikan Foto Selfie
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCameraFacing((prev) => (prev === 'user' ? 'environment' : 'user'));
                        setTimeout(startCamera, 100);
                      }}
                      className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-medium rounded-xl flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Putar Kamera
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-xl"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-center py-4">
                  {cameraError && (
                    <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-lg max-w-md mx-auto text-left flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>{cameraError}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="w-full sm:w-auto px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 transition-transform active:scale-95"
                    >
                      <Camera className="w-4 h-4" />
                      Buka Kamera Langsung
                    </button>

                    <label className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 shadow-2xs cursor-pointer flex items-center justify-center gap-2">
                      <Upload className="w-4 h-4 text-slate-500" />
                      <span>Upload Foto dari HP / Laptop</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="user"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Sistem otomatis menyematkan tanggal, waktu WIB, dan identitas SMA NEGERI 1 JULOK pada foto.
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
    </div>
  );
};
