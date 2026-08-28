import fs from 'fs';
import path from 'path';
import { MongoClient, Db } from 'mongodb';
import { Medication, DoseLog, RoutineItem, RoutineLog } from '../src/types.ts';
import { 
  INITIAL_SAMPLE_MEDICATIONS, 
  INITIAL_SAMPLE_ROUTINES,
  generateDefaultSampleDoseLogs,
  generateDefaultSampleRoutineLogs
} from '../src/utils/storage.ts';

export interface DbStatus {
  connected: boolean;
  configured: boolean;
  databaseName?: string;
  maskedUri?: string;
  error?: string;
  storageMode: 'mongodb' | 'server_disk';
  lastSync?: string;
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
let lastSyncTimestamp = new Date().toISOString();

// Persistent Disk Store Path: /server/data/store.json
const STORE_DIR = path.join(process.cwd(), 'server', 'data');
const STORE_FILE = path.join(STORE_DIR, 'store.json');

interface LocalDiskStore {
  medications: Medication[];
  logs: DoseLog[];
  routines: RoutineItem[];
  routineLogs: RoutineLog[];
  updatedAt: string;
}

let inMemoryMedications: Medication[] = [...INITIAL_SAMPLE_MEDICATIONS];
let inMemoryLogs: DoseLog[] = generateDefaultSampleDoseLogs();
let inMemoryRoutines: RoutineItem[] = [...INITIAL_SAMPLE_ROUTINES];
let inMemoryRoutineLogs: RoutineLog[] = generateDefaultSampleRoutineLogs();

function ensureStoreDir(): void {
  try {
    if (!fs.existsSync(STORE_DIR)) {
      fs.mkdirSync(STORE_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('[Store] Could not create data directory:', err);
  }
}

function loadFromDiskStore(): void {
  try {
    ensureStoreDir();
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed: LocalDiskStore = JSON.parse(raw);
      if (Array.isArray(parsed.medications)) {
        inMemoryMedications = parsed.medications;
      }
      if (Array.isArray(parsed.logs)) {
        inMemoryLogs = parsed.logs;
      }
      if (Array.isArray(parsed.routines)) {
        inMemoryRoutines = parsed.routines;
      }
      if (Array.isArray(parsed.routineLogs)) {
        inMemoryRoutineLogs = parsed.routineLogs;
      }
      console.log(`[Store] Loaded from persistent disk store: ${inMemoryMedications.length} meds, ${inMemoryRoutines.length} routines, ${inMemoryLogs.length} logs`);
      return;
    }
  } catch (err) {
    console.warn('[Store] Error reading disk store, will initialize default:', err);
  }
  // Initialize file with defaults
  saveToDiskStore();
}

function saveToDiskStore(): void {
  try {
    ensureStoreDir();
    const data: LocalDiskStore = {
      medications: inMemoryMedications,
      logs: inMemoryLogs,
      routines: inMemoryRoutines,
      routineLogs: inMemoryRoutineLogs,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    lastSyncTimestamp = data.updatedAt;
  } catch (err) {
    console.warn('[Store] Error writing disk store:', err);
  }
}

// Load disk store on server startup
loadFromDiskStore();

/**
 * Mask sensitive credentials in MongoDB URI for safe UI display
 */
export function maskMongoUri(uri?: string): string {
  if (!uri) return '';
  return uri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@.+)/i, '$1******$3');
}

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
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (db) return db;
  }

  isConnecting = true;
  connectionError = null;

  try {
    console.log('[MongoDB] Connecting to MongoDB cluster...');
    const newClient = new MongoClient(uri, {
      serverSelectionTimeoutMS: 6000,
      connectTimeoutMS: 6000,
    });

    await newClient.connect();
    client = newClient;
    
    db = client.db(process.env.MONGODB_DB_NAME || 'medschedule');
    console.log(`[MongoDB] Connected successfully to database: ${db.databaseName}`);

    // Synchronize initial data:
    // If MongoDB is empty, seed from current persistent disk store
    const medsCol = db.collection<Medication>('medications');
    const medsCount = await medsCol.countDocuments();
    if (medsCount === 0 && inMemoryMedications.length > 0) {
      console.log('[MongoDB] Seeding medications into MongoDB collections...');
      await medsCol.insertMany(inMemoryMedications as any);
    } else if (medsCount > 0) {
      // MongoDB already has data, sync into local store
      const docs = await medsCol.find({}).toArray();
      inMemoryMedications = docs.map(({ _id, ...rest }: any) => rest as Medication);
    }

    const routinesCol = db.collection<RoutineItem>('routines');
    const routinesCount = await routinesCol.countDocuments();
    if (routinesCount === 0 && inMemoryRoutines.length > 0) {
      console.log('[MongoDB] Seeding routines into MongoDB collections...');
      await routinesCol.insertMany(inMemoryRoutines as any);
    } else if (routinesCount > 0) {
      const docs = await routinesCol.find({}).toArray();
      inMemoryRoutines = docs.map(({ _id, ...rest }: any) => rest as RoutineItem);
    }

    const logsCol = db.collection<DoseLog>('dose_logs');
    const logsCount = await logsCol.countDocuments();
    if (logsCount === 0 && inMemoryLogs.length > 0) {
      await logsCol.insertMany(inMemoryLogs as any);
    } else if (logsCount > 0) {
      const docs = await logsCol.find({}).toArray();
      inMemoryLogs = docs.map(({ _id, ...rest }: any) => rest as DoseLog);
    }

    const rLogsCol = db.collection<RoutineLog>('routine_logs');
    const rLogsCount = await rLogsCol.countDocuments();
    if (rLogsCount === 0 && inMemoryRoutineLogs.length > 0) {
      await rLogsCol.insertMany(inMemoryRoutineLogs as any);
    } else if (rLogsCount > 0) {
      const docs = await rLogsCol.find({}).toArray();
      inMemoryRoutineLogs = docs.map(({ _id, ...rest }: any) => rest as RoutineLog);
    }

    saveToDiskStore();
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
      storageMode: 'server_disk',
      lastSync: lastSyncTimestamp,
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
        maskedUri: maskMongoUri(uri),
        storageMode: 'server_disk',
        lastSync: lastSyncTimestamp,
        error: connectionError || 'Could not establish connection to MongoDB URI. Please verify cluster credentials and IP access list.',
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
      maskedUri: maskMongoUri(uri),
      storageMode: 'mongodb',
      lastSync: lastSyncTimestamp,
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
      maskedUri: maskMongoUri(uri),
      storageMode: 'server_disk',
      lastSync: lastSyncTimestamp,
      error: err.message || 'Error querying MongoDB database',
      itemCounts: {
        medications: inMemoryMedications.length,
        logs: inMemoryLogs.length,
        routines: inMemoryRoutines.length,
        routineLogs: inMemoryRoutineLogs.length,
      },
    };
  }
}

