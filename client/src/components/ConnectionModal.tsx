import React, { useState } from 'react';
import {
  X,
  Server,
  Key,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { TdarrConnectionConfig } from '../types/flow';

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: TdarrConnectionConfig;
  onSaveConfig: (url: string, apiKey: string) => Promise<void>;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig
}) => {
  const [url, setUrl] = useState(config.url || 'http://192.168.1.50:8265');
  const [apiKey, setApiKey] = useState(config.apiKey || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    version?: string;
    totalFlows?: number;
    latencyMs?: number;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/tdarr/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, apiKey })
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Network request failed: ${err.message}`
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveConfig(url, apiKey);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-[#141923] border border-[#2d3748] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#21262d] bg-[#181f2c] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-500/10 rounded-lg border border-sky-500/20 text-sky-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">Tdarr Server Connection</h2>
              <p className="text-[11px] text-slate-400">Configure your Tdarr instance IP/URL and API Key</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-[#21262d] rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
          {/* Server URL */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              Tdarr Server URL / IP & Port
            </label>
            <input
              type="text"
              required
              placeholder="http://192.168.1.50:8265"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-[#0b0e14] border border-[#2d3748] rounded-lg py-2 px-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono text-xs"
            />
            <p className="text-[11px] text-slate-500">
              Default Tdarr Server web & API port is usually <code>8265</code>.
            </p>
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-slate-400" />
              Tdarr API Key (Optional)
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                placeholder="tapi_xxxxxxxxxxxxxx (Leave blank if auth is disabled)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-[#0b0e14] border border-[#2d3748] rounded-lg py-2 pl-3 pr-10 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
              >
                {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Found in Tdarr WebUI under <strong>Tools → API Keys</strong>.
            </p>
          </div>

          {/* Test Status Banner */}
          {testResult && (
            <div
              className={`p-3 rounded-lg border flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-800 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-semibold">{testResult.message}</div>
                {testResult.success && (
                  <div className="text-[11px] text-slate-400 flex items-center gap-3">
                    {testResult.version && <span>Version: {testResult.version}</span>}
                    {testResult.latencyMs && <span>Latency: {testResult.latencyMs}ms</span>}
                    {testResult.totalFlows !== undefined && (
                      <span>Flows detected: {testResult.totalFlows}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#21262d]">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="py-2 px-3.5 bg-[#1f2633] hover:bg-[#283243] text-slate-200 border border-[#303c4f] rounded-lg font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {testing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                  Test Connection
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="py-2 px-3.5 bg-transparent hover:bg-[#1f2633] text-slate-400 hover:text-slate-200 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="py-2 px-4 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg transition-colors shadow-md shadow-sky-950 disabled:opacity-50 flex items-center gap-1.5"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect & Fetch Flows'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
