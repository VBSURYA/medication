import { 
  Medication, 
  DoseLog, 
  DailyDoseItem, 
  DoseStatus,
  RoutineItem,
  RoutineLog,
  DailyRoutineItem,
  RoutineStatus
} from '../types.ts';
import { getTodayDateString } from './helpers.ts';

const STORAGE_KEY_MEDS = 'med_reminder_medications_v1';
const STORAGE_KEY_LOGS = 'med_reminder_logs_v1';
const STORAGE_KEY_ROUTINES = 'med_reminder_routines_v1';
const STORAGE_KEY_ROUTINE_LOGS = 'med_reminder_routine_logs_v1';
const STORAGE_KEY_REMINDER_SETTINGS = 'med_reminder_settings_v1';

export interface ReminderSettings {
  soundEnabled: boolean;
  browserNotificationsEnabled: boolean;
  snoozeMinutes: number;
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  soundEnabled: true,
  browserNotificationsEnabled: false,
  snoozeMinutes: 10,
};

export const INITIAL_SAMPLE_MEDICATIONS: Medication[] = [
  {
    id: 'med-1',
    name: 'Omeprazole',
    dosage: '20 mg (1 Capsule)',
    form: 'capsule',
    color: 'teal',
    instructions: 'Take 30 minutes before breakfast on an empty stomach with a full glass of water.',
    doctorName: 'Dr. Sarah Mitchell (Gastroenterology)',
    inventoryCount: 28,
    isSpecialCondition: false,
    schedules: [
      {
        id: 'sch-1-1',
        time: '07:00',
        slot: 'morning',
        label: 'Morning Pre-Breakfast Dose',
        mealRelation: 'before_meal',
        mealName: 'Breakfast',
        reminderEnabled: true,
        reminderMinutesBefore: 0,
        soundEnabled: true,
      },
    ],
    createdAt: '2026-08-01T08:00:00.000Z',
  },
  {
    id: 'med-2',
    name: 'Metformin',
    dosage: '500 mg (1 Tablet)',
    form: 'tablet',
    color: 'blue',
    instructions: 'Take immediately after finishing breakfast to minimize gastrointestinal discomfort.',
    doctorName: 'Dr. Robert Chen (Endocrinology)',
    inventoryCount: 56,
    isSpecialCondition: false,
    schedules: [
      {
        id: 'sch-2-1',
        time: '07:45',
        slot: 'morning',
        label: 'Post-Breakfast Blood Sugar Control',
        mealRelation: 'after_meal',
        mealName: 'Breakfast',
        reminderEnabled: true,
        reminderMinutesBefore: 0,
        soundEnabled: true,
      },
      {
        id: 'sch-2-2',
        time: '19:45',
        slot: 'evening',
        label: 'Post-Dinner Blood Sugar Control',
        mealRelation: 'after_meal',
        mealName: 'Dinner',
        reminderEnabled: true,
        reminderMinutesBefore: 0,
        soundEnabled: true,
      },
    ],
    createdAt: '2026-08-01T08:00:00.000Z',
  },
  {
    id: 'med-3',
    name: 'Vitamin D3 & Calcium',
    dosage: '1000 IU (1 Softgel)',
    form: 'capsule',
    color: 'amber',
    instructions: 'Take with food or right after lunch for optimal fat-soluble absorption.',
    doctorName: 'Dr. Sarah Mitchell',
    inventoryCount: 90,
    isSpecialCondition: false,
    schedules: [
      {
        id: 'sch-3-1',
        time: '13:00',
        slot: 'afternoon',
        label: 'Lunchtime Supplement',
        mealRelation: 'after_meal',
        mealName: 'Lunch',
        reminderEnabled: true,
        reminderMinutesBefore: 5,
        soundEnabled: true,
      },
    ],
    createdAt: '2026-08-05T08:00:00.000Z',
  },
  {
    id: 'med-4',
    name: 'Atorvastatin',
    dosage: '20 mg (1 Tablet)',
    form: 'tablet',
    color: 'indigo',
    instructions: 'Take once nightly at bedtime with water for cholesterol management.',
    doctorName: 'Dr. Evelyn Ward (Cardiology)',
    inventoryCount: 30,
    isSpecialCondition: false,
    schedules: [
      {
        id: 'sch-4-1',
        time: '21:30',
        slot: 'night',
        label: 'Night / Bedtime Lipid Support',
        mealRelation: 'anytime',
        mealName: 'Bedtime',
        reminderEnabled: true,
        reminderMinutesBefore: 0,
        soundEnabled: true,
      },
    ],
    createdAt: '2026-08-01T08:00:00.000Z',
  },
  {
    id: 'med-5',
    name: 'Sumatriptan',
    dosage: '50 mg (1 Tablet)',
    form: 'tablet',
    color: 'rose',
    instructions: 'Take 1 tablet at the first sign of a severe migraine. Repeat in 2 hours only if symptoms return.',
    doctorName: 'Dr. Evelyn Ward',
    inventoryCount: 6,
    isSpecialCondition: true,
    specialConditionReason: 'For acute migraine attack or severe throbbing headache',
    specialMaxDosesPerDay: 2,
    schedules: [],
    createdAt: '2026-08-10T08:00:00.000Z',
  },
  {
    id: 'med-6',
    name: 'Salbutamol / Albuterol Inhaler',
    dosage: '100 mcg (2 Puffs)',
    form: 'inhaler',
    color: 'emerald',
    instructions: 'Inhale 2 puffs when experiencing wheezing, shortness of breath, or asthma symptoms.',
    doctorName: 'Dr. Mitchell',
    inventoryCount: 180,
    isSpecialCondition: true,
    specialConditionReason: 'For sudden shortness of breath, wheezing, or asthma flare-up',
    specialMaxDosesPerDay: 4,
    schedules: [],
    createdAt: '2026-08-10T08:00:00.000Z',
  },
];

