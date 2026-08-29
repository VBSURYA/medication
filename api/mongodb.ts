import { MongoClient, Db } from 'mongodb';

export type MealRelation = 
  | 'before_meal' 
  | 'after_meal' 
  | 'with_meal' 
  | 'empty_stomach' 
  | 'anytime';

export type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'night' | 'custom';

export type MedicationForm = 
  | 'tablet' 
  | 'capsule' 
  | 'syrup' 
  | 'injection' 
  | 'inhaler' 
  | 'drops' 
  | 'cream' 
  | 'patch' 
  | 'other';

export interface ScheduleItem {
  id: string;
  time: string;
  slot: TimeSlot;
  label?: string;
  mealRelation: MealRelation;
  mealName?: string;
  reminderEnabled: boolean;
  reminderMinutesBefore: number;
  soundEnabled: boolean;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  form: MedicationForm;
  color: string;
  instructions: string;
  doctorName?: string;
  inventoryCount?: number;
  isSpecialCondition: boolean;
  specialConditionReason?: string;
  specialMaxDosesPerDay?: number;
  schedules: ScheduleItem[];
  createdAt: string;
}

export type DoseStatus = 'pending' | 'taken' | 'skipped';

export interface DoseLog {
  id: string;
  date: string;
  medicationId: string;
  scheduleId?: string;
  scheduledTime?: string;
  mealRelation: MealRelation;
  mealName?: string;
  status: DoseStatus;
  takenAt?: string;
  notes?: string;
  createdAt: string;
}

export type RoutineCategory = 'meal' | 'sleep' | 'exercise' | 'work' | 'custom';

export interface RoutineItem {
  id: string;
  title: string;
  time: string;
  category: RoutineCategory;
  description?: string;
  icon?: string;
  color?: string;
  isDefault: boolean;
  reminderEnabled: boolean;
  soundEnabled: boolean;
}

export type RoutineStatus = 'pending' | 'completed' | 'skipped';

export interface RoutineLog {
  id: string;
  date: string;
  routineId: string;
  status: RoutineStatus;
  completedAt?: string;
  notes?: string;
  createdAt: string;
}

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

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function maskMongoUri(uri?: string): string {
  if (!uri) return '';
  return uri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@.+)/i, '$1******$3');
}

export async function getMongoDb(): Promise<Db | null> {
  const uri = process.env.MONGODB_URI || process.env.MONGODB_URL;
  if (!uri || uri.trim() === '') {
    return null;
  }

  if (cachedClient && cachedDb) {
    try {
      await cachedDb.command({ ping: 1 });
      return cachedDb;
    } catch {
      cachedClient = null;
      cachedDb = null;
    }
  }

  try {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME || 'medschedule');

    cachedClient = client;
    cachedDb = db;
    return db;
  } catch (err: any) {
    console.error('[MongoDB] Connection error:', err.message);
    return null;
  }
}

export async function requireMongoDb(): Promise<Db> {
  const db = await getMongoDb();
  if (!db) {
    throw new Error('MongoDB connection failed. Please ensure MONGODB_URI is set in Vercel and MongoDB Network Access allows 0.0.0.0/0.');
  }
  return db;
}

export async function getDatabaseStatus(): Promise<DbStatus> {
  const uri = process.env.MONGODB_URI || process.env.MONGODB_URL;
  const configured = Boolean(uri && uri.trim() !== '');

  if (!configured) {
    return {
      connected: false,
      configured: false,
      storageMode: 'mongodb',
      error: 'MongoDB connection string not configured. Please add MONGODB_URI to Vercel Environment Variables.',
      itemCounts: { medications: 0, logs: 0, routines: 0, routineLogs: 0 }
    };
  }

  try {
    const db = await getMongoDb();
    if (!db) {
      return {
        connected: false,
        configured: true,
        maskedUri: maskMongoUri(uri),
        storageMode: 'mongodb',
        error: 'Could not establish connection to MongoDB. Verify credentials & Atlas Network Access (0.0.0.0/0).',
        itemCounts: { medications: 0, logs: 0, routines: 0, routineLogs: 0 }
      };
    }

    const [medsCount, logsCount, routinesCount, routineLogsCount] = await Promise.all([
      db.collection('medications').countDocuments(),
      db.collection('dose_logs').countDocuments(),
      db.collection('routines').countDocuments(),
      db.collection('routine_logs').countDocuments()
    ]);

    return {
      connected: true,
      configured: true,
      databaseName: db.databaseName,
      maskedUri: maskMongoUri(uri),
      storageMode: 'mongodb',
      lastSync: new Date().toISOString(),
      itemCounts: {
        medications: medsCount,
        logs: logsCount,
        routines: routinesCount,
        routineLogs: routineLogsCount
      }
    };
  } catch (err: any) {
    return {
      connected: false,
      configured: true,
      maskedUri: maskMongoUri(uri),
      storageMode: 'mongodb',
      error: err.message || 'Error querying MongoDB',
      itemCounts: { medications: 0, logs: 0, routines: 0, routineLogs: 0 }
    };
  }
}

