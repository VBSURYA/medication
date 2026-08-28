import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Filter, 
  Printer, 
  Plus, 
  ArrowLeft, 
  Pill, 
  Utensils, 
  Activity, 
  HeartPulse, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileText,
  TrendingUp,
  CheckCheck,
  ShieldCheck,
  Download
} from 'lucide-react';
import { 
  Medication, 
  RoutineItem, 
  DoseLog, 
  RoutineLog, 
  HistoryEventItem, 
  DayHistoryGroup 
} from '../types.ts';
import { buildDaywiseHistory, formatTimestampTime, formatTimestampShort } from '../utils/history.ts';
import { formatTime24to12 } from '../utils/helpers.ts';
import { DoctorReportModal } from './DoctorReportModal.tsx';
import { QuickHistoryLogModal } from './QuickHistoryLogModal.tsx';

interface HistoryPageProps {
  medications: Medication[];
  doseLogs: DoseLog[];
  routines: RoutineItem[];
  routineLogs: RoutineLog[];
  onNavigateHome: () => void;
  onSaveDoseLog: (log: DoseLog) => void;
  onSaveRoutineLog: (log: RoutineLog, newRoutine?: RoutineItem) => void;
}

type FilterCategory = 'all' | 'medication' | 'meal' | 'bathroom' | 'vitals';
type FilterStatus = 'all' | 'done' | 'skipped';
type DateRange = '7' | '14' | '30' | 'all';

