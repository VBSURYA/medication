import { MongoClient, Db } from 'mongodb';
import fs from 'fs';
import path from 'path';
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
  storageMode: 'mongodb';
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

/**
 * Mask sensitive credentials in MongoDB URI for safe UI display
 */
export function maskMongoUri(uri?: string): string {
  if (!uri) return '';
  return uri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@.+)/i, '$1******$3');
}

/**
 * Connect to MongoDB and seed initial collections if empty.
 * Zero in-memory caching or fallback storage.
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
    console.log('[MongoDB] Connecting directly to MongoDB cluster...');
    const newClient = new MongoClient(uri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
    });

    await newClient.connect();
    client = newClient;
    
    db = client.db(process.env.MONGODB_DB_NAME || 'medschedule');
    console.log(`[MongoDB] Connected successfully to database: ${db.databaseName}`);

    // Create indexes and seed initial database records if empty
    const medsCol = db.collection<Medication>('medications');
    const routinesCol = db.collection<RoutineItem>('routines');
    const logsCol = db.collection<DoseLog>('dose_logs');
    const rLogsCol = db.collection<RoutineLog>('routine_logs');

    try {
      await medsCol.createIndex({ id: 1 }, { unique: true });
      await routinesCol.createIndex({ id: 1 }, { unique: true });
      await logsCol.createIndex({ id: 1 }, { unique: true });
      await logsCol.createIndex({ date: 1, medicationId: 1 });
      await rLogsCol.createIndex({ id: 1 }, { unique: true });
      await rLogsCol.createIndex({ date: 1, routineId: 1 });
    } catch (idxErr) {
      console.warn('[MongoDB] Index creation note:', idxErr);
    }

    const medsCount = await medsCol.countDocuments();
    if (medsCount === 0) {
      console.log('[MongoDB] Initializing medications collection with default schedule...');
      await medsCol.insertMany(INITIAL_SAMPLE_MEDICATIONS as any);
    }

    const routinesCount = await routinesCol.countDocuments();
    if (routinesCount === 0) {
      console.log('[MongoDB] Initializing routines & meal schedules collection...');
      await routinesCol.insertMany(INITIAL_SAMPLE_ROUTINES as any);
    }

    const logsCount = await logsCol.countDocuments();
    if (logsCount === 0) {
      const defaultLogs = generateDefaultSampleDoseLogs();
      if (defaultLogs.length > 0) {
        await logsCol.insertMany(defaultLogs as any);
      }
    }

    const rLogsCount = await rLogsCol.countDocuments();
    if (rLogsCount === 0) {
      const defaultRLogs = generateDefaultSampleRoutineLogs();
      if (defaultRLogs.length > 0) {
        await rLogsCol.insertMany(defaultRLogs as any);
      }
    }

    lastSyncTimestamp = new Date().toISOString();
    return db;
  } catch (err: any) {
    connectionError = err.message || 'Failed to connect to MongoDB';
    console.error('[MongoDB] Connection error:', connectionError);
    client = null;
    db = null;
    return null;
  } finally {
    isConnecting = false;
  }
}

/**
 * Require an active MongoDB database instance, throwing if unavailable
 */
export async function requireMongoDb(): Promise<Db> {
  const activeDb = await getMongoDb();
  if (!activeDb) {
    const uri = process.env.MONGODB_URI || process.env.MONGODB_URL;
    if (!uri || uri.trim() === '') {
      throw new Error('MongoDB URI not configured. Please provide MONGODB_URI in your environment or connect via the MongoDB setup modal.');
    }
    throw new Error(connectionError || 'Could not connect to MongoDB cluster. Check network access and credentials.');
  }
  return activeDb;
}

/**
 * Check current MongoDB configuration and connection status directly from MongoDB
 */
