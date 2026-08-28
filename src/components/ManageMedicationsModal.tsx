import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Edit2, 
  Trash2, 
  Copy, 
  Search, 
  Pill, 
  Clock, 
  Utensils, 
  ShieldAlert, 
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { Medication } from '../types.ts';
import { formatTime24to12, getMealRelationInfo, COLOR_PALETTES } from '../utils/helpers.ts';

interface ManageMedicationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  medications: Medication[];
  onOpenAddModal: () => void;
  onOpenEditModal: (med: Medication) => void;
  onDeleteMedication: (id: string) => void;
  onDuplicateMedication: (med: Medication) => void;
  onResetSampleData: () => void;
}

export const ManageMedicationsModal: React.FC<ManageMedicationsModalProps> = ({
  isOpen,
  onClose,
  medications,
  onOpenAddModal,
  onOpenEditModal,
  onDeleteMedication,
  onDuplicateMedication,
  onResetSampleData,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredMeds = medications.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.dosage.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.instructions && m.instructions.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const regularMeds = filteredMeds.filter((m) => !m.isSpecialCondition);
  const specialMeds = filteredMeds.filter((m) => m.isSpecialCondition);

  const handleDelete = (id: string) => {
    onDeleteMedication(id);
    setConfirmDeleteId(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-white shadow-xs">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                Manage All Medications & Schedules
              </h2>
              <p className="text-xs text-slate-500">
                View, update, duplicate, or remove any prescribed medicine
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

        {/* Toolbar: Search, Add & Reset */}
        <div className="p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search medication name or dose..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Reset all medications and today logs back to standard medical example?')) {
                  onResetSampleData();
                }
              }}
              title="Reset to default example medications"
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Samples</span>
            </button>

            <button
              id="btn-manage-add-med"
              type="button"
              onClick={() => {
                onClose();
                onOpenAddModal();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Medication</span>
            </button>
          </div>
        </div>

        {/* Medication List */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          
          {/* 1. Regular Scheduled Regimen */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-teal-600" />
              <span>Routine Daily Medications ({regularMeds.length})</span>
            </h3>

            {regularMeds.length === 0 ? (
              <div className="p-4 text-center bg-slate-50 rounded-xl text-xs text-slate-500">
                No regular medications found. Click "Add Medication" to create one.
              </div>
            ) : (
              <div className="space-y-2.5">
                {regularMeds.map((med) => {
                  const colorScheme = COLOR_PALETTES[med.color] || COLOR_PALETTES.teal;
                  const isDeletingThis = confirmDeleteId === med.id;

                  return (
                    <div
                      key={med.id}
                      id={`manage-med-card-${med.id}`}
                      className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${colorScheme.lightBg} ${colorScheme.border} ${colorScheme.text}`}
                          >
                            <Pill className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-baseline gap-2">
                              <h4 className="text-sm font-bold text-slate-900">{med.name}</h4>
                              <span className="text-xs font-semibold text-slate-500">{med.dosage}</span>
                            </div>
                            {med.doctorName && (
                              <p className="text-[11px] text-slate-400">Dr: {med.doctorName}</p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          {isDeletingThis ? (
                            <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-lg border border-rose-200">
                              <span className="text-[11px] font-bold text-rose-700 px-1">Delete?</span>
                              <button
                                type="button"
                                onClick={() => handleDelete(med.id)}
                                className="px-2 py-0.5 bg-rose-600 text-white rounded text-[11px] font-bold"
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[11px]"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => onDuplicateMedication(med)}
                                title="Duplicate / Clone this medication"
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              <button
                                id={`btn-edit-manage-${med.id}`}
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onOpenEditModal(med);
                                }}
                                title="Edit Medication & Schedule"
                                className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2.5 py-1.5 rounded-lg border border-teal-200 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>

                              <button
                                id={`btn-del-manage-${med.id}`}
                                type="button"
                                onClick={() => setConfirmDeleteId(med.id)}
                                title="Delete Medication"
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Scheduled Doses & Meal Relations Chips */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {med.schedules.map((sch) => {
                          const mealInfo = getMealRelationInfo(sch.mealRelation, sch.mealName);
                          return (
                            <div
                              key={sch.id}
                              className="inline-flex items-center gap-1.5 text-xs bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200"
                            >
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span className="font-mono font-bold text-slate-800">
                                {formatTime24to12(sch.time)}
                              </span>
                              <span className="text-slate-300">•</span>
                              <Utensils className="w-3 h-3 text-amber-600" />
                              <span className="font-medium text-slate-700">{mealInfo.label}</span>
                            </div>
                          );
                        })}
                      </div>

                      {med.instructions && (
                        <p className="text-xs text-slate-500 italic bg-slate-50 px-2.5 py-1.5 rounded-lg">
                          "{med.instructions}"
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Special Condition & PRN Medicines */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />
              <span>Special Condition / As-Needed (PRN) ({specialMeds.length})</span>
            </h3>

            {specialMeds.length === 0 ? (
              <div className="p-4 text-center bg-purple-50/50 rounded-xl text-xs text-purple-600 border border-dashed border-purple-200">
                No special condition medicines configured.
              </div>
            ) : (
              <div className="space-y-2.5">
                {specialMeds.map((med) => {
                  const colorScheme = COLOR_PALETTES[med.color] || COLOR_PALETTES.purple;
                  const isDeletingThis = confirmDeleteId === med.id;

                  return (
                    <div
                      key={med.id}
                      className="p-4 rounded-xl border border-purple-200 bg-purple-50/30 hover:bg-purple-50/50 transition-all space-y-2"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${colorScheme.lightBg} ${colorScheme.border} ${colorScheme.text}`}
                          >
                            <Pill className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-baseline gap-2">
                              <h4 className="text-sm font-bold text-slate-900">{med.name}</h4>
                              <span className="text-xs font-semibold text-slate-500">{med.dosage}</span>
                            </div>
                            <p className="text-xs font-bold text-purple-800">
                              Trigger: {med.specialConditionReason}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          {isDeletingThis ? (
                            <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-lg border border-rose-200">
                              <span className="text-[11px] font-bold text-rose-700 px-1">Delete?</span>
                              <button
                                type="button"
                                onClick={() => handleDelete(med.id)}
                                className="px-2 py-0.5 bg-rose-600 text-white rounded text-[11px] font-bold"
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[11px]"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onOpenEditModal(med);
                                }}
                                className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 hover:text-purple-900 bg-white px-2.5 py-1.5 rounded-lg border border-purple-200 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(med.id)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-slate-600 flex items-center gap-3">
                        <span>Max {med.specialMaxDosesPerDay || 3} doses per day</span>
                        {med.instructions && <span>• {med.instructions}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Total Medications: <strong className="text-slate-800">{medications.length}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors border border-slate-300 bg-white"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