export async function testMongoConnection(uri: string): Promise<{ ok: boolean; message: string; databaseName?: string }> {
  const cleanUri = uri.trim();
  if (!cleanUri) return { ok: false, message: 'URI cannot be empty' };

  const testClient = new MongoClient(cleanUri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
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

export async function getAllMedications(): Promise<Medication[]> {
  const db = await requireMongoDb();
  const records = await db.collection<Medication>('medications')
    .find({}, { projection: { _id: 0 } })
    .sort({ createdAt: -1 })
    .toArray();
  return records;
}

export async function saveMedication(med: Medication): Promise<Medication> {
  const db = await requireMongoDb();
  await db.collection<Medication>('medications').updateOne(
    { id: med.id },
    { $set: med },
    { upsert: true }
  );
  return med;
}

export async function deleteMedication(id: string): Promise<boolean> {
  const db = await requireMongoDb();
  await db.collection('medications').deleteOne({ id });
  await db.collection('dose_logs').deleteMany({ medicationId: id });
  return true;
}

export async function getAllLogs(date?: string): Promise<DoseLog[]> {
  const db = await requireMongoDb();
  const query = date ? { date } : {};
  const records = await db.collection<DoseLog>('dose_logs')
    .find(query, { projection: { _id: 0 } })
    .sort({ scheduledTime: 1, createdAt: 1 })
    .toArray();
  return records;
}

export async function saveDoseLog(log: DoseLog): Promise<DoseLog> {
  const db = await requireMongoDb();
  await db.collection<DoseLog>('dose_logs').updateOne(
    { id: log.id },
    { $set: log },
    { upsert: true }
  );
  return log;
}

export async function getAllRoutines(): Promise<RoutineItem[]> {
  const db = await requireMongoDb();
  const records = await db.collection<RoutineItem>('routines')
    .find({}, { projection: { _id: 0 } })
    .sort({ time: 1 })
    .toArray();
  return records;
}

export async function saveRoutine(routine: RoutineItem): Promise<RoutineItem> {
  const db = await requireMongoDb();
  await db.collection<RoutineItem>('routines').updateOne(
    { id: routine.id },
    { $set: routine },
    { upsert: true }
  );
  return routine;
}

export async function deleteRoutine(id: string): Promise<boolean> {
  const db = await requireMongoDb();
  await db.collection('routines').deleteOne({ id });
  await db.collection('routine_logs').deleteMany({ routineId: id });
  return true;
}

export async function getAllRoutineLogs(date?: string): Promise<RoutineLog[]> {
  const db = await requireMongoDb();
  const query = date ? { date } : {};
  const records = await db.collection<RoutineLog>('routine_logs')
    .find(query, { projection: { _id: 0 } })
    .sort({ createdAt: 1 })
    .toArray();
  return records;
}

export async function saveRoutineLog(log: RoutineLog): Promise<RoutineLog> {
  const db = await requireMongoDb();
  await db.collection<RoutineLog>('routine_logs').updateOne(
    { id: log.id },
    { $set: log },
    { upsert: true }
  );
  return log;
}

export async function getAllDataSync(date?: string): Promise<{
  success: boolean;
  date: string;
  medications: Medication[];
  logs: DoseLog[];
  routines: RoutineItem[];
  routineLogs: RoutineLog[];
  dbStatus: DbStatus;
}> {
  const targetDate = date || getTodayDateString();
  const status = await getDatabaseStatus();

  if (!status.connected) {
    return {
      success: false,
      date: targetDate,
      medications: [],
      logs: [],
      routines: [],
      routineLogs: [],
      dbStatus: status
    };
  }

  const [medications, logs, routines, routineLogs] = await Promise.all([
    getAllMedications(),
    getAllLogs(targetDate),
    getAllRoutines(),
    getAllRoutineLogs(targetDate)
  ]);

  return {
    success: true,
    date: targetDate,
    medications,
    logs,
    routines,
    routineLogs,
    dbStatus: status
  };
}
