import React, { useEffect } from 'react';
import { Bell, Check, Clock, X, Volume2, VolumeX, Utensils, AlertTriangle } from 'lucide-react';
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
  isAlarmRinging?: boolean;
  onStopAlarm?: () => void;
  onTakeNow: (alert: ActiveAlert) => void;
  onSnooze: (alert: ActiveAlert) => void;
  onDismiss: () => void;
}

export const ActiveReminderBanner: React.FC<ActiveReminderBannerProps> = ({
  alert,
  isAlarmRinging = false,
  onStopAlarm,
  onTakeNow,
  onSnooze,
  onDismiss,
}) => {
  // Listen for keyboard Space or Escape to immediately silence the alarm
  useEffect(() => {
    if (!alert) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'Space') {
        // Prevent page scroll if Space was pressed to silence
        if (e.code === 'Space' && isAlarmRinging) {
          e.preventDefault();
        }
        if (isAlarmRinging && onStopAlarm) {
          onStopAlarm();
        } else if (e.key === 'Escape') {
          onDismiss();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [alert, isAlarmRinging, onStopAlarm, onDismiss]);

  if (!alert) return null;

  const mealInfo = getMealRelationInfo(alert.schedule.mealRelation, alert.schedule.mealName);

  return (
    <div
      id="active-reminder-toast"
      role="alert"
      aria-live="assertive"
      className={`fixed bottom-5 right-5 left-5 sm:left-auto sm:max-w-md z-50 rounded-2xl shadow-2xl transition-all duration-300 ${
        isAlarmRinging
          ? 'bg-slate-950 text-white border-2 border-amber-400 ring-4 ring-amber-500/30'
          : 'bg-slate-900 text-white border border-teal-500/40'
      } p-4`}
    >
      {/* Urgent pulsating banner when loud alarm is ringing */}
      {isAlarmRinging && (
        <div
          id="alarm-ringing-indicator"
          className="mb-3 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-between gap-2 animate-pulse"
        >
          <div className="flex items-center gap-2 text-amber-300 text-xs font-black tracking-wide uppercase">
            <Volume2 className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
            <span>Loud Patient Alarm is Ringing!</span>
          </div>
          {onStopAlarm && (
            <button
              id="btn-immediate-silence-top"
              type="button"
              onClick={onStopAlarm}
              className="text-[11px] font-bold text-amber-950 bg-amber-300 hover:bg-amber-200 px-2.5 py-0.5 rounded-lg transition-colors flex items-center gap-1 shadow-xs"
            >
              <VolumeX className="w-3 h-3" />
              <span>Stop Sound</span>
            </button>
          )}
        </div>
      )}

      <div className="flex items-start gap-3.5">
        {/* Animated bell or sound wave icon */}
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 ${
            isAlarmRinging
              ? 'bg-gradient-to-br from-amber-500 to-rose-500 animate-pulse shadow-lg shadow-amber-500/30'
              : 'bg-teal-500 shadow-lg shadow-teal-500/20'
          }`}
        >
          {isAlarmRinging ? (
            <Bell className="w-6 h-6 animate-spin-subtle" />
          ) : (
            <Bell className="w-6 h-6" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
                isAlarmRinging ? 'text-amber-400' : 'text-teal-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Due Now • {formatTime24to12(alert.dueTime)}</span>
            </span>
            <button
              id="btn-dismiss-alert-x"
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss alert and stop alarm"
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h4 className="text-base font-extrabold text-white truncate leading-tight">
            {alert.medication.name}{' '}
            <span className="text-xs font-semibold text-slate-300">
              ({alert.medication.dosage})
            </span>
          </h4>

          {/* Prominent meal badge */}
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-800">
            <Utensils className="w-3 h-3 text-amber-400 shrink-0" />
            <span>{mealInfo.label}</span>
          </div>

          <p className="text-xs text-slate-300 line-clamp-2">
            {alert.medication.instructions || mealInfo.description}
          </p>

          {/* Urgent Action buttons */}
          <div className="pt-2 space-y-2">
            {/* If alarm is ringing, provide large immediate Stop Alarm / Silence button */}
            {isAlarmRinging && onStopAlarm && (
              <button
                id="btn-alert-stop-alarm"
                type="button"
                onClick={onStopAlarm}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md transition-all active:scale-98 cursor-pointer"
              >
                <VolumeX className="w-4 h-4 stroke-[2.5]" />
                <span>STOP ALARM (SILENCE SOUND)</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              <button
                id="btn-alert-take-now"
                type="button"
                onClick={() => onTakeNow(alert)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Mark Taken</span>
              </button>

              <button
                id="btn-alert-snooze"
                type="button"
                onClick={() => onSnooze(alert)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              >
                Snooze 10m
              </button>
            </div>

            <p className="text-[10px] text-slate-400 text-center">
              Tip: Press <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-300 font-mono text-[9px]">Space</kbd> or <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-300 font-mono text-[9px]">Esc</kbd> to silence alarm
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
