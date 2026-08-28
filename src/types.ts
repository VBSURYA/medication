export type MealRelation = 
  | 'before_meal' 
  | 'after_meal' 
  | 'with_meal' 
  | 'empty_stomach' 
  | 'anytime';

export type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'night' | 'custom';

export type MedicationForm = 
  | 'tablet' 
  | 'capsule' 
  | 'syrup' 
  | 'injection' 
  | 'inhaler' 
  | 'drops' 
  | 'cream' 
  | 'patch' 
  | 'other';

export interface ScheduleItem {
  id: string;
  time: string; // "07:00", "13:00", "20:00" in 24h
  slot: TimeSlot;
  label?: string; // e.g. "Morning Dose"
  mealRelation: MealRelation;
  mealName?: string; // "Breakfast", "Lunch", "Dinner", "Bedtime"
  reminderEnabled: boolean;
  reminderMinutesBefore: number; // 0, 5, 10, 15
  soundEnabled: boolean;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string; // e.g. "20 mg", "500 mg", "1 tablet", "2 puffs"
  form: MedicationForm;
  color: string; // hex or color key like 'emerald', 'sky', 'indigo', 'amber', 'rose', 'purple'
  instructions: string; // e.g. "Drink with a full glass of water. Do not lie down for 30 mins."
  doctorName?: string;
  inventoryCount?: number; // pills left
  isSpecialCondition: boolean; // PRN / As Needed
  specialConditionReason?: string; // e.g. "For acute migraine or severe headache", "When BP > 140"
  specialMaxDosesPerDay?: number; // e.g. 3
  schedules: ScheduleItem[]; // For regular medications
  createdAt: string;
}

export type DoseStatus = 'pending' | 'taken' | 'skipped';

export interface DoseLog {
  id: string;
  date: string; // "YYYY-MM-DD"
  medicationId: string;
  scheduleId?: string; // Present for routine scheduled doses
  scheduledTime?: string; // "07:00"
  mealRelation: MealRelation;
  mealName?: string;
  status: DoseStatus;
  takenAt?: string; // ISO string when taken
  skippedReason?: string;
  notes?: string;
  isSpecialDose?: boolean;
  specialConditionNote?: string;
}

export interface DailyDoseItem {
  logId: string;
  medication: Medication;
  schedule?: ScheduleItem;
  scheduledTime: string;
  mealRelation: MealRelation;
  mealName?: string;
  status: DoseStatus;
  takenAt?: string;
  skippedReason?: string;
  notes?: string;
  isSpecialDose: boolean;
  specialConditionNote?: string;
}

export type RoutineCategory = 
  | 'meal' 
  | 'snack' 
  | 'hydration' 
  | 'vitals' 
  | 'activity' 
  | 'sleep'
  | 'latrine' 
  | 'other';

export interface RoutineItem {
  id: string;
  title: string; // e.g. "Breakfast", "9 AM Morning Snack", "Lunch", "Dinner"
  category: RoutineCategory;
  time: string; // "06:00", "09:00" in 24h
  description?: string;
  iconKey?: string; // 'utensils', 'coffee', 'apple', 'droplet', 'activity', 'footprints', 'moon', 'heart-pulse'
  reminderEnabled: boolean;
  createdAt: string;
}

export type RoutineStatus = 'pending' | 'completed' | 'skipped';

export interface RoutineLog {
  id: string;
  routineId: string;
  date: string; // "YYYY-MM-DD"
  status: RoutineStatus;
  completedAt?: string; // ISO string
  notes?: string;
}

export interface DailyRoutineItem {
  logId: string;
  routine: RoutineItem;
  scheduledTime: string;
  status: RoutineStatus;
  completedAt?: string;
  notes?: string;
}

export type UnifiedTimelineItem = 
  | { type: 'medication'; data: DailyDoseItem; time: string }
  | { type: 'routine'; data: DailyRoutineItem; time: string };
