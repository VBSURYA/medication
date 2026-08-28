import { MongoClient, Db, Collection } from 'mongodb';
import { Medication, DoseLog, RoutineItem, RoutineLog } from '../src/types.ts';
import { INITIAL_SAMPLE_MEDICATIONS, INITIAL_SAMPLE_ROUTINES } from '../src/utils/storage.ts';

interface DbStatus {
  connected: boolean;
  configured: boolean;
  databaseName?: string;
  error?: string;
  itemCounts?: {
    medications: number;
    logs: number;
    routines: number;
    routineLogs: number;
  };
}

let client: MongoClient | null = null;
let db: Db | null = null;
let isConnecting = false;
let connectionError: string | null = null;

// In-memory fallback cache to ensure zero crashes and instant readiness
// before the user configures MONGODB_URI in .env.local
let inMemoryMedications: Medication[] = [...INITIAL_SAMPLE_MEDICATIONS];
let inMemoryLogs: DoseLog[] = [
  {
    id: 'log-seed-1',
    date: new Date().toISOString().split('T')[0],
    medicationId: 'med-1',
    scheduleId: 'sch-1-1',
    scheduledTime: '07:00',
    mealRelation: 'before_meal',
    mealName: 'Breakfast',
    status: 'taken',
    takenAt: `${new Date().toISOString().split('T')[0]}T07:05:00`,
    notes: 'Taken before breakfast with 250ml water',
  },
];
let inMemoryRoutines: RoutineItem[] = [...INITIAL_SAMPLE_ROUTINES];
let inMemoryRoutineLogs: RoutineLog[] = [
  {
    id: 'routine-log-seed-1',
    routineId: 'routine-1',
    date: new Date().toISOString().split('T')[0],
    status: 'completed',
    completedAt: `${new Date().toISOString().split('T')[0]}T06:20:00`,
    notes: 'Had oatmeal with blueberries and warm lemon water',
  },
];

/**
 * Lazy, fail-safe connection to MongoDB.
 * Never throws at boot; reports connection status gracefully.
 */
export async function getMongoDb(): Promise<Db | null> {
  const uri = process.env.MONGODB_URI || process.env.MONGODB_URL;
  if (!uri || uri.trim() === '') {
    return null;
  }

  if (db && client) {
    return db;
  }

  if (isConnecting) {
    // Wait slightly if connection is already in progress
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (db) return db;
  }

  isConnecting = true;
  connectionError = null;

  try {
    console.log('[MongoDB] Connecting to MongoDB instance...');
    const newClient = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });

    await newClient.connect();
    client = newClient;
    
    // Use database specified in URI or default to 'medschedule'
    db = client.db(process.env.MONGODB_DB_NAME || 'medschedule');
    console.log(`[MongoDB] Connected successfully to database: ${db.databaseName}`);

    // Seed initial medications if empty
    const medsCol = db.collection<Medication>('medications');
    const count = await medsCol.countDocuments();
    if (count === 0 && inMemoryMedications.length > 0) {
      console.log('[MongoDB] Seeding initial medications into database...');
      await medsCol.insertMany(inMemoryMedications as any);
    }

    // Seed initial logs if empty
    const logsCol = db.collection<DoseLog>('dose_logs');
    const logsCount = await logsCol.countDocuments();
    if (logsCount === 0 && inMemoryLogs.length > 0) {
      await logsCol.insertMany(inMemoryLogs as any);
    }

    // Seed initial routines if empty
    const routinesCol = db.collection<RoutineItem>('routines');
    const routinesCount = await routinesCol.countDocuments();
    if (routinesCount === 0 && inMemoryRoutines.length > 0) {
      console.log('[MongoDB] Seeding initial daily meals & routines into database...');
      await routinesCol.insertMany(inMemoryRoutines as any);
    }

    // Seed initial routine logs if empty
    const rLogsCol = db.collection<RoutineLog>('routine_logs');
    const rLogsCount = await rLogsCol.countDocuments();
    if (rLogsCount === 0 && inMemoryRoutineLogs.length > 0) {
      await rLogsCol.insertMany(inMemoryRoutineLogs as any);
    }

    return db;
  } catch (err: any) {
    connectionError = err.message || 'Failed to connect to MongoDB';
    console.warn('[MongoDB] Connection warning:', connectionError);
    client = null;
    db = null;
    return null;
  } finally {
    isConnecting = false;
  }
}

/**
 * Check current MongoDB configuration and connection status
 */
