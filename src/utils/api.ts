import { Medication, DoseLog } from '../types.ts';

export interface DbStatusResponse {
  connected: boolean;
  configured: boolean;
  databaseName?: string;
  error?: string;
  itemCounts?: {
    medications: number;
    logs: number;
  };
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
