import React from 'react';
import { 
  X, 
  Printer, 
  FileText, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  User, 
  Stethoscope,
  Pill,
  Utensils,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { DayHistoryGroup } from '../types.ts';
import { formatTimestampTime } from '../utils/history.ts';
import { formatTime24to12 } from '../utils/helpers.ts';

interface DoctorReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  historyGroups: DayHistoryGroup[];
  patientName?: string;
}

export const DoctorReportModal: React.FC<DoctorReportModalProps> = ({
  isOpen,
  onClose,
  historyGroups,
  patientName = 'Primary Patient',
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  // Compute aggregate statistics
  let totalDosesTaken = 0;
  let totalDosesSkipped = 0;
  let totalMealsLogged = 0;
  let totalLatrineLogged = 0;

  historyGroups.forEach((g) => {
    totalDosesTaken += g.medStats.taken;
    totalDosesSkipped += g.medStats.skipped;
    totalMealsLogged += g.routineStats.mealsCount;
    totalLatrineLogged += g.routineStats.latrineCount;
  });

  const totalDosesRecorded = totalDosesTaken + totalDosesSkipped;
  const overallAdherence = totalDosesRecorded > 0
    ? Math.round((totalDosesTaken / totalDosesRecorded) * 100)
    : 100;

  const dateRangeStr = historyGroups.length > 0
    ? `${historyGroups[historyGroups.length - 1].date} to ${historyGroups[0].date}`
    : 'Recent Dates';

  return (
    <div 
      id="modal-doctor-report-overlay" 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white"
    >
      <div 
        id="modal-doctor-report-container" 
        className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none"
      >
        {/* Header - Screen only */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-xs">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Doctor Consultation Summary Report
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Daywise log of medications, meal timings, and bowel movements for physician review
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              id="btn-print-doctor-report"
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Report</span>
            </button>
            <button
              id="btn-close-doctor-report"
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Clinical Sheet Body */}
        <div className="overflow-y-auto p-6 sm:p-8 space-y-6 print:p-4 print:space-y-4 text-slate-800">
          
          {/* Clinical Header */}
          <div className="border-b-2 border-teal-700 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">
                  CLINICAL ADHERENCE & SCHEDULE LOG
                </h1>
                <p className="text-xs text-teal-800 font-semibold uppercase tracking-wider mt-0.5">
                  MedSchedule Patient Care Documentation
                </p>
              </div>
              <div className="text-right sm:text-right">
                <span className="inline-block px-2.5 py-1 rounded-md bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold">
                  Doctor Visit Copy
                </span>
                <p className="text-xs text-slate-500 mt-1">Generated on: {new Date().toLocaleDateString()}</p>
              </div>
            </div>

            {/* Patient & Range Meta */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block font-medium">Patient:</span>
                <span className="font-bold text-slate-900">{patientName}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Logged Period:</span>
                <span className="font-bold text-slate-900">{dateRangeStr}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Med Adherence:</span>
                <span className="font-bold text-emerald-700">{overallAdherence}% ({totalDosesTaken}/{totalDosesRecorded} doses)</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Bowel Regularity:</span>
                <span className="font-bold text-teal-700">{totalLatrineLogged} bowel movements recorded</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
            <div className="p-2">
              <span className="text-xs text-slate-500 font-medium block">Doses Taken</span>
              <span className="text-lg font-extrabold text-emerald-700">{totalDosesTaken}</span>
            </div>
            <div className="p-2 border-l border-slate-200">
              <span className="text-xs text-slate-500 font-medium block">Doses Missed/Skipped</span>
              <span className={`text-lg font-extrabold ${totalDosesSkipped > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                {totalDosesSkipped}
              </span>
            </div>
            <div className="p-2 border-l border-slate-200">
              <span className="text-xs text-slate-500 font-medium block">Meals Recorded</span>
              <span className="text-lg font-extrabold text-amber-700">{totalMealsLogged}</span>
            </div>
            <div className="p-2 border-l border-slate-200">
              <span className="text-xs text-slate-500 font-medium block">Latrine / Bowel Record</span>
              <span className="text-lg font-extrabold text-teal-700">{totalLatrineLogged}</span>
            </div>
          </div>

          {/* Daywise Schedule Breakdown (Descending Order) */}
          <div className="space-y-6">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
              <Calendar className="w-4 h-4 text-teal-600" />
              Daywise Log Entries (Descending Order)
            </h2>

            {historyGroups.map((group) => {
              const recordedEvents = group.events.filter(
                (e) => e.status === 'taken' || e.status === 'completed' || e.status === 'skipped'
              );

              return (
                <div 
                  key={group.date} 
                  className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs break-inside-avoid"
                >
                  {/* Day Header */}
                  <div className="bg-slate-100/90 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {group.displayDate}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">({group.date})</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {group.medStats.taken} Taken
                      </span>
                      {group.medStats.skipped > 0 && (
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                          {group.medStats.skipped} Skipped
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                        {group.routineStats.mealsCount} Meals
                      </span>
                      <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                        {group.routineStats.latrineCount} Bowel Movement
                      </span>
                    </div>
                  </div>

                  {/* Events Table */}
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/60 text-slate-600 font-bold">
                        <th className="py-2 px-3 w-28">Logged Time</th>
                        <th className="py-2 px-3 w-28">Scheduled</th>
                        <th className="py-2 px-3 w-24">Type</th>
                        <th className="py-2 px-3">Item / Event Name</th>
                        <th className="py-2 px-3">Timing / Food / Latrine Notes</th>
                        <th className="py-2 px-3 w-24 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recordedEvents.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-3 px-3 text-center text-slate-400 italic">
                            No events completed or recorded for this date
                          </td>
                        </tr>
                      ) : (
                        recordedEvents.map((e) => (
                          <tr key={e.id} className="hover:bg-slate-50/50">
                            {/* Logged Exact Timestamp */}
                            <td className="py-2 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                              {e.recordedAt ? formatTimestampTime(e.recordedAt) : '-'}
                            </td>

                            {/* Scheduled Time */}
                            <td className="py-2 px-3 text-slate-500 font-mono whitespace-nowrap">
                              {formatTime24to12(e.scheduledTime)}
                            </td>

                            {/* Type */}
                            <td className="py-2 px-3">
                              {e.type === 'medication' ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-teal-700">
                                  <Pill className="w-3 h-3" /> Med
                                </span>
                              ) : e.category === 'bathroom' ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-purple-700">
                                  <Activity className="w-3 h-3" /> Latrine
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                                  <Utensils className="w-3 h-3" /> Meal
                                </span>
                              )}
                            </td>

                            {/* Name & Subtitle */}
                            <td className="py-2 px-3 font-medium text-slate-900">
                              <div>{e.title}</div>
                              {e.subtitle && (
                                <div className="text-[11px] text-slate-500">{e.subtitle}</div>
                              )}
                            </td>

                            {/* Notes / Relation */}
                            <td className="py-2 px-3 text-slate-600">
                              {e.mealRelation && (
                                <span className="font-medium text-slate-800 mr-1.5">
                                  [{e.mealRelation.replace('_', ' ')}]
                                </span>
                              )}
                              {e.notes || e.skippedReason || '-'}
                            </td>

                            {/* Status */}
                            <td className="py-2 px-3 text-right">
                              {e.status === 'taken' || e.status === 'completed' ? (
                                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" /> Done
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                  <AlertTriangle className="w-3 h-3" /> Skipped
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>

          {/* Physician Consultation Notes Section */}
          <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/50 break-inside-avoid">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Physician Consultation Notes & Prescription Adjustments
            </h3>
            <div className="h-20 border-b border-dashed border-slate-300"></div>
            <div className="flex items-center justify-between pt-3 text-xs text-slate-500">
              <span>Doctor's Signature / Stamp: ___________________________</span>
              <span>Date: ____ / ____ / ________</span>
            </div>
          </div>

        </div>

        {/* Footer actions - Screen only */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between print:hidden">
          <p className="text-xs text-slate-500">
            Tip: Press Ctrl+P or Command+P to print this clinical document anytime.
          </p>
          <div className="flex items-center gap-2">
            <button
              id="btn-footer-close-doctor-report"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl transition-colors"
            >
              Close
            </button>
            <button
              id="btn-footer-print-doctor-report"
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Clinical Copy</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
