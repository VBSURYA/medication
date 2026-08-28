import { MongoClient, Db, Collection } from 'mongodb';
import { Medication, DoseLog } from '../src/types.ts';
import { INITIAL_SAMPLE_MEDICATIONS } from '../src/utils/storage.ts';

interface DbStatus {
  connected: boolean;
  configured: boolean;
  databaseName?: string;
  error?: string;
  itemCounts?: {
    medications: number;
    logs: number;
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
        },
      };
    }

    const medsCount = await activeDb.collection('medications').countDocuments();
    const logsCount = await activeDb.collection('dose_logs').countDocuments();

    return {
      connected: true,
      configured: true,
      databaseName: activeDb.databaseName,
      itemCounts: {
        medications: medsCount,
        logs: logsCount,
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
      return docs.map(({ _id, ...rest }: any) => rest as Medication);
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
 * Reset all data to sample medications
 */
export async function resetToSamples(): Promise<Medication[]> {
  try {
    const activeDb = await getMongoDb();
    if (activeDb) {
      const medsCol = activeDb.collection('medications');
      await medsCol.deleteMany({});
      await medsCol.insertMany(INITIAL_SAMPLE_MEDICATIONS as any);

      const logsCol = activeDb.collection('dose_logs');
      await logsCol.deleteMany({});
    }
  } catch (err) {
    console.warn('[MongoDB] Error resetting sample data in DB:', err);
  }

  inMemoryMedications = [...INITIAL_SAMPLE_MEDICATIONS];
  inMemoryLogs = [];

  return inMemoryMedications;
}