export async function getDatabaseStatus(): Promise<DbStatus> {
  const uri = process.env.MONGODB_URI || process.env.MONGODB_URL;
  const configured = Boolean(uri && uri.trim() !== '');

  if (!configured) {
    return {
      connected: false,
      configured: false,
      itemCounts: {
        medications: inMemoryMedications.length,
        logs: inMemoryLogs.length,
        routines: inMemoryRoutines.length,
        routineLogs: inMemoryRoutineLogs.length,
      },
    };
  }

  try {
    const activeDb = await getMongoDb();
    if (!activeDb) {
      return {
        connected: false,
        configured: true,
        error: connectionError || 'Could not establish connection to MongoDB URI.',
        itemCounts: {
          medications: inMemoryMedications.length,
          logs: inMemoryLogs.length,
          routines: inMemoryRoutines.length,
          routineLogs: inMemoryRoutineLogs.length,
        },
      };
    }

    const medsCount = await activeDb.collection('medications').countDocuments();
    const logsCount = await activeDb.collection('dose_logs').countDocuments();
    const routinesCount = await activeDb.collection('routines').countDocuments();
    const routineLogsCount = await activeDb.collection('routine_logs').countDocuments();

    return {
      connected: true,
      configured: true,
      databaseName: activeDb.databaseName,
      itemCounts: {
        medications: medsCount,
        logs: logsCount,
        routines: routinesCount,
        routineLogs: routineLogsCount,
      },
    };
  } catch (err: any) {
    return {
      connected: false,
      configured: true,
      error: err.message || 'Error pinging MongoDB database',
    };
  }
}

/**
 * Fetch all medications (from MongoDB or memory fallback)
 */
export async function getAllMedications(): Promise<Medication[]> {
  try {
    const activeDb = await getMongoDb();
    if (activeDb) {
      const col = activeDb.collection<Medication>('medications');
      const docs = await col.find({}).toArray();
      // Map out Mongo's _id if present and ensure clean Medication objects
      const mapped = docs.map(({ _id, ...rest }: any) => rest as Medication);
      return mapped.map((m) => {
        if (m.id === 'med-4' && m.schedules.some((s) => s.time === '20:30')) {
          return {
            ...m,
            instructions: 'Take once nightly at bedtime with water for cholesterol management.',
            schedules: m.schedules.map((s) =>
              s.time === '20:30'
                ? {
                    ...s,
                    time: '21:30',
                    slot: 'night' as const,
                    label: 'Night / Bedtime Lipid Support',
                    mealName: 'Bedtime',
                  }
                : s
            ),
          };
        }
        return m;
      });
    }
  } catch (err) {
    console.warn('[MongoDB] Error querying medications from DB, using fallback:', err);
  }
  return inMemoryMedications;
}

/**
 * Save or update a medication
 */
export async function saveMedication(med: Medication): Promise<Medication> {
  try {
    const activeDb = await getMongoDb();
    if (activeDb) {
      const col = activeDb.collection<Medication>('medications');
      await col.updateOne({ id: med.id }, { $set: med }, { upsert: true });
    }
  } catch (err) {
    console.warn('[MongoDB] Error saving medication to DB, updating fallback:', err);
  }

  // Update in-memory fallback
  const idx = inMemoryMedications.findIndex((m) => m.id === med.id);
  if (idx >= 0) {
    inMemoryMedications[idx] = med;
  } else {
    inMemoryMedications.push(med);
  }

  return med;
}

/**
 * Delete a medication completely by ID
 */
export async function deleteMedication(id: string): Promise<boolean> {
  try {
    const activeDb = await getMongoDb();
    if (activeDb) {
      const col = activeDb.collection<Medication>('medications');
      await col.deleteOne({ id });

      // Also remove un-taken logs for this deleted medication
      const logsCol = activeDb.collection<DoseLog>('dose_logs');
      await logsCol.deleteMany({ medicationId: id, status: { $ne: 'taken' } });
    }
  } catch (err) {
    console.warn('[MongoDB] Error deleting medication from DB:', err);
  }

  // Update in-memory fallback
  inMemoryMedications = inMemoryMedications.filter((m) => m.id !== id);
  inMemoryLogs = inMemoryLogs.filter((l) => l.medicationId !== id || l.status === 'taken');

  return true;
}

/**
 * Fetch dose logs (optionally filtered by date)
 */
export async function getAllLogs(date?: string): Promise<DoseLog[]> {
  try {
    const activeDb = await getMongoDb();
    if (activeDb) {
      const col = activeDb.collection<DoseLog>('dose_logs');
      const query = date ? { date } : {};
      const docs = await col.find(query).toArray();
      return docs.map(({ _id, ...rest }: any) => rest as DoseLog);
    }
  } catch (err) {
    console.warn('[MongoDB] Error querying logs from DB, using fallback:', err);
  }

  if (date) {
    return inMemoryLogs.filter((l) => l.date === date);
  }
  return inMemoryLogs;
}

/**
 * Save or update a dose log
 */
export async function saveDoseLog(log: DoseLog): Promise<DoseLog> {
  try {
    const activeDb = await getMongoDb();
    if (activeDb) {
      const col = activeDb.collection<DoseLog>('dose_logs');
      await col.updateOne({ id: log.id }, { $set: log }, { upsert: true });
    }
  } catch (err) {
    console.warn('[MongoDB] Error saving log to DB:', err);
  }

  // Update in-memory
  const idx = inMemoryLogs.findIndex((l) => l.id === log.id);
  if (idx >= 0) {
    inMemoryLogs[idx] = log;
  } else {
    inMemoryLogs.push(log);
  }

  return log;
}

