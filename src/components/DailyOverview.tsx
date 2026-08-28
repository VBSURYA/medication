import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Sparkles, 
  ArrowRight, 
  Utensils, 
  CheckCheck,
  ShieldAlert,
  Apple,
  Pill
} from 'lucide-react';
import { DailyDoseItem, DailyRoutineItem } from '../types.ts';
import { formatTime24to12, getMealRelationInfo } from '../utils/helpers.ts';

export type FilterStatus = 'all' | 'pending' | 'taken' | 'medications' | 'routines' | 'skipped' | 'special';

interface DailyOverviewProps {
  items: DailyDoseItem[];
  routineItems?: DailyRoutineItem[];
  specialMedsCount: number;
  activeFilter: FilterStatus;
  onFilterChange: (filter: FilterStatus) => void;
  onQuickTakeDose: (item: DailyDoseItem) => void;
  onQuickCompleteRoutine?: (item: DailyRoutineItem) => void;
}

export const DailyOverview: React.FC<DailyOverviewProps> = ({
  items,
  routineItems = [],
  specialMedsCount,
  activeFilter,
  onFilterChange,
  onQuickTakeDose,
  onQuickCompleteRoutine,
}) => {
  // Only regular scheduled items contribute to the standard daily progress
  const regularItems = items.filter((it) => !it.isSpecialDose);
  const totalMedsCount = regularItems.length;
  const takenMedsCount = regularItems.filter((it) => it.status === 'taken').length;
  const pendingMedsCount = regularItems.filter((it) => it.status === 'pending').length;
  const skippedCount = regularItems.filter((it) => it.status === 'skipped').length;

  // Routines metrics
  const totalRoutinesCount = routineItems.length;
  const completedRoutinesCount = routineItems.filter((r) => r.status === 'completed').length;
  const pendingRoutinesCount = routineItems.filter((r) => r.status === 'pending').length;

  // Combined totals
  const totalCombined = totalMedsCount + totalRoutinesCount;
  const completedCombined = takenMedsCount + completedRoutinesCount;
  const pendingCombined = pendingMedsCount + pendingRoutinesCount;

  const percentage = totalCombined > 0 
    ? Math.round((completedCombined / totalCombined) * 100) 
    : 100;

  // Find next pending item (either medication dose or meal/routine, sorted by scheduled time)
  const nextPendingMed = regularItems.find((it) => it.status === 'pending');
  const nextPendingRoutine = routineItems.find((r) => r.status === 'pending');

  let nextUpcoming: { type: 'med'; item: DailyDoseItem } | { type: 'routine'; item: DailyRoutineItem } | null = null;

  if (nextPendingMed && nextPendingRoutine) {
    if (nextPendingRoutine.scheduledTime <= nextPendingMed.scheduledTime) {
      nextUpcoming = { type: 'routine', item: nextPendingRoutine };
    } else {
      nextUpcoming = { type: 'med', item: nextPendingMed };
    }
  } else if (nextPendingMed) {
    nextUpcoming = { type: 'med', item: nextPendingMed };
  } else if (nextPendingRoutine) {
    nextUpcoming = { type: 'routine', item: nextPendingRoutine };
  }

  return (
    <div id="daily-overview-container" className="space-y-4">
      {/* Primary Status Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Progress Circle & Text */}
          <div className="lg:col-span-7 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
              {/* SVG Ring */}
              <svg className="w-20 h-20 -rotate-90 transform" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-teal-600 transition-all duration-700 ease-out"
                  strokeDasharray={`${percentage}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-extrabold text-slate-900 leading-none">
                  {percentage}%
                </span>
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                  Done
                </span>
              </div>
            </div>

            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Daily Schedule & Meal Regimen
                </h2>
                {percentage === 100 && totalCombined > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    <CheckCheck className="w-3 h-3" /> All Complete
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-slate-600">
                {totalCombined === 0 ? (
                  'No scheduled items for this day.'
                ) : percentage === 100 ? (
                  'All scheduled medications, meals, and routines have been completed. Great job maintaining your health schedule!'
                ) : (
                  <span>
                    <strong className="text-teal-700 font-semibold">{completedCombined}</strong> of{' '}
                    <strong className="text-slate-800 font-semibold">{totalCombined}</strong> daily actions completed today.{' '}
                    <strong className="text-amber-700 font-semibold">{pendingCombined}</strong> pending.
                  </span>
                )}
              </p>

              {/* Mini Stat Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs font-medium">
                  <Pill className="w-3.5 h-3.5 text-teal-600" />
                  <span>{takenMedsCount}/{totalMedsCount} Meds</span>
                </div>

                {totalRoutinesCount > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                    <Utensils className="w-3.5 h-3.5 text-amber-600" />
                    <span>{completedRoutinesCount}/{totalRoutinesCount} Meals & Routines</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-800 text-xs font-medium">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>{pendingCombined} Pending</span>
                </div>

                {skippedCount > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
                    <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
                    <span>{skippedCount} Skipped</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Next Action Callout */}
          <div className="lg:col-span-5 bg-slate-50 rounded-xl border border-slate-200/80 p-4">
            {nextUpcoming ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-teal-600" /> 
                    {nextUpcoming.type === 'med' ? 'Next Upcoming Dose' : 'Next Upcoming Meal / Routine'}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {formatTime24to12(nextUpcoming.item.scheduledTime)}
                  </span>
                </div>

                {nextUpcoming.type === 'med' ? (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {nextUpcoming.item.medication.name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {nextUpcoming.item.medication.dosage}
                        </p>
                      </div>

                      <button
                        id="btn-quick-take-next"
                        type="button"
                        onClick={() => onQuickTakeDose((nextUpcoming as { type: 'med'; item: DailyDoseItem }).item)}
                        className="shrink-0 inline-flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Taken</span>
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-600 flex items-center gap-1.5 pt-0.5">
                      <Utensils className="w-3 h-3 text-amber-600 shrink-0" />
                      <span className="truncate">
                        {getMealRelationInfo(nextUpcoming.item.mealRelation, nextUpcoming.item.mealName).label}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {nextUpcoming.item.routine.title}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {nextUpcoming.item.routine.description || 'Scheduled daily routine'}
                        </p>
                      </div>

                      {onQuickCompleteRoutine && (
                        <button
                          id="btn-quick-complete-routine"
                          type="button"
                          onClick={() => onQuickCompleteRoutine((nextUpcoming as { type: 'routine'; item: DailyRoutineItem }).item)}
                          className="shrink-0 inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Done</span>
                        </button>
                      )}
                    </div>

                    <div className="text-[11px] text-amber-800 font-medium flex items-center gap-1.5 pt-0.5">
                      <Apple className="w-3 h-3 text-amber-600 shrink-0" />
                      <span className="capitalize">{nextUpcoming.item.routine.category} Schedule</span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 py-1">
                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    No Pending Schedule
                  </p>
                  <p className="text-xs text-slate-500">
                    All scheduled medications and meals for today are complete!
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Filter Tabs */}
      <div id="status-filter-bar" className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <div className="flex items-center gap-1.5">
          <button
            id="filter-all"
            type="button"
            onClick={() => onFilterChange('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              activeFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            All Events ({totalCombined})
          </button>

          <button
            id="filter-pending"
            type="button"
            onClick={() => onFilterChange('pending')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              activeFilter === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Pending ({pendingCombined})
          </button>

          <button
            id="filter-medications"
            type="button"
            onClick={() => onFilterChange('medications')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeFilter === 'medications'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Pill className="w-3.5 h-3.5" />
            <span>Medications ({totalMedsCount})</span>
          </button>

          <button
            id="filter-routines"
            type="button"
            onClick={() => onFilterChange('routines')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeFilter === 'routines'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Meals & Routines ({totalRoutinesCount})</span>
          </button>

          <button
            id="filter-taken"
            type="button"
            onClick={() => onFilterChange('taken')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              activeFilter === 'taken'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Completed ({completedCombined})
          </button>

          {skippedCount > 0 && (
            <button
              id="filter-skipped"
              type="button"
              onClick={() => onFilterChange('skipped')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeFilter === 'skipped'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Skipped ({skippedCount})
            </button>
          )}

          <button
            id="filter-special"
            type="button"
            onClick={() => onFilterChange('special')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeFilter === 'special'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-white text-purple-700 hover:bg-purple-50 border border-purple-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Special / SOS ({specialMedsCount})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