export const INITIAL_SAMPLE_ROUTINES: RoutineItem[] = [
  {
    id: 'routine-1',
    title: 'Breakfast',
    category: 'meal',
    time: '06:00',
    description: 'Light healthy breakfast (oatmeal, eggs, or toast with warm water)',
    iconKey: 'coffee',
    reminderEnabled: true,
    createdAt: '2026-08-01T08:00:00.000Z',
  },
  {
    id: 'routine-2',
    title: 'Morning Snack / Second Meal',
    category: 'snack',
    time: '09:00',
    description: 'Fresh fruits, yogurt, or handful of nuts with a glass of water',
    iconKey: 'apple',
    reminderEnabled: true,
    createdAt: '2026-08-01T08:00:00.000Z',
  },
  {
    id: 'routine-3',
    title: 'Lunch',
    category: 'meal',
    time: '13:00',
    description: 'Wholesome lunch with vegetables and lean protein',
    iconKey: 'utensils',
    reminderEnabled: true,
    createdAt: '2026-08-01T08:00:00.000Z',
  },
  {
    id: 'routine-4',
    title: 'Afternoon Hydration & Tea',
    category: 'hydration',
    time: '17:00',
    description: 'Herbal tea or 500ml water and light walk/stretching',
    iconKey: 'droplet',
    reminderEnabled: true,
    createdAt: '2026-08-01T08:00:00.000Z',
  },
  {
    id: 'routine-5',
    title: 'Dinner',
    category: 'meal',
    time: '19:30',
    description: 'Comforting evening meal before night medications',
    iconKey: 'utensils',
    reminderEnabled: true,
    createdAt: '2026-08-01T08:00:00.000Z',
  },
  {
    id: 'routine-latrine-1',
    title: 'Morning Bowel Movement / Latrine',
    category: 'bathroom',
    time: '07:15',
    description: 'Daily elimination & digestive regularity check',
    iconKey: 'activity',
    reminderEnabled: false,
    createdAt: '2026-08-01T08:00:00.000Z',
  },
  {
    id: 'routine-6',
    title: 'Bedtime Wind-Down & Water',
    category: 'sleep',
    time: '21:30',
    description: 'Glass of water, dim lights, and prepare for restful sleep',
    iconKey: 'moon',
    reminderEnabled: true,
    createdAt: '2026-08-01T08:00:00.000Z',
  },
];

