import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Activity, 
  Utensils, 
  Pill, 
  HeartPulse, 
  Check, 
  Clock, 
  Calendar 
} from 'lucide-react';
import { Medication, RoutineItem, DoseLog, RoutineLog } from '../types.ts';
import { getTodayDateString } from '../utils/helpers.ts';

interface QuickHistoryLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  medications: Medication[];
  routines: RoutineItem[];
  onSaveDoseLog: (log: DoseLog) => void;
  onSaveRoutineLog: (log: RoutineLog, newRoutine?: RoutineItem) => void;
}

type LogType = 'bathroom' | 'meal' | 'medication' | 'vitals';

export const QuickHistoryLogModal: React.FC<QuickHistoryLogModalProps> = ({
  isOpen,
  onClose,
  medications,
  routines,
  onSaveDoseLog,
  onSaveRoutineLog,
}) => {
  if (!isOpen) return null;

  const now = new Date();
  const currentHours = String(now.getHours()).padStart(2, '0');
  const currentMinutes = String(now.getMinutes()).padStart(2, '0');
  const currentTime = `${currentHours}:${currentMinutes}`;
  const today = getTodayDateString();

  const [logType, setLogType] = useState<LogType>('bathroom');
  const [date, setDate] = useState(today);
  const [time, setTime] = useState(currentTime);
  const [notes, setNotes] = useState('');
  
  // Latrine specific
  const [latrineType, setLatrineType] = useState('Normal & regular');

  // Meal specific
  const [mealTitle, setMealTitle] = useState('Snack / Food');
  const [mealCategory, setMealCategory] = useState<'meal' | 'snack' | 'hydration'>('snack');

  // Medication specific
  const [selectedMedId, setSelectedMedId] = useState(medications[0]?.id || '');
  const [status, setStatus] = useState<'taken' | 'skipped'>('taken');
  const [skippedReason, setSkippedReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const timestampISO = new Date(`${date}T${time}:00`).toISOString();

    if (logType === 'bathroom') {
      // Find or create routine for bathroom
      const existingBathroomRoutine = routines.find((r) => r.category === 'bathroom');
      const routineId = existingBathroomRoutine?.id || `routine-latrine-${Date.now()}`;
      
      let newRoutine: RoutineItem | undefined;
      if (!existingBathroomRoutine) {
        newRoutine = {
          id: routineId,
          title: 'Latrine / Bowel Movement',
          category: 'bathroom',
          time,
          description: 'Elimination & digestive regularity check',
          iconKey: 'activity',
          reminderEnabled: false,
          createdAt: new Date().toISOString(),
        };
      }

      const routineLog: RoutineLog = {
        id: `rlog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        routineId,
        date,
        status: 'completed',
        completedAt: timestampISO,
        notes: `${latrineType}${notes ? ` - ${notes}` : ''}`,
      };

      onSaveRoutineLog(routineLog, newRoutine);
    } else if (logType === 'meal') {
      const routineId = `routine-meal-${Date.now()}`;
      const newRoutine: RoutineItem = {
        id: routineId,
        title: mealTitle,
        category: mealCategory,
        time,
        description: notes || 'Food intake logged by patient',
        iconKey: mealCategory === 'meal' ? 'utensils' : 'apple',
        reminderEnabled: false,
        createdAt: new Date().toISOString(),
      };

      const routineLog: RoutineLog = {
        id: `rlog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        routineId,
        date,
        status: 'completed',
        completedAt: timestampISO,
        notes: notes || mealTitle,
      };

      onSaveRoutineLog(routineLog, newRoutine);
    } else if (logType === 'medication') {
      const med = medications.find((m) => m.id === selectedMedId);
      if (!med) return;

      const doseLog: DoseLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date,
        medicationId: med.id,
        scheduledTime: time,
        mealRelation: 'anytime',
        status,
        takenAt: status === 'taken' ? timestampISO : undefined,
        skippedReason: status === 'skipped' ? (skippedReason || 'Skipped by patient') : undefined,
        notes,
      };

      onSaveDoseLog(doseLog);
    } else if (logType === 'vitals') {
      const routineId = `routine-vital-${Date.now()}`;
      const newRoutine: RoutineItem = {
        id: routineId,
        title: 'Health Check / Vitals',
        category: 'vitals',
        time,
        description: notes || 'Health check observation',
        iconKey: 'heart-pulse',
        reminderEnabled: false,
        createdAt: new Date().toISOString(),
      };

      const routineLog: RoutineLog = {
        id: `rlog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        routineId,
        date,
        status: 'completed',
        completedAt: timestampISO,
        notes,
      };

      onSaveRoutineLog(routineLog, newRoutine);
    }

    onClose();
  };

  return (
    <div 
      id="modal-quick-log-overlay" 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
    >
      <div 
        id="modal-quick-log-container" 
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Log Clinical Event
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Record medicine, meal, or latrine timing with exact timestamp
              </p>
            </div>
          </div>
          
          <button
            id="btn-close-quick-log"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Type Selector Buttons */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select What You Wish To Log
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setLogType('bathroom')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold gap-1.5 transition-all ${
                  logType === 'bathroom'
                    ? 'bg-teal-50 border-teal-500 text-teal-900 ring-2 ring-teal-500/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <Activity className="w-5 h-5 text-teal-600" />
                <span>Latrine / Bowel</span>
              </button>

              <button
                type="button"
                onClick={() => setLogType('meal')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold gap-1.5 transition-all ${
                  logType === 'meal'
                    ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <Utensils className="w-5 h-5 text-amber-600" />
                <span>Meal / Food</span>
              </button>

              <button
                type="button"
                onClick={() => setLogType('medication')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold gap-1.5 transition-all ${
                  logType === 'medication'
                    ? 'bg-sky-50 border-sky-500 text-sky-900 ring-2 ring-sky-500/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <Pill className="w-5 h-5 text-sky-600" />
                <span>Medication</span>
              </button>

              <button
                type="button"
                onClick={() => setLogType('vitals')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold gap-1.5 transition-all ${
                  logType === 'vitals'
                    ? 'bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <HeartPulse className="w-5 h-5 text-rose-600" />
                <span>Health / Vitals</span>
              </button>
            </div>
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 outline-hidden font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Exact Time
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 outline-hidden font-medium font-mono"
                required
              />
            </div>
          </div>

          {/* Specific Inputs per Type */}

          {/* 1. Latrine / Bowel Movement */}
          {logType === 'bathroom' && (
            <div className="space-y-3 bg-teal-50/50 p-4 rounded-xl border border-teal-100">
              <label className="block text-xs font-bold text-teal-900 uppercase tracking-wider">
                Bowel Movement Comfort & Consistency
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Normal & regular',
                  'Soft / Smooth',
                  'Slightly loose',
                  'Hard / Constipated',
                  'Comfortable, no pain',
                  'Mild cramping',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setLatrineType(preset)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      latrineType === preset
                        ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                        : 'bg-white text-teal-900 border-teal-200 hover:bg-teal-100/50'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2. Meal / Food */}
          {logType === 'meal' && (
            <div className="space-y-3 bg-amber-50/50 p-4 rounded-xl border border-amber-100">
              <div>
                <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider mb-1.5">
                  Meal Name
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {['Breakfast', 'Morning Snack', 'Lunch', 'Afternoon Tea', 'Dinner', 'Night Snack / Milk'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setMealTitle(preset)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        mealTitle === preset
                          ? 'bg-amber-700 text-white border-amber-700 shadow-2xs'
                          : 'bg-white text-amber-900 border-amber-200 hover:bg-amber-100/50'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={mealTitle}
                  onChange={(e) => setMealTitle(e.target.value)}
                  placeholder="e.g. Oatmeal with eggs or Light lunch"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 outline-hidden bg-white"
                  required
                />
              </div>
            </div>
          )}

          {/* 3. Medication */}
          {logType === 'medication' && (
            <div className="space-y-3 bg-sky-50/50 p-4 rounded-xl border border-sky-100">
              <div>
                <label className="block text-xs font-bold text-sky-900 uppercase tracking-wider mb-1.5">
                  Select Medication
                </label>
                <select
                  value={selectedMedId}
                  onChange={(e) => setSelectedMedId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-sky-500 outline-hidden bg-white"
                >
                  {medications.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.dosage}) - Dr. {m.doctorName || 'Prescriber'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-sky-900 uppercase tracking-wider mb-1.5">
                  Dose Status
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus('taken')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                      status === 'taken'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Taken & Completed
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('skipped')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                      status === 'skipped'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Skipped / Missed
                  </button>
                </div>
              </div>

              {status === 'skipped' && (
                <div>
                  <label className="block text-xs font-bold text-rose-900 uppercase tracking-wider mb-1.5">
                    Reason for Skipping
                  </label>
                  <input
                    type="text"
                    value={skippedReason}
                    onChange={(e) => setSkippedReason(e.target.value)}
                    placeholder="e.g. Fasting for lab blood work, mild nausea"
                    className="w-full px-3 py-2 rounded-xl border border-rose-300 text-sm focus:ring-2 focus:ring-rose-500 outline-hidden bg-white"
                    required
                  />
                </div>
              )}
            </div>
          )}

          {/* Notes / Clinical Observations */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Clinical Notes / Observations (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Stool consistency was normal; took with full glass of water; blood pressure 125/80"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 outline-hidden"
            />
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              id="btn-cancel-quick-log"
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-save-quick-log"
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Save to History</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
