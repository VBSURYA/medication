import React, { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  Utensils, 
  Coffee, 
  Apple, 
  Droplets, 
  Footprints, 
  HeartPulse, 
  Moon, 
  Sparkles, 
  Trash2, 
  Check, 
  Plus
} from 'lucide-react';
import { RoutineItem, RoutineCategory } from '../types.ts';

interface RoutineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (routine: RoutineItem) => void;
  onDelete?: (routineId: string) => void;
  initialRoutine?: RoutineItem | null;
}

interface RoutinePreset {
  title: string;
  category: RoutineCategory;
  time: string;
  description: string;
  iconKey: string;
}

const PRESETS: RoutinePreset[] = [
  {
    title: 'Breakfast',
    category: 'meal',
    time: '06:00',
    description: 'Healthy breakfast (oatmeal, eggs, warm water)',
    iconKey: 'coffee',
  },
  {
    title: 'Morning Snack / Second Meal',
    category: 'snack',
    time: '09:00',
    description: 'Fresh fruit, nuts, or light snack with hydration',
    iconKey: 'apple',
  },
  {
    title: 'Lunch',
    category: 'meal',
    time: '13:00',
    description: 'Wholesome lunch with vegetables and lean protein',
    iconKey: 'utensils',
  },
  {
    title: 'Afternoon Tea & Snack',
    category: 'snack',
    time: '16:30',
    description: 'Herbal tea or green tea with light snack',
    iconKey: 'apple',
  },
  {
    title: 'Dinner',
    category: 'meal',
    time: '19:30',
    description: 'Nutritious dinner before evening medications',
    iconKey: 'utensils',
  },
  {
    title: 'Hydration Check (500ml)',
    category: 'hydration',
    time: '11:00',
    description: 'Drink a full glass of water to stay well-hydrated',
    iconKey: 'droplets',
  },
  {
    title: 'Blood Glucose Check',
    category: 'vitals',
    time: '08:00',
    description: 'Measure blood sugar level before/after breakfast',
    iconKey: 'heart-pulse',
  },
  {
    title: 'Morning Walk / Exercise',
    category: 'activity',
    time: '07:00',
    description: '20-30 minute brisk walk or gentle stretching',
    iconKey: 'footprints',
  },
  {
    title: 'Bedtime Wind Down',
    category: 'sleep',
    time: '22:00',
    description: 'Relaxation, glass of water, and restful sleep preparation',
    iconKey: 'moon',
  },
  {
    title: 'Night Chamomile Tea / Warm Milk',
    category: 'snack',
    time: '21:30',
    description: 'Calming bedtime herbal tea or warm milk before sleep',
    iconKey: 'coffee',
  },
  {
    title: 'Night Hydration & Pill Prep',
    category: 'hydration',
    time: '21:45',
    description: 'Drink water with nighttime medicine and set glass beside bed',
    iconKey: 'droplets',
  },
];

export const RoutineModal: React.FC<RoutineModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialRoutine,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<RoutineCategory>('meal');
  const [time, setTime] = useState('06:00');
  const [description, setDescription] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (initialRoutine) {
      setTitle(initialRoutine.title);
      setCategory(initialRoutine.category);
      setTime(initialRoutine.time);
      setDescription(initialRoutine.description || '');
      setReminderEnabled(initialRoutine.reminderEnabled ?? true);
      setShowDeleteConfirm(false);
    } else {
      setTitle('Breakfast');
      setCategory('meal');
      setTime('06:00');
      setDescription('Light nutritious breakfast with a glass of water');
      setReminderEnabled(true);
      setShowDeleteConfirm(false);
    }
  }, [initialRoutine, isOpen]);

  if (!isOpen) return null;

  const applyPreset = (preset: RoutinePreset) => {
    setTitle(preset.title);
    setCategory(preset.category);
    setTime(preset.time);
    setDescription(preset.description);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !time.trim()) return;

    const routineData: RoutineItem = {
      id: initialRoutine?.id || `routine-${Date.now()}`,
      title: title.trim(),
      category,
      time,
      description: description.trim() || undefined,
      reminderEnabled,
      createdAt: initialRoutine?.createdAt || new Date().toISOString(),
    };

    onSave(routineData);
    onClose();
  };

  const handleDelete = () => {
    if (initialRoutine && onDelete) {
      onDelete(initialRoutine.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        id="routine-modal-dialog" 
        className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-6 bg-linear-to-r from-amber-50 to-orange-50/60 border-b border-amber-200/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                {initialRoutine ? 'Edit Meal or Routine' : 'Add Meal or Routine Item'}
              </h2>
              <p className="text-xs text-slate-600">
                Schedule your daily meals, snacks, water, and wellness habits
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Quick Presets Carousel */}
          {!initialRoutine && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Quick Presets (1-Click Fill)
              </label>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="shrink-0 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 text-xs font-semibold text-slate-800 transition-all flex items-center gap-1.5"
                  >
                    <span className="font-mono text-amber-700 text-[11px] font-bold">
                      {p.time}
                    </span>
                    <span>{p.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Title or Meal Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 6 AM Breakfast, 9 AM Meal, Morning Walk, Hydration"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden font-medium"
            />
          </div>

          {/* Time & Category Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Scheduled Time */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Scheduled Time (24h) <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden"
              />
              <div className="flex gap-1.5 mt-1.5">
                {['06:00', '09:00', '13:00', '19:30'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTime(t)}
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-mono font-bold"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as RoutineCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden font-medium bg-white"
              >
                <option value="meal">Meal (Breakfast, Lunch, Dinner)</option>
                <option value="snack">Snack / Second Meal</option>
                <option value="hydration">Hydration / Drink Water</option>
                <option value="vitals">Health Check (Blood Pressure, Sugar)</option>
                <option value="activity">Exercise / Walk / Stretching</option>
                <option value="sleep">Sleep & Bedtime Routine</option>
                <option value="latrine">Latrine / Bathroom</option>
                <option value="other">General Routine</option>
              </select>
            </div>
          </div>

          {/* Description & Food Details */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Menu / Details / Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Oatmeal with fruits and cinnamon, target sugar < 100 mg/dL, 500ml warm water..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden font-normal"
            />
          </div>

          {/* Reminder Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <p className="text-xs font-bold text-slate-900">Audio Alarm & Notice</p>
              <p className="text-[11px] text-slate-500">
                Trigger sound reminder when scheduled time arrives
              </p>
            </div>
            <input
              type="checkbox"
              checked={reminderEnabled}
              onChange={(e) => setReminderEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Delete button when editing */}
            {initialRoutine && onDelete ? (
              showDeleteConfirm ? (
                <div className="flex items-center gap-2 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                  <span className="text-xs font-bold text-rose-800">Confirm delete?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    Yes, Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-2 py-1 text-slate-600 hover:bg-slate-200 rounded-lg text-xs"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Routine</span>
                </button>
              )
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>{initialRoutine ? 'Save Changes' : 'Add to Schedule'}</span>
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
