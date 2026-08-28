/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  Volume2,
  Apple,
  Smartphone,
  Download,
  X
} from 'lucide-react';
import { 
  Medication, 
  DoseLog, 
  DailyDoseItem, 
  DoseStatus, 
  TimeSlot,
  RoutineItem,
  RoutineLog,
  DailyRoutineItem,
  RoutineStatus
} from './types.ts';
import { 
  getStoredMedications, 
  saveMedications, 
  getStoredLogs, 
  saveLogs, 
  getDailyDoseItems,
  INITIAL_SAMPLE_MEDICATIONS,
  getStoredRoutines,
  saveRoutines,
  getStoredRoutineLogs,
  saveRoutineLogs,
  getDailyRoutineItems,
  INITIAL_SAMPLE_ROUTINES,
  generateDefaultSampleDoseLogs,
  generateDefaultSampleRoutineLogs,
  getReminderSettings,
  saveReminderSettings
} from './utils/storage.ts';
import { 
  getTodayDateString, 
  getTimeSlotFromTime, 
  formatTime24to12 
} from './utils/helpers.ts';
import { soundManager, AlarmVolumeLevel } from './utils/audio.ts';
import { isScheduleDue, requestBrowserNotificationPermission, sendBrowserNotification } from './utils/notification.ts';
import { getIsInstalled } from './registerServiceWorker.ts';

// Components
import { Header } from './components/Header.tsx';
import { DailyOverview, FilterStatus } from './components/DailyOverview.tsx';
import { DoseCard } from './components/DoseCard.tsx';
import { RoutineCard } from './components/RoutineCard.tsx';
import { RoutineModal } from './components/RoutineModal.tsx';
import { SpecialMedicationSection } from './components/SpecialMedicationSection.tsx';
import { MedicationModal } from './components/MedicationModal.tsx';
import { ManageMedicationsModal } from './components/ManageMedicationsModal.tsx';
import { PrintScheduleModal } from './components/PrintScheduleModal.tsx';
import { SpecialDoseModal } from './components/SpecialDoseModal.tsx';
import { SkipModal } from './components/SkipModal.tsx';
import { ActiveReminderBanner, ActiveAlert } from './components/ActiveReminderBanner.tsx';
import { MongoStatusModal } from './components/MongoStatusModal.tsx';
import { HistoryPage } from './components/HistoryPage.tsx';
import { PwaInstallModal } from './components/PwaInstallPrompt.tsx';
import { 
  fetchDbStatus, 
  fetchApiMedications, 
  apiSaveMedication, 
  apiDeleteMedication, 
  fetchApiLogs, 
  apiSaveDoseLog, 
  fetchApiRoutines,
  apiSaveRoutine,
  apiDeleteRoutine,
  fetchApiRoutineLogs,
  apiSaveRoutineLog,
  apiResetSamples, 
  DbStatusResponse,
  fetchApiSyncAll
} from './utils/api.ts';

export type UnifiedSlotItem = 
  | { type: 'dose'; item: DailyDoseItem; time: string }
  | { type: 'routine'; item: DailyRoutineItem; time: string };

