import { Teacher, ClassRoom, Subject, TimeSlot, ScheduleItem, AttendanceRecord, DayOfWeek } from '../types';

export const INITIAL_TEACHERS: Teacher[] = [];

export const INITIAL_CLASSES: ClassRoom[] = [];

export const INITIAL_SUBJECTS: Subject[] = [];

export const INITIAL_TIME_SLOTS: TimeSlot[] = [
  { id: 'ts-1', label: 'Jam 1', startTime: '07:30', endTime: '08:15', period: '07:30 - 08:15' },
  { id: 'ts-2', label: 'Jam 2', startTime: '08:15', endTime: '09:00', period: '08:15 - 09:00' },
  { id: 'ts-3', label: 'Jam 3', startTime: '09:00', endTime: '09:45', period: '09:00 - 09:45' },
  { id: 'ts-4', label: 'Jam 4', startTime: '10:15', endTime: '11:00', period: '10:15 - 11:00' },
  { id: 'ts-5', label: 'Jam 5', startTime: '11:00', endTime: '11:45', period: '11:00 - 11:45' },
  { id: 'ts-6', label: 'Jam 6', startTime: '11:45', endTime: '12:30', period: '11:45 - 12:30' },
  { id: 'ts-7', label: 'Jam 7', startTime: '13:30', endTime: '14:15', period: '13:30 - 14:15' },
  { id: 'ts-8', label: 'Jam 8', startTime: '14:15', endTime: '15:00', period: '14:15 - 15:00' },
  { id: 'ts-9', label: 'Jam 9', startTime: '15:00', endTime: '15:45', period: '15:00 - 15:45' },
  { id: 'ts-10', label: 'Jam 10', startTime: '15:45', endTime: '16:30', period: '15:45 - 16:30' },
];

export const INITIAL_SCHEDULES: ScheduleItem[] = [];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [];

export const INDONESIAN_DAYS: DayOfWeek[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function getTodayDayName(): DayOfWeek {
  const dayIndex = new Date().getDay(); // 0 is Sunday
  if (dayIndex === 1) return 'Senin';
  if (dayIndex === 2) return 'Selasa';
  if (dayIndex === 3) return 'Rabu';
  if (dayIndex === 4) return 'Kamis';
  if (dayIndex === 5) return 'Jumat';
  if (dayIndex === 6) return 'Sabtu';
  return 'Senin'; // default Sunday to Senin
}

export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatScheduleTimeSlots(
  schedule: { timeSlotId: string; timeSlotIds?: string[] },
  timeSlots: TimeSlot[]
): { label: string; period: string; fullText: string } {
  const ids = schedule.timeSlotIds && schedule.timeSlotIds.length > 0
    ? schedule.timeSlotIds
    : (schedule.timeSlotId ? [schedule.timeSlotId] : []);

  const matched = timeSlots
    .filter((ts) => ids.includes(ts.id))
    .sort((a, b) => timeSlots.indexOf(a) - timeSlots.indexOf(b));

  if (matched.length === 0) {
    const single = timeSlots.find((ts) => ts.id === schedule.timeSlotId);
    if (single) {
      return {
        label: single.label,
        period: single.period,
        fullText: `${single.label} (${single.period})`
      };
    }
    return { label: '-', period: '-', fullText: '-' };
  }

  const label = matched.map((m) => m.label).join(', ');
  const period = `${matched[0].startTime} - ${matched[matched.length - 1].endTime}`;
  const fullText = `${label} (${period})`;

  return { label, period, fullText };
}
