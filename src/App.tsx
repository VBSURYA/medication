/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Pill, 
  Plus, 
  Calendar, 
  Clock, 
  Sun, 
  Sunrise, 
  Sunset, 
  Moon, 
  ShieldAlert, 
  CheckCircle2, 
  CheckCheck,
  AlertCircle,
  Filter,
  Sparkles,
  Utensils,
  Volume2
} from 'lucide-react';
import { 
  Medication, 
  DoseLog, 
  DailyDoseItem, 
  DoseStatus, 
  TimeSlot 
} from './types.ts';
import { 
  getStoredMedications, 
  saveMedications, 
  getStoredLogs, 
  saveLogs, 
  getDailyDoseItems,
  INITIAL_SAMPLE_MEDICATIONS,
  getReminderSettings,
  saveReminderSettings
} from './utils/storage.ts';
import { 
  getTodayDateString, 
  getTimeSlotFromTime, 
  formatTime24to12 
} from './utils/helpers.ts';
import { soundManager } from './utils/audio.ts';
import { isScheduleDue, requestBrowserNotificationPermission, sendBrowserNotification } from './utils/notification.ts';

// Components
import { Header } from './components/Header.tsx';
import { DailyOverview, FilterStatus } from './components/DailyOverview.tsx';
import { DoseCard } from './components/DoseCard.tsx';
import { SpecialMedicationSection } from './components/SpecialMedicationSection.tsx';
import { MedicationModal } from './components/MedicationModal.tsx';
import { ManageMedicationsModal } from './components/ManageMedicationsModal.tsx';
import { PrintScheduleModal } from './components/PrintScheduleModal.tsx';
import { SpecialDoseModal } from './components/SpecialDoseModal.tsx';
import { SkipModal } from './components/SkipModal.tsx';
import { ActiveReminderBanner, ActiveAlert } from './components/ActiveReminderBanner.tsx';
import { MongoStatusModal } from './components/MongoStatusModal.tsx';
import { 
  fetchDbStatus, 
  fetchApiMedications, 
  apiSaveMedication, 
  apiDeleteMedication, 
  fetchApiLogs, 
  apiSaveDoseLog, 
  apiResetSamples, 
  DbStatusResponse 
} from './utils/api.ts';

