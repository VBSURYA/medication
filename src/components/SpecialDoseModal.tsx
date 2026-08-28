import React, { useState } from 'react';
import { X, ShieldAlert, Clock, Check, AlertCircle } from 'lucide-react';
import { Medication } from '../types.ts';

interface SpecialDoseModalProps {
  isOpen: boolean;
  onClose: () => void;
  medication: Medication | null;
  onConfirm: (medication: Medication, time: string, note?: string) => void;
}

export const SpecialDoseModal: React.FC<SpecialDoseModalProps> = ({
  isOpen,
  onClose,
  medication,
  onConfirm,
}) => {
  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [symptomNote, setSymptomNote] = useState('');

  if (!isOpen || !medication) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(medication, time, symptomNote.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-purple-200 overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Log Special Condition Dose</h3>
              <p className="text-[11px] text-purple-700 font-medium">As-needed (PRN) administration</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <h4 className="text-sm font-bold text-slate-900">{medication.name}</h4>
            <p className="text-xs text-slate-500 font-medium">{medication.dosage}</p>
            {medication.specialConditionReason && (
              <p className="text-xs text-purple-800 font-semibold mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-purple-600 shrink-0" />
                <span>Condition: {medication.specialConditionReason}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Time Administered
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Current Symptoms / Clinical Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={symptomNote}
              onChange={(e) => setSymptomNote(e.target.value)}
              placeholder="e.g. Mild headache began after screen time, rating 5/10"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              id="btn-confirm-special-dose"
              type="submit"
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Record Dose Taken</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