/**
 * Test a MongoDB connection string without saving it
 */
export async function testMongoConnection(uri: string): Promise<{ ok: boolean; message: string; databaseName?: string }> {
  const cleanUri = uri.trim();
  if (!cleanUri) {
    return { ok: false, message: 'URI cannot be empty' };
  }
  if (!cleanUri.startsWith('mongodb://') && !cleanUri.startsWith('mongodb+srv://')) {
    return { ok: false, message: 'Invalid format: Must start with "mongodb://" or "mongodb+srv://"' };
  }

  const testClient = new MongoClient(cleanUri, {
    serverSelectionTimeoutMS: 6000,
    connectTimeoutMS: 6000,
  });

  try {
    await testClient.connect();
    const testDb = testClient.db(process.env.MONGODB_DB_NAME || 'medschedule');
    await testDb.command({ ping: 1 });
    const dbName = testDb.databaseName;
    await testClient.close();
    return { ok: true, message: 'Successfully connected and pinged MongoDB cluster!', databaseName: dbName };
  } catch (err: any) {
    try { await testClient.close(); } catch {}
    return { ok: false, message: err.message || 'Failed to connect to MongoDB cluster' };
  }
}

/**
 * Configure and persist MongoDB connection string into .env.local and establish live connection
 */
export async function saveMongoUriConfig(uri: string): Promise<DbStatus> {
  const cleanUri = uri.trim();
  if (!cleanUri) {
    throw new Error('MongoDB URI cannot be empty');
  }

  // 1. Test connection first
  const testRes = await testMongoConnection(cleanUri);
  if (!testRes.ok) {
    throw new Error(testRes.message);
  }

  // 2. Disconnect previous if open
  if (client) {
    try {
      await client.close();
    } catch {}
    client = null;
    db = null;
  }

  // 3. Persist to .env.local
  try {
    const envLocalPath = path.join(process.cwd(), '.env.local');
    let envContent = '';
    if (fs.existsSync(envLocalPath)) {
      envContent = fs.readFileSync(envLocalPath, 'utf-8');
      if (envContent.includes('MONGODB_URI=')) {
        envContent = envContent.replace(/MONGODB_URI=.*(\r?\n|$)/g, `MONGODB_URI=${cleanUri}$1`);
      } else {
        envContent = envContent.trim() + `\nMONGODB_URI=${cleanUri}\n`;
      }
    } else {
      envContent = `MONGODB_URI=${cleanUri}\n`;
    }
    fs.writeFileSync(envLocalPath, envContent, 'utf-8');
    console.log('[MongoDB] Saved MONGODB_URI to .env.local');
  } catch (envErr) {
    console.warn('[MongoDB] Note: Could not write .env.local:', envErr);
  }

  // 4. Update process.env
  process.env.MONGODB_URI = cleanUri;

  // 5. Connect and synchronize collections
  const activeDb = await getMongoDb();
  if (!activeDb) {
    throw new Error('Failed to initialize connection with verified URI');
  }

  return await getDatabaseStatus();
}

/**
 * Disconnect MongoDB and revert to server persistent storage
 */
