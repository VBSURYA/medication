import React, { useState } from 'react';
import { 
  Check, 
  Clock, 
  Utensils, 
  Coffee, 
  Apple, 
  Droplets, 
  Footprints, 
  HeartPulse, 
  Moon, 
  Sparkles,
  Edit2,
  Trash2,
  RotateCcw,
  Activity
} from 'lucide-react';
import { DailyRoutineItem, RoutineStatus } from '../types.ts';
import { formatTime24to12 } from '../utils/helpers.ts';

interface RoutineCardProps {
  item: DailyRoutineItem;
  onToggleStatus: (item: DailyRoutineItem) => void;
  onEditRoutine: (routineId: string) => void;
  onDeleteRoutine: (routineId: string) => void;
}

export const RoutineCard: React.FC<RoutineCardProps> = ({
  item,
  onToggleStatus,
  onEditRoutine,
  onDeleteRoutine,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { routine, scheduledTime, status, completedAt, notes } = item;

  const isCompleted = status === 'completed';

  // Format completed timestamp
  const formatCompletedTime = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Get icon and color scheme based on category
  const getCategoryConfig = (category: string) => {
    switch (category) {
      case 'meal':
        return {
          label: 'Meal',
          icon: <Utensils className="w-5 h-5" />,
          lightBg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-800',
          accent: 'bg-amber-600 hover:bg-amber-700',
          pillBg: 'bg-amber-100/80 border-amber-300 text-amber-900',
        };
      case 'snack':
        return {
          label: 'Snack / Second Meal',
          icon: <Apple className="w-5 h-5" />,
          lightBg: 'bg-orange-50',
          border: 'border-orange-200',
          text: 'text-orange-800',
          accent: 'bg-orange-600 hover:bg-orange-700',
          pillBg: 'bg-orange-100/80 border-orange-300 text-orange-900',
        };
      case 'hydration':
        return {
          label: 'Hydration',
          icon: <Droplets className="w-5 h-5" />,
          lightBg: 'bg-sky-50',
          border: 'border-sky-200',
          text: 'text-sky-800',
          accent: 'bg-sky-600 hover:bg-sky-700',
          pillBg: 'bg-sky-100/80 border-sky-300 text-sky-900',
        };
      case 'vitals':
        return {
          label: 'Health Check / Vitals',
          icon: <HeartPulse className="w-5 h-5" />,
          lightBg: 'bg-rose-50',
          border: 'border-rose-200',
          text: 'text-rose-800',
          accent: 'bg-rose-600 hover:bg-rose-700',
          pillBg: 'bg-rose-100/80 border-rose-300 text-rose-900',
        };
      case 'activity':
        return {
          label: 'Activity & Exercise',
          icon: <Footprints className="w-5 h-5" />,
          lightBg: 'bg-emerald-50',
          border: 'border-emerald-200',
          text: 'text-emerald-800',
          accent: 'bg-emerald-600 hover:bg-emerald-700',
          pillBg: 'bg-emerald-100/80 border-emerald-300 text-emerald-900',
        };
      case 'sleep':
        return {
          label: 'Bedtime / Wind Down',
          icon: <Moon className="w-5 h-5" />,
          lightBg: 'bg-purple-50',
          border: 'border-purple-200',
          text: 'text-purple-800',
          accent: 'bg-purple-600 hover:bg-purple-700',
          pillBg: 'bg-purple-100/80 border-purple-300 text-purple-900',
        };
      case 'bathroom':
      case 'latrine':
        return {
          label: 'Latrine / Bowel Movement',
          icon: <Activity className="w-5 h-5" />,
          lightBg: 'bg-teal-50',
          border: 'border-teal-200',
          text: 'text-teal-900',
          accent: 'bg-teal-700 hover:bg-teal-800',
          pillBg: 'bg-teal-100/80 border-teal-300 text-teal-950',
        };
      default:
        return {
          label: 'Routine',
          icon: <Sparkles className="w-5 h-5" />,
          lightBg: 'bg-slate-50',
          border: 'border-slate-200',
          text: 'text-slate-800',
          accent: 'bg-slate-700 hover:bg-slate-800',
          pillBg: 'bg-slate-100 border-slate-300 text-slate-800',
        };
    }
  };

  const config = getCategoryConfig(routine.category);

  return (
    <div
      id={`routine-card-${item.logId}`}
      className={`relative rounded-2xl transition-all duration-200 border ${
        isCompleted
          ? 'bg-emerald-50/40 border-emerald-200/90 shadow-2xs'
          : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
      }`}
    >
      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          
          {/* Left Column: Icon, Time, Title, Description */}
          <div className="flex items-start gap-3.5 min-w-0 flex-1">
            
            {/* Category Icon Badge */}
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                isCompleted
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                  : `${config.lightBg} ${config.border} ${config.text}`
              }`}
            >
              {isCompleted ? (
                <Check className="w-6 h-6 stroke-[2.5]" />
              ) : (
                config.icon
              )}
            </div>

            {/* Routine details */}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                {/* Scheduled Time */}
                <div className="flex items-center gap-1 font-mono text-sm font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-md">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{formatTime24to12(scheduledTime)}</span>
                </div>

                {/* Category Pill */}
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border ${config.pillBg}`}>
                  {config.label}
                </span>

                {/* Completion Status Badge */}
                {isCompleted && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Done {completedAt ? `at ${formatCompletedTime(completedAt)}` : ''}
                  </span>
                )}
              </div>

              {/* Title & Notes */}
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <span className={isCompleted ? 'line-through text-slate-500' : ''}>
                    {routine.title}
                  </span>
                </h3>

                {routine.description && (
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    {routine.description}
                  </p>
                )}

                {notes && (
                  <p className="text-xs text-emerald-800 font-medium mt-1 bg-emerald-50/70 px-2 py-0.5 rounded border border-emerald-100 inline-block">
                    Note: {notes}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Actions */}
          <div className="flex items-center sm:self-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 justify-between sm:justify-end">
            
            {/* Edit Button */}
            <button
              type="button"
              onClick={() => onEditRoutine(routine.id)}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              title="Edit Routine"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            {/* Delete Button */}
            {showDeleteConfirm ? (
              <div className="flex items-center gap-1.5 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200 animate-in fade-in">
                <span className="text-[11px] font-bold text-rose-800">Delete?</span>
                <button
                  type="button"
                  onClick={() => onDeleteRoutine(routine.id)}
                  className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-bold"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-1.5 py-0.5 text-slate-600 hover:bg-slate-200 rounded text-[11px]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Delete Routine"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {/* Toggle Completion Button */}
            {isCompleted ? (
              <button
                type="button"
                onClick={() => onToggleStatus(item)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition-colors shadow-2xs"
              >
                <Check className="w-4 h-4 text-emerald-700 stroke-[3]" />
                <span>Done</span>
                <RotateCcw className="w-3 h-3 ml-0.5 text-emerald-600" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onToggleStatus(item)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-all ${config.accent}`}
              >
                <Check className="w-4 h-4" />
                <span>Mark Done</span>
              </button>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