export default function App() {
  // 1. Core State
  const [medications, setMedications] = useState<Medication[]>(() => getStoredMedications());
  const [logs, setLogs] = useState<DoseLog[]>(() => getStoredLogs());
  const [routines, setRoutines] = useState<RoutineItem[]>(() => getStoredRoutines());
  const [routineLogs, setRoutineLogs] = useState<RoutineLog[]>(() => getStoredRoutineLogs());
  const [currentDate, setCurrentDate] = useState<string>(() => getTodayDateString());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => getReminderSettings().soundEnabled);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');

  // View state: 'daily' vs 'history' (/history page)
  const [currentView, setCurrentView] = useState<'daily' | 'history'>(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/history') {
      return 'history';
    }
    return 'daily';
  });

  // Keep URL in sync with view
  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname === '/history') {
        setCurrentView('history');
      } else {
        setCurrentView('daily');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleViewChange = (view: 'daily' | 'history') => {
    setCurrentView(view);
    const targetPath = view === 'history' ? '/history' : '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  };

  // 2. Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalAsSpecial, setAddModalAsSpecial] = useState(false);
  const [addModalDefaultSlot, setAddModalDefaultSlot] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('morning');
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [isRoutineModalOpen, setIsRoutineModalOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<RoutineItem | null>(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [skipModalItem, setSkipModalItem] = useState<DailyDoseItem | null>(null);
  const [specialDoseMed, setSpecialDoseMed] = useState<Medication | null>(null);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<DbStatusResponse | null>(null);

  // 3. Active Alert & Loud Alarm State
  const [activeAlert, setActiveAlert] = useState<ActiveAlert | null>(null);
  const alertedMinutesRef = useRef<Set<string>>(new Set());
  const [isAlarmRinging, setIsAlarmRinging] = useState<boolean>(() => soundManager.isRinging());
  const [volumeLevel, setVolumeLevel] = useState<AlarmVolumeLevel>(() => soundManager.getVolumeLevel());

  // 4. PWA State
  const [isPwaModalOpen, setIsPwaModalOpen] = useState<boolean>(false);
  const [showPwaBanner, setShowPwaBanner] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (getIsInstalled()) return false;
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) return false;
    return localStorage.getItem('med_pwa_banner_dismissed') !== 'true';
  });

  // Subscribe to loud alarm ringing state
  useEffect(() => {
    const unsubscribe = soundManager.subscribe((ringing) => {
      setIsAlarmRinging(ringing);
    });
    return unsubscribe;
  }, []);

  // Global keyboard shortcut: Press Space or Escape to silence ringing alarm immediately
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.code === 'Space' || e.key === 'Escape') && soundManager.isRinging()) {
        if (e.code === 'Space') e.preventDefault();
        soundManager.stopAlarm();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Check URL parameters on mount (e.g., from PWA shortcuts)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');
      const actionParam = params.get('action');
      if (viewParam === 'history') {
        setCurrentView('history');
      }
      if (actionParam === 'test_alarm') {
        setTimeout(() => {
          handleTestReminder();
        }, 600);
      }
    }
  }, []);

  // Immediate alarm stop action
  const handleStopAlarm = () => {
    soundManager.stopAlarm();
  };

  const handleChangeVolumeLevel = (lvl: AlarmVolumeLevel) => {
    soundManager.setVolumeLevel(lvl);
    setVolumeLevel(lvl);
  };

  // 5. Live Clock State
  const [currentTimeStr, setCurrentTimeStr] = useState<string>(() => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  });
  const [currentHHMM, setCurrentHHMM] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  // Keep local storage in sync
  useEffect(() => {
    saveMedications(medications);
  }, [medications]);

  useEffect(() => {
    saveLogs(logs);
  }, [logs]);

  useEffect(() => {
    saveRoutines(routines);
  }, [routines]);

  useEffect(() => {
    saveRoutineLogs(routineLogs);
  }, [routineLogs]);

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Authoritative Database Sync:
  // Pulls the latest complete state from MongoDB / server persistent store
  // Guarantees all devices (Phone A, Phone B, tablet) see exact identical schedules
  const syncDatabase = useCallback(async (isManual = false) => {
    try {
      if (isManual) setIsSyncing(true);
      const res = await fetchApiSyncAll(currentDate);
      if (res) {
        if (Array.isArray(res.medications)) {
          setMedications(res.medications);
          saveMedications(res.medications);
        }
        if (Array.isArray(res.routines)) {
          setRoutines(res.routines);
          saveRoutines(res.routines);
        }
        if (Array.isArray(res.logs)) {
          setLogs(res.logs);
          saveLogs(res.logs);
        }
        if (Array.isArray(res.routineLogs)) {
          setRoutineLogs(res.routineLogs);
          saveRoutineLogs(res.routineLogs);
        }
        if (res.dbStatus) {
          setDbStatus(res.dbStatus);
        }
        const now = new Date();
        setLastSyncTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (err) {
      console.warn('[MedSchedule] Database synchronization fallback active:', err);
    } finally {
      if (isManual) setIsSyncing(false);
    }
  }, [currentDate]);

  // Initial fetch on mount & when currentDate changes
  useEffect(() => {
    syncDatabase();
  }, [syncDatabase]);

  // Multi-Device Auto-Sync on Tab Focus & Phone Screen Unlock:
  // Immediately pulls latest data whenever user opens or switches back to the app
  useEffect(() => {
    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        syncDatabase();
      }
    };
    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);
    return () => {
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, [syncDatabase]);

  // Fast background polling every 5 seconds when visible:
  // Ensures updates made on Phone A reflect on Phone B in real time
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncDatabase();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [syncDatabase]);

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
      setCurrentHHMM((prev) => (prev !== currentHHMM ? currentHHMM : prev));
      const today = getTodayDateString();

      // Check each minute once
      const minuteKey = `${today}-${currentHHMM}`;
      if (!alertedMinutesRef.current.has(minuteKey)) {
        alertedMinutesRef.current.add(minuteKey);

        // 1. Check medication alerts
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
                  soundManager.startLoudAlarmLoop();
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

        // 2. Check routine / meal alerts
        for (const r of routines) {
          if (r.reminderEnabled && r.time === currentHHMM) {
            const isAlreadyDone = routineLogs.some(
              (rl) => rl.date === today && rl.routineId === r.id && rl.status === 'completed'
            );
            if (!isAlreadyDone) {
              if (soundEnabled) {
                soundManager.startLoudAlarmLoop();
              }
              sendBrowserNotification(
                `Routine & Meal Notice: ${r.title}`,
                `Scheduled for ${formatTime24to12(r.time)}: ${r.description || 'Daily routine event'}`
              );
            }
          }
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [medications, logs, routines, routineLogs, soundEnabled]);

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

  // Compute daily routine items for the selected date
  const dailyRoutineItems = useMemo(() => {
    return getDailyRoutineItems(currentDate, routines, routineLogs);
  }, [currentDate, routines, routineLogs]);

  const specialMedications = useMemo(() => {
    return medications.filter((m) => m.isSpecialCondition);
  }, [medications]);

  const todaySpecialDoses = useMemo(() => {
    return dailyItems.filter((i) => i.isSpecialDose);
  }, [dailyItems]);

  // Filter doses based on activeFilter
  const filteredDailyDoses = useMemo(() => {
    if (activeFilter === 'routines') return [];
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
    return dailyItems; // 'all' or 'medications'
  }, [dailyItems, activeFilter]);

  // Filter routines based on activeFilter
  const filteredDailyRoutines = useMemo(() => {
    if (activeFilter === 'medications' || activeFilter === 'special' || activeFilter === 'skipped') {
      return [];
    }
    if (activeFilter === 'pending') {
      return dailyRoutineItems.filter((r) => r.status === 'pending');
    }
    if (activeFilter === 'taken') {
      return dailyRoutineItems.filter((r) => r.status === 'completed');
    }
    return dailyRoutineItems; // 'all' or 'routines'
  }, [dailyRoutineItems, activeFilter]);

  // Unified items grouped by time slot, strictly sorted by time
  const groupedUnifiedItems = useMemo(() => {
    const groups: Record<TimeSlot, UnifiedSlotItem[]> = {
      morning: [],
      afternoon: [],
      evening: [],
      night: [],
      custom: [],
    };

    // Add doses
    filteredDailyDoses.forEach((d) => {
      const slot = d.schedule?.slot || getTimeSlotFromTime(d.scheduledTime);
      const targetSlot = groups[slot] ? slot : 'morning';
      groups[targetSlot].push({
        type: 'dose',
        item: d,
        time: d.scheduledTime,
      });
    });

    // Add routines
    filteredDailyRoutines.forEach((r) => {
      const slot = getTimeSlotFromTime(r.scheduledTime);
      const targetSlot = groups[slot] ? slot : 'morning';
      groups[targetSlot].push({
        type: 'routine',
        item: r,
        time: r.scheduledTime,
      });
    });

    // Sort each group chronologically by time
    (Object.keys(groups) as TimeSlot[]).forEach((slotKey) => {
      groups[slotKey].sort((a, b) => a.time.localeCompare(b.time));
    });

    return groups;
  }, [filteredDailyDoses, filteredDailyRoutines]);

  const totalFilteredCount = filteredDailyDoses.length + filteredDailyRoutines.length;

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

  // Routine Status Handler (Toggle between completed and pending)
  const handleToggleRoutine = (item: DailyRoutineItem) => {
    setRoutineLogs((prevLogs) => {
      const existingIdx = prevLogs.findIndex(
        (l) => l.date === currentDate && l.routineId === item.routine.id
      );

      const isCurrentlyDone = item.status === 'completed';
      const newStatus: RoutineStatus = isCurrentlyDone ? 'pending' : 'completed';

      if (newStatus === 'completed' && soundEnabled) {
        soundManager.playSuccessChime();
      }

      if (existingIdx >= 0) {
        const updated = [...prevLogs];
        const updatedLog: RoutineLog = {
          ...updated[existingIdx],
          status: newStatus,
          completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
        };
        updated[existingIdx] = updatedLog;
        apiSaveRoutineLog(updatedLog).catch(() => {});
        return updated;
      } else {
        const newLog: RoutineLog = {
          id: `rlog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          routineId: item.routine.id,
          date: currentDate,
          status: newStatus,
          completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
        };
        apiSaveRoutineLog(newLog).catch(() => {});
        return [...prevLogs, newLog];
      }
    });
  };

  // Routine CRUD Handlers
  const handleSaveRoutine = (routineData: RoutineItem) => {
    setRoutines((prev) => {
      const idx = prev.findIndex((r) => r.id === routineData.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = routineData;
        return copy;
      } else {
        return [...prev, routineData];
      }
    });
    apiSaveRoutine(routineData).catch((err) => console.warn('API routine save error:', err));
  };

  const handleDeleteRoutine = (routineId: string) => {
    setRoutines((prev) => prev.filter((r) => r.id !== routineId));
    setRoutineLogs((prev) => prev.filter((l) => l.routineId !== routineId || l.status === 'completed'));
    apiDeleteRoutine(routineId).catch((err) => console.warn('API routine delete error:', err));
  };

  const handleEditRoutine = (routineId: string) => {
    const target = routines.find((r) => r.id === routineId);
    if (target) {
      setEditingRoutine(target);
      setIsRoutineModalOpen(true);
    }
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
    localStorage.removeItem('med_reminder_routines_v1');
    localStorage.removeItem('med_reminder_routine_logs_v1');
    setMedications(INITIAL_SAMPLE_MEDICATIONS);
    setRoutines(INITIAL_SAMPLE_ROUTINES);
    const seededLogs = generateDefaultSampleDoseLogs();
    const seededRoutineLogs = generateDefaultSampleRoutineLogs();
    setLogs(seededLogs);
    setRoutineLogs(seededRoutineLogs);
    saveLogs(seededLogs);
    saveRoutineLogs(seededRoutineLogs);
    apiResetSamples().catch(() => {});
  };

  // Direct Clinical History log persistence handlers
  const handleSaveHistoryDoseLog = (log: DoseLog) => {
    setLogs((prev) => {
      const idx = prev.findIndex((l) => l.id === log.id);
      let updated: DoseLog[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = log;
      } else {
        updated = [...prev, log];
      }
      saveLogs(updated);
      return updated;
    });
    apiSaveDoseLog(log).catch(() => {});
  };

  const handleSaveHistoryRoutineLog = (log: RoutineLog, newRoutine?: RoutineItem) => {
    if (newRoutine) {
      setRoutines((prev) => {
        const next = [...prev, newRoutine];
        saveRoutines(next);
        return next;
      });
      apiSaveRoutine(newRoutine).catch(() => {});
    }

    setRoutineLogs((prev) => {
      const idx = prev.findIndex((l) => l.id === log.id);
      let updated: RoutineLog[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = log;
      } else {
        updated = [...prev, log];
      }
      saveRoutineLogs(updated);
      return updated;
    });
    apiSaveRoutineLog(log).catch(() => {});
  };

  // Test Alarm Simulator (Runs loud continuous alarm loop so patient can test & stop immediately)
  const handleTestReminder = () => {
    requestBrowserNotificationPermission();
    if (soundManager.isRinging()) {
      soundManager.stopAlarm();
      return;
    }

    // Pick the first available regular med schedule or generate a realistic test dose
    const regularMed = medications.find((m) => !m.isSpecialCondition && m.schedules.length > 0);
    if (regularMed && regularMed.schedules[0]) {
      setActiveAlert({
        id: `test-alert-${Date.now()}`,
        medication: regularMed,
        schedule: regularMed.schedules[0],
        dueTime: regularMed.schedules[0].time,
      });
    } else {
      const simulatedMed: Medication = {
        id: 'test-med-001',
        name: 'Daily Morning Tablet',
        dosage: '10mg (1 Tablet)',
        form: 'tablet',
        color: 'teal',
        instructions: 'Take 30 mins before breakfast with a glass of water',
        isSpecialCondition: false,
        createdAt: new Date().toISOString(),
        schedules: [
          {
            id: 'test-sch-001',
            time: currentHHMM,
            slot: 'morning',
            mealRelation: 'before_meal',
            mealName: 'Breakfast',
            reminderEnabled: true,
            reminderMinutesBefore: 0,
            soundEnabled: true,
          }
        ],
      };
      setActiveAlert({
        id: `test-alert-${Date.now()}`,
        medication: simulatedMed,
        schedule: simulatedMed.schedules[0],
        dueTime: simulatedMed.schedules[0].time,
      });
    }

    if (soundEnabled) {
      soundManager.startLoudAlarmLoop();
    }
  };

  // Helper for rendering a time period block
  const renderTimePeriodSection = (
    slotKey: TimeSlot,
    title: string,
    timeRange: string,
    icon: React.ReactNode,
    bgClass: string,
    borderClass: string,
    alwaysShow: boolean = false
  ) => {
    const items = groupedUnifiedItems[slotKey];
    if (items.length === 0) {
      if (!alwaysShow) return null;
      return (
        <div id={`section-${slotKey}`} className="space-y-3">
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
            <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full">
              4th Daily Period
            </span>
          </div>

          <div className="p-4 rounded-xl border border-dashed border-purple-300 bg-purple-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 text-purple-900">
              <div className="w-9 h-9 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">Night & Bedtime Schedule</p>
                <p className="text-[11px] text-slate-600">
                  Ready for your nighttime doses (e.g. 10:00 PM cholesterol / sleep medicine) or evening water routine
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={() => {
                  setEditingMedication(null);
                  setAddModalAsSpecial(false);
                  setAddModalDefaultSlot('night');
                  setIsAddModalOpen(true);
                }}
                className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-xs inline-flex items-center justify-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Night Medication</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingRoutine({
                    id: '',
                    title: 'Bedtime Wind Down & Night Water',
                    category: 'sleep',
                    time: '22:00',
                    description: 'Bedtime routine with glass of water and nighttime tablets',
                    reminderEnabled: true,
                    createdAt: '',
                  });
                  setIsRoutineModalOpen(true);
                }}
                className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-white hover:bg-purple-50 text-purple-800 border border-purple-200 font-semibold text-xs transition-colors"
              >
                + Add Bedtime Routine
              </button>
            </div>
          </div>
        </div>
      );
    }

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
            {items.length} {items.length === 1 ? 'event' : 'events'}
          </span>
        </div>

        {/* List of cards */}
        <div className="space-y-2.5">
          {items.map((entry) => {
            if (entry.type === 'dose') {
              return (
                <DoseCard
                  key={`dose-${entry.item.logId}`}
                  item={entry.item}
                  onUpdateStatus={handleUpdateDoseStatus}
                  onOpenEditMed={(medId) => {
                    const target = medications.find((m) => m.id === medId);
                    if (target) setEditingMedication(target);
                  }}
                  onOpenSkipModal={(it) => setSkipModalItem(it)}
                  onDeleteMedication={handleDeleteMedication}
                />
              );
            } else {
              return (
                <RoutineCard
                  key={`routine-${entry.item.logId}`}
                  item={entry.item}
                  onToggleStatus={handleToggleRoutine}
                  onEditRoutine={handleEditRoutine}
                  onDeleteRoutine={handleDeleteRoutine}
                />
              );
            }
          })}
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
        onOpenAddRoutineModal={() => {
          setEditingRoutine(null);
          setIsRoutineModalOpen(true);
        }}
        onOpenManageModal={() => setIsManageModalOpen(true)}
        onOpenPrintModal={() => setIsPrintModalOpen(true)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        currentTimeStr={currentTimeStr}
        onTestReminder={handleTestReminder}
        onOpenDbModal={() => setIsDbModalOpen(true)}
        dbStatus={dbStatus}
        currentView={currentView}
        onViewChange={handleViewChange}
        historyCount={logs.filter(l => l.status === 'taken').length + routineLogs.filter(rl => rl.status === 'completed').length}
        isAlarmRinging={isAlarmRinging}
        onStopAlarm={handleStopAlarm}
        onOpenPwaModal={() => setIsPwaModalOpen(true)}
        volumeLevel={volumeLevel}
        onChangeVolumeLevel={handleChangeVolumeLevel}
        isSyncing={isSyncing}
        onManualSync={() => syncDatabase(true)}
      />

      {/* 2. Main View Switcher: History Page vs Daily Schedule Timeline */}
      {currentView === 'history' ? (
        <HistoryPage
          medications={medications}
          doseLogs={logs}
          routines={routines}
          routineLogs={routineLogs}
          onNavigateHome={() => handleViewChange('daily')}
          onSaveDoseLog={handleSaveHistoryDoseLog}
          onSaveRoutineLog={handleSaveHistoryRoutineLog}
        />
      ) : (
        <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 space-y-6">
        
        {/* PWA Mobile Installation Banner (Dismissible) */}
        {showPwaBanner && (
          <div
            id="banner-pwa-install"
            className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-teal-600/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 text-teal-300 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">Install MedSchedule Mobile App</h4>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-400/20 text-teal-300 border border-teal-400/30">
                    PWA
                  </span>
                </div>
                <p className="text-xs text-teal-100/80 mt-0.5">
                  Install on your Android or iPhone for loud continuous medication alarms, phone vibration, and instant 1-tap access.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                id="btn-banner-install-app"
                type="button"
                onClick={() => setIsPwaModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 text-xs font-black shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install on Phone</span>
              </button>
              <button
                id="btn-banner-dismiss-pwa"
                type="button"
                onClick={() => {
                  setShowPwaBanner(false);
                  localStorage.setItem('med_pwa_banner_dismissed', 'true');
                }}
                className="p-2 text-teal-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                aria-label="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Top Progress & Daily Regimen Overview */}
        <DailyOverview
          items={dailyItems}
          routineItems={dailyRoutineItems}
          specialMedsCount={specialMedications.length}
          activeFilter={activeFilter}
          currentDate={currentDate}
          currentHHMM={currentHHMM}
          onFilterChange={setActiveFilter}
          onQuickTakeDose={(item) => handleUpdateDoseStatus(item, 'taken')}
          onQuickCompleteRoutine={(routineItem) => handleToggleRoutine(routineItem)}
        />

        {/* Core Timeline Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left / Main Column: Daily Schedule Cards */}
          <div className="lg:col-span-8 space-y-6">
            
            {totalFilteredCount === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {activeFilter === 'all'
                    ? 'No Schedule Found for Today'
                    : `No ${activeFilter.toUpperCase()} Events Found`}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {activeFilter === 'all'
                    ? 'Create your daily schedule by adding your medications with before/after meal rules, or by scheduling breakfast, meals, snacks, and hydration routines.'
                    : 'You can switch back to "All Events" to view your complete daily medication and meal timeline.'}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRoutine(null);
                      setIsRoutineModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors"
                  >
                    <Utensils className="w-4 h-4" />
                    <span>Add Meal / Routine</span>
                  </button>

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
                    <span>Add Medication</span>
                  </button>

                  {activeFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setActiveFilter('all')}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-2"
                    >
                      View All Events
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Morning Slot */}
                {renderTimePeriodSection(
                  'morning',
                  'Morning Routine & Meals',
                  '5:00 AM – 11:59 AM',
                  <Sunrise className="w-4 h-4 text-amber-600" />,
                  'bg-amber-50',
                  'border-amber-200'
                )}

                {/* Afternoon Slot */}
                {renderTimePeriodSection(
                  'afternoon',
                  'Afternoon Routine & Meals',
                  '12:00 PM – 4:59 PM',
                  <Sun className="w-4 h-4 text-orange-600" />,
                  'bg-orange-50',
                  'border-orange-200'
                )}

                {/* Evening Slot */}
                {renderTimePeriodSection(
                  'evening',
                  'Evening Routine & Dinner',
                  '5:00 PM – 8:59 PM',
                  <Sunset className="w-4 h-4 text-indigo-600" />,
                  'bg-indigo-50',
                  'border-indigo-200'
                )}

                {/* Night / Bedtime Slot (Always rendered so all 4 schedules are always clear) */}
                {renderTimePeriodSection(
                  'night',
                  'Night & Bedtime Routine',
                  '9:00 PM – 4:59 AM',
                  <Moon className="w-4 h-4 text-purple-600" />,
                  'bg-purple-50',
                  'border-purple-200',
                  true
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

            {/* Quick Patient Meal & Routine Rule Tip Box */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-100/80 text-amber-800 shrink-0">
                <Utensils className="w-4 h-4" />
              </div>
              <div className="text-xs text-slate-700 space-y-1">
                <h4 className="font-bold text-amber-950">Patient Meal & Medication Timing Protocol:</h4>
                <p>
                  <strong className="text-slate-900">Before Eating:</strong> Take 30 minutes before your meal on an empty stomach with a full glass of water.
                  <br />
                  <strong className="text-slate-900">After Eating:</strong> Take 20-30 minutes after completing your meal or snack to protect your stomach lining.
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
                {/* Add Night Schedule (Direct Quick Action) */}
                <button
                  type="button"
                  onClick={() => {
                    setEditingMedication(null);
                    setAddModalAsSpecial(false);
                    setAddModalDefaultSlot('night');
                    setIsAddModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-purple-300 bg-purple-50/40 hover:bg-purple-100/60 text-left transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-200 text-purple-800 flex items-center justify-center group-hover:bg-purple-700 group-hover:text-white transition-colors">
                      <Moon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                        <span>Add Night Schedule</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-purple-200 text-purple-800 rounded font-semibold">9 PM – 4 AM</span>
                      </p>
                      <p className="text-[11px] text-purple-800/80">Schedule bedtime dose, 10 PM tablet, or tea</p>
                    </div>
                  </div>
                  <Plus className="w-4 h-4 text-purple-600 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Add Meal / Routine */}
                <button
                  type="button"
                  onClick={() => {
                    setEditingRoutine(null);
                    setIsRoutineModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-amber-200 hover:border-amber-300 hover:bg-amber-50/50 text-left transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                      <Utensils className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Add Meal or Routine</p>
                      <p className="text-[11px] text-slate-500">Schedule 6 AM breakfast, 9 AM meal, walk, water</p>
                    </div>
                  </div>
                </button>

                {/* Add Medication */}
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

                {/* Manage Medications */}
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

                {/* Print Refrigerator Routine */}
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

                {/* View Clinical History Page Button */}
                <button
                  id="btn-sidebar-view-history"
                  type="button"
                  onClick={() => handleViewChange('history')}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-teal-200 hover:border-teal-300 hover:bg-teal-50/70 text-left transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>Clinical History Log</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-teal-100 text-teal-800 rounded font-semibold">/history</span>
                      </p>
                      <p className="text-[11px] text-slate-500">Daywise logs of medicine, food & latrine for doctor</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-teal-700 group-hover:translate-x-0.5 transition-transform">→</span>
                </button>
              </div>
            </div>

          </div>

        </div>

      </main>
      )}

      {/* 3. Floating Active Reminder Toast (When medication is due right now) */}
      <ActiveReminderBanner
        alert={activeAlert}
        isAlarmRinging={isAlarmRinging}
        onStopAlarm={handleStopAlarm}
        onTakeNow={(alt) => {
          handleStopAlarm();
          const doseItem = dailyItems.find(
            (d) => d.medication.id === alt.medication.id && d.schedule?.id === alt.schedule.id
          );
          if (doseItem) {
            handleUpdateDoseStatus(doseItem, 'taken');
          }
          setActiveAlert(null);
        }}
        onSnooze={(alt) => {
          handleStopAlarm();
          setActiveAlert(null);
          // Re-trigger alert in 10 minutes
          setTimeout(() => {
            setActiveAlert(alt);
            if (soundEnabled) {
              soundManager.startLoudAlarmLoop();
            }
          }, 10 * 60 * 1000);
        }}
        onDismiss={() => {
          handleStopAlarm();
          setActiveAlert(null);
        }}
      />

      {/* PWA Mobile Installation Modal */}
      <PwaInstallModal
        isOpen={isPwaModalOpen}
        onClose={() => setIsPwaModalOpen(false)}
      />

      {/* 4. Modals */}
      {/* Create / Edit Medication Modal */}
      <MedicationModal
        isOpen={isAddModalOpen || editingMedication !== null}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingMedication(null);
          setAddModalAsSpecial(false);
          setAddModalDefaultSlot('morning');
        }}
        onSave={handleSaveMedication}
        onDelete={handleDeleteMedication}
        initialMedication={editingMedication}
        defaultAsSpecial={addModalAsSpecial}
        defaultTimeSlot={addModalDefaultSlot}
      />

      {/* Create / Edit Routine & Meal Modal */}
      <RoutineModal
        isOpen={isRoutineModalOpen}
        onClose={() => {
          setIsRoutineModalOpen(false);
          setEditingRoutine(null);
        }}
        onSave={handleSaveRoutine}
        onDelete={handleDeleteRoutine}
        initialRoutine={editingRoutine}
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
        routines={routines}
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
          await syncDatabase(true);
        }}
      />

    </div>
  );
}
