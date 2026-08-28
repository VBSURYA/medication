import { 
  Medication, 
  DoseLog, 
  RoutineItem, 
  RoutineLog, 
  HistoryEventItem, 
  DayHistoryGroup 
} from '../types.ts';
import { formatTime24to12, getTodayDateString } from './helpers.ts';

/**
 * Format an ISO string or time string into friendly clinical timestamp
 * e.g. "8:05 AM" or "Aug 27, 8:05 AM"
 */
export function formatTimestampTime(isoOrTime?: string): string {
  if (!isoOrTime) return '';
  if (!isoOrTime.includes('T')) {
    return formatTime24to12(isoOrTime);
  }
  try {
    const d = new Date(isoOrTime);
    if (isNaN(d.getTime())) return isoOrTime;
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  } catch {
    return isoOrTime;
  }
}

export function formatTimestampShort(isoOrTime?: string): string {
  if (!isoOrTime) return '';
  if (!isoOrTime.includes('T')) {
    return formatTime24to12(isoOrTime);
  }
  try {
    const d = new Date(isoOrTime);
    if (isNaN(d.getTime())) return isoOrTime;
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return isoOrTime;
  }
}

/**
 * Format full date in friendly clinical style
 * e.g. "Thursday, August 27, 2026"
 */
export function formatFullDayHeader(dateStr: string): { title: string; relativeLabel?: string } {
  const today = getTodayDateString();
  const d = new Date(dateStr + 'T00:00:00');
  
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  const title = d.toLocaleDateString(undefined, options);

  if (dateStr === today) {
    return { title, relativeLabel: 'Today' };
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().split('T')[0];
  if (dateStr === yStr) {
    return { title, relativeLabel: 'Yesterday' };
  }

  // Calculate days ago
  const diffTime = new Date(today + 'T00:00:00').getTime() - d.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays > 1 && diffDays <= 7) {
    return { title, relativeLabel: `${diffDays} days ago` };
  }

  return { title };
}

/**
 * Combine medications, dose logs, routines, and routine logs into daywise groups
 * strictly sorted in descending order (newest date first).
 */