export const HistoryPage: React.FC<HistoryPageProps> = ({
  medications,
  doseLogs,
  routines,
  routineLogs,
  onNavigateHome,
  onSaveDoseLog,
  onSaveRoutineLog,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('all');
  const [selectedStatus, setSelectedStatus] = useState<FilterStatus>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>({});
  
  // Modals
  const [isDoctorReportOpen, setIsDoctorReportOpen] = useState(false);
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);

  // 1. Build daywise descending history
  const allGroups = useMemo(() => {
    return buildDaywiseHistory(medications, doseLogs, routines, routineLogs);
  }, [medications, doseLogs, routines, routineLogs]);

  // 2. Filter groups based on date range, category, status, search
  const filteredGroups = useMemo(() => {
    const now = new Date();

    return allGroups
      .map((group) => {
        // Date range filter
        if (dateRange !== 'all') {
          const daysLimit = parseInt(dateRange, 10);
          const groupDate = new Date(group.date + 'T00:00:00');
          const diffDays = Math.round((now.getTime() - groupDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays > daysLimit) {
            return null;
          }
        }

        // Filter events within day
        const matchingEvents = group.events.filter((event) => {
          // Category filter
          if (selectedCategory === 'medication' && event.type !== 'medication') return false;
          if (selectedCategory === 'meal' && event.category !== 'meal' && event.category !== 'snack') return false;
          if (selectedCategory === 'bathroom' && event.category !== 'bathroom' && event.category !== 'latrine') return false;
          if (selectedCategory === 'vitals' && event.category !== 'vitals') return false;

          // Status filter
          if (selectedStatus === 'done' && event.status !== 'taken' && event.status !== 'completed') return false;
          if (selectedStatus === 'skipped' && event.status !== 'skipped') return false;

          // Search query
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const titleMatch = event.title.toLowerCase().includes(q);
            const subtitleMatch = event.subtitle?.toLowerCase().includes(q);
            const notesMatch = event.notes?.toLowerCase().includes(q);
            const doctorMatch = event.doctorName?.toLowerCase().includes(q);
            const mealNameMatch = event.mealName?.toLowerCase().includes(q);
            if (!titleMatch && !subtitleMatch && !notesMatch && !doctorMatch && !mealNameMatch) {
              return false;
            }
          }

          return true;
        });

        if (matchingEvents.length === 0) return null;

        return {
          ...group,
          events: matchingEvents,
        };
      })
      .filter((g): g is DayHistoryGroup => g !== null);
  }, [allGroups, dateRange, selectedCategory, selectedStatus, searchQuery]);

  // Overall statistics
  const stats = useMemo(() => {
    let takenDoses = 0;
    let skippedDoses = 0;
    let totalMeals = 0;
    let totalLatrine = 0;
    let totalEvents = 0;

    allGroups.forEach((g) => {
      takenDoses += g.medStats.taken;
      skippedDoses += g.medStats.skipped;
      totalMeals += g.routineStats.mealsCount;
      totalLatrine += g.routineStats.latrineCount;
      totalEvents += g.events.filter((e) => e.status === 'taken' || e.status === 'completed').length;
    });

    const recordedDoses = takenDoses + skippedDoses;
    const adherence = recordedDoses > 0 ? Math.round((takenDoses / recordedDoses) * 100) : 100;

    return {
      takenDoses,
      skippedDoses,
      totalMeals,
      totalLatrine,
      totalEvents,
      adherence,
      totalDays: allGroups.length,
    };
  }, [allGroups]);

  const toggleDateCollapse = (date: string) => {
    setCollapsedDates((prev) => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    filteredGroups.forEach((g) => (next[g.date] = true));
    setCollapsedDates(next);
  };

  const expandAll = () => {
    setCollapsedDates({});
  };

  return (
    <div id="history-page-container" className="min-h-screen bg-slate-50/50 pb-16">
      
      {/* Top Breadcrumb & Actions Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 gap-3">
            
            {/* Left: Back button & Breadcrumb */}
            <div className="flex items-center gap-3">
              <button
                id="btn-history-back"
                type="button"
                onClick={onNavigateHome}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs"
              >
                <ArrowLeft className="w-4 h-4 text-teal-600" />
                <span>Today's Schedule</span>
              </button>
              
              <div className="h-4 w-px bg-slate-200 hidden sm:block" />

              <div>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  Patient Clinical History & Adherence Log
                </h1>
                <p className="text-xs text-slate-500 font-medium hidden sm:block">
                  Daywise descending record of medicines, meals, and latrine for doctor visits
                </p>
              </div>
            </div>

            {/* Right: Quick Log + Doctor Print Modal */}
            <div className="flex items-center gap-2">
              <button
                id="btn-history-quick-log"
                type="button"
                onClick={() => setIsQuickLogOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Log Event</span>
              </button>

              <button
                id="btn-open-doctor-report"
                type="button"
                onClick={() => setIsDoctorReportOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-teal-200 bg-teal-50 hover:bg-teal-100/70 text-teal-900 shadow-2xs transition-colors"
              >
                <Printer className="w-4 h-4 text-teal-700" />
                <span>Doctor Summary Sheet</span>
              </button>
            </div>

          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* Doctor Consultation Highlights & KPI Cards */}
        <section aria-label="Clinical Metrics Overview" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Adherence Rate */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Med Adherence
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {stats.adherence}%
              </span>
              <span className="text-xs font-semibold text-emerald-700">
                ({stats.takenDoses} doses taken)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {stats.skippedDoses === 0 ? 'Optimal adherence on schedule' : `${stats.skippedDoses} skipped dose recorded`}
            </p>
          </div>

          {/* Meals Tracked */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Food & Meals
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Utensils className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {stats.totalMeals}
              </span>
              <span className="text-xs font-semibold text-amber-700">
                meals logged
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Breakfast, Lunch, Dinner & Snacks
            </p>
          </div>

          {/* Latrine & Digestion */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Latrine / Bowel
              </span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {stats.totalLatrine}
              </span>
              <span className="text-xs font-semibold text-teal-700">
                regular records
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Elimination regularity & comfort notes
            </p>
          </div>

          {/* Total Days & Records */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Records
              </span>
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                <CheckCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {stats.totalEvents}
              </span>
              <span className="text-xs font-semibold text-sky-700">
                across {stats.totalDays} days
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Saved securely in database & storage
            </p>
          </div>

        </section>

        {/* Filter and Search Control Center */}
        <section aria-label="Filters and Search" className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="input-history-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search medication, meal, latrine note, or doctor..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-teal-500 outline-hidden transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Date Range Selector & View Toggle */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Range:
              </span>
              <select
                id="select-date-range"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRange)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-hidden"
              >
                <option value="all">All Recorded Days</option>
                <option value="7">Past 7 Days</option>
                <option value="14">Past 14 Days</option>
                <option value="30">Past 30 Days</option>
              </select>

              <div className="h-4 w-px bg-slate-200 mx-1" />

              <button
                type="button"
                onClick={expandAll}
                className="text-xs font-medium text-slate-600 hover:text-teal-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
              >
                Expand All
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="text-xs font-medium text-slate-600 hover:text-teal-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
              >
                Collapse All
              </button>
            </div>

          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
              Category:
            </span>

            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Events
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategory('medication')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedCategory === 'medication'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100/60'
              }`}
            >
              <Pill className="w-3.5 h-3.5" />
              <span>Medications ({stats.takenDoses})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategory('meal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedCategory === 'meal'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100/60'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Food & Meals ({stats.totalMeals})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategory('bathroom')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedCategory === 'bathroom'
                  ? 'bg-teal-800 text-white shadow-xs'
                  : 'bg-teal-50/80 text-teal-900 border border-teal-200 hover:bg-teal-100/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Latrine / Bowel ({stats.totalLatrine})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedCategory('vitals')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedCategory === 'vitals'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100/60'
              }`}
            >
              <HeartPulse className="w-3.5 h-3.5" />
              <span>Vitals</span>
            </button>

            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSelectedStatus(selectedStatus === 'all' ? 'done' : selectedStatus === 'done' ? 'skipped' : 'all')}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Status: <span className="font-bold text-teal-700 capitalize">{selectedStatus}</span>
              </button>
            </div>

          </div>

        </section>

        {/* Daywise History Entries (Descending Order) */}
        <section aria-label="Daywise History Entries" className="space-y-4">
          
          {filteredGroups.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs max-w-md mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No matching log entries found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Try clearing your search query or switching filters to view previous days.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedStatus('all');
                  setDateRange('all');
                }}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 text-white hover:bg-teal-700 transition-colors"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            filteredGroups.map((group) => {
              const isCollapsed = Boolean(collapsedDates[group.date]);

              return (
                <div
                  key={group.date}
                  id={`history-day-${group.date}`}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all"
                >
                  {/* Day Header Row */}
                  <div
                    onClick={() => toggleDateCollapse(group.date)}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 border-b border-slate-100 select-none transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 font-black shrink-0">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                            {group.displayDate}
                          </h2>
                          <span className="font-mono text-xs text-slate-400 font-normal">
                            ({group.date})
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {group.events.length} total activity items tracked for this day
                        </p>
                      </div>
                    </div>

                    {/* Day Summary Badges & Collapse Arrow */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {group.medStats.taken} Meds Taken
                      </span>
                      {group.medStats.skipped > 0 && (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                          {group.medStats.skipped} Skipped
                        </span>
                      )}
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        {group.routineStats.mealsCount} Meals
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                        {group.routineStats.latrineCount} Bowel
                      </span>

                      <button
                        type="button"
                        aria-label={isCollapsed ? 'Expand day' : 'Collapse day'}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 ml-1 transition-colors"
                      >
                        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Day Events Timeline */}
                  {!isCollapsed && (
                    <div className="divide-y divide-slate-100">
                      {group.events.map((event) => {
                        const isDone = event.status === 'taken' || event.status === 'completed';
                        const isSkipped = event.status === 'skipped';
                        const isPending = event.status === 'pending';

                        return (
                          <div 
                            key={event.id} 
                            className={`p-4 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                              isSkipped ? 'bg-rose-50/20' : 'hover:bg-slate-50/40'
                            }`}
                          >
                            {/* Left Side: Category Icon, Title, Timing Info */}
                            <div className="flex items-start gap-3.5 min-w-0 flex-1">
                              
                              {/* Category Icon */}
                              <div className="shrink-0 mt-0.5">
                                {event.type === 'medication' ? (
                                  <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
                                    <Pill className="w-4 h-4" />
                                  </div>
                                ) : event.category === 'bathroom' || event.category === 'latrine' ? (
                                  <div className="w-9 h-9 rounded-xl bg-teal-100 border border-teal-300 flex items-center justify-center text-teal-800">
                                    <Activity className="w-4 h-4" />
                                  </div>
                                ) : event.category === 'meal' || event.category === 'snack' ? (
                                  <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                                    <Utensils className="w-4 h-4" />
                                  </div>
                                ) : (
                                  <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                                    <Sparkles className="w-4 h-4" />
                                  </div>
                                )}
                              </div>

                              {/* Title, Subtitle, Notes */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-sm font-bold text-slate-900">
                                    {event.title}
                                  </h4>
                                  
                                  {event.mealRelation && (
                                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                      {event.mealRelation.replace('_', ' ')}
                                      {event.mealName ? ` (${event.mealName})` : ''}
                                    </span>
                                  )}

                                  {(event.category === 'bathroom' || event.category === 'latrine') && (
                                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-teal-100 text-teal-900 border border-teal-200">
                                      Latrine / Bowel
                                    </span>
                                  )}

                                  {event.doctorName && (
                                    <span className="text-[11px] text-slate-400 font-medium">
                                      Prescribed by Dr. {event.doctorName}
                                    </span>
                                  )}
                                </div>

                                {event.subtitle && (
                                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                                    {event.subtitle}
                                  </p>
                                )}

                                {/* Specific recorded notes (e.g. food eaten, latrine notes, blood pressure) */}
                                {event.notes && (
                                  <div className="mt-1.5 text-xs text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200/80 font-medium flex items-start gap-1.5">
                                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                    <span>{event.notes}</span>
                                  </div>
                                )}

                                {isSkipped && event.skippedReason && (
                                  <div className="mt-1.5 text-xs text-rose-800 bg-rose-50 p-2 rounded-lg border border-rose-200 font-medium flex items-start gap-1.5">
                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                                    <span>Reason: {event.skippedReason}</span>
                                  </div>
                                )}
                              </div>

                            </div>

                            {/* Right Side: Exact Timestamp & Status Badges */}
                            <div className="flex flex-row sm:flex-col sm:items-end justify-between items-center sm:justify-center gap-1.5 shrink-0 pl-12 sm:pl-0">
                              
                              {/* Exact Logged Timestamp */}
                              {event.recordedAt ? (
                                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-900 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Recorded: {formatTimestampTime(event.recordedAt)}</span>
                                </div>
                              ) : (
                                <div className="text-xs text-slate-400 font-mono">
                                  Scheduled: {formatTime24to12(event.scheduledTime)}
                                </div>
                              )}

                              {/* Scheduled Time Comparison */}
                              {event.recordedAt && (
                                <span className="text-[11px] text-slate-500 font-medium">
                                  Scheduled: {formatTime24to12(event.scheduledTime)}
                                </span>
                              )}

                              {/* Status Badge */}
                              <div>
                                {isDone && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Completed</span>
                                  </span>
                                )}
                                {isSkipped && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                                    <span>Skipped</span>
                                  </span>
                                )}
                                {isPending && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    <span>Unrecorded</span>
                                  </span>
                                )}
                              </div>

                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              );
            })
          )}

        </section>

      </main>

      {/* Doctor Report Print Sheet Modal */}
      <DoctorReportModal
        isOpen={isDoctorReportOpen}
        onClose={() => setIsDoctorReportOpen(false)}
        historyGroups={filteredGroups}
      />

      {/* Quick History Log Entry Modal */}
      <QuickHistoryLogModal
        isOpen={isQuickLogOpen}
        onClose={() => setIsQuickLogOpen(false)}
        medications={medications}
        routines={routines}
        onSaveDoseLog={onSaveDoseLog}
        onSaveRoutineLog={onSaveRoutineLog}
      />

    </div>
  );
};
