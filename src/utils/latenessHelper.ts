import { AttendanceRecord, TimeSlot, ScheduleItem } from '../types';

export interface LatenessResult {
  isLate: boolean;
  lateMinutes: number;
  slotStartTime: string;
  checkinTime: string;
  badgeText: string;
  warningText: string;
}

/**
 * Analyzes whether an attendance record was submitted after the scheduled lesson started.
 */
export function analyzeRecordLateness(
  record: AttendanceRecord,
  timeSlots?: TimeSlot[]
): LatenessResult {
  let isLate = false;
  let lateMinutes = 0;
  let slotStartTime = '';
  let checkinTime = '';

  // 1. Extract check-in time from timestamp (supports ISO string, HH:mm:ss, HH.mm)
  if (record.timestamp) {
    if (record.timestamp.includes('T')) {
      const d = new Date(record.timestamp);
      if (!isNaN(d.getTime())) {
        checkinTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      }
    } else {
      const match = record.timestamp.match(/(\d{1,2})[:.](\d{2})/);
      if (match) {
        checkinTime = `${match[1].padStart(2, '0')}:${match[2]}`;
      } else {
        checkinTime = record.timestamp;
      }
    }
  }

  // 2. Extract slot start time from timeSlotName (e.g. "Jam 1 (07:30 - 08:15)", "07:30 - 08:15")
  if (record.timeSlotName) {
    const slotMatch = record.timeSlotName.match(/(\d{1,2})[:.](\d{2})/);
    if (slotMatch) {
      slotStartTime = `${slotMatch[1].padStart(2, '0')}:${slotMatch[2]}`;
    }
  }

  // Fallback to timeSlots list if provided
  if (!slotStartTime && timeSlots && timeSlots.length > 0) {
    const matchedSlot = timeSlots.find(
      (ts) =>
        record.timeSlotName?.toLowerCase().includes(ts.label.toLowerCase()) ||
        record.timeSlotName?.toLowerCase().includes(ts.id.toLowerCase())
    );
    if (matchedSlot) {
      slotStartTime = matchedSlot.startTime;
    }
  }

  // 3. Compare check-in time vs slot start time
  if (slotStartTime && checkinTime) {
    const [sH, sM] = slotStartTime.split(':').map((v) => parseInt(v, 10));
    const [cH, cM] = checkinTime.split(':').map((v) => parseInt(v, 10));
    if (!isNaN(sH) && !isNaN(sM) && !isNaN(cH) && !isNaN(cM)) {
      const slotTotalMins = sH * 60 + sM;
      const checkinTotalMins = cH * 60 + cM;

      if (checkinTotalMins > slotTotalMins) {
        isLate = true;
        lateMinutes = checkinTotalMins - slotTotalMins;
      }
    }
  } else if (
    record.notes?.toLowerCase().includes('telat') ||
    record.notes?.toLowerCase().includes('terlambat') ||
    record.topic?.toLowerCase().includes('telat')
  ) {
    isLate = true;
    lateMinutes = 0;
  }

  const actuallyLate = record.status === 'HADIR' && isLate;

  return {
    isLate: actuallyLate,
    lateMinutes,
    slotStartTime: slotStartTime || '-',
    checkinTime: checkinTime || record.timestamp || '-',
    badgeText: actuallyLate
      ? lateMinutes > 0
        ? `Terlambat (+${lateMinutes}m)`
        : 'Terlambat'
      : 'Tepat Waktu',
    warningText: actuallyLate
      ? `Absen setelah jam pelajaran dimulai (${slotStartTime} WIB • Telat ${lateMinutes > 0 ? `${lateMinutes} menit` : ''})`
      : 'Presensi dilakukan tepat waktu'
  };
}

/**
 * Checks if a scheduled lesson has already started today compared to the current clock,
 * useful for alerting piket about teachers who haven't checked in yet.
 */
export function isScheduleOverdue(
  schedule: ScheduleItem,
  timeSlots: TimeSlot[]
): { isOverdue: boolean; overdueMinutes: number; startTime: string } {
  const ids = schedule.timeSlotIds && schedule.timeSlotIds.length > 0
    ? schedule.timeSlotIds
    : [schedule.timeSlotId];

  const matched = timeSlots
    .filter((ts) => ids.includes(ts.id))
    .sort((a, b) => timeSlots.indexOf(a) - timeSlots.indexOf(b));

  const firstSlot = matched[0] || timeSlots.find((ts) => ts.id === schedule.timeSlotId);
  if (!firstSlot || !firstSlot.startTime) {
    return { isOverdue: false, overdueMinutes: 0, startTime: '-' };
  }

  const now = new Date();
  const currentTotalMins = now.getHours() * 60 + now.getMinutes();
  const [sH, sM] = firstSlot.startTime.split(':').map((v) => parseInt(v, 10));
  if (isNaN(sH) || isNaN(sM)) {
    return { isOverdue: false, overdueMinutes: 0, startTime: firstSlot.startTime };
  }

  const slotTotalMins = sH * 60 + sM;
  if (currentTotalMins > slotTotalMins) {
    return {
      isOverdue: true,
      overdueMinutes: currentTotalMins - slotTotalMins,
      startTime: firstSlot.startTime
    };
  }

  return {
    isOverdue: false,
    overdueMinutes: 0,
    startTime: firstSlot.startTime
  };
}
