import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Clock, 
  Utensils, 
  Bell, 
  Volume2, 
  ShieldAlert, 
  Info, 
  Check, 
  Sparkles,
  Pill
} from 'lucide-react';
import { Medication, ScheduleItem, MealRelation, TimeSlot, MedicationForm } from '../types.ts';
import { getTimeSlotFromTime } from '../utils/helpers.ts';
import { soundManager } from '../utils/audio.ts';

interface MedicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (medication: Medication) => void;
  onDelete?: (id: string) => void;
  initialMedication?: Medication | null;
  defaultAsSpecial?: boolean;
}

const COMMON_DRUGS = [
  'Omeprazole',
  'Metformin',
  'Lisinopril',
  'Amlodipine',
  'Atorvastatin',
  'Levothyroxine',
  'Paracetamol',
  'Ibuprofen',
  'Amoxicillin',
  'Sumatriptan',
  'Salbutamol Inhaler',
];

const COLOR_CHOICES = [
  { id: 'teal', label: 'Teal', bg: 'bg-teal-500' },
  { id: 'blue', label: 'Blue', bg: 'bg-blue-500' },
  { id: 'indigo', label: 'Indigo', bg: 'bg-indigo-500' },
  { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-500' },
  { id: 'amber', label: 'Amber', bg: 'bg-amber-500' },
  { id: 'rose', label: 'Rose', bg: 'bg-rose-500' },
  { id: 'purple', label: 'Purple', bg: 'bg-purple-500' },
  { id: 'orange', label: 'Orange', bg: 'bg-orange-500' },
];

const FORM_OPTIONS: { id: MedicationForm; label: string }[] = [
  { id: 'tablet', label: 'Tablet' },
  { id: 'capsule', label: 'Capsule' },
  { id: 'syrup', label: 'Syrup / Liquid' },
  { id: 'inhaler', label: 'Inhaler / Spray' },
  { id: 'injection', label: 'Injection' },
  { id: 'drops', label: 'Drops' },
  { id: 'cream', label: 'Cream / Ointment' },
  { id: 'patch', label: 'Patch' },
  { id: 'other', label: 'Other' },
];

export const MedicationModal: React.FC<MedicationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialMedication,
  defaultAsSpecial = false,
}) => {
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [form, setForm] = useState<MedicationForm>('tablet');
  const [color, setColor] = useState('teal');
  const [instructions, setInstructions] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [inventoryCount, setInventoryCount] = useState<number | undefined>(undefined);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  
  // Special Condition vs Regular Schedule
  const [isSpecialCondition, setIsSpecialCondition] = useState(defaultAsSpecial);
  const [specialConditionReason, setSpecialConditionReason] = useState('');
  const [specialMaxDosesPerDay, setSpecialMaxDosesPerDay] = useState(3);

  // Schedules list
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialMedication) {
      setName(initialMedication.name);
      setDosage(initialMedication.dosage);
      setForm(initialMedication.form);
      setColor(initialMedication.color || 'teal');
      setInstructions(initialMedication.instructions || '');
      setDoctorName(initialMedication.doctorName || '');
      setInventoryCount(initialMedication.inventoryCount);
      setIsSpecialCondition(initialMedication.isSpecialCondition);
      setSpecialConditionReason(initialMedication.specialConditionReason || '');
      setSpecialMaxDosesPerDay(initialMedication.specialMaxDosesPerDay || 3);
      setSchedules(
        initialMedication.schedules.length > 0
          ? [...initialMedication.schedules]
          : []
      );
    } else {
      // Default new medication state
      setName('');
      setDosage('');
      setForm('tablet');
      setColor('teal');
      setInstructions('');
      setDoctorName('');
      setInventoryCount(undefined);
      setIsSpecialCondition(defaultAsSpecial);
      setSpecialConditionReason('');
      setSpecialMaxDosesPerDay(3);
      
      // Default: 1 morning schedule (7:00 AM before breakfast)
      if (!defaultAsSpecial) {
        setSchedules([
          {
            id: `sch-${Date.now()}`,
            time: '07:00',
            slot: 'morning',
            label: 'Morning Dose',
            mealRelation: 'before_meal',
            mealName: 'Breakfast',
            reminderEnabled: true,
            reminderMinutesBefore: 0,
            soundEnabled: true,
          },
        ]);
      } else {
        setSchedules([]);
      }
    }
    setErrors({});
  }, [initialMedication, defaultAsSpecial, isOpen]);

  if (!isOpen) return null;

  // Add a schedule slot
  const handleAddSchedule = (preset?: Partial<ScheduleItem>) => {
    const newSch: ScheduleItem = {
      id: `sch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      time: preset?.time || '08:00',
      slot: preset?.time ? getTimeSlotFromTime(preset.time) : 'morning',
      label: preset?.label || 'Dose',
      mealRelation: preset?.mealRelation || 'after_meal',
      mealName: preset?.mealName || 'Breakfast',
      reminderEnabled: true,
      reminderMinutesBefore: 0,
      soundEnabled: true,
    };
    setSchedules([...schedules, newSch]);
  };

  const handleRemoveSchedule = (id: string) => {
    setSchedules(schedules.filter((s) => s.id !== id));
  };

  const handleUpdateSchedule = (id: string, updates: Partial<ScheduleItem>) => {
    setSchedules(
      schedules.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, ...updates };
        if (updates.time) {
          updated.slot = getTimeSlotFromTime(updates.time);
        }
        return updated;
      })
    );
  };

  // Form submission validation
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Medication name is required';
    }
    if (!dosage.trim()) {
      newErrors.dosage = 'Dosage is required (e.g. 500 mg, 1 tablet)';
    }

    if (isSpecialCondition) {
      if (!specialConditionReason.trim()) {
        newErrors.specialConditionReason = 'Please specify the symptom or condition trigger';
      }
    } else {
      if (schedules.length === 0) {
        newErrors.schedules = 'Please add at least one schedule time';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const newMed: Medication = {
      id: initialMedication ? initialMedication.id : `med-${Date.now()}`,
      name: name.trim(),
      dosage: dosage.trim(),
      form,
      color,
      instructions: instructions.trim(),
      doctorName: doctorName.trim() || undefined,
      inventoryCount: inventoryCount ? Number(inventoryCount) : undefined,
      isSpecialCondition,
      specialConditionReason: isSpecialCondition ? specialConditionReason.trim() : undefined,
      specialMaxDosesPerDay: isSpecialCondition ? Number(specialMaxDosesPerDay) : undefined,
      schedules: isSpecialCondition ? [] : schedules,
      createdAt: initialMedication ? initialMedication.createdAt : new Date().toISOString(),
    };

    onSave(newMed);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-xs">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                {initialMedication ? 'Edit Medication & Schedule' : 'Add New Medication'}
              </h2>
              <p className="text-xs text-slate-500">
                Configure dosage, meal relation (before/after eating), and reminder alarms
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
          
          {/* Medication Type Toggle: Regular vs Special Condition */}
          <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsSpecialCondition(false)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                !isSpecialCondition
                  ? 'bg-white text-teal-800 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Routine Daily Medication</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSpecialCondition(true)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                isSpecialCondition
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Special Condition / As-Needed (PRN)</span>
            </button>
          </div>

          {/* Section 1: Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Medication Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="input-med-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors({ ...errors, name: '' });
                }}
                placeholder="e.g. Omeprazole, Metformin, Lisinopril..."
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  errors.name ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300 bg-white'
                }`}
              />
              {errors.name && <p className="text-xs text-rose-600 mt-1">{errors.name}</p>}

              {/* Quick suggestions */}
              {!initialMedication && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[11px] text-slate-400">Quick fill:</span>
                  {COMMON_DRUGS.slice(0, 6).map((drug) => (
                    <button
                      key={drug}
                      type="button"
                      onClick={() => setName(drug)}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    >
                      {drug}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Dosage / Strength <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-med-dosage"
                  type="text"
                  value={dosage}
                  onChange={(e) => {
                    setDosage(e.target.value);
                    if (errors.dosage) setErrors({ ...errors, dosage: '' });
                  }}
                  placeholder="e.g. 20 mg, 500 mg, 1 tablet, 2 puffs"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    errors.dosage ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300 bg-white'
                  }`}
                />
                {errors.dosage && <p className="text-xs text-rose-600 mt-1">{errors.dosage}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Medication Form
                </label>
                <select
                  id="select-med-form"
                  value={form}
                  onChange={(e) => setForm(e.target.value as MedicationForm)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {FORM_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pill Color Identifier */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Visual Color Tag
              </label>
              <div className="flex items-center gap-2">
                {COLOR_CHOICES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    aria-label={`Select ${c.label} color`}
                    className={`w-7 h-7 rounded-full ${c.bg} flex items-center justify-center transition-transform ${
                      color === c.id ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : 'opacity-80 hover:opacity-100'
                    }`}
                  >
                    {color === c.id && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Special Condition Details (if active) */}
          {isSpecialCondition ? (
            <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-4 space-y-4">
              <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
                <ShieldAlert className="w-4 h-4 text-purple-700" />
                <span>Special Condition & Symptom Trigger Details</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-900 mb-1">
                  When should the patient take this? <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-special-reason"
                  type="text"
                  value={specialConditionReason}
                  onChange={(e) => {
                    setSpecialConditionReason(e.target.value);
                    if (errors.specialConditionReason) {
                      setErrors({ ...errors, specialConditionReason: '' });
                    }
                  }}
                  placeholder="e.g. For acute migraine flare-up, When BP > 140/90, During asthma attack"
                  className={`w-full px-3 py-2 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 ${
                    errors.specialConditionReason ? 'border-rose-400' : 'border-purple-300'
                  }`}
                />
                {errors.specialConditionReason && (
                  <p className="text-xs text-rose-600 mt-1">{errors.specialConditionReason}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-900 mb-1">
                  Maximum Doses in 24 Hours (Safety Cap)
                </label>
                <input
                  id="input-special-max-doses"
                  type="number"
                  min="1"
                  max="12"
                  value={specialMaxDosesPerDay}
                  onChange={(e) => setSpecialMaxDosesPerDay(Number(e.target.value))}
                  className="w-32 px-3 py-2 rounded-xl border border-purple-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
                <span className="text-xs text-purple-700 ml-2">doses per day</span>
              </div>
            </div>
          ) : (
            /* Section 3: Schedule & Meal Relations (The Core Feature) */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-600" />
                    <span>Dosing Schedule & Meal Timing</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Specify exact hour and whether to take before eating, with food, or after eating
                  </p>
                </div>

                {/* Add another time */}
                <button
                  id="btn-add-schedule-item"
                  type="button"
                  onClick={() => handleAddSchedule()}
                  className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-1.5 rounded-lg transition-colors self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Time</span>
                </button>
              </div>

              {/* Quick Preset Buttons for Common Schedules */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-400">Quick presets:</span>
                <button
                  type="button"
                  onClick={() =>
                    handleAddSchedule({
                      time: '07:00',
                      label: 'Morning Before Breakfast',
                      mealRelation: 'before_meal',
                      mealName: 'Breakfast',
                    })
                  }
                  className="text-[11px] font-medium bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-md"
                >
                  7:00 AM (Before Breakfast)
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleAddSchedule({
                      time: '07:45',
                      label: 'Morning After Breakfast',
                      mealRelation: 'after_meal',
                      mealName: 'Breakfast',
                    })
                  }
                  className="text-[11px] font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-md"
                >
                  7:45 AM (After Breakfast)
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleAddSchedule({
                      time: '13:00',
                      label: 'After Lunch',
                      mealRelation: 'after_meal',
                      mealName: 'Lunch',
                    })
                  }
                  className="text-[11px] font-medium bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-md"
                >
                  1:00 PM (After Lunch)
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleAddSchedule({
                      time: '20:00',
                      label: 'After Dinner',
                      mealRelation: 'after_meal',
                      mealName: 'Dinner',
                    })
                  }
                  className="text-[11px] font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 px-2.5 py-1 rounded-md"
                >
                  8:00 PM (After Dinner)
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleAddSchedule({
                      time: '22:00',
                      label: 'Bedtime',
                      mealRelation: 'anytime',
                      mealName: 'Bedtime',
                    })
                  }
                  className="text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-md"
                >
                  10:00 PM (Bedtime)
                </button>
              </div>

              {errors.schedules && (
                <p className="text-xs text-rose-600">{errors.schedules}</p>
              )}

              {/* Schedules Cards List */}
              <div className="space-y-3">
                {schedules.length === 0 ? (
                  <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
                    <p className="font-semibold">No schedule times set for this medication.</p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleAddSchedule}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-xs shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Schedule Time
                      </button>
                      {initialMedication && onDelete && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete ${name || 'this medication'} completely?`)) {
                              onDelete(initialMedication.id);
                              onClose();
                            }
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs shadow-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete Medication
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  schedules.map((sch, index) => (
                    <div
                      key={sch.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-teal-600" />
                          <span>Schedule #{index + 1}</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRemoveSchedule(sch.id)}
                          className="text-xs text-rose-500 hover:text-rose-700 p-1.5 rounded-md hover:bg-rose-50 transition-colors inline-flex items-center gap-1"
                          title="Remove this schedule time"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-medium">Remove Schedule</span>
                        </button>
                      </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Time input */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Scheduled Time (24h or AM/PM)
                        </label>
                        <input
                          type="time"
                          value={sch.time}
                          onChange={(e) => handleUpdateSchedule(sch.id, { time: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>

                      {/* Meal Relation: The Core Prompt Requirement */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Food / Meal Timing
                        </label>
                        <select
                          value={sch.mealRelation}
                          onChange={(e) =>
                            handleUpdateSchedule(sch.id, {
                              mealRelation: e.target.value as MealRelation,
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                          <option value="before_meal">🍽️ Before Eating / Food</option>
                          <option value="after_meal">☕ After Eating / Food</option>
                          <option value="with_meal">🥗 With Food / Meal</option>
                          <option value="empty_stomach">🥛 Strict Empty Stomach</option>
                          <option value="anytime">⏱️ Anytime (No Food Restriction)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* Meal Name */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Meal Label / Note
                        </label>
                        <input
                          type="text"
                          value={sch.mealName || ''}
                          onChange={(e) =>
                            handleUpdateSchedule(sch.id, { mealName: e.target.value })
                          }
                          placeholder="e.g. Breakfast, Lunch, Dinner"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>

                      {/* Reminder config */}
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                            <Bell className="w-3 h-3 text-amber-500" />
                            <span>Reminder Alert</span>
                          </label>
                          <input
                            type="checkbox"
                            checked={sch.reminderEnabled}
                            onChange={(e) =>
                              handleUpdateSchedule(sch.id, { reminderEnabled: e.target.checked })
                            }
                            className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                          />
                        </div>

                        {sch.reminderEnabled && (
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <select
                              value={sch.reminderMinutesBefore}
                              onChange={(e) =>
                                handleUpdateSchedule(sch.id, {
                                  reminderMinutesBefore: Number(e.target.value),
                                })
                              }
                              className="text-[11px] px-2 py-1 rounded border border-slate-200 bg-slate-50"
                            >
                              <option value={0}>At scheduled time</option>
                              <option value={5}>5 minutes before</option>
                              <option value={10}>10 minutes before</option>
                              <option value={15}>15 minutes before</option>
                              <option value={30}>30 minutes before</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => soundManager.playTestTone()}
                              title="Test reminder chime tone"
                              className="text-[10px] text-teal-700 hover:text-teal-900 flex items-center gap-1 font-semibold"
                            >
                              <Volume2 className="w-3 h-3" /> Test Chime
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                ))
              )}
              </div>
            </div>
          )}

          {/* Section 4: Patient Instructions & Notes */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Instructions for Patient
              </label>
              <textarea
                id="input-med-instructions"
                rows={2}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. Take with a full glass of water. Do not lie down for 30 minutes. Avoid dairy."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Prescribing Doctor / Clinic
                </label>
                <input
                  id="input-med-doctor"
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="e.g. Dr. Mitchell (Internal Medicine)"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Inventory / Pills Remaining (Optional)
                </label>
                <input
                  id="input-med-inventory"
                  type="number"
                  min="0"
                  value={inventoryCount !== undefined ? inventoryCount : ''}
                  onChange={(e) =>
                    setInventoryCount(e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="e.g. 30"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Modal Actions Footer */}
          <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Delete button when editing an existing medication */}
            <div>
              {initialMedication && onDelete && (
                showConfirmDelete ? (
                  <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl">
                    <span className="text-xs font-bold text-rose-700">Delete this medication?</span>
                    <button
                      id="btn-confirm-delete-med-modal"
                      type="button"
                      onClick={() => {
                        onDelete(initialMedication.id);
                        onClose();
                      }}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      Yes, Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfirmDelete(false)}
                      className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    id="btn-delete-med-modal"
                    type="button"
                    onClick={() => setShowConfirmDelete(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-xl transition-colors border border-rose-200/60"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Medication</span>
                  </button>
                )
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>

              <button
                id="btn-save-medication"
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-xs font-bold shadow-xs transition-colors"
              >
                {initialMedication ? 'Save Changes' : 'Create Medication'}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
