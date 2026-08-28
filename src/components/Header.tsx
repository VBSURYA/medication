import React, { useState } from 'react';
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
  VolumeX,
  Database,
  Utensils,
  Clock,
  Smartphone,
  Check,
  RefreshCw
} from 'lucide-react';
import { formatDisplayDate, getTodayDateString } from '../utils/helpers.ts';
import { soundManager, AlarmVolumeLevel } from '../utils/audio.ts';
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
  isAlarmRinging?: boolean;
  onStopAlarm?: () => void;
  onOpenPwaModal?: () => void;
  volumeLevel?: AlarmVolumeLevel;
  onChangeVolumeLevel?: (lvl: AlarmVolumeLevel) => void;
  isSyncing?: boolean;
  onManualSync?: () => void;
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
  isAlarmRinging = false,
  onStopAlarm,
  onOpenPwaModal,
  volumeLevel = 'loud',
  onChangeVolumeLevel,
  isSyncing = false,
  onManualSync,
}) => {
  const today = getTodayDateString();
  const isToday = currentDate === today;
  const [showVolumeMenu, setShowVolumeMenu] = useState(false);

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

  const handleCycleVolume = (lvl: AlarmVolumeLevel) => {
    onChangeVolumeLevel?.(lvl);
    setShowVolumeMenu(false);
  };

  return (
    <header id="app-header" className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* High-visibility Urgent Stop Alarm Header Strip (when ringing) */}
      {isAlarmRinging && (
        <div
          id="header-urgent-alarm-strip"
          className="bg-amber-500 text-slate-950 px-4 py-2 flex items-center justify-between shadow-inner animate-pulse"
        >
          <div className="flex items-center gap-2 font-black text-xs sm:text-sm tracking-wide">
            <Bell className="w-4 h-4 animate-spin-subtle text-slate-950" />
            <span>PATIENT ALARM IS ACTIVELY RINGING!</span>
          </div>
          {onStopAlarm && (
            <button
              id="btn-header-strip-stop-alarm"
              type="button"
              onClick={onStopAlarm}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
            >
              <VolumeX className="w-4 h-4 text-amber-400 stroke-[3]" />
              <span>STOP ALARM IMMEDIATELY</span>
            </button>
          )}
        </div>
      )}

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
              {/* If alarm ringing on mobile, show instant stop button */}
              {isAlarmRinging && onStopAlarm && (
                <button
                  id="btn-mobile-stop-alarm"
                  type="button"
                  onClick={onStopAlarm}
                  title="Stop ringing alarm immediately"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 p-2 rounded-lg text-xs font-black shadow-md animate-bounce"
                >
                  <VolumeX className="w-4 h-4 stroke-[3]" />
                </button>
              )}

              {/* Install PWA Button on mobile */}
              {onOpenPwaModal && (
                <button
                  id="btn-mobile-pwa-install"
                  type="button"
                  onClick={onOpenPwaModal}
                  title="Install MedSchedule on your phone"
                  className="p-2 rounded-lg border border-teal-200 bg-teal-50 text-teal-800 text-xs font-bold transition-colors"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              )}

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
              {/* Quick Sync Button mobile */}
              {onManualSync && (
                <button
                  id="btn-mobile-sync"
                  type="button"
                  onClick={onManualSync}
                  disabled={isSyncing}
                  title="Synchronize all records with database"
                  className="p-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-teal-600' : 'text-slate-600'}`} />
                </button>
              )}

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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                  className="p-1.5 rounded-lg text-slate-600 hover:bg-white hover:shadow-xs transition-all cursor-pointer"
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
                  className="p-1.5 rounded-lg text-slate-600 hover:bg-white hover:shadow-xs transition-all cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {!isToday && (
                  <button
                    id="btn-jump-today"
                    type="button"
                    onClick={handleSetToday}
                    className="ml-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-2xs cursor-pointer"
                  >
                    Today
                  </button>
                )}

                <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

                <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 pl-1">
                  <Clock className="w-3.5 h-3.5 text-teal-600" />
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
            {/* Urgent Stop Alarm Button (Desktop) */}
            {isAlarmRinging && onStopAlarm && (
              <button
                id="btn-desktop-stop-alarm"
                type="button"
                onClick={onStopAlarm}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 border-2 border-amber-300 shadow-md animate-pulse transition-all cursor-pointer"
              >
                <VolumeX className="w-4 h-4 stroke-[3]" />
                <span>STOP ALARM</span>
              </button>
            )}

            {/* Audio Toggle & Volume Settings */}
            <div className="relative">
              <button
                id="btn-sound-toggle"
                type="button"
                onClick={() => {
                  onToggleSound();
                  if (!soundEnabled) {
                    soundManager.playSuccessChime();
                  }
                }}
                title={soundEnabled ? 'Chimes & alarms are active' : 'Chimes are muted'}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  soundEnabled
                    ? 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100/60'
                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'
                }`}
              >
                {soundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-teal-600" />
                ) : (
                  <BellOff className="w-3.5 h-3.5" />
                )}
                <span>{soundEnabled ? 'Sound On' : 'Sound Off'}</span>
              </button>
            </div>

            {/* Volume Level Selector (Loud 100% / Standard / Soft) */}
            {onChangeVolumeLevel && (
              <div className="relative">
                <button
                  id="btn-volume-level"
                  type="button"
                  onClick={() => setShowVolumeMenu(!showVolumeMenu)}
                  title="Configure alarm loudness"
                  className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer"
                >
                  <span className="text-[11px] text-slate-500">Vol:</span>
                  <span className="font-bold text-teal-700 uppercase">{volumeLevel}</span>
                </button>

                {showVolumeMenu && (
                  <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-40 text-xs">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Alarm Loudness
                    </div>
                    {(['loud', 'standard', 'soft'] as AlarmVolumeLevel[]).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => handleCycleVolume(lvl)}
                        className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-slate-50 ${
                          volumeLevel === lvl ? 'text-teal-700 font-bold bg-teal-50/50' : 'text-slate-700'
                        }`}
                      >
                        <span className="capitalize">
                          {lvl} {lvl === 'loud' ? '(100% High)' : lvl === 'standard' ? '(70%)' : '(40%)'}
                        </span>
                        {volumeLevel === lvl && <Check className="w-3.5 h-3.5 text-teal-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Test Alert Simulator (Toggles to Stop Alarm when ringing) */}
            <button
              id="btn-test-alert"
              type="button"
              onClick={isAlarmRinging && onStopAlarm ? onStopAlarm : onTestReminder}
              title={isAlarmRinging ? 'Stop the ringing alarm' : 'Test loud continuous alarm audio'}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                isAlarmRinging
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              {isAlarmRinging ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-950" />
                  <span>Stop Alarm</span>
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5 text-amber-500" />
                  <span>Test Alarm</span>
                </>
              )}
            </button>

            {/* Install PWA Mobile App Button */}
            {onOpenPwaModal && (
              <button
                id="btn-pwa-install-desktop"
                type="button"
                onClick={onOpenPwaModal}
                title="Install MedSchedule on mobile phone or desktop"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-teal-200 bg-teal-50/70 hover:bg-teal-100 text-teal-800 transition-colors cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5 text-teal-600" />
                <span>Install App</span>
              </button>
            )}

            {/* Printable Schedule */}
            <button
              id="btn-print-schedule"
              type="button"
              onClick={onOpenPrintModal}
              title="Printable medication chart for fridge or doctor visit"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
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
                    ? `Connected to MongoDB (${dbStatus.databaseName}). Click to view or sync.` 
                    : 'MongoDB status & cloud configuration'
                }
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  dbStatus?.connected
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100/70'
                    : 'bg-teal-50/70 border-teal-200 text-teal-800 hover:bg-teal-100/70'
                }`}
              >
                <Database className={`w-3.5 h-3.5 ${dbStatus?.connected ? 'text-emerald-600' : 'text-teal-600'}`} />
                <span>{dbStatus?.connected ? 'MongoDB Active' : 'MongoDB Sync'}</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    dbStatus?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                  }`}
                />
              </button>
            )}

            {/* Quick Live Sync Button (Desktop) */}
            {onManualSync && (
              <button
                id="btn-desktop-sync"
                type="button"
                onClick={onManualSync}
                disabled={isSyncing}
                title="Synchronize all patient records across all phones"
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-teal-600' : 'text-slate-500'}`} />
                <span className="hidden xl:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>
              </button>
            )}

            {/* Manage Medications */}
            <button
              id="btn-manage-meds"
              type="button"
              onClick={onOpenManageModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
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
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors cursor-pointer"
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
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors cursor-pointer"
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
