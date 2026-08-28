import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Plus, 
  Clock, 
  CheckCircle2, 
  Info, 
  AlertTriangle, 
  Pill,
  Sparkles,
  Edit2,
  Trash2
} from 'lucide-react';
import { Medication, DailyDoseItem } from '../types.ts';
import { COLOR_PALETTES } from '../utils/helpers.ts';

interface SpecialMedicationSectionProps {
  specialMedications: Medication[];
  todaySpecialDoses: DailyDoseItem[];
  onOpenLogSpecialModal: (med: Medication) => void;
  onOpenAddModal: () => void;
  onOpenEditMed: (medId: string) => void;
  onDeleteMedication?: (medId: string) => void;
}

export const SpecialMedicationSection: React.FC<SpecialMedicationSectionProps> = ({
  specialMedications,
  todaySpecialDoses,
  onOpenLogSpecialModal,
  onOpenAddModal,
  onOpenEditMed,
  onDeleteMedication,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  return (
    <div id="special-condition-section" className="bg-white rounded-2xl border border-purple-200/90 p-5 sm:p-6 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-100 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Special Condition & As-Needed (PRN)</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                SOS
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Medications taken only when specific symptoms or clinical conditions occur
            </p>
          </div>
        </div>

        <button
          id="btn-add-special-med"
          type="button"
          onClick={onOpenAddModal}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-lg transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Special Medicine</span>
        </button>
      </div>

      {/* Grid of Special Medicines */}
      {specialMedications.length === 0 ? (
        <div className="p-6 text-center bg-purple-50/40 rounded-xl border border-dashed border-purple-200">
          <ShieldAlert className="w-8 h-8 text-purple-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No special condition medicines configured</p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            You can add as-needed medications (like migraine relief, asthma inhalers, or emergency painkillers) that do not follow a fixed daily hour.
          </p>
          <button
            type="button"
            onClick={onOpenAddModal}
            className="mt-3 text-xs font-bold text-purple-700 underline"
          >
            Add an As-Needed Medication
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {specialMedications.map((med) => {
            const dosesTakenToday = todaySpecialDoses.filter((d) => d.medication.id === med.id);
            const maxDoses = med.specialMaxDosesPerDay || 4;
            const reachedMax = dosesTakenToday.length >= maxDoses;
            const colorScheme = COLOR_PALETTES[med.color] || COLOR_PALETTES.purple;

            return (
              <div
                key={med.id}
                id={`special-card-${med.id}`}
                className="bg-slate-50/70 hover:bg-slate-50 rounded-xl border border-slate-200 p-4 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${colorScheme.lightBg} ${colorScheme.border} ${colorScheme.text}`}
                    >
                      <Pill className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-bold text-slate-900">{med.name}</h3>
                        <span className="text-xs text-slate-500 font-semibold">{med.dosage}</span>
                      </div>
                      <p className="text-xs font-semibold text-purple-800 mt-0.5">
                        Trigger: {med.specialConditionReason || 'As instructed by doctor'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {confirmDeleteId === med.id ? (
                      <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 p-1 rounded-lg">
                        <span className="text-[11px] font-bold text-rose-700">Delete?</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (onDeleteMedication) onDeleteMedication(med.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px]"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onOpenEditMed(med.id)}
                          title="Edit Medication"
                          className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-100 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {onDeleteMedication && (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(med.id)}
                            title="Delete Medication"
                            className="text-rose-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Safety & Max doses guidance */}
                <div className="flex items-center justify-between text-xs bg-white px-3 py-2 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Safety Limit: Max {maxDoses} doses/day</span>
                  </div>
                  <div className="font-bold">
                    <span className={reachedMax ? 'text-rose-600' : 'text-slate-800'}>
                      {dosesTakenToday.length}
                    </span>
                    <span className="text-slate-400"> / {maxDoses} taken</span>
                  </div>
                </div>

                {/* Instructions snippet */}
                {med.instructions && (
                  <p className="text-xs text-slate-600 line-clamp-2">
                    <strong className="text-slate-700">Instructions: </strong>
                    {med.instructions}
                  </p>
                )}

                {/* Log Dose Button */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500">
                    {dosesTakenToday.length > 0 ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Taken {dosesTakenToday.length}x today
                      </span>
                    ) : (
                      'Not taken yet today'
                    )}
                  </span>

                  <button
                    id={`btn-log-special-${med.id}`}
                    type="button"
                    onClick={() => onOpenLogSpecialModal(med)}
                    disabled={reachedMax}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
                      reachedMax
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-purple-700 hover:bg-purple-800 text-white'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{reachedMax ? 'Daily Limit Reached' : 'Log Special Dose'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
