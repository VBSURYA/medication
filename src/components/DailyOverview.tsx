import React, { useState, useEffect, useMemo } from 'react';
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
  Pill,
  Activity,
  Droplets,
  Zap
} from 'lucide-react';
import { DailyDoseItem, DailyRoutineItem, MealRelation } from '../types.ts';
import { formatTime24to12, getMealRelationInfo, getTodayDateString } from '../utils/helpers.ts';

export type FilterStatus = 'all' | 'pending' | 'taken' | 'medications' | 'routines' | 'skipped' | 'special';

interface DailyOverviewProps {
  items: DailyDoseItem[];
  routineItems?: DailyRoutineItem[];
  specialMedsCount: number;
  activeFilter: FilterStatus;
  currentDate?: string;
  currentHHMM?: string;
  onFilterChange: (filter: FilterStatus) => void;
  onQuickTakeDose: (item: DailyDoseItem) => void;
  onQuickCompleteRoutine?: (item: DailyRoutineItem) => void;
}

export const DailyOverview: React.FC<DailyOverviewProps> = ({
  items,
  routineItems = [],
  specialMedsCount,
  activeFilter,
  currentDate,
  currentHHMM,
  onFilterChange,
  onQuickTakeDose,
  onQuickCompleteRoutine,
}) => {
  // 1. Live minute tracking for dynamic upcoming dose calculation
  const [liveHHMM, setLiveHHMM] = useState<string>(() => {
    if (currentHHMM) return currentHHMM;
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  useEffect(() => {
    if (currentHHMM) {
      setLiveHHMM(currentHHMM);
    }
  }, [currentHHMM]);

  // Keep live time updated every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      setLiveHHMM((prev) => (prev !== hhmm ? hhmm : prev));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

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

  // 2. Determine Next Upcoming Action (Medication or Meal / Routine) based on CURRENT TIME
  const activeDate = currentDate || getTodayDateString();
  const today = getTodayDateString();
  const isToday = activeDate === today;
  const isFuture = activeDate > today;
  const isPast = activeDate < today;

  const [currH, currM] = liveHHMM.split(':').map(Number);
  const nowTotalMinutes = (isNaN(currH) ? 12 : currH) * 60 + (isNaN(currM) ? 0 : currM);

  const { primaryActionItem, earlierPendingItems } = useMemo(() => {
    // Map pending regular medications
    const pendingMeds = regularItems
      .filter((it) => it.status === 'pending')
      .map((it) => {
        const [h, m] = it.scheduledTime.split(':').map(Number);
        const itemTotalMinutes = (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
        const diff = isToday ? itemTotalMinutes - nowTotalMinutes : isFuture ? 9999 : -9999;
        return {
          type: 'med' as const,
          id: it.logId || it.medication.id,
          scheduledTime: it.scheduledTime,
          totalMinutes: itemTotalMinutes,
          diffMinutes: diff,
          isDueNow: isToday && diff <= 0 && diff >= -15,
          isOverdue: isToday && diff < -15,
          isFutureDate: isFuture,
          isPastDate: isPast,
          title: it.medication.name,
          subtitle: it.medication.dosage,
          mealRelation: it.mealRelation,
          mealName: it.mealName,
          medicationItem: it,
          routineCategory: undefined,
          routineItem: undefined,
        };
      });

    // Map pending routines
    const pendingRoutines = routineItems
      .filter((r) => r.status === 'pending')
      .map((r) => {
        const [h, m] = r.scheduledTime.split(':').map(Number);
        const itemTotalMinutes = (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
        const diff = isToday ? itemTotalMinutes - nowTotalMinutes : isFuture ? 9999 : -9999;
        return {
          type: 'routine' as const,
          id: r.logId || r.routine.id,
          scheduledTime: r.scheduledTime,
          totalMinutes: itemTotalMinutes,
          diffMinutes: diff,
          isDueNow: isToday && diff <= 0 && diff >= -15,
          isOverdue: isToday && diff < -15,
          isFutureDate: isFuture,
          isPastDate: isPast,
          title: r.routine.title,
          subtitle: r.routine.description || `${r.routine.category} schedule`,
          mealRelation: undefined as MealRelation | undefined,
          mealName: undefined as string | undefined,
          medicationItem: undefined,
          routineCategory: r.routine.category,
          routineItem: r,
        };
      });

    // Unified list of all pending items
    const allPending = [...pendingMeds, ...pendingRoutines];

    // Sort chronologically
    allPending.sort((a, b) => {
      if (a.scheduledTime !== b.scheduledTime) {
        return a.scheduledTime.localeCompare(b.scheduledTime);
      }
      // When at the exact same scheduled time:
      // 1. Medicine with before_meal goes before routine
      if (a.type === 'med' && a.mealRelation === 'before_meal') return -1;
      if (b.type === 'med' && b.mealRelation === 'before_meal') return 1;
      // 2. Meal routine comes before medicine with after_meal
      if (a.type === 'routine' && b.type === 'med' && b.mealRelation === 'after_meal') return -1;
      if (b.type === 'routine' && a.type === 'med' && a.mealRelation === 'after_meal') return 1;
      return 0;
    });

    // Upcoming or currently active items:
    // - On future date: all pending items are upcoming
    // - On today: items with diffMinutes >= -15 (scheduled in the future or within current 15m window)
    // - On past date: none upcoming
    const upcomingOrActive = isFuture
      ? allPending
      : isToday
        ? allPending.filter((it) => it.diffMinutes >= -15)
        : [];

    // Earlier missed items:
    // - On today: items scheduled more than 15 minutes in the past that are still pending
    // - On past date: all pending items from that past day
    const earlier = isToday
      ? allPending.filter((it) => it.diffMinutes < -15)
      : isPast
        ? allPending
        : [];

    let primary = null;
    if (upcomingOrActive.length > 0) {
      primary = upcomingOrActive[0];
    } else if (earlier.length > 0) {
      // If no upcoming items left today, show the earliest missed item
      primary = earlier[0];
    }

    return {
      primaryActionItem: primary,
      earlierPendingItems: earlier,
    };
  }, [regularItems, routineItems, isToday, isFuture, isPast, nowTotalMinutes]);

  // Compute friendly relative time badge
  const getRelativeBadge = (diffMinutes: number) => {
    if (!isToday) {
      if (isFuture) return { label: 'Tomorrow', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      return { label: 'Past Date', className: 'bg-slate-100 text-slate-600 border-slate-200' };
    }

    if (diffMinutes < -15) {
      const overdueHours = Math.floor(Math.abs(diffMinutes) / 60);
      const overdueMins = Math.abs(diffMinutes) % 60;
      const label = overdueHours > 0 
        ? (overdueMins > 0 ? `${overdueHours}h ${overdueMins}m overdue` : `${overdueHours}h overdue`)
        : `${overdueMins}m overdue`;
      return { label, className: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold' };
    }

    if (diffMinutes <= 0 && diffMinutes >= -15) {
      return { label: 'Due Right Now', className: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold' };
    }

    if (diffMinutes <= 60) {
      return { label: `in ~${diffMinutes}m`, className: 'bg-teal-50 text-teal-800 border-teal-200 font-semibold' };
    }

    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    const label = mins > 0 ? `in ~${hours}h ${mins}m` : `in ~${hours}h`;
    return { label, className: 'bg-slate-100 text-slate-700 border-slate-200 font-medium' };
  };

  // Compute header title
  const getHeaderTitle = (item: NonNullable<typeof primaryActionItem>) => {
    if (item.isOverdue) {
      return item.type === 'med' ? 'Pending Dose from Earlier Today' : 'Pending Routine from Earlier Today';
    }

    if (item.isDueNow) {
      if (item.type === 'med') return 'Medication Due Right Now';
      if (item.routineCategory === 'meal') return 'Meal Due Right Now';
      if (item.routineCategory === 'bathroom') return 'Latrine Check Due Right Now';
      return 'Routine Due Right Now';
    }

    if (item.isFutureDate) {
      if (item.type === 'med') return 'Upcoming Dose (Tomorrow)';
      if (item.routineCategory === 'meal') return 'Upcoming Meal (Tomorrow)';
      return 'Upcoming Routine (Tomorrow)';
    }

    if (item.isPastDate) {
      return item.type === 'med' ? 'Unlogged Dose from Past Date' : 'Unlogged Routine from Past Date';
    }

    // Default next upcoming today
    if (item.type === 'med') return 'Next Upcoming Dose';
    if (item.routineCategory === 'meal') return 'Next Upcoming Meal';
    if (item.routineCategory === 'bathroom') return 'Next Upcoming Latrine / Check';
    if (item.routineCategory === 'hydration') return 'Next Upcoming Hydration';
    return 'Next Upcoming Routine';
  };

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
            {primaryActionItem ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5 truncate">
                    {primaryActionItem.type === 'med' ? (
                      <Pill className="w-3 h-3 text-teal-600 shrink-0" />
                    ) : primaryActionItem.routineCategory === 'meal' ? (
                      <Utensils className="w-3 h-3 text-amber-600 shrink-0" />
                    ) : primaryActionItem.routineCategory === 'bathroom' ? (
                      <Activity className="w-3 h-3 text-rose-600 shrink-0" />
                    ) : primaryActionItem.routineCategory === 'hydration' ? (
                      <Droplets className="w-3 h-3 text-blue-600 shrink-0" />
                    ) : (
                      <Apple className="w-3 h-3 text-amber-600 shrink-0" />
                    )}
                    <span className="truncate">{getHeaderTitle(primaryActionItem)}</span>
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {formatTime24to12(primaryActionItem.scheduledTime)}
                    </span>
                    {(() => {
                      const badge = getRelativeBadge(primaryActionItem.diffMinutes);
                      return (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${badge.className}`}>
                          {badge.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {primaryActionItem.type === 'med' ? (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {primaryActionItem.title}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {primaryActionItem.subtitle}
                        </p>
                      </div>

                      <button
                        id="btn-quick-take-next"
                        type="button"
                        onClick={() => onQuickTakeDose(primaryActionItem.medicationItem!)}
                        className="shrink-0 inline-flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Taken</span>
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-600 flex items-center gap-1.5 pt-0.5">
                      <Utensils className="w-3 h-3 text-amber-600 shrink-0" />
                      <span className="truncate">
                        {getMealRelationInfo(primaryActionItem.mealRelation, primaryActionItem.mealName).label}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {primaryActionItem.title}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {primaryActionItem.subtitle}
                        </p>
                      </div>

                      {onQuickCompleteRoutine && (
                        <button
                          id="btn-quick-complete-routine"
                          type="button"
                          onClick={() => onQuickCompleteRoutine(primaryActionItem.routineItem!)}
                          className="shrink-0 inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Done</span>
                        </button>
                      )}
                    </div>

                    <div className="text-[11px] text-amber-800 font-medium flex items-center gap-1.5 pt-0.5">
                      <Apple className="w-3 h-3 text-amber-600 shrink-0" />
                      <span className="capitalize">{primaryActionItem.routineCategory} Schedule</span>
                    </div>
                  </>
                )}

                {/* Sub-notice if earlier morning items are still pending */}
                {isToday && earlierPendingItems.length > 0 && primaryActionItem !== earlierPendingItems[0] && (
                  <div id="earlier-missed-alert-banner" className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <p className="text-[11px] text-amber-900 font-medium truncate">
                        <span className="font-bold text-amber-800">{earlierPendingItems.length} earlier item{earlierPendingItems.length > 1 ? 's' : ''} pending: </span>
                        <span className="font-semibold text-slate-800">{earlierPendingItems[0].title}</span>{' '}
                        <span className="text-slate-500 font-mono">({formatTime24to12(earlierPendingItems[0].scheduledTime)})</span>
                      </p>
                    </div>
                    <button
                      id="btn-take-earlier-missed"
                      type="button"
                      onClick={() => {
                        if (earlierPendingItems[0].type === 'med' && earlierPendingItems[0].medicationItem) {
                          onQuickTakeDose(earlierPendingItems[0].medicationItem);
                        } else if (earlierPendingItems[0].type === 'routine' && earlierPendingItems[0].routineItem && onQuickCompleteRoutine) {
                          onQuickCompleteRoutine(earlierPendingItems[0].routineItem);
                        }
                      }}
                      className="shrink-0 text-[11px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2 py-0.5 rounded transition-colors"
                    >
                      Take Now
                    </button>
                  </div>
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
