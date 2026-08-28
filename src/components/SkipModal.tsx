import React, { useState } from 'react';
import { X, AlertCircle, Check } from 'lucide-react';
import { DailyDoseItem } from '../types.ts';

interface SkipModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: DailyDoseItem | null;
  onConfirm: (item: DailyDoseItem, reason: string) => void;
}

const COMMON_REASONS = [
  'Doctor advised to pause',
  'Felt nauseous / stomach upset',
  'Fasting for medical test',
  'Forgot and time passed',
  'Medication temporarily out of stock',
  'Other personal reason',
];

export const SkipModal: React.FC<SkipModalProps> = ({
  isOpen,
  onClose,
  item,
  onConfirm,
}) => {
  const [reason, setReason] = useState('Doctor advised to pause');
  const [customReason, setCustomReason] = useState('');

  if (!isOpen || !item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = reason === 'Other personal reason' && customReason.trim()
      ? customReason.trim()
      : reason;
    onConfirm(item, finalReason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Skip Medication Dose</h3>
              <p className="text-[11px] text-slate-500">Record clinical or patient reason for skipping</p>
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200 text-xs">
            <p className="font-bold text-amber-900">{item.medication.name} ({item.medication.dosage})</p>
            <p className="text-amber-700 mt-0.5">Scheduled for {item.scheduledTime} ({item.mealRelation})</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Reason for Skipping
            </label>
            <div className="space-y-1.5">
              {COMMON_REASONS.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-2.5 p-2 rounded-lg text-xs cursor-pointer border transition-colors ${
                    reason === r ? 'bg-teal-50 border-teal-300 text-teal-900 font-semibold' : 'hover:bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="skipReason"
                    value={r}
                    checked={reason === r}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-3.5 h-3.5 text-teal-600 focus:ring-teal-500"
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>
          </div>

          {reason === 'Other personal reason' && (
            <div>
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Specify reason..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              id="btn-confirm-skip"
              type="submit"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Confirm Skip</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
