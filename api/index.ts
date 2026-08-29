import type { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  getDatabaseStatus, 
  getAllMedications, 
  saveMedication, 
  deleteMedication, 
  getAllLogs, 
  saveDoseLog, 
  getAllRoutines,
  saveRoutine,
  deleteRoutine,
  getAllRoutineLogs,
  saveRoutineLog,
  testMongoConnection,
  getAllDataSync
} from './mongodb.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Extract path, handling various Vercel rewrite patterns
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname;
  const method = req.method?.toUpperCase();

  // Enable CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1. Health check
    if (path.endsWith('/health')) {
      return res.json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    // 2. Database connection status
    if (path.endsWith('/db/status') && method === 'GET') {
      const status = await getDatabaseStatus();
      return res.json(status);
    }

    // 2b. Test MongoDB URI connection
    if (path.endsWith('/db/test') && method === 'POST') {
      const { uri } = req.body || {};
      if (!uri) return res.status(400).json({ ok: false, message: 'URI is required' });
      const testResult = await testMongoConnection(uri);
      return res.json(testResult);
    }

    // 2c. Save dynamic DB config (Not persisted to fs on serverless, but verified)
    if (path.endsWith('/db/config') && method === 'POST') {
      const { uri } = req.body || {};
      if (!uri) return res.status(400).json({ error: 'MongoDB connection URI is required' });
      const testResult = await testMongoConnection(uri);
      if (!testResult.ok) return res.status(400).json({ error: testResult.message });
      return res.json({ success: true, message: 'URI valid. To persist across serverless instances, add MONGODB_URI in Vercel settings.' });
    }

    // 2e. Unified atomic synchronization endpoint
    if (path.endsWith('/sync/all') && method === 'GET') {
      const date = typeof req.query.date === 'string' ? req.query.date : undefined;
      const data = await getAllDataSync(date);
      return res.json(data);
    }

    // 3. Medications API
    if (path.endsWith('/medications')) {
      if (method === 'GET') {
        const meds = await getAllMedications();
        return res.json(meds);
      }
      if (method === 'POST') {
        const med = req.body;
        if (!med || !med.id || !med.name) {
          return res.status(400).json({ error: 'Medication must have an id and name' });
        }
        const saved = await saveMedication(med);
        return res.json(saved);
      }
    }

    if (path.includes('/medications/') && method === 'DELETE') {
      const id = path.split('/medications/')[1];
      if (!id) return res.status(400).json({ error: 'Medication ID is required' });
      await deleteMedication(id);
      return res.json({ success: true, deletedId: id });
    }

    // 4. Dose Logs API
    if (path.endsWith('/logs')) {
      if (method === 'GET') {
        const date = typeof req.query.date === 'string' ? req.query.date : undefined;
        const logs = await getAllLogs(date);
        return res.json(logs);
      }
      if (method === 'POST') {
        const log = req.body;
        if (!log || !log.id || !log.medicationId) {
          return res.status(400).json({ error: 'Log must have an id and medicationId' });
        }
        const saved = await saveDoseLog(log);
        return res.json(saved);
      }
    }

    // 5. Daily Routines API
    if (path.endsWith('/routines')) {
      if (method === 'GET') {
        const routines = await getAllRoutines();
        return res.json(routines);
      }
      if (method === 'POST') {
        const routine = req.body;
        if (!routine || !routine.id || !routine.title || !routine.time) {
          return res.status(400).json({ error: 'Routine must have an id, title, and time' });
        }
        const saved = await saveRoutine(routine);
        return res.json(saved);
      }
    }

    if (path.includes('/routines/') && method === 'DELETE') {
      const id = path.split('/routines/')[1];
      if (!id) return res.status(400).json({ error: 'Routine ID is required' });
      await deleteRoutine(id);
      return res.json({ success: true, deletedId: id });
    }

    // 6. Routine Logs API
    if (path.endsWith('/routine-logs')) {
      if (method === 'GET') {
        const date = typeof req.query.date === 'string' ? req.query.date : undefined;
        const logs = await getAllRoutineLogs(date);
        return res.json(logs);
      }
      if (method === 'POST') {
        const log = req.body;
        if (!log || !log.id || !log.routineId) {
          return res.status(400).json({ error: 'Routine log must have an id and routineId' });
        }
        const saved = await saveRoutineLog(log);
        return res.json(saved);
      }
    }

    // Default route
    return res.status(404).json({ error: `Route ${method} ${path} not found` });
  } catch (err: any) {
    console.error('[API Error]:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
