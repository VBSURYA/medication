import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
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
  resetToSamples 
} from './server/mongodb.ts';

// Load default .env and then .env.local if present
dotenv.config();
dotenv.config({ path: '.env.local' });

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // 1. Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 2. Database connection status
  app.get('/api/db/status', async (req, res) => {
    try {
      const status = await getDatabaseStatus();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ 
        connected: false, 
        configured: false, 
        error: err.message || 'Failed to check database status' 
      });
    }
  });

  // 3. Medications API
  app.get('/api/medications', async (req, res) => {
    try {
      const meds = await getAllMedications();
      res.json(meds);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to retrieve medications' });
    }
  });

  app.post('/api/medications', async (req, res) => {
    try {
      const med = req.body;
      if (!med || !med.id || !med.name) {
        res.status(400).json({ error: 'Medication must have an id and name' });
        return;
      }
      const saved = await saveMedication(med);
      res.json(saved);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to save medication' });
    }
  });

  app.delete('/api/medications/:id', async (req, res) => {
    try {
      const id = req.params.id;
      if (!id) {
        res.status(400).json({ error: 'Medication ID is required' });
        return;
      }
      await deleteMedication(id);
      res.json({ success: true, deletedId: id });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete medication' });
    }
  });

  // 4. Dose Logs API
  app.get('/api/logs', async (req, res) => {
    try {
      const date = typeof req.query.date === 'string' ? req.query.date : undefined;
      const logs = await getAllLogs(date);
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to retrieve logs' });
    }
  });

  app.post('/api/logs', async (req, res) => {
    try {
      const log = req.body;
      if (!log || !log.id || !log.medicationId) {
        res.status(400).json({ error: 'Log must have an id and medicationId' });
        return;
      }
      const saved = await saveDoseLog(log);
      res.json(saved);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to save dose log' });
    }
  });

  // 5. Daily Routines & Meals API
  app.get('/api/routines', async (req, res) => {
    try {
      const routines = await getAllRoutines();
      res.json(routines);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to retrieve routines' });
    }
  });

  app.post('/api/routines', async (req, res) => {
    try {
      const routine = req.body;
      if (!routine || !routine.id || !routine.title || !routine.time) {
        res.status(400).json({ error: 'Routine must have an id, title, and time' });
        return;
      }
      const saved = await saveRoutine(routine);
      res.json(saved);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to save routine' });
    }
  });

  app.delete('/api/routines/:id', async (req, res) => {
    try {
      const id = req.params.id;
      if (!id) {
        res.status(400).json({ error: 'Routine ID is required' });
        return;
      }
      await deleteRoutine(id);
      res.json({ success: true, deletedId: id });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete routine' });
    }
  });

  // 6. Routine Logs API
  app.get('/api/routine-logs', async (req, res) => {
    try {
      const date = typeof req.query.date === 'string' ? req.query.date : undefined;
      const logs = await getAllRoutineLogs(date);
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to retrieve routine logs' });
    }
  });

  app.post('/api/routine-logs', async (req, res) => {
    try {
      const log = req.body;
      if (!log || !log.id || !log.routineId) {
        res.status(400).json({ error: 'Routine log must have an id and routineId' });
        return;
      }
      const saved = await saveRoutineLog(log);
      res.json(saved);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to save routine log' });
    }
  });

  // 7. Reset data endpoint
  app.post('/api/reset-samples', async (req, res) => {
    try {
      const result = await resetToSamples();
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to reset sample data' });
    }
  });

  // Vite middleware for development & static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[MedSchedule Server] Running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[MedSchedule Server] Failed to start server:', err);
  process.exit(1);
});
