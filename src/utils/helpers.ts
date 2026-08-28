import { MealRelation, TimeSlot } from '../types.ts';

export function formatTime24to12(time24: string): string {
  if (!time24) return '';
  const [hoursStr, minutesStr] = time24.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = minutesStr || '00';
  if (isNaN(hours)) return time24;

  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // '0' becomes '12'
  return `${hours}:${minutes} ${ampm}`;
}

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(dateStr: string): string {
  const today = getTodayDateString();
  const d = new Date(dateStr + 'T00:00:00');
  
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  };
  const formatted = d.toLocaleDateString(undefined, options);

  if (dateStr === today) {
    return `Today, ${formatted}`;
  }
  
  // Check yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().split('T')[0];
  if (dateStr === yStr) {
    return `Yesterday, ${formatted}`;
  }

  // Check tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tStr = tomorrow.toISOString().split('T')[0];
  if (dateStr === tStr) {
    return `Tomorrow, ${formatted}`;
  }

  return formatted;
}

export function getTimeSlotFromTime(time24: string): TimeSlot {
  if (!time24) return 'morning';
  const hour = parseInt(time24.split(':')[0], 10);
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

export interface MealInfo {
  label: string;
  tag: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  iconType: 'before' | 'after' | 'with' | 'empty' | 'anytime';
  description: string;
}

export function getMealRelationInfo(relation: MealRelation, mealName?: string): MealInfo {
  const name = mealName || 'Food';

  switch (relation) {
    case 'before_meal':
      return {
        label: `Before ${name}`,
        tag: 'Before Eating',
        badgeBg: 'bg-amber-50',
        badgeText: 'text-amber-800',
        badgeBorder: 'border-amber-200',
        iconType: 'before',
        description: `Take 30 minutes before eating ${name.toLowerCase()}`
      };
    case 'after_meal':
      return {
        label: `After ${name}`,
        tag: 'After Eating',
        badgeBg: 'bg-emerald-50',
        badgeText: 'text-emerald-800',
        badgeBorder: 'border-emerald-200',
        iconType: 'after',
        description: `Take 20-30 minutes after finishing ${name.toLowerCase()}`
      };
    case 'with_meal':
      return {
        label: `With ${name}`,
        tag: 'With Food',
        badgeBg: 'bg-blue-50',
        badgeText: 'text-blue-800',
        badgeBorder: 'border-blue-200',
        iconType: 'with',
        description: `Take while having your ${name.toLowerCase()}`
      };
    case 'empty_stomach':
      return {
        label: 'Empty Stomach',
        tag: 'Empty Stomach',
        badgeBg: 'bg-purple-50',
        badgeText: 'text-purple-800',
        badgeBorder: 'border-purple-200',
        iconType: 'empty',
        description: 'Take 1 hour before eating or 2 hours after'
      };
    case 'anytime':
    default:
      return {
        label: 'Anytime',
        tag: 'No Food Restriction',
        badgeBg: 'bg-slate-100',
        badgeText: 'text-slate-700',
        badgeBorder: 'border-slate-200',
        iconType: 'anytime',
        description: 'May be taken with or without food'
      };
  }
}

export const COLOR_PALETTES: Record<string, { bg: string; border: string; text: string; lightBg: string }> = {
  teal: {
    bg: 'bg-teal-500',
    border: 'border-teal-300',
    text: 'text-teal-700',
    lightBg: 'bg-teal-50',
  },
  blue: {
    bg: 'bg-blue-500',
    border: 'border-blue-300',
    text: 'text-blue-700',
    lightBg: 'bg-blue-50',
  },
  indigo: {
    bg: 'bg-indigo-500',
    border: 'border-indigo-300',
    text: 'text-indigo-700',
    lightBg: 'bg-indigo-50',
  },
  emerald: {
    bg: 'bg-emerald-500',
    border: 'border-emerald-300',
    text: 'text-emerald-700',
    lightBg: 'bg-emerald-50',
  },
  amber: {
    bg: 'bg-amber-500',
    border: 'border-amber-300',
    text: 'text-amber-700',
    lightBg: 'bg-amber-50',
  },
  rose: {
    bg: 'bg-rose-500',
    border: 'border-rose-300',
    text: 'text-rose-700',
    lightBg: 'bg-rose-50',
  },
  purple: {
    bg: 'bg-purple-500',
    border: 'border-purple-300',
    text: 'text-purple-700',
    lightBg: 'bg-purple-50',
  },
  orange: {
    bg: 'bg-orange-500',
    border: 'border-orange-300',
    text: 'text-orange-700',
    lightBg: 'bg-orange-50',
  },
};