export default function App() {
  // 1. Core State
  const [medications, setMedications] = useState<Medication[]>(() => getStoredMedications());
  const [logs, setLogs] = useState<DoseLog[]>(() => getStoredLogs());
  const [currentDate, setCurrentDate] = useState<string>(() => getTodayDateString());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => getReminderSettings().soundEnabled);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');

  // 2. Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalAsSpecial, setAddModalAsSpecial] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [skipModalItem, setSkipModalItem] = useState<DailyDoseItem | null>(null);
  const [specialDoseMed, setSpecialDoseMed] = useState<Medication | null>(null);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<DbStatusResponse | null>(null);

  // 3. Active Alert State
  const [activeAlert, setActiveAlert] = useState<ActiveAlert | null>(null);
  const alertedMinutesRef = useRef<Set<string>>(new Set());

  // 4. Live Clock State
  const [currentTimeStr, setCurrentTimeStr] = useState<string>(() => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  });

  // Keep storage in sync
  useEffect(() => {
    saveMedications(medications);
  }, [medications]);

  useEffect(() => {
    saveLogs(logs);
  }, [logs]);

  // Initial MongoDB & API sync on mount
  useEffect(() => {
    let mounted = true;
    async function syncBackendData() {
      try {
        const status = await fetchDbStatus();
        if (mounted) setDbStatus(status);

        const apiMeds = await fetchApiMedications();
        if (mounted && apiMeds && apiMeds.length > 0) {
          setMedications(apiMeds);
          saveMedications(apiMeds);
        }

        const apiLogs = await fetchApiLogs(currentDate);
        if (mounted && apiLogs && apiLogs.length > 0) {
          setLogs((prev) => {
            const merged = [...apiLogs];
            for (const l of prev) {
              if (!merged.some((m) => m.id === l.id)) {
                merged.push(l);
              }
            }
            return merged;
          });
        }
      } catch (err) {
        console.warn('[MedSchedule] API synchronization fallback active:', err);
      }
    }
    syncBackendData();
    return () => {
      mounted = false;
    };
  }, [currentDate]);

  useEffect(() => {
    saveReminderSettings({
      soundEnabled,
      browserNotificationsEnabled: false,
      snoozeMinutes: 10,
    });
  }, [soundEnabled]);

  // Clock & Reminder Monitoring Loop (runs every second)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );

      // Check for scheduled medication reminders
      const currentHH = String(now.getHours()).padStart(2, '0');
      const currentMM = String(now.getMinutes()).padStart(2, '0');
      const currentHHMM = `${currentHH}:${currentMM}`;
      const today = getTodayDateString();

      // Check each minute once
      const minuteKey = `${today}-${currentHHMM}`;
      if (!alertedMinutesRef.current.has(minuteKey)) {
        alertedMinutesRef.current.add(minuteKey);

        // Find if any medication has a schedule due right now
        for (const med of medications) {
          if (med.isSpecialCondition) continue;

          for (const sch of med.schedules) {
            if (isScheduleDue(sch, currentHHMM)) {
              // Check if already taken today
              const isAlreadyTaken = logs.some(
                (l) =>
                  l.date === today &&
                  l.medicationId === med.id &&
                  l.scheduleId === sch.id &&
                  l.status === 'taken'
              );

              if (!isAlreadyTaken) {
                // Trigger alert!
                setActiveAlert({
                  id: `alert-${med.id}-${sch.id}-${Date.now()}`,
                  medication: med,
                  schedule: sch,
                  dueTime: sch.time,
                });

                if (soundEnabled && sch.soundEnabled) {
                  soundManager.playReminderAlert();
                }

                sendBrowserNotification(
                  `Medication Reminder: ${med.name}`,
                  `Time for ${med.dosage} (${formatTime24to12(sch.time)}). Please take as directed.`
                );
                break;
              }
            }
          }
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [medications, logs, soundEnabled]);

  // Request browser notification permission once gently
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        // Will be prompted when user clicks test alert or enables reminders
      }
    }
  }, []);

  // Compute daily dose items for the selected date
  const dailyItems = useMemo(() => {
    return getDailyDoseItems(currentDate, medications, logs);
  }, [currentDate, medications, logs]);

  const specialMedications = useMemo(() => {
    return medications.filter((m) => m.isSpecialCondition);
  }, [medications]);

  const todaySpecialDoses = useMemo(() => {
    return dailyItems.filter((i) => i.isSpecialDose);
  }, [dailyItems]);

  // Filter items based on activeFilter
  const filteredDailyItems = useMemo(() => {
    if (activeFilter === 'pending') {
      return dailyItems.filter((i) => i.status === 'pending');
    }
    if (activeFilter === 'taken') {
      return dailyItems.filter((i) => i.status === 'taken');
    }
    if (activeFilter === 'skipped') {
      return dailyItems.filter((i) => i.status === 'skipped');
    }
    if (activeFilter === 'special') {
      return dailyItems.filter((i) => i.isSpecialDose);
    }
    return dailyItems; // 'all'
  }, [dailyItems, activeFilter]);

  // Group items by time period for chronological structure
  const groupedItems = useMemo(() => {
    const groups: Record<TimeSlot, DailyDoseItem[]> = {
      morning: [],
      afternoon: [],
      evening: [],
      night: [],
      custom: [],
    };

    filteredDailyItems.forEach((item) => {
      const slot = item.schedule?.slot || getTimeSlotFromTime(item.scheduledTime);
      if (groups[slot]) {
        groups[slot].push(item);
      } else {
        groups.morning.push(item);
      }
    });

    return groups;
  }, [filteredDailyItems]);

  // Handlers for Dose Status (Mark Taken / Skip / Undo)
  const handleUpdateDoseStatus = (
    item: DailyDoseItem,
    newStatus: DoseStatus,
    skippedReason?: string
  ) => {
    setLogs((prevLogs) => {
      // Check if log entry already exists
      const existingIdx = prevLogs.findIndex(
        (l) =>
          l.date === currentDate &&
          l.medicationId === item.medication.id &&
          (item.schedule ? l.scheduleId === item.schedule.id : l.id === item.logId)
      );

      if (newStatus === 'taken' && soundEnabled) {
        soundManager.playSuccessChime();
      }

      // If active alert is currently showing for this medication, dismiss it!
      if (activeAlert && activeAlert.medication.id === item.medication.id) {
        setActiveAlert(null);
      }

      if (existingIdx >= 0) {
        const updated = [...prevLogs];
        const updatedLog: DoseLog = {
          ...updated[existingIdx],
          status: newStatus,
          takenAt: newStatus === 'taken' ? new Date().toISOString() : undefined,
          skippedReason: newStatus === 'skipped' ? skippedReason : undefined,
        };
        updated[existingIdx] = updatedLog;
        apiSaveDoseLog(updatedLog).catch(() => {});
        return updated;
      } else {
        // Create new log entry
        const newLog: DoseLog = {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          date: currentDate,
          medicationId: item.medication.id,
          scheduleId: item.schedule?.id,
          scheduledTime: item.scheduledTime,
          mealRelation: item.mealRelation,
          mealName: item.mealName,
          status: newStatus,
          takenAt: newStatus === 'taken' ? new Date().toISOString() : undefined,
          skippedReason: newStatus === 'skipped' ? skippedReason : undefined,
          isSpecialDose: item.isSpecialDose,
        };
        apiSaveDoseLog(newLog).catch(() => {});
        return [...prevLogs, newLog];
      }
    });
  };

  // Special Dose confirmation handler
  const handleConfirmSpecialDose = (med: Medication, time: string, note?: string) => {
    const newLog: DoseLog = {
      id: `special-log-${Date.now()}`,
      date: currentDate,
      medicationId: med.id,
      scheduledTime: time,
      mealRelation: 'anytime',
      status: 'taken',
      takenAt: `${currentDate}T${time}:00`,
      isSpecialDose: true,
      specialConditionNote: note,
    };

    setLogs((prev) => [...prev, newLog]);
    apiSaveDoseLog(newLog).catch(() => {});
    if (soundEnabled) {
      soundManager.playSuccessChime();
    }
  };

  // Skip Modal confirmation
  const handleConfirmSkip = (item: DailyDoseItem, reason: string) => {
    handleUpdateDoseStatus(item, 'skipped', reason);
  };

  // Medication CRUD handlers
  const handleSaveMedication = (newMed: Medication) => {
    setMedications((prev) => {
      const idx = prev.findIndex((m) => m.id === newMed.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newMed;
        return copy;
      } else {
        return [...prev, newMed];
      }
    });
    apiSaveMedication(newMed).catch((err) => console.warn('API save error:', err));
  };

  const handleDeleteMedication = (id: string) => {
    setMedications((prev) => prev.filter((m) => m.id !== id));
    // Also clean up future un-taken logs
    setLogs((prev) => prev.filter((l) => l.medicationId !== id || l.status === 'taken'));
    apiDeleteMedication(id).catch((err) => console.warn('API delete error:', err));
  };

  const handleDuplicateMedication = (med: Medication) => {
    const cloned: Medication = {
      ...med,
      id: `med-${Date.now()}`,
      name: `${med.name} (Copy)`,
      schedules: med.schedules.map((s) => ({
        ...s,
        id: `sch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      })),
      createdAt: new Date().toISOString(),
    };
    setMedications((prev) => [...prev, cloned]);
    apiSaveMedication(cloned).catch((err) => console.warn('API save error:', err));
  };

  const handleResetSampleData = () => {
    localStorage.removeItem('med_reminder_medications_v1');
    localStorage.removeItem('med_reminder_logs_v1');
    setMedications(INITIAL_SAMPLE_MEDICATIONS);
    const today = getTodayDateString();
    const seededLogs: DoseLog[] = [
      {
        id: `log-seed-1`,
        date: today,
        medicationId: 'med-1',
        scheduleId: 'sch-1-1',
        scheduledTime: '07:00',
        mealRelation: 'before_meal',
        mealName: 'Breakfast',
        status: 'taken',
        takenAt: `${today}T07:05:00`,
        notes: 'Taken before breakfast with 250ml water',
      },
    ];
    setLogs(seededLogs);
    apiResetSamples().catch(() => {});
  };

  // Test Alarm Simulator
  const handleTestReminder = () => {
    requestBrowserNotificationPermission();
    // Pick the first available regular med schedule or fallback
    const regularMed = medications.find((m) => !m.isSpecialCondition && m.schedules.length > 0);
    if (regularMed && regularMed.schedules[0]) {
      setActiveAlert({
        id: `test-alert-${Date.now()}`,
        medication: regularMed,
        schedule: regularMed.schedules[0],
        dueTime: regularMed.schedules[0].time,
      });
      if (soundEnabled) {
        soundManager.playReminderAlert();
      }
    } else {
      soundManager.playTestTone();
      alert('Reminder chime tested! Add a scheduled medication to test the full alarm banner.');
    }
  };

  // Helper for rendering a time period block
  const renderTimePeriodSection = (
    slotKey: TimeSlot,
    title: string,
    timeRange: string,
    icon: React.ReactNode,
    bgClass: string,
    borderClass: string
  ) => {
    const items = groupedItems[slotKey];
    if (items.length === 0) return null;

    return (
      <div id={`section-${slotKey}`} className="space-y-3">
        {/* Section Header */}
        <div className="flex items-center justify-between pt-2 pb-1">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg border ${bgClass} ${borderClass}`}>
              {icon}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{title}</h3>
              <p className="text-[11px] text-slate-500 font-medium">{timeRange}</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
            {items.length} {items.length === 1 ? 'dose' : 'doses'}
          </span>
        </div>

        {/* List of cards */}
        <div className="space-y-2.5">
          {items.map((item) => (
            <DoseCard
              key={item.logId}
              item={item}
              onUpdateStatus={handleUpdateDoseStatus}
              onOpenEditMed={(medId) => {
                const target = medications.find((m) => m.id === medId);
                if (target) setEditingMedication(target);
              }}
              onOpenSkipModal={(it) => setSkipModalItem(it)}
              onDeleteMedication={handleDeleteMedication}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100/60 flex flex-col font-sans antialiased text-slate-900">
      
      {/* 1. App Header */}
      <Header
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        onOpenAddModal={() => {
          setEditingMedication(null);
          setAddModalAsSpecial(false);
          setIsAddModalOpen(true);
        }}
        onOpenManageModal={() => setIsManageModalOpen(true)}
        onOpenPrintModal={() => setIsPrintModalOpen(true)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        currentTimeStr={currentTimeStr}
        onTestReminder={handleTestReminder}
        onOpenDbModal={() => setIsDbModalOpen(true)}
        dbStatus={dbStatus}
      />

      {/* 2. Main Page Layout */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 space-y-6">
        
        {/* Top Progress & Daily Regimen Overview */}
        <DailyOverview
          items={dailyItems}
          specialMedsCount={specialMedications.length}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          onQuickTakeDose={(item) => handleUpdateDoseStatus(item, 'taken')}
        />

        {/* Core Timeline Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left / Main Column: Daily Dose Schedule Cards */}
          <div className="lg:col-span-8 space-y-6">
            
            {filteredDailyItems.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {activeFilter === 'all'
                    ? 'No Medications Scheduled'
                    : `No ${activeFilter.toUpperCase()} Doses Found`}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {activeFilter === 'all'
                    ? 'Create your first morning or evening medication schedule with custom before/after meal timing.'
                    : 'You can switch back to "All Doses" to see all scheduled items for today.'}
                </p>
                {activeFilter === 'all' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMedication(null);
                      setAddModalAsSpecial(false);
                      setIsAddModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add First Medication</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveFilter('all')}
                    className="text-xs font-bold text-teal-700 underline"
                  >
                    View All Doses
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Morning Slot */}
                {renderTimePeriodSection(
                  'morning',
                  'Morning Routine',
                  '5:00 AM – 11:59 AM',
                  <Sunrise className="w-4 h-4 text-amber-600" />,
                  'bg-amber-50',
                  'border-amber-200'
                )}

                {/* Afternoon Slot */}
                {renderTimePeriodSection(
                  'afternoon',
                  'Afternoon Routine',
                  '12:00 PM – 4:59 PM',
                  <Sun className="w-4 h-4 text-orange-600" />,
                  'bg-orange-50',
                  'border-orange-200'
                )}

                {/* Evening Slot */}
                {renderTimePeriodSection(
                  'evening',
                  'Evening Routine',
                  '5:00 PM – 8:59 PM',
                  <Sunset className="w-4 h-4 text-indigo-600" />,
                  'bg-indigo-50',
                  'border-indigo-200'
                )}

                {/* Night / Bedtime Slot */}
                {renderTimePeriodSection(
                  'night',
                  'Night & Bedtime Routine',
                  '9:00 PM – 4:59 AM',
                  <Moon className="w-4 h-4 text-purple-600" />,
                  'bg-purple-50',
                  'border-purple-200'
                )}

                {/* Custom / Other */}
                {renderTimePeriodSection(
                  'custom',
                  'Flexible / Other Timings',
                  'As designated',
                  <Clock className="w-4 h-4 text-slate-600" />,
                  'bg-slate-50',
                  'border-slate-200'
                )}
              </div>
            )}

            {/* Quick Helper Tip Box */}
            <div className="bg-teal-50/70 border border-teal-200/80 rounded-2xl p-4 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-teal-100/80 text-teal-800 shrink-0">
                <Utensils className="w-4 h-4" />
              </div>
              <div className="text-xs text-slate-600 space-y-1">
                <h4 className="font-bold text-teal-950">Patient Meal Timing Rule:</h4>
                <p>
                  <strong className="text-slate-800">Before Eating:</strong> Take 30 minutes before your meal on an empty stomach with a full glass of water.
                  <br />
                  <strong className="text-slate-800">After Eating:</strong> Take 20-30 minutes after finishing food to protect your stomach.
                </p>
              </div>
            </div>

          </div>

          {/* Right Column: Special Condition / As-Needed Section & Quick Tools */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Special Condition / PRN Medicines Section */}
            <SpecialMedicationSection
              specialMedications={specialMedications}
              todaySpecialDoses={todaySpecialDoses}
              onOpenLogSpecialModal={(med) => setSpecialDoseMed(med)}
              onOpenAddModal={() => {
                setEditingMedication(null);
                setAddModalAsSpecial(true);
                setIsAddModalOpen(true);
              }}
              onOpenEditMed={(medId) => {
                const target = medications.find((m) => m.id === medId);
                if (target) setEditingMedication(target);
              }}
              onDeleteMedication={handleDeleteMedication}
            />

            {/* Caregiver & Patient Quick Action Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Schedule Tools & Actions
              </h3>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingMedication(null);
                    setAddModalAsSpecial(false);
                    setIsAddModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 text-left transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
                      <Plus className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Add New Medication</p>
                      <p className="text-[11px] text-slate-500">Set custom time & before/after food rule</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setIsManageModalOpen(true)}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-left transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                      <Pill className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Manage All Medications</p>
                      <p className="text-[11px] text-slate-500">Edit dosages, schedules, or delete items</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(true)}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-left transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Print Refrigerator Routine</p>
                      <p className="text-[11px] text-slate-500">Clean chart for patient or doctor review</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* 3. Floating Active Reminder Toast (When medication is due right now) */}
      <ActiveReminderBanner
        alert={activeAlert}
        onTakeNow={(alt) => {
          const doseItem = dailyItems.find(
            (d) => d.medication.id === alt.medication.id && d.schedule?.id === alt.schedule.id
          );
          if (doseItem) {
            handleUpdateDoseStatus(doseItem, 'taken');
          }
          setActiveAlert(null);
        }}
        onSnooze={(alt) => {
          setActiveAlert(null);
          // Re-trigger alert in 10 minutes
          setTimeout(() => {
            setActiveAlert(alt);
            if (soundEnabled) {
              soundManager.playReminderAlert();
            }
          }, 10 * 60 * 1000);
        }}
        onDismiss={() => setActiveAlert(null)}
      />

      {/* 4. Modals */}
      {/* Create / Edit Medication Modal */}
      <MedicationModal
        isOpen={isAddModalOpen || editingMedication !== null}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingMedication(null);
          setAddModalAsSpecial(false);
        }}
        onSave={handleSaveMedication}
        onDelete={handleDeleteMedication}
        initialMedication={editingMedication}
        defaultAsSpecial={addModalAsSpecial}
      />

      {/* Manage Medications Drawer / Modal */}
      <ManageMedicationsModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        medications={medications}
        onOpenAddModal={() => {
          setEditingMedication(null);
          setAddModalAsSpecial(false);
          setIsAddModalOpen(true);
        }}
        onOpenEditModal={(med) => setEditingMedication(med)}
        onDeleteMedication={handleDeleteMedication}
        onDuplicateMedication={handleDuplicateMedication}
        onResetSampleData={handleResetSampleData}
      />

      {/* Printable Schedule Modal */}
      <PrintScheduleModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        medications={medications}
      />

      {/* Record Special Dose Modal */}
      <SpecialDoseModal
        isOpen={specialDoseMed !== null}
        onClose={() => setSpecialDoseMed(null)}
        medication={specialDoseMed}
        onConfirm={handleConfirmSpecialDose}
      />

      {/* Skip Dose Modal */}
      <SkipModal
        isOpen={skipModalItem !== null}
        onClose={() => setSkipModalItem(null)}
        item={skipModalItem}
        onConfirm={handleConfirmSkip}
      />

      {/* MongoDB Database Status & Setup Modal */}
      <MongoStatusModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
        dbStatus={dbStatus}
        onRefresh={async () => {
          const s = await fetchDbStatus();
          setDbStatus(s);
        }}
      />

    </div>
  );
}