/**
 * Fetch all routine & meal items
 */
export async function getAllRoutines(): Promise<RoutineItem[]> {
  try {
    const activeDb = await getMongoDb();
    if (activeDb) {
      const col = activeDb.collection<RoutineItem>('routines');
      const docs = await col.find({}).toArray();
      return docs.map(({ _id, ...rest }: any) => rest as RoutineItem);
    }
  } catch (err) {
    console.warn('[MongoDB] Error querying routines from DB, using fallback:', err);
  }
  return inMemoryRoutines;
}

/**
 * Save or update a routine item
 */
export async function saveRoutine(routine: RoutineItem): Promise<RoutineItem> {
  try {
    const activeDb = await getMongoDb();
    if (activeDb) {
      const col = activeDb.collection<RoutineItem>('routines');
      await col.updateOne({ id: routine.id }, { $set: routine }, { upsert: true });
    }
  } catch (err) {
    console.warn('[MongoDB] Error saving routine to DB, updating fallback:', err);
  }

  const idx = inMemoryRoutines.findIndex((r) => r.id === routine.id);
  if (idx >= 0) {
    inMemoryRoutines[idx] = routine;
  } else {
    inMemoryRoutines.push(routine);
  }

  return routine;
}

/**
 * Delete a routine item completely by ID
 */
export async function deleteRoutine(id: string): Promise<boolean> {
  try {
    const activeDb = await getMongoDb();
    if (activeDb) {
      const col = activeDb.collection<RoutineItem>('routines');
      await col.deleteOne({ id });

      const logsCol = activeDb.collection<RoutineLog>('routine_logs');
      await logsCol.deleteMany({ routineId: id });
    }
  } catch (err) {
    console.warn('[MongoDB] Error deleting routine from DB:', err);
  }

  inMemoryRoutines = inMemoryRoutines.filter((r) => r.id !== id);
  inMemoryRoutineLogs = inMemoryRoutineLogs.filter((l) => l.routineId !== id);

  return true;
}

/**
 * Fetch routine logs (optionally filtered by date)
 */
export async function getAllRoutineLogs(date?: string): Promise<RoutineLog[]> {
  try {
    const activeDb = await getMongoDb();
    if (activeDb) {
      const col = activeDb.collection<RoutineLog>('routine_logs');
      const query = date ? { date } : {};
      const docs = await col.find(query).toArray();
      return docs.map(({ _id, ...rest }: any) => rest as RoutineLog);
    }
  } catch (err) {
    console.warn('[MongoDB] Error querying routine logs from DB, using fallback:', err);
  }

  if (date) {
    return inMemoryRoutineLogs.filter((l) => l.date === date);
  }
  return inMemoryRoutineLogs;
}

/**
 * Save or update a routine log
 */
export async function saveRoutineLog(log: RoutineLog): Promise<RoutineLog> {
  try {
    const activeDb = await getMongoDb();
    if (activeDb) {
      const col = activeDb.collection<RoutineLog>('routine_logs');
      await col.updateOne({ id: log.id }, { $set: log }, { upsert: true });
    }
  } catch (err) {
    console.warn('[MongoDB] Error saving routine log to DB:', err);
  }

  const idx = inMemoryRoutineLogs.findIndex((l) => l.id === log.id);
  if (idx >= 0) {
    inMemoryRoutineLogs[idx] = log;
  } else {
    inMemoryRoutineLogs.push(log);
  }

  return log;
}

/**
 * Reset all data to sample medications and routines
 */
export async function resetToSamples(): Promise<{ medications: Medication[]; routines: RoutineItem[] }> {
  try {
    const activeDb = await getMongoDb();
    if (activeDb) {
      const medsCol = activeDb.collection('medications');
      await medsCol.deleteMany({});
      await medsCol.insertMany(INITIAL_SAMPLE_MEDICATIONS as any);

      const logsCol = activeDb.collection('dose_logs');
      await logsCol.deleteMany({});

      const routinesCol = activeDb.collection('routines');
      await routinesCol.deleteMany({});
      await routinesCol.insertMany(INITIAL_SAMPLE_ROUTINES as any);

      const rLogsCol = activeDb.collection('routine_logs');
      await rLogsCol.deleteMany({});
    }
  } catch (err) {
    console.warn('[MongoDB] Error resetting sample data in DB:', err);
  }

  inMemoryMedications = [...INITIAL_SAMPLE_MEDICATIONS];
  inMemoryLogs = [];
  inMemoryRoutines = [...INITIAL_SAMPLE_ROUTINES];
  inMemoryRoutineLogs = [];

  return { medications: inMemoryMedications, routines: inMemoryRoutines };
}
