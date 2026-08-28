import React from 'react';
import { X, Printer, Pill, Clock, Utensils, ShieldAlert, Check, Apple } from 'lucide-react';
import { Medication, ScheduleItem, RoutineItem } from '../types.ts';
import { formatTime24to12, getMealRelationInfo } from '../utils/helpers.ts';

interface PrintScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  medications: Medication[];
  routines?: RoutineItem[];
}

export const PrintScheduleModal: React.FC<PrintScheduleModalProps> = ({
  isOpen,
  onClose,
  medications,
  routines = [],
}) => {
  if (!isOpen) return null;

  // Flatten regular schedules sorted by time
  const routineRows: {
    schedule: ScheduleItem;
    med: Medication;
  }[] = [];

  medications
    .filter((m) => !m.isSpecialCondition)
    .forEach((med) => {
      med.schedules.forEach((sch) => {
        routineRows.push({ schedule: sch, med });
      });
    });

  routineRows.sort((a, b) => a.schedule.time.localeCompare(b.schedule.time));

  // Sort routines by time
  const sortedRoutines = [...routines].sort((a, b) => a.time.localeCompare(b.time));

  const specialMeds = medications.filter((m) => m.isSpecialCondition);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none">
        
        {/* Header (hidden in actual print if desired or styled cleanly) */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-teal-600" />
            <h2 className="text-base font-bold text-slate-900">
              Printable Patient Medication Routine
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-trigger-print"
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Schedule</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Document */}
        <div className="overflow-y-auto p-6 sm:p-8 space-y-6 flex-1 print:p-0 print:overflow-visible">
          
          {/* Document Header */}
          <div className="border-b-2 border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Pill className="w-6 h-6 text-teal-700" />
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Patient Medication & Meal Schedule
                </h1>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Daily Administration Protocol & Meal Association Guide
              </p>
            </div>
            <div className="text-right text-xs text-slate-500 font-mono">
              Generated: {new Date().toLocaleDateString(undefined, { dateStyle: 'long' })}
            </div>
          </div>

          {/* Routine Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
              <Clock className="w-4 h-4 text-teal-700" />
              <span>1. Scheduled Routine Medications (Daily)</span>
            </h3>

            <div className="overflow-x-auto rounded-xl border border-slate-300">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-300">
                  <tr>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Medication & Strength</th>
                    <th className="py-2.5 px-3">Food & Meal Timing</th>
                    <th className="py-2.5 px-3">Instructions / Doctor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {routineRows.map(({ schedule, med }) => {
                    const mealInfo = getMealRelationInfo(schedule.mealRelation, schedule.mealName);
                    return (
                      <tr key={`${med.id}-${schedule.id}`} className="hover:bg-slate-50/60">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatTime24to12(schedule.time)}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{med.name}</div>
                          <div className="text-slate-500">{med.dosage} ({med.form})</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-block font-bold px-2 py-0.5 rounded border ${mealInfo.badgeBg} ${mealInfo.badgeBorder} ${mealInfo.badgeText}`}>
                            {mealInfo.label}
                          </span>
                          <div className="text-[11px] text-slate-600 mt-0.5">{mealInfo.description}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          <div>{med.instructions || 'Take as directed'}</div>
                          {med.doctorName && (
                            <div className="text-[10px] text-slate-400 mt-0.5">Dr: {med.doctorName}</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Daily Meals & Wellness Routines Table */}
          {sortedRoutines.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-amber-900 flex items-center gap-1.5 uppercase tracking-wide">
                <Utensils className="w-4 h-4 text-amber-700" />
                <span>2. Daily Meal & Wellness Routine Schedule</span>
              </h3>

              <div className="overflow-x-auto rounded-xl border border-amber-300">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-amber-100/70 text-amber-900 uppercase font-bold border-b border-amber-300">
                    <tr>
                      <th className="py-2.5 px-3">Time</th>
                      <th className="py-2.5 px-3">Routine / Meal Title</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Details & Instructions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100">
                    {sortedRoutines.map((r) => (
                      <tr key={r.id} className="hover:bg-amber-50/40">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatTime24to12(r.time)}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900">
                          {r.title}
                        </td>
                        <td className="py-3 px-3">
                          <span className="capitalize px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 font-semibold">
                            {r.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {r.description || 'Daily scheduled routine'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Special Condition Table */}
          {specialMeds.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-purple-900 flex items-center gap-1.5 uppercase tracking-wide">
                <ShieldAlert className="w-4 h-4 text-purple-700" />
                <span>3. Special Condition & As-Needed (PRN) Medications</span>
              </h3>

              <div className="overflow-x-auto rounded-xl border border-purple-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-purple-50 text-purple-900 uppercase font-bold border-b border-purple-200">
                    <tr>
                      <th className="py-2.5 px-3">Medication</th>
                      <th className="py-2.5 px-3">Dose</th>
                      <th className="py-2.5 px-3">Condition / Symptom Trigger</th>
                      <th className="py-2.5 px-3">Maximum Allowed</th>
                      <th className="py-2.5 px-3">Specific Instructions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-100">
                    {specialMeds.map((med) => (
                      <tr key={med.id} className="hover:bg-purple-50/30">
                        <td className="py-3 px-3 font-bold text-slate-900">{med.name}</td>
                        <td className="py-3 px-3 font-semibold text-slate-700">{med.dosage}</td>
                        <td className="py-3 px-3 font-bold text-purple-800">
                          {med.specialConditionReason}
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          Max {med.specialMaxDosesPerDay || 3} doses / 24h
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {med.instructions || 'Follow doctor directions'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes Box */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-800">Important Patient Guidance:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Always check the meal relationship badge (Before Eating, With Food, or After Eating) before swallowing oral tablets.</li>
              <li>Do not crush or chew extended-release capsules unless approved by your physician or pharmacist.</li>
              <li>Keep this schedule pinned to your medicine cabinet or refrigerator for daily checklist guidance.</li>
            </ul>
          </div>

        </div>

      </div>
    </div>
  );
};
