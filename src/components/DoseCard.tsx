import React, { useState } from 'react';
import { 
  Check, 
  Clock, 
  RotateCcw, 
  Utensils, 
  Bell, 
  Info, 
  AlertCircle, 
  Pill, 
  ChevronDown, 
  ChevronUp, 
  ShieldAlert,
  Edit2,
  Trash2
} from 'lucide-react';
import { DailyDoseItem, DoseStatus } from '../types.ts';
import { formatTime24to12, getMealRelationInfo, COLOR_PALETTES } from '../utils/helpers.ts';

interface DoseCardProps {
  item: DailyDoseItem;
  onUpdateStatus: (item: DailyDoseItem, newStatus: DoseStatus, skippedReason?: string) => void;
  onOpenEditMed: (medicationId: string) => void;
  onOpenSkipModal: (item: DailyDoseItem) => void;
  onDeleteMedication?: (medicationId: string) => void;
}

export const DoseCard: React.FC<DoseCardProps> = ({
  item,
  onUpdateStatus,
  onOpenEditMed,
  onOpenSkipModal,
  onDeleteMedication,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showCardDeleteConfirm, setShowCardDeleteConfirm] = useState(false);
  const { medication, scheduledTime, mealRelation, mealName, status, takenAt, skippedReason } = item;

  const mealInfo = getMealRelationInfo(mealRelation, mealName);
  const colorScheme = COLOR_PALETTES[medication.color] || COLOR_PALETTES.teal;

  const isTaken = status === 'taken';
  const isSkipped = status === 'skipped';
  const isPending = status === 'pending';

  // Format taken timestamp
  const formatTakenTime = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div
      id={`dose-card-${item.logId}`}
      className={`relative rounded-2xl transition-all duration-200 border ${
        isTaken
          ? 'bg-emerald-50/40 border-emerald-200/90 shadow-2xs'
          : isSkipped
          ? 'bg-slate-50/80 border-slate-200 opacity-75'
          : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
      }`}
    >
      <div className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          
          {/* Left Column: Time, Pill Icon, Medication Name & Meal Badge */}
          <div className="flex items-start gap-3.5 min-w-0 flex-1">
            
            {/* Pill / Form Icon in colored badge */}
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                isTaken 
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-700' 
                  : `${colorScheme.lightBg} ${colorScheme.border} ${colorScheme.text}`
              }`}
            >
              {isTaken ? (
                <Check className="w-6 h-6 stroke-[2.5]" />
              ) : (
                <Pill className="w-6 h-6 stroke-[2]" />
              )}
            </div>

            {/* Med details */}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                {/* Scheduled Time */}
                <div className="flex items-center gap-1 font-mono text-sm font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-md">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{formatTime24to12(scheduledTime)}</span>
                </div>

                {/* Prominent Meal Relation Badge: The key feature requested! */}
                <div
                  className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border ${mealInfo.badgeBg} ${mealInfo.badgeBorder} ${mealInfo.badgeText}`}
                >
                  <Utensils className="w-3 h-3 shrink-0" />
                  <span>{mealInfo.label}</span>
                </div>

                {/* Special Condition indicator */}
                {item.isSpecialDose && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 border border-purple-200 text-purple-800">
                    <ShieldAlert className="w-3 h-3" /> Special / SOS
                  </span>
                )}

                {/* Reminder active tag */}
                {item.schedule?.reminderEnabled && (
                  <span 
                    title={`Reminder active (${item.schedule.reminderMinutesBefore === 0 ? 'at time' : `${item.schedule.reminderMinutesBefore}m before`})`}
                    className="inline-flex items-center gap-0.5 text-[10px] font-medium text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200"
                  >
                    <Bell className="w-2.5 h-2.5 text-amber-500" />
                    <span>Alarm</span>
                  </span>
                )}
              </div>

              {/* Title & Dosage */}
              <div className="flex items-baseline gap-2 pt-0.5">
                <h3 className={`text-base font-bold truncate ${isTaken ? 'text-emerald-950 line-through decoration-emerald-600/50' : 'text-slate-900'}`}>
                  {medication.name}
                </h3>
                <span className="text-xs font-semibold text-slate-500 shrink-0">
                  {medication.dosage}
                </span>
              </div>

              {/* Meal Instruction Helper Line */}
              <p className="text-xs text-slate-600 flex items-center gap-1">
                <span className="font-medium text-slate-700">{mealInfo.description}</span>
              </p>
            </div>
          </div>

          {/* Right Column: Actions & Status */}
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
            
            {/* When Taken */}
            {isTaken && (
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-300">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Taken at {formatTakenTime(takenAt) || 'on time'}</span>
                  </div>
                </div>
                <button
                  id={`btn-undo-dose-${item.logId}`}
                  type="button"
                  onClick={() => onUpdateStatus(item, 'pending')}
                  title="Mark as not taken / undo"
                  className="text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 p-2 rounded-lg transition-colors inline-flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Undo</span>
                </button>
              </div>
            )}

            {/* When Skipped */}
            {isSkipped && (
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-200/80 px-2.5 py-1 rounded-lg">
                    <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
                    <span>Skipped {skippedReason ? `(${skippedReason})` : ''}</span>
                  </span>
                </div>
                <button
                  id={`btn-undo-skip-${item.logId}`}
                  type="button"
                  onClick={() => onUpdateStatus(item, 'pending')}
                  title="Undo skip status"
                  className="text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 p-2 rounded-lg transition-colors inline-flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Undo</span>
                </button>
              </div>
            )}

            {/* When Pending: Mark Taken & Skip buttons */}
            {isPending && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  id={`btn-skip-dose-${item.logId}`}
                  type="button"
                  onClick={() => onOpenSkipModal(item)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-2.5 py-2 rounded-lg border border-slate-200 transition-colors"
                >
                  Skip
                </button>

                <button
                  id={`btn-mark-taken-${item.logId}`}
                  type="button"
                  onClick={() => onUpdateStatus(item, 'taken')}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Mark as Taken</span>
                </button>
              </div>
            )}

            {/* Expand details toggle */}
            <button
              id={`btn-toggle-details-${item.logId}`}
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Toggle instructions and details"
            >
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

        </div>

        {/* Collapsible Instructions & Metadata */}
        {showDetails && (
          <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-2 bg-slate-50/50 p-3 rounded-xl">
            {medication.instructions && (
              <div className="flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-700">Patient Instructions: </span>
                  <span>{medication.instructions}</span>
                </div>
              </div>
            )}

            {item.isSpecialDose && item.specialConditionNote && (
              <div className="flex items-start gap-2 text-purple-800">
                <ShieldAlert className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Condition Reported: </span>
                  <span>{item.specialConditionNote}</span>
                </div>
              </div>
            )}

            {medication.doctorName && (
              <p className="text-[11px] text-slate-500">
                Prescribed by: <strong className="text-slate-700">{medication.doctorName}</strong>
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
              <span className="text-[11px] text-slate-400">
                Form: {medication.form} • Meal rule: {mealInfo.tag}
              </span>
              <div className="flex items-center gap-3">
                {onDeleteMedication && (
                  showCardDeleteConfirm ? (
                    <div className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg text-[11px]">
                      <span className="font-bold text-rose-700">Delete medicine?</span>
                      <button
                        type="button"
                        onClick={() => onDeleteMedication(medication.id)}
                        className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold transition-colors"
                      >
                        Yes, Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCardDeleteConfirm(false)}
                        className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowCardDeleteConfirm(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete Medicine</span>
                    </button>
                  )
                )}

                <button
                  id={`btn-edit-med-${medication.id}`}
                  type="button"
                  onClick={() => onOpenEditMed(medication.id)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Edit Schedule & Settings</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