export function getStoredMedications(): Medication[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_MEDS);
    if (!data) {
      saveMedications(INITIAL_SAMPLE_MEDICATIONS);
      return INITIAL_SAMPLE_MEDICATIONS;
    }
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      // Migrate med-4 (Atorvastatin) if it was on evening 20:30 so it now has night schedule
      const migrated = parsed.map((m: Medication) => {
        if (m.id === 'med-4' && m.schedules.some((s) => s.time === '20:30')) {
          return {
            ...m,
            instructions: 'Take once nightly at bedtime with water for cholesterol management.',
            schedules: m.schedules.map((s) =>
              s.time === '20:30'
                ? {
                    ...s,
                    time: '21:30',
                    slot: 'night' as const,
                    label: 'Night / Bedtime Lipid Support',
                    mealName: 'Bedtime',
                  }
                : s
            ),
          };
        }
        return m;
      });
      return migrated;
    }
    return INITIAL_SAMPLE_MEDICATIONS;
  } catch {
    return INITIAL_SAMPLE_MEDICATIONS;
  }
}

export function saveMedications(medications: Medication[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_MEDS, JSON.stringify(medications));
  } catch (err) {
    console.error('Failed to save medications to localStorage:', err);
  }
}

export function generateDefaultSampleDoseLogs(): DoseLog[] {
  const today = getTodayDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().split('T')[0];

  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const t2Str = twoDaysAgo.toISOString().split('T')[0];

  return [
    // Today
    {
      id: 'log-seed-1',
      date: today,
      medicationId: 'med-1',
      scheduleId: 'sch-1-1',
      scheduledTime: '07:00',
      mealRelation: 'before_meal',
      mealName: 'Breakfast',
      status: 'taken',
      takenAt: `${today}T07:05:12.000Z`,
      notes: 'Taken before breakfast with 250ml warm water',
    },
    // Yesterday
    {
      id: 'log-seed-y1',
      date: yStr,
      medicationId: 'med-1',
      scheduleId: 'sch-1-1',
      scheduledTime: '07:00',
      mealRelation: 'before_meal',
      mealName: 'Breakfast',
      status: 'taken',
      takenAt: `${yStr}T07:04:30.000Z`,
      notes: 'Taken before breakfast',
    },
    {
      id: 'log-seed-y2',
      date: yStr,
      medicationId: 'med-2',
      scheduleId: 'sch-2-1',
      scheduledTime: '08:00',
      mealRelation: 'after_meal',
      mealName: 'Breakfast',
      status: 'taken',
      takenAt: `${yStr}T08:12:00.000Z`,
      notes: 'Blood pressure was 128/82 mmHg',
    },
    {
      id: 'log-seed-y3',
      date: yStr,
      medicationId: 'med-3',
      scheduleId: 'sch-3-1',
      scheduledTime: '13:00',
      mealRelation: 'with_meal',
      mealName: 'Lunch',
      status: 'taken',
      takenAt: `${yStr}T13:15:00.000Z`,
      notes: 'Taken during lunch',
    },
    {
      id: 'log-seed-y4',
      date: yStr,
      medicationId: 'med-4',
      scheduleId: 'sch-4-1',
      scheduledTime: '22:00',
      mealRelation: 'anytime',
      mealName: 'Bedtime',
      status: 'taken',
      takenAt: `${yStr}T22:08:45.000Z`,
      notes: 'Taken before sleep with water',
    },
    // Two Days Ago
    {
      id: 'log-seed-t1',
      date: t2Str,
      medicationId: 'med-1',
      scheduleId: 'sch-1-1',
      scheduledTime: '07:00',
      mealRelation: 'before_meal',
      mealName: 'Breakfast',
      status: 'taken',
      takenAt: `${t2Str}T07:02:00.000Z`,
    },
    {
      id: 'log-seed-t2',
      date: t2Str,
      medicationId: 'med-2',
      scheduleId: 'sch-2-1',
      scheduledTime: '08:00',
      mealRelation: 'after_meal',
      mealName: 'Breakfast',
      status: 'taken',
      takenAt: `${t2Str}T08:09:00.000Z`,
    },
    {
      id: 'log-seed-t3',
      date: t2Str,
      medicationId: 'med-4',
      scheduleId: 'sch-4-1',
      scheduledTime: '22:00',
      mealRelation: 'anytime',
      mealName: 'Bedtime',
      status: 'taken',
      takenAt: `${t2Str}T22:15:00.000Z`,
    },
  ];
}

