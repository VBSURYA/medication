import { Medication, DoseLog, RoutineItem, RoutineLog } from '../types.ts';

export interface DbStatusResponse {
  connected: boolean;
  configured: boolean;
  databaseName?: string;
  maskedUri?: string;
  storageMode?: 'mongodb' | 'server_disk';
  lastSync?: string;
  error?: string;
  itemCounts?: {
    medications: number;
    logs: number;
    routines?: number;
    routineLogs?: number;
  };
}

export interface SyncAllResponse {
  medications: Medication[];
  logs: DoseLog[];
  routines: RoutineItem[];
  routineLogs: RoutineLog[];
  dbStatus: DbStatusResponse;
  timestamp: string;
}

export async function fetchApiSyncAll(date?: string): Promise<SyncAllResponse | null> {
  try {
    const url = date ? `/api/sync/all?date=${encodeURIComponent(date)}` : '/api/sync/all';
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('[API] Atomic sync error, falling back to local cached state:', err);
    return null;
  }
}

export async function apiTestMongo(uri: string): Promise<{ ok: boolean; message: string; databaseName?: string }> {
  try {
    const res = await fetch('/api/db/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uri }),
    });
    return await res.json();
  } catch (err: any) {
    return { ok: false, message: err.message || 'Connection test request failed' };
  }
}

export async function apiConfigureMongo(uri: string): Promise<{ success: boolean; status?: DbStatusResponse; error?: string }> {
  try {
    const res = await fetch('/api/db/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uri }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || `HTTP ${res.status}` };
    }
    return { success: true, status: data.status };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to save MongoDB configuration' };
  }
}

export async function apiDisconnectMongo(): Promise<{ success: boolean; status?: DbStatusResponse; error?: string }> {
  try {
    const res = await fetch('/api/db/disconnect', {
      method: 'POST',
    });
    const data = await res.json();
    return { success: res.ok, status: data.status, error: data.error };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to disconnect MongoDB' };
  }
}

export async function fetchDbStatus(): Promise<DbStatusResponse> {
  try {
    const res = await fetch('/api/db/status');
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    return {
      connected: false,
      configured: false,
      error: err.message || 'Server not reachable',
    };
  }
}

export async function fetchApiMedications(): Promise<Medication[] | null> {
  try {
    const res = await fetch('/api/medications');
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data)) {
      return data;
    }
    return null;
  } catch (err) {
    console.warn('[API] Unable to load medications from API, will use local storage:', err);
    return null;
  }
}

export async function apiSaveMedication(med: Medication): Promise<boolean> {
  try {
    const res = await fetch('/api/medications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(med),
    });
    return res.ok;
  } catch (err) {
    console.warn('[API] Error saving medication to server API:', err);
    return false;
  }
}

export async function apiDeleteMedication(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/medications/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.warn('[API] Error deleting medication from server API:', err);
    return false;
  }
}

export async function fetchApiLogs(date?: string): Promise<DoseLog[] | null> {
  try {
    const url = date ? `/api/logs?date=${encodeURIComponent(date)}` : '/api/logs';
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data)) {
      return data;
    }
    return null;
  } catch (err) {
    console.warn('[API] Unable to load dose logs from API, will use local storage:', err);
    return null;
  }
}

export async function apiSaveDoseLog(log: DoseLog): Promise<boolean> {
  try {
    const res = await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log),
    });
    return res.ok;
  } catch (err) {
    console.warn('[API] Error saving log to server API:', err);
    return false;
  }
}

export async function fetchApiRoutines(): Promise<RoutineItem[] | null> {
  try {
    const res = await fetch('/api/routines');
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data)) {
      return data;
    }
    return null;
  } catch (err) {
    console.warn('[API] Unable to load routines from API, will use local storage:', err);
    return null;
  }
}

export async function apiSaveRoutine(routine: RoutineItem): Promise<boolean> {
  try {
    const res = await fetch('/api/routines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(routine),
    });
    return res.ok;
  } catch (err) {
    console.warn('[API] Error saving routine to server API:', err);
    return false;
  }
}

export async function apiDeleteRoutine(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/routines/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.warn('[API] Error deleting routine from server API:', err);
    return false;
  }
}

export async function fetchApiRoutineLogs(date?: string): Promise<RoutineLog[] | null> {
  try {
    const url = date ? `/api/routine-logs?date=${encodeURIComponent(date)}` : '/api/routine-logs';
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data)) {
      return data;
    }
    return null;
  } catch (err) {
    console.warn('[API] Unable to load routine logs from API, will use local storage:', err);
    return null;
  }
}

export async function apiSaveRoutineLog(log: RoutineLog): Promise<boolean> {
  try {
    const res = await fetch('/api/routine-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log),
    });
    return res.ok;
  } catch (err) {
    console.warn('[API] Error saving routine log to server API:', err);
    return false;
  }
}

export async function apiResetSamples(): Promise<boolean> {
  try {
    const res = await fetch('/api/reset-samples', {
      method: 'POST',
    });
    return res.ok;
  } catch (err) {
    console.warn('[API] Error resetting sample data on server:', err);
    return false;
  }
}

