import React from 'react';
import {
  Download,
  Settings,
  UploadCloud,
  Layers,
  Workflow,
  Sparkles,
  Server,
  PackageCheck
} from 'lucide-react';
import { TdarrConnectionConfig, ViewMode, TdarrFlow } from '../types/flow';

interface HeaderProps {
  connection: TdarrConnectionConfig;
  viewMode: ViewMode;
  activeFlow: TdarrFlow | null;
  flowsCount: number;
  isStandalone?: boolean;
  onOpenSettings: () => void;
  onOpenExport: () => void;
  onOpenImport: () => void;
  onLoadSamples: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  connection,
  viewMode,
  activeFlow,
  flowsCount,
  isStandalone = false,
  onOpenSettings,
  onOpenExport,
  onOpenImport,
  onLoadSamples
}) => {
  return (
    <header className="h-14 bg-[#10141d] border-b border-[#21262d] px-4 flex items-center justify-between z-30 select-none">
      {/* Brand & Active Target */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-sky-400 p-0.5 flex items-center justify-center shadow-md shadow-cyan-950">
            <div className="w-full h-full bg-[#0d1117] rounded-[7px] flex items-center justify-center">
              <Workflow className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-tight text-white">
                Tdarr<span className="text-cyan-400">chive</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                v1.0
              </span>
            </div>
          </div>
        </div>

        <div className="h-5 w-px bg-[#21262d]" />

        {/* Current Active Title */}
        <div className="flex items-center gap-2">
          {viewMode === 'tree' ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-800/60 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Composite Flow Tree Mega-Viewer
              </span>
              <span className="text-xs text-slate-400 font-mono">
                ({flowsCount} interconnected flows)
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-200">
                {activeFlow ? activeFlow.name : 'No Flow Selected'}
              </span>
              {activeFlow && (
                <span className="text-[10px] font-mono text-slate-500 bg-[#0d1117] px-2 py-0.5 rounded border border-[#21262d]">
                  {(activeFlow.flowPlugins || activeFlow.nodes || []).length} nodes
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons & Status */}
      <div className="flex items-center gap-2.5">
        {isStandalone ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950/40 border border-cyan-800/60 text-cyan-300 rounded-md text-xs font-medium">
            <PackageCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Standalone Portable Viewer</span>
          </div>
        ) : (
          <>
            {/* Connection Badge */}
            <button
              onClick={onOpenSettings}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all ${
                connection.isConnected
                  ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-400 hover:bg-emerald-950/60'
                  : 'bg-[#161b22] border-[#30363d] text-slate-400 hover:text-slate-200 hover:bg-[#1f242c]'
              }`}
              title="Click to configure Tdarr IP & API Key"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  connection.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                }`}
              />
              <Server className="w-3.5 h-3.5" />
              <span>
                {connection.isConnected
                  ? `Connected: ${connection.url}`
                  : 'Tdarr Offline (Samples)'}
              </span>
            </button>

            {/* Samples Button */}
            <button
              onClick={onLoadSamples}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] text-slate-300 hover:text-white rounded-md text-xs font-medium transition-colors"
              title="Reload built-in sample flow tree"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Samples</span>
            </button>

            {/* Import Button */}
            <button
              onClick={onOpenImport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] text-slate-300 hover:text-white rounded-md text-xs font-medium transition-colors"
            >
              <UploadCloud className="w-3.5 h-3.5 text-sky-400" />
              <span>Import JSON</span>
            </button>

            {/* Settings Button */}
            <button
              onClick={onOpenSettings}
              className="p-1.5 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] text-slate-300 hover:text-white rounded-md text-xs transition-colors"
              title="Tdarr Connection & Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Export Button */}
        <button
          onClick={onOpenExport}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-slate-950 font-bold rounded-md text-xs shadow-md shadow-cyan-950/60 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Download className="w-4 h-4" />
          <span>Export Flow...</span>
        </button>
      </div>
    </header>
  );
};