export function generateDefaultSampleRoutineLogs(): RoutineLog[] {
  const today = getTodayDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().split('T')[0];

  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const t2Str = twoDaysAgo.toISOString().split('T')[0];

  return [
    // Today
    {
      id: 'routine-log-seed-1',
      routineId: 'routine-1',
      date: today,
      status: 'completed',
      completedAt: `${today}T06:20:00.000Z`,
      notes: 'Had oatmeal with blueberries and warm lemon water',
    },
    {
      id: 'routine-log-seed-latrine-today',
      routineId: 'routine-latrine-1',
      date: today,
      status: 'completed',
      completedAt: `${today}T07:22:00.000Z`,
      notes: 'Normal bowel movement, comfortable, regular digestion',
    },
    // Yesterday
    {
      id: 'routine-log-seed-y1',
      routineId: 'routine-1',
      date: yStr,
      status: 'completed',
      completedAt: `${yStr}T06:25:00.000Z`,
      notes: 'Scrambled eggs, whole wheat toast, and green tea',
    },
    {
      id: 'routine-log-seed-y-latrine',
      routineId: 'routine-latrine-1',
      date: yStr,
      status: 'completed',
      completedAt: `${yStr}T07:15:00.000Z`,
      notes: 'Morning latrine / bowel movement, normal stool, no pain',
    },
    {
      id: 'routine-log-seed-y2',
      routineId: 'routine-3',
      date: yStr,
      status: 'completed',
      completedAt: `${yStr}T13:05:00.000Z`,
      notes: 'Lentil soup with mixed vegetables',
    },
    {
      id: 'routine-log-seed-y3',
      routineId: 'routine-5',
      date: yStr,
      status: 'completed',
      completedAt: `${yStr}T19:35:00.000Z`,
      notes: 'Steamed vegetables and grilled fish',
    },
    {
      id: 'routine-log-seed-y4',
      routineId: 'routine-6',
      date: yStr,
      status: 'completed',
      completedAt: `${yStr}T21:40:00.000Z`,
      notes: 'Bedtime glass of water and wind-down',
    },
    // Two Days Ago
    {
      id: 'routine-log-seed-t1',
      routineId: 'routine-1',
      date: t2Str,
      status: 'completed',
      completedAt: `${t2Str}T06:35:00.000Z`,
    },
    {
      id: 'routine-log-seed-t-latrine',
      routineId: 'routine-latrine-1',
      date: t2Str,
      status: 'completed',
      completedAt: `${t2Str}T07:20:00.000Z`,
      notes: 'Daily morning elimination, normal comfort',
    },
    {
      id: 'routine-log-seed-t2',
      routineId: 'routine-3',
      date: t2Str,
      status: 'completed',
      completedAt: `${t2Str}T13:10:00.000Z`,
    },
    {
      id: 'routine-log-seed-t3',
      routineId: 'routine-5',
      date: t2Str,
      status: 'completed',
      completedAt: `${t2Str}T19:40:00.000Z`,
    },
  ];
}

export function getStoredLogs(): DoseLog[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_LOGS);
    if (!data) {
      const initialLogs = generateDefaultSampleDoseLogs();
      saveLogs(initialLogs);
      return initialLogs;
    }
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    const initialLogs = generateDefaultSampleDoseLogs();
    saveLogs(initialLogs);
    return initialLogs;
  } catch {
    return generateDefaultSampleDoseLogs();
  }
}

export function saveLogs(logs: DoseLog[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
  } catch (err) {
    console.error('Failed to save logs to localStorage:', err);
  }
}

export function getReminderSettings(): ReminderSettings {
  try {
    const data = localStorage.getItem(STORAGE_KEY_REMINDER_SETTINGS);
    if (!data) return DEFAULT_REMINDER_SETTINGS;
    return { ...DEFAULT_REMINDER_SETTINGS, ...JSON.parse(data) };
  } catch {
    return DEFAULT_REMINDER_SETTINGS;
  }
}

