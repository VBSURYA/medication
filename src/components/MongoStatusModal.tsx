import React, { useState, useEffect } from 'react';
import { 
  X, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Copy, 
  Check, 
  Server, 
  ShieldCheck,
  Globe,
  Lock,
  ArrowRight,
  Unplug,
  Info
} from 'lucide-react';
import { DbStatusResponse, apiConfigureMongo, apiTestMongo, apiDisconnectMongo } from '../utils/api.ts';

interface MongoStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  dbStatus: DbStatusResponse | null;
  onRefresh: () => Promise<void>;
}

export const MongoStatusModal: React.FC<MongoStatusModalProps> = ({
  isOpen,
  onClose,
  dbStatus,
  onRefresh,
}) => {
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [uriInput, setUriInput] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTestResult(null);
      setSaveError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const exampleEnv = `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/medschedule?retryWrites=true&w=majority`;

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(exampleEnv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  const handleTestConnection = async () => {
    if (!uriInput.trim()) {
      setTestResult({ ok: false, message: 'Please enter or paste your MongoDB URI first.' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    setSaveError(null);
    try {
      const res = await apiTestMongo(uriInput.trim());
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ ok: false, message: err.message || 'Network error while testing connection' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uriInput.trim()) {
      setSaveError('Please enter or paste your MongoDB URI first.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setTestResult(null);

    try {
      const res = await apiConfigureMongo(uriInput.trim());
      if (res.success) {
        setUriInput('');
        await onRefresh();
      } else {
        setSaveError(res.error || 'Failed to connect to MongoDB');
      }
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect MongoDB? All devices will continue syncing via the central server disk store.')) {
      return;
    }
    setIsDisconnecting(true);
    try {
      await apiDisconnectMongo();
      await onRefresh();
    } catch (err) {
      console.warn('Disconnect error:', err);
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div id="mongo-modal-backdrop" className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div id="mongo-modal-dialog" className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs ${
              dbStatus?.connected ? 'bg-emerald-600' : 'bg-teal-600'
            }`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                MongoDB Database Sync & Cloud Storage
              </h2>
              <p className="text-xs text-slate-500">
                Real-time multi-device synchronization across all patient and caregiver phones
              </p>
            </div>
          </div>

          <button
            id="btn-close-mongo-modal"
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 text-xs text-slate-600 max-h-[75vh] overflow-y-auto">
          {/* Status Alert Banner */}
          {dbStatus?.connected ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 shadow-2xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                    <span>MongoDB Atlas Connected & Live</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Active Cloud Sync
                    </span>
                  </h4>
                  <button
                    id="btn-disconnect-mongo"
                    type="button"
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                    className="text-[11px] font-semibold text-rose-700 hover:text-rose-900 flex items-center gap-1 cursor-pointer"
                  >
                    <Unplug className="w-3.5 h-3.5" />
                    <span>{isDisconnecting ? 'Disconnecting...' : 'Disconnect'}</span>
                  </button>
                </div>

                <p className="text-emerald-800">
                  Cluster Database: <strong className="font-mono text-emerald-950 font-bold">{dbStatus.databaseName}</strong>
                </p>
                {dbStatus.maskedUri && (
                  <p className="text-slate-500 font-mono text-[10px] truncate max-w-sm">
                    URI: {dbStatus.maskedUri}
                  </p>
                )}

                <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                  <div className="p-2 rounded-lg bg-emerald-100/60 border border-emerald-200">
                    <div className="text-base font-extrabold text-emerald-950">{dbStatus.itemCounts?.medications ?? 0}</div>
                    <div className="text-[10px] font-semibold text-emerald-800">Medications</div>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-100/60 border border-emerald-200">
                    <div className="text-base font-extrabold text-emerald-950">{dbStatus.itemCounts?.routines ?? 0}</div>
                    <div className="text-[10px] font-semibold text-emerald-800">Meals & Routines</div>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-100/60 border border-emerald-200">
                    <div className="text-base font-extrabold text-emerald-950">{dbStatus.itemCounts?.logs ?? 0}</div>
                    <div className="text-[10px] font-semibold text-emerald-800">Dose Logs</div>
                  </div>
                </div>

                <p className="text-emerald-900 text-[11px] pt-1">
                  ✓ Every phone or browser opening this app pulls and pushes to this exact MongoDB database.
                </p>
              </div>
            </div>
          ) : dbStatus?.configured ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1.5 flex-1">
                <h4 className="text-sm font-bold text-rose-950">
                  Connection Attempt Failed
                </h4>
                <p className="text-rose-800 font-mono text-[11px] leading-relaxed break-all bg-rose-100/60 p-2 rounded border border-rose-200">
                  {dbStatus.error || 'Connection timed out or credentials invalid.'}
                </p>
                <div className="text-[11px] text-rose-900 space-y-1 pt-1">
                  <p><strong>Common Fixes:</strong></p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>In <strong>MongoDB Atlas &gt; Network Access</strong>, click <em>Add IP Address</em> and select <strong>Allow Access from Anywhere (0.0.0.0/0)</strong>.</li>
                    <li>Check that <code className="font-mono bg-rose-100 px-1 rounded">&lt;password&gt;</code> was replaced with your actual database user password.</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 flex items-start gap-3">
              <Server className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-teal-950">
                  Connect Your MongoDB Database
                </h4>
                <p className="text-teal-900">
                  All medications, meal schedules, latrine logs, and dose logs sync directly to and from your MongoDB database. Connect your MongoDB Atlas URI below to activate direct database persistence.
                </p>
              </div>
            </div>
          )}

          {/* Connect MongoDB Form */}
          <form onSubmit={handleSaveAndConnect} className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              <label htmlFor="mongo-uri-input" className="font-bold text-slate-800 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-teal-600" />
                <span>{dbStatus?.connected ? 'Change MongoDB URI / Cluster' : 'Connect Your MongoDB Cluster'}</span>
              </label>
              <button
                type="button"
                onClick={handleCopyEnv}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Format Copied!' : 'Copy URI format'}</span>
              </button>
            </div>

            <p className="text-slate-500 text-[11px]">
              Paste your MongoDB connection string (e.g. from MongoDB Atlas). Your medications and routine schedules will automatically sync.
            </p>

            <div className="space-y-2">
              <input
                id="mongo-uri-input"
                type="password"
                value={uriInput}
                onChange={(e) => setUriInput(e.target.value)}
                placeholder="mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/medschedule?retryWrites=true&w=majority"
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
              />

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  id="btn-test-mongo-connection"
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting || isSaving}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-teal-600' : ''}`} />
                  <span>{isTesting ? 'Testing Cluster...' : 'Test Connection'}</span>
                </button>

                <button
                  id="btn-save-mongo-config"
                  type="submit"
                  disabled={isSaving || isTesting}
                  className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer ml-auto"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Connecting & Syncing...</span>
                    </>
                  ) : (
                    <>
                      <span>Save & Connect MongoDB</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Test result message */}
            {testResult && (
              <div className={`p-2.5 rounded-lg text-[11px] font-medium border flex items-start gap-2 ${
                testResult.ok 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                {testResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            {/* Save error message */}
            {saveError && (
              <div className="p-2.5 rounded-lg text-[11px] font-medium border bg-rose-50 border-rose-200 text-rose-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{saveError}</span>
              </div>
            )}
          </form>

          {/* Quick Atlas Setup Steps */}
          <div className="space-y-2 border border-slate-200 rounded-xl p-3.5 bg-slate-50/50">
            <h5 className="font-bold text-slate-800 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-teal-600" />
              <span>How to get a free MongoDB Atlas URI in 2 minutes:</span>
            </h5>
            <ol className="list-decimal pl-4 space-y-1.5 text-slate-600 text-[11px]">
              <li>Sign in to <a href="https://www.mongodb.com/cloud/atlas" target="_blank" rel="noreferrer" className="text-teal-700 font-bold underline">mongodb.com/cloud/atlas</a> (Free M0 cluster).</li>
              <li>Go to <strong>Network Access</strong> &gt; Click <strong>Add IP Address</strong> &gt; Select <strong>Allow Access from Anywhere (0.0.0.0/0)</strong>.</li>
              <li>Go to <strong>Database Access</strong> &gt; Add a database user with username and password.</li>
              <li>Go to <strong>Database</strong> &gt; Click <strong>Connect</strong> &gt; Choose <strong>Drivers (Node.js)</strong> &gt; Copy connection string.</li>
              <li>Replace <code className="font-mono bg-slate-200 px-1 rounded">&lt;password&gt;</code> with your password, then paste above.</li>
            </ol>
          </div>

          {/* Fail-Safe Persistence note */}
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="text-emerald-950 text-[11px]">
              <strong>Multi-Device Zero-Loss Guarantee:</strong> All patient medications, daily meals, latrine checks, and dose records are synced automatically. Both phones will always see identical schedules.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <button
            id="btn-refresh-mongo-modal"
            type="button"
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg border border-slate-300 hover:bg-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Database Now'}</span>
          </button>

          <button
            id="btn-done-mongo-modal"
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
