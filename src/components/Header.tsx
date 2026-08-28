import React from 'react';
import { 
  Pill, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Settings2, 
  Printer, 
  Bell, 
  BellOff, 
  Volume2,
  Database,
  Utensils,
  Clock
} from 'lucide-react';
import { formatDisplayDate, getTodayDateString } from '../utils/helpers.ts';
import { soundManager } from '../utils/audio.ts';
import { DbStatusResponse } from '../utils/api.ts';

interface HeaderProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  onOpenAddModal: () => void;
  onOpenAddRoutineModal?: () => void;
  onOpenManageModal: () => void;
  onOpenPrintModal: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  currentTimeStr: string;
  onTestReminder: () => void;
  onOpenDbModal?: () => void;
  dbStatus?: DbStatusResponse | null;
  currentView?: 'daily' | 'history';
  onViewChange?: (view: 'daily' | 'history') => void;
  historyCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentDate,
  onDateChange,
  onOpenAddModal,
  onOpenAddRoutineModal,
  onOpenManageModal,
  onOpenPrintModal,
  soundEnabled,
  onToggleSound,
  currentTimeStr,
  onTestReminder,
  onOpenDbModal,
  dbStatus,
  currentView = 'daily',
  onViewChange,
  historyCount,
}) => {
  const today = getTodayDateString();
  const isToday = currentDate === today;

  const handlePrevDay = () => {
    const d = new Date(currentDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    const yStr = d.toISOString().split('T')[0];
    onDateChange(yStr);
  };

  const handleNextDay = () => {
    const d = new Date(currentDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    const tStr = d.toISOString().split('T')[0];
    onDateChange(tStr);
  };

  const handleSetToday = () => {
    onDateChange(today);
  };

  return (
    <header id="app-header" className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3.5 gap-3.5">
          
          {/* Logo & Clinical Brand */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-xs">
                <Pill className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 leading-tight tracking-tight">
                  MedSchedule
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Patient Medication & Meal Timing Tracker
                </p>
              </div>
            </div>

            {/* Mobile Actions Right */}
            <div className="flex items-center gap-1.5 md:hidden">
              <button
                id="btn-nav-history-mobile-icon"
                type="button"
                onClick={() => onViewChange?.(currentView === 'daily' ? 'history' : 'daily')}
                title={currentView === 'daily' ? 'View Clinical History' : 'View Daily Schedule'}
                className={`p-2 rounded-lg border text-xs font-medium transition-colors ${
                  currentView === 'history'
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'bg-teal-50 border-teal-200 text-teal-800'
                }`}
              >
                <Clock className="w-4 h-4" />
              </button>
              {onOpenDbModal && (
                <button
                  id="btn-mongo-status-mobile"
                  type="button"
                  onClick={onOpenDbModal}
                  title={dbStatus?.connected ? 'MongoDB Connected' : 'MongoDB Configuration'}
                  className={`p-2 rounded-lg border text-xs relative transition-colors ${
                    dbStatus?.connected
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  <Database className="w-4 h-4" />
                  <span
                    className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                      dbStatus?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                    }`}
                  />
                </button>
              )}
              <button
                id="btn-sound-toggle-mobile"
                type="button"
                onClick={onToggleSound}
                title={soundEnabled ? 'Mute Chimes' : 'Enable Chimes'}
                className={`p-2 rounded-lg border text-xs font-medium transition-colors ${
                  soundEnabled 
                    ? 'bg-teal-50 border-teal-200 text-teal-700' 
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </button>
              {onOpenAddRoutineModal && (
                <button
                  id="btn-add-routine-mobile"
                  type="button"
                  onClick={onOpenAddRoutineModal}
                  title="Add Meal / Routine"
                  className="bg-amber-600 hover:bg-amber-700 text-white p-2 rounded-lg text-xs font-semibold shadow-xs"
                >
                  <Utensils className="w-4 h-4" />
                </button>
              )}
              <button
                id="btn-add-medication-mobile"
                type="button"
                onClick={onOpenAddModal}
                className="bg-teal-600 hover:bg-teal-700 text-white p-2 rounded-lg text-xs font-semibold shadow-xs"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Desktop Navigation Switcher & Date Controls */}
          <div className="flex items-center justify-between md:justify-center gap-2.5">
            
            {/* View Switcher: Daily Schedule vs Clinical History */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                id="nav-tab-daily"
                type="button"
                onClick={() => onViewChange?.('daily')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  currentView === 'daily'
                    ? 'bg-white text-teal-900 shadow-2xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-teal-600" />
                <span>Today's Schedule</span>
              </button>

              <button
                id="nav-tab-history"
                type="button"
                onClick={() => onViewChange?.('history')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  currentView === 'history'
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Clinical History</span>
                {typeof historyCount === 'number' && historyCount > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    currentView === 'history' ? 'bg-teal-900 text-teal-100' : 'bg-teal-100 text-teal-800'
                  }`}>
                    {historyCount}
                  </span>
                )}
              </button>
            </div>

            {/* Date Selector & Clock (Active in Daily view) */}
            {currentView === 'daily' && (
              <div className="flex items-center gap-1 bg-slate-50/80 p-1 rounded-xl border border-slate-200/80">
                <button
                  id="btn-prev-date"
                  type="button"
                  onClick={handlePrevDay}
                  aria-label="Previous day"
                  className="p-1.5 rounded-lg text-slate-600 hover:bg-white hover:shadow-xs transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <div className="flex items-center gap-1.5 px-2 py-1">
                  <span className="text-xs sm:text-sm font-semibold text-slate-800 whitespace-nowrap">
                    {formatDisplayDate(currentDate)}
                  </span>
                </div>

                <button
                  id="btn-next-date"
                  type="button"
                  onClick={handleNextDay}
                  aria-label="Next day"
                  className="p-1.5 rounded-lg text-slate-600 hover:bg-white hover:shadow-xs transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {!isToday && (
                  <button
                    id="btn-jump-today"
                    type="button"
                    onClick={handleSetToday}
                    className="text-[11px] font-medium bg-teal-100/70 hover:bg-teal-200/70 text-teal-800 px-2 py-0.5 rounded-md transition-colors ml-1"
                  >
                    Today
                  </button>
                )}

                <div className="hidden lg:flex items-center border-l border-slate-200 pl-2 ml-1 text-xs text-slate-500 font-mono">
                  <span className="font-semibold text-slate-700">{currentTimeStr}</span>
                </div>
              </div>
            )}

            {currentView === 'history' && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50/80 border border-teal-200 text-teal-900 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
                <span>Daywise Records (Descending)</span>
              </div>
            )}
          </div>

          {/* Action Bar (Desktop) */}
          <div className="hidden md:flex items-center gap-2">
            {/* Audio Toggle */}
            <button
              id="btn-sound-toggle"
              type="button"
              onClick={() => {
                onToggleSound();
                if (!soundEnabled) {
                  soundManager.playSuccessChime();
                }
              }}
              title={soundEnabled ? 'Chimes are active' : 'Chimes are muted'}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                soundEnabled
                  ? 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100/60'
                  : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-teal-600" /> : <BellOff className="w-3.5 h-3.5" />}
              <span>{soundEnabled ? 'Sound On' : 'Sound Off'}</span>
            </button>

            {/* Test Alert Simulator */}
            <button
              id="btn-test-alert"
              type="button"
              onClick={onTestReminder}
              title="Test a simulated reminder alert"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
            >
              <Bell className="w-3.5 h-3.5 text-amber-500" />
              <span>Test Alarm</span>
            </button>

            {/* Printable Schedule */}
            <button
              id="btn-print-schedule"
              type="button"
              onClick={onOpenPrintModal}
              title="Printable medication chart for fridge or doctor visit"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print Routine</span>
            </button>

            {/* MongoDB Connection Status */}
            {onOpenDbModal && (
              <button
                id="btn-mongo-status"
                type="button"
                onClick={onOpenDbModal}
                title={
                  dbStatus?.connected 
                    ? `Connected to MongoDB (${dbStatus.databaseName})` 
                    : 'MongoDB status & configuration'
                }
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                  dbStatus?.connected
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100/70'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/70'
                }`}
              >
                <Database className={`w-3.5 h-3.5 ${dbStatus?.connected ? 'text-emerald-600' : 'text-slate-500'}`} />
                <span>{dbStatus?.connected ? 'MongoDB Active' : 'MongoDB'}</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    dbStatus?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                  }`}
                />
              </button>
            )}

            {/* Manage Medications */}
            <button
              id="btn-manage-meds"
              type="button"
              onClick={onOpenManageModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
            >
              <Settings2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Manage List</span>
            </button>

            {/* Add Meal / Routine */}
            {onOpenAddRoutineModal && (
              <button
                id="btn-add-routine-desktop"
                type="button"
                onClick={onOpenAddRoutineModal}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors"
              >
                <Utensils className="w-4 h-4" />
                <span>Add Meal / Routine</span>
              </button>
            )}

            {/* Primary Add Medication */}
            <button
              id="btn-add-medication-desktop"
              type="button"
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Medication</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