export function saveReminderSettings(settings: ReminderSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_REMINDER_SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save reminder settings:', err);
  }
}

/**
 * Build the full daily dose items list for a specific date
 * Combines scheduled regular doses with any logged special condition doses
 */
export function getDailyDoseItems(
  date: string,
  medications: Medication[],
  logs: DoseLog[]
): DailyDoseItem[] {
  const result: DailyDoseItem[] = [];
  const dateLogs = logs.filter((l) => l.date === date);

  // 1. Regular scheduled medications
  medications.forEach((med) => {
    if (med.isSpecialCondition) return; // Handled separately below

    med.schedules.forEach((sch) => {
      const existingLog = dateLogs.find(
        (l) => l.medicationId === med.id && l.scheduleId === sch.id
      );

      result.push({
        logId: existingLog?.id || `temp-${med.id}-${sch.id}-${date}`,
        medication: med,
        schedule: sch,
        scheduledTime: sch.time,
        mealRelation: sch.mealRelation,
        mealName: sch.mealName,
        status: existingLog ? existingLog.status : 'pending',
        takenAt: existingLog?.takenAt,
        skippedReason: existingLog?.skippedReason,
        notes: existingLog?.notes,
        isSpecialDose: false,
      });
    });
  });

  // 2. Special condition doses logged for this date
  const specialLogs = dateLogs.filter((l) => l.isSpecialDose);
  specialLogs.forEach((sLog) => {
    const med = medications.find((m) => m.id === sLog.medicationId);
    if (med) {
      result.push({
        logId: sLog.id,
        medication: med,
        scheduledTime: sLog.scheduledTime || (sLog.takenAt ? sLog.takenAt.split('T')[1]?.slice(0, 5) : '12:00'),
        mealRelation: sLog.mealRelation || 'anytime',
        mealName: sLog.mealName,
        status: sLog.status,
        takenAt: sLog.takenAt,
        skippedReason: sLog.skippedReason,
        notes: sLog.notes,
        isSpecialDose: true,
        specialConditionNote: sLog.specialConditionNote,
      });
    }
  });

  // Sort chronologically by scheduled time
  result.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  return result;
}

export function getStoredRoutines(): RoutineItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_ROUTINES);
    if (!data) {
      saveRoutines(INITIAL_SAMPLE_ROUTINES);
      return INITIAL_SAMPLE_ROUTINES;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : INITIAL_SAMPLE_ROUTINES;
  } catch {
    return INITIAL_SAMPLE_ROUTINES;
  }
}

export function saveRoutines(routines: RoutineItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_ROUTINES, JSON.stringify(routines));
  } catch (err) {
    console.error('Failed to save routines to localStorage:', err);
  }
}

export function getStoredRoutineLogs(): RoutineLog[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_ROUTINE_LOGS);
    if (!data) {
      const initialRoutineLogs = generateDefaultSampleRoutineLogs();
      saveRoutineLogs(initialRoutineLogs);
      return initialRoutineLogs;
    }
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    const initialRoutineLogs = generateDefaultSampleRoutineLogs();
    saveRoutineLogs(initialRoutineLogs);
    return initialRoutineLogs;
  } catch {
    return generateDefaultSampleRoutineLogs();
  }
}

export function saveRoutineLogs(logs: RoutineLog[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_ROUTINE_LOGS, JSON.stringify(logs));
  } catch (err) {
    console.error('Failed to save routine logs to localStorage:', err);
  }
}

export function getDailyRoutineItems(
  date: string,
  routines: RoutineItem[],
  logs: RoutineLog[]
): DailyRoutineItem[] {
  const result: DailyRoutineItem[] = [];
  const dateLogs = logs.filter((l) => l.date === date);

  routines.forEach((routine) => {
    const existingLog = dateLogs.find((l) => l.routineId === routine.id);
    result.push({
      logId: existingLog?.id || `temp-routine-${routine.id}-${date}`,
      routine,
      scheduledTime: routine.time,
      status: existingLog ? existingLog.status : 'pending',
      completedAt: existingLog?.completedAt,
      notes: existingLog?.notes,
    });
  });

  result.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  return result;
}