export async function getDatabaseStatus(): Promise<DbStatus> {
  const uri = process.env.MONGODB_URI || process.env.MONGODB_URL;
  const configured = Boolean(uri && uri.trim() !== '');

  if (!configured) {
    return {
      connected: false,
      configured: false,
      storageMode: 'mongodb',
      lastSync: lastSyncTimestamp,
      error: 'MongoDB connection string not configured. Connect your cluster to sync records.',
      itemCounts: {
        medications: 0,
        logs: 0,
        routines: 0,
        routineLogs: 0,
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
        storageMode: 'mongodb',
        lastSync: lastSyncTimestamp,
        error: connectionError || 'Could not establish connection to MongoDB URI. Please verify cluster credentials and IP access (0.0.0.0/0).',
        itemCounts: {
          medications: 0,
          logs: 0,
          routines: 0,
          routineLogs: 0,
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
      storageMode: 'mongodb',
      lastSync: lastSyncTimestamp,
      error: err.message || 'Error querying MongoDB database',
      itemCounts: {
        medications: 0,
        logs: 0,
        routines: 0,
        routineLogs: 0,
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

  // 5. Connect and initialize collections in MongoDB
  const activeDb = await getMongoDb();
  if (!activeDb) {
    throw new Error('Failed to initialize connection with verified URI');
  }

  return await getDatabaseStatus();
}

/**
 * Disconnect MongoDB
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
 * Atomic unified data sync directly from MongoDB for all connected devices
 */
export async function getAllDataSync(date?: string) {
  const activeDb = await requireMongoDb();
  
  const query = date ? { date } : {};
  const [medsDocs, logsDocs, routinesDocs, rLogsDocs, status] = await Promise.all([
    activeDb.collection<Medication>('medications').find({}).toArray(),
    activeDb.collection<DoseLog>('dose_logs').find(query).toArray(),
    activeDb.collection<RoutineItem>('routines').find({}).toArray(),
    activeDb.collection<RoutineLog>('routine_logs').find(query).toArray(),
    getDatabaseStatus(),
  ]);

  lastSyncTimestamp = new Date().toISOString();

  return {
    medications: medsDocs.map(({ _id, ...rest }: any) => rest as Medication),
    logs: logsDocs.map(({ _id, ...rest }: any) => rest as DoseLog),
    routines: routinesDocs.map(({ _id, ...rest }: any) => rest as RoutineItem),
    routineLogs: rLogsDocs.map(({ _id, ...rest }: any) => rest as RoutineLog),
    dbStatus: status,
    timestamp: lastSyncTimestamp,
  };
}

/**
 * Fetch all medications directly from MongoDB collection
 */
export async function getAllMedications(): Promise<Medication[]> {
  const activeDb = await requireMongoDb();
  const docs = await activeDb.collection<Medication>('medications').find({}).toArray();
  return docs.map(({ _id, ...rest }: any) => rest as Medication);
}

/**
 * Save or update a medication directly in MongoDB collection
 */
export async function saveMedication(med: Medication): Promise<Medication> {
  const activeDb = await requireMongoDb();
  const col = activeDb.collection<Medication>('medications');
  await col.updateOne({ id: med.id }, { $set: med }, { upsert: true });
  lastSyncTimestamp = new Date().toISOString();
  return med;
}

/**
 * Delete a medication directly in MongoDB collection
 */
export async function deleteMedication(id: string): Promise<boolean> {
  const activeDb = await requireMongoDb();
  const col = activeDb.collection<Medication>('medications');
  await col.deleteOne({ id });

  // Clean up non-taken logs for this deleted medication
  const logsCol = activeDb.collection<DoseLog>('dose_logs');
  await logsCol.deleteMany({ medicationId: id, status: { $ne: 'taken' } });
  lastSyncTimestamp = new Date().toISOString();
  return true;
}

/**
 * Fetch dose logs directly from MongoDB collection
 */
export async function getAllLogs(date?: string): Promise<DoseLog[]> {
  const activeDb = await requireMongoDb();
  const col = activeDb.collection<DoseLog>('dose_logs');
  const query = date ? { date } : {};
  const docs = await col.find(query).toArray();
  return docs.map(({ _id, ...rest }: any) => rest as DoseLog);
}

/**
 * Save or update a dose log directly in MongoDB collection
 */
export async function saveDoseLog(log: DoseLog): Promise<DoseLog> {
  const activeDb = await requireMongoDb();
  const col = activeDb.collection<DoseLog>('dose_logs');
  await col.updateOne({ id: log.id }, { $set: log }, { upsert: true });
  lastSyncTimestamp = new Date().toISOString();
  return log;
}

/**
 * Fetch all routine & meal items directly from MongoDB collection
 */
export async function getAllRoutines(): Promise<RoutineItem[]> {
  const activeDb = await requireMongoDb();
  const col = activeDb.collection<RoutineItem>('routines');
  const docs = await col.find({}).toArray();
  return docs.map(({ _id, ...rest }: any) => rest as RoutineItem);
}

/**
 * Save or update a routine item directly in MongoDB collection
 */
export async function saveRoutine(routine: RoutineItem): Promise<RoutineItem> {
  const activeDb = await requireMongoDb();
  const col = activeDb.collection<RoutineItem>('routines');
  await col.updateOne({ id: routine.id }, { $set: routine }, { upsert: true });
  lastSyncTimestamp = new Date().toISOString();
  return routine;
}

/**
 * Delete a routine item directly in MongoDB collection
 */
export async function deleteRoutine(id: string): Promise<boolean> {
  const activeDb = await requireMongoDb();
  const col = activeDb.collection<RoutineItem>('routines');
  await col.deleteOne({ id });

  const logsCol = activeDb.collection<RoutineLog>('routine_logs');
  await logsCol.deleteMany({ routineId: id });
  lastSyncTimestamp = new Date().toISOString();
  return true;
}

/**
 * Fetch routine logs directly from MongoDB collection
 */
export async function getAllRoutineLogs(date?: string): Promise<RoutineLog[]> {
  const activeDb = await requireMongoDb();
  const col = activeDb.collection<RoutineLog>('routine_logs');
  const query = date ? { date } : {};
  const docs = await col.find(query).toArray();
  return docs.map(({ _id, ...rest }: any) => rest as RoutineLog);
}

/**
 * Save or update a routine log directly in MongoDB collection
 */
export async function saveRoutineLog(log: RoutineLog): Promise<RoutineLog> {
  const activeDb = await requireMongoDb();
  const col = activeDb.collection<RoutineLog>('routine_logs');
  await col.updateOne({ id: log.id }, { $set: log }, { upsert: true });
  lastSyncTimestamp = new Date().toISOString();
  return log;
}

/**
 * Reset all data to sample medications and routines directly in MongoDB
 */
export async function resetToSamples(): Promise<{ medications: Medication[]; routines: RoutineItem[] }> {
  const activeDb = await requireMongoDb();

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

  lastSyncTimestamp = new Date().toISOString();
  return { medications: INITIAL_SAMPLE_MEDICATIONS, routines: INITIAL_SAMPLE_ROUTINES };
}
