import React, { useState } from 'react';
import {
  GitBranch,
  Layers,
  Search,
  Plus,
  Workflow,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { TdarrFlow, ViewMode } from '../types/flow';

interface SidebarProps {
  flows: TdarrFlow[];
  activeFlowId: string | null;
  onSelectFlow: (flowId: string) => void;
  viewMode: ViewMode;
  onSetViewMode: (mode: ViewMode) => void;
  onOpenImportModal: () => void;
  onLoadSamples: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  flows,
  activeFlowId,
  onSelectFlow,
  viewMode,
  onSetViewMode,
  onOpenImportModal,
  onLoadSamples
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFlows = flows.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.description && f.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <aside className="w-80 h-full bg-[#10141d] border-r border-[#21262d] flex flex-col z-20">
      {/* View Mode Toggle */}
      <div className="p-3 border-b border-[#21262d]">
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#0b0e14] border border-[#21262d] rounded-lg">
          <button
            onClick={() => onSetViewMode('single')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${
              viewMode === 'single'
                ? 'bg-[#1f293d] text-[#38bdf8] shadow-sm border border-[#38bdf8]/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Workflow className="w-3.5 h-3.5" />
            Single Flow
          </button>
          <button
            onClick={() => onSetViewMode('tree')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${
              viewMode === 'tree'
                ? 'bg-[#0e3a47] text-[#22d3ee] shadow-sm border border-[#22d3ee]/40 animate-glow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Flow Tree
          </button>
        </div>
      </div>

      {/* Search & Header */}
      <div className="p-3 border-b border-[#21262d] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Loaded Flows ({flows.length})
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenImportModal}
              className="p-1 text-slate-400 hover:text-sky-400 hover:bg-[#1f242c] rounded transition-colors"
              title="Import Flow JSON"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search flows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0b0e14] border border-[#21262d] rounded-md py-1.5 pl-8 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
          />
        </div>
      </div>

      {/* Flow List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filteredFlows.length === 0 ? (
          <div className="text-center py-8 px-4 text-slate-500 text-xs">
            {flows.length === 0 ? (
              <div className="space-y-3">
                <p>No flows loaded yet.</p>
                <button
                  onClick={onLoadSamples}
                  className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-sky-600/20 text-sky-400 border border-sky-500/30 rounded-md hover:bg-sky-600/30 transition-colors text-xs font-medium"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Load Sample Flow Tree
                </button>
              </div>
            ) : (
              'No flows match search query'
            )}
          </div>
        ) : (
          filteredFlows.map((flow) => {
            const isSelected = viewMode === 'single' && flow._id === activeFlowId;
            const nodeCount = (flow.flowPlugins || flow.nodes || []).length;
            const subflowNodes = (flow.flowPlugins || flow.nodes || []).filter(
              n => (n.pluginName && n.pluginName.toLowerCase().includes('gotoflow')) ||
                   (n.name && n.name.toLowerCase().includes('go to:'))
            );

            return (
              <button
                key={flow._id}
                onClick={() => {
                  onSelectFlow(flow._id);
                  if (viewMode === 'tree') {
                    onSetViewMode('single');
                  }
                }}
                className={`w-full text-left p-3 rounded-lg border transition-all relative group flex flex-col gap-1.5 ${
                  isSelected
                    ? 'bg-[#162032] border-sky-500/50 shadow-md shadow-sky-950/40'
                    : 'bg-[#141923] border-[#21262d] hover:bg-[#1a2130] hover:border-[#30363d]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-xs text-slate-100 group-hover:text-sky-300 leading-tight">
                    {flow.name}
                  </div>
                  <ChevronRight
                    className={`w-3.5 h-3.5 text-slate-500 shrink-0 transition-transform ${
                      isSelected ? 'text-sky-400 translate-x-0.5' : ''
                    }`}
                  />
                </div>

                {flow.description && (
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {flow.description}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-mono text-slate-400 bg-[#0b0e14] px-2 py-0.5 rounded border border-[#21262d]">
                    {nodeCount} nodes
                  </span>

                  {subflowNodes.length > 0 && (
                    <span className="text-[10px] font-medium text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800 flex items-center gap-1">
                      <GitBranch className="w-2.5 h-2.5" />
                      {subflowNodes.length} subflow{subflowNodes.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};