export function buildDaywiseHistory(
  medications: Medication[],
  doseLogs: DoseLog[],
  routines: RoutineItem[],
  routineLogs: RoutineLog[]
): DayHistoryGroup[] {
  // Map for fast medication lookup
  const medMap = new Map<string, Medication>();
  medications.forEach((m) => medMap.set(m.id, m));

  // Map for fast routine lookup
  const routineMap = new Map<string, RoutineItem>();
  routines.forEach((r) => routineMap.set(r.id, r));

  // Collect all unique dates across dose logs and routine logs
  const datesSet = new Set<string>();
  
  // Include today so the current day is always present
  datesSet.add(getTodayDateString());

  doseLogs.forEach((l) => {
    if (l.date) datesSet.add(l.date);
  });
  routineLogs.forEach((r) => {
    if (r.date) datesSet.add(r.date);
  });

  // Sort dates descending (newest date first)
  const sortedDates = Array.from(datesSet).sort((a, b) => b.localeCompare(a));

  const groups: DayHistoryGroup[] = [];

  for (const date of sortedDates) {
    const events: HistoryEventItem[] = [];

    // 1. Gather all dose logs for this date
    const dayDoseLogs = doseLogs.filter((l) => l.date === date);

    // Keep track of which medication schedule IDs were logged
    const loggedScheduleKeys = new Set<string>();

    dayDoseLogs.forEach((l) => {
      const med = medMap.get(l.medicationId);
      const schedule = med?.schedules.find((s) => s.id === l.scheduleId);
      if (l.scheduleId) {
        loggedScheduleKeys.add(`${l.medicationId}-${l.scheduleId}`);
      }

      events.push({
        id: l.id,
        type: 'medication',
        date,
        scheduledTime: l.scheduledTime || schedule?.time || '08:00',
        recordedAt: l.takenAt,
        title: med ? `${med.name} ${med.dosage}` : 'Prescription Dose',
        subtitle: med?.instructions || (schedule?.label ? schedule.label : undefined),
        medicationForm: med?.form,
        status: l.status,
        mealRelation: l.mealRelation || schedule?.mealRelation,
        mealName: l.mealName || schedule?.mealName,
        notes: l.notes,
        skippedReason: l.skippedReason,
        isSpecialDose: l.isSpecialDose || med?.isSpecialCondition,
        specialConditionNote: l.specialConditionNote || med?.specialConditionReason,
        doctorName: med?.doctorName,
        color: med?.color,
      });
    });

    // If date is today, also include pending regular schedules so the patient can see uncompleted doses
    if (date === getTodayDateString()) {
      medications.forEach((med) => {
        if (med.isSpecialCondition) return;
        med.schedules.forEach((sch) => {
          const key = `${med.id}-${sch.id}`;
          if (!loggedScheduleKeys.has(key)) {
            events.push({
              id: `pending-${med.id}-${sch.id}-${date}`,
              type: 'medication',
              date,
              scheduledTime: sch.time,
              title: `${med.name} ${med.dosage}`,
              subtitle: sch.label || med.instructions,
              medicationForm: med.form,
              status: 'pending',
              mealRelation: sch.mealRelation,
              mealName: sch.mealName,
              doctorName: med.doctorName,
              color: med.color,
            });
          }
        });
      });
    }

    // 2. Gather routine logs for this date
    const dayRoutineLogs = routineLogs.filter((r) => r.date === date);
    const loggedRoutineIds = new Set<string>();

    dayRoutineLogs.forEach((rl) => {
      const routine = routineMap.get(rl.routineId);
      loggedRoutineIds.add(rl.routineId);

      events.push({
        id: rl.id,
        type: 'routine',
        date,
        scheduledTime: routine?.time || '12:00',
        recordedAt: rl.completedAt,
        title: routine?.title || 'Daily Routine',
        subtitle: routine?.description,
        category: routine?.category || 'other',
        status: rl.status,
        notes: rl.notes,
      });
    });

    // If date is today, also show pending routines
    if (date === getTodayDateString()) {
      routines.forEach((r) => {
        if (!loggedRoutineIds.has(r.id)) {
          events.push({
            id: `pending-routine-${r.id}-${date}`,
            type: 'routine',
            date,
            scheduledTime: r.time,
            title: r.title,
            subtitle: r.description,
            category: r.category,
            status: 'pending',
          });
        }
      });
    }

    // Sort events inside the day:
    // Recorded events with timestamps sort by recorded time, otherwise by scheduled time
    events.sort((a, b) => {
      const timeA = a.recordedAt ? a.recordedAt.split('T')[1] || a.scheduledTime : a.scheduledTime;
      const timeB = b.recordedAt ? b.recordedAt.split('T')[1] || b.scheduledTime : b.scheduledTime;
      return timeA.localeCompare(timeB);
    });

    // Compute stats
    const medEvents = events.filter((e) => e.type === 'medication');
    const taken = medEvents.filter((e) => e.status === 'taken').length;
    const skipped = medEvents.filter((e) => e.status === 'skipped').length;
    const pending = medEvents.filter((e) => e.status === 'pending').length;
    const medTotal = medEvents.length;
    const adherencePercent = medTotal > 0 ? Math.round((taken / (taken + skipped || 1)) * 100) : 100;

    const routineEvents = events.filter((e) => e.type === 'routine');
    const routineCompleted = routineEvents.filter((e) => e.status === 'completed').length;
    const mealsCount = routineEvents.filter(
      (e) => (e.category === 'meal' || e.category === 'snack') && e.status === 'completed'
    ).length;
    const latrineCount = routineEvents.filter(
      (e) => e.category === 'bathroom' && e.status === 'completed'
    ).length;
    const hydrationCount = routineEvents.filter(
      (e) => e.category === 'hydration' && e.status === 'completed'
    ).length;
    const vitalsCount = routineEvents.filter(
      (e) => e.category === 'vitals' && e.status === 'completed'
    ).length;

    const dateHeader = formatFullDayHeader(date);

    groups.push({
      date,
      displayDate: dateHeader.title,
      events,
      medStats: {
        taken,
        skipped,
        pending,
        total: medTotal,
        adherencePercent,
      },
      routineStats: {
        completed: routineCompleted,
        total: routineEvents.length,
        mealsCount,
        latrineCount,
        hydrationCount,
        vitalsCount,
      },
    });
  }

  return groups;
}
