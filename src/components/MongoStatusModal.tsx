import React, { useState } from 'react';
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
  FileCode2,
  ExternalLink
} from 'lucide-react';
import { DbStatusResponse } from '../utils/api.ts';

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

  if (!isOpen) return null;

  const exampleEnv = `MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/medschedule?retryWrites=true&w=majority`;

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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                MongoDB Connection Status
              </h2>
              <p className="text-xs text-slate-500">
                Database synchronization & cloud storage configuration
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 text-xs text-slate-600">
          {/* Status Alert Banner */}
          {dbStatus?.connected ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-emerald-950">
                  MongoDB Connected & Active
                </h4>
                <p className="text-emerald-800">
                  Connected to database:{' '}
                  <strong className="font-mono text-emerald-950">{dbStatus.databaseName}</strong>
                </p>
                <div className="flex items-center gap-4 pt-1 text-emerald-900 font-medium">
                  <span>Medications: {dbStatus.itemCounts?.medications ?? 0}</span>
                  <span>•</span>
                  <span>Dose Logs: {dbStatus.itemCounts?.logs ?? 0}</span>
                </div>
              </div>
            </div>
          ) : dbStatus?.configured ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-rose-950">
                  MongoDB URI Configured, But Connection Failed
                </h4>
                <p className="text-rose-800">
                  {dbStatus.error || 'Check that your MongoDB cluster IP access list allows connection.'}
                </p>
                <p className="text-rose-700 pt-1">
                  Fallback active: App data is running in safe in-memory & local mode.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-amber-950">
                  Ready for MongoDB Connection
                </h4>
                <p className="text-amber-800">
                  The backend API endpoints and MongoDB driver are fully configured and listening.
                  Whenever you add your MongoDB URL in <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono font-bold">.env.local</code> or environment secrets, the server will connect automatically.
                </p>
              </div>
            </div>
          )}

          {/* Quick Setup Instructions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <FileCode2 className="w-4 h-4 text-teal-600" />
                <span>How to provide your MongoDB URI:</span>
              </span>
              <button
                type="button"
                onClick={handleCopyEnv}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy format'}</span>
              </button>
            </div>

            <div className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed">
              <p className="text-slate-400"># In .env.local or platform environment:</p>
              <p className="text-emerald-400 font-semibold">{exampleEnv}</p>
            </div>

            <p className="text-[11px] text-slate-500 pt-1">
              Supports MongoDB Atlas, cloud-hosted MongoDB, or local instances (<code className="font-mono">mongodb://localhost:27017/medschedule</code>).
            </p>
          </div>

          {/* Safety note */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="text-slate-600 text-[11px]">
              <strong>Fail-Safe Persistence:</strong> All medications, schedules, and dose records remain saved locally in your browser and will automatically migrate when MongoDB connects.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <button
            type="button"
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg border border-slate-300 hover:bg-white transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Checking...' : 'Refresh Status'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
