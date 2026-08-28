import React from 'react';
import { Bell, Check, Clock, X, Volume2, Utensils } from 'lucide-react';
import { Medication, ScheduleItem } from '../types.ts';
import { formatTime24to12, getMealRelationInfo } from '../utils/helpers.ts';

export interface ActiveAlert {
  id: string;
  medication: Medication;
  schedule: ScheduleItem;
  dueTime: string;
}

interface ActiveReminderBannerProps {
  alert: ActiveAlert | null;
  onTakeNow: (alert: ActiveAlert) => void;
  onSnooze: (alert: ActiveAlert) => void;
  onDismiss: () => void;
}

export const ActiveReminderBanner: React.FC<ActiveReminderBannerProps> = ({
  alert,
  onTakeNow,
  onSnooze,
  onDismiss,
}) => {
  if (!alert) return null;

  const mealInfo = getMealRelationInfo(alert.schedule.mealRelation, alert.schedule.mealName);

  return (
    <div
      id="active-reminder-toast"
      className="fixed bottom-5 right-5 left-5 sm:left-auto sm:max-w-md z-50 bg-slate-900 text-white rounded-2xl shadow-2xl border border-teal-500/40 p-4 animate-bounce-subtle"
    >
      <div className="flex items-start gap-3">
        {/* Animated bell icon */}
        <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center text-white shrink-0 animate-pulse">
          <Bell className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-300 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Medication Due Now
            </span>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss alert"
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h4 className="text-sm font-bold text-white truncate">
            {alert.medication.name}{' '}
            <span className="text-xs font-normal text-slate-300">({alert.medication.dosage})</span>
          </h4>

          {/* Prominent meal badge */}
          <div className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-800">
            <Utensils className="w-3 h-3" />
            <span>{mealInfo.label}</span>
          </div>

          <p className="text-xs text-slate-300 pt-0.5">
            {alert.medication.instructions || mealInfo.description}
          </p>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              id="btn-alert-take-now"
              type="button"
              onClick={() => onTakeNow(alert)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-xs transition-colors"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Mark Taken</span>
            </button>

            <button
              id="btn-alert-snooze"
              type="button"
              onClick={() => onSnooze(alert)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
            >
              Snooze 10m
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