export async function disconnectMongo(): Promise<DbStatus> {
  if (client) {
    try {
      await client.close();
    } catch {}
    client = null;
    db = null;
  }
  delete process.env.MONGODB_URI;

  try {
    const envLocalPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envLocalPath)) {
      let content = fs.readFileSync(envLocalPath, 'utf-8');
      content = content.replace(/MONGODB_URI=.*(\r?\n|$)/g, '');
      fs.writeFileSync(envLocalPath, content, 'utf-8');
    }
  } catch (err) {
    console.warn('[MongoDB] Error removing URI from .env.local:', err);
  }

  return await getDatabaseStatus();
}

/**
 * Atomic unified data sync for all devices:
 * Returns medications, routines, dose logs, and status in one payload
 */
export async function getAllDataSync(date?: string) {
  const [meds, logsList, routinesList, rLogsList, status] = await Promise.all([
    getAllMedications(),
    getAllLogs(date),
    getAllRoutines(),
    getAllRoutineLogs(date),
    getDatabaseStatus(),
  ]);

  return {
    medications: meds,
    logs: logsList,
    routines: routinesList,
    routineLogs: rLogsList,
    dbStatus: status,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Fetch all medications (from MongoDB or persistent server disk)
 */
export async function getAllMedications(): Promise<Medication[]> {
  try {
    const activeDb = await getMongoDb();
    if (activeDb) {
      const col = activeDb.collection<Medication>('medications');
      const docs = await col.find({}).toArray();
      const mapped = docs.map(({ _id, ...rest }: any) => rest as Medication);
      inMemoryMedications = mapped;
      saveToDiskStore();
      return mapped;
    }
  } catch (err) {
    console.warn('[MongoDB] Error querying medications from DB, using persistent store:', err);
  }
  return inMemoryMedications;
}

/**
 * Save or update a medication across MongoDB and persistent server disk
 */
export async function saveMedication(med: Medication): Promise<Medication> {
  try {
    const activeDb = await getMongoDb();
    if (activeDb) {
      const col = activeDb.collection<Medication>('medications');
      await col.updateOne({ id: med.id }, { $set: med }, { upsert: true });
    }
  } catch (err) {
    console.warn('[MongoDB] Error saving medication to DB, updating persistent store:', err);
  }

  // Update in-memory & disk store
  const idx = inMemoryMedications.findIndex((m) => m.id === med.id);
  if (idx >= 0) {
    inMemoryMedications[idx] = med;
  } else {
    inMemoryMedications.push(med);
  }
  saveToDiskStore();

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

      // Also clean up non-taken logs for this deleted medication
      const logsCol = activeDb.collection<DoseLog>('dose_logs');
      await logsCol.deleteMany({ medicationId: id, status: { $ne: 'taken' } });
    }
  } catch (err) {
    console.warn('[MongoDB] Error deleting medication from DB:', err);
  }

  inMemoryMedications = inMemoryMedications.filter((m) => m.id !== id);
  inMemoryLogs = inMemoryLogs.filter((l) => l.medicationId !== id || l.status === 'taken');
  saveToDiskStore();

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
      const mapped = docs.map(({ _id, ...rest }: any) => rest as DoseLog);
      // Merge into inMemoryLogs
      for (const item of mapped) {
        const idx = inMemoryLogs.findIndex((l) => l.id === item.id);
        if (idx >= 0) {
          inMemoryLogs[idx] = item;
        } else {
          inMemoryLogs.push(item);
        }
      }
      saveToDiskStore();
      return mapped;
    }
  } catch (err) {
    console.warn('[MongoDB] Error querying logs from DB, using persistent store:', err);
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

  const idx = inMemoryLogs.findIndex((l) => l.id === log.id);
  if (idx >= 0) {
    inMemoryLogs[idx] = log;
  } else {
    inMemoryLogs.push(log);
  }
  saveToDiskStore();

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
      const mapped = docs.map(({ _id, ...rest }: any) => rest as RoutineItem);
      inMemoryRoutines = mapped;
      saveToDiskStore();
      return mapped;
    }
  } catch (err) {
    console.warn('[MongoDB] Error querying routines from DB, using persistent store:', err);
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
    console.warn('[MongoDB] Error saving routine to DB, updating persistent store:', err);
  }

  const idx = inMemoryRoutines.findIndex((r) => r.id === routine.id);
  if (idx >= 0) {
    inMemoryRoutines[idx] = routine;
  } else {
    inMemoryRoutines.push(routine);
  }
  saveToDiskStore();

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
  saveToDiskStore();

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
      const mapped = docs.map(({ _id, ...rest }: any) => rest as RoutineLog);
      for (const item of mapped) {
        const idx = inMemoryRoutineLogs.findIndex((l) => l.id === item.id);
        if (idx >= 0) {
          inMemoryRoutineLogs[idx] = item;
        } else {
          inMemoryRoutineLogs.push(item);
        }
      }
      saveToDiskStore();
      return mapped;
    }
  } catch (err) {
    console.warn('[MongoDB] Error querying routine logs from DB, using persistent store:', err);
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
  saveToDiskStore();

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
  saveToDiskStore();

  return { medications: inMemoryMedications, routines: inMemoryRoutines };
}
