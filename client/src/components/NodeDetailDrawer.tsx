import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  Code2,
  ListTree
} from 'lucide-react';
import { TdarrFlowNode } from '../types/flow';

interface NodeDetailDrawerProps {
  node: TdarrFlowNode | null;
  onClose: () => void;
  onJumpToFlow?: (flowId: string) => void;
}

export const NodeDetailDrawer: React.FC<NodeDetailDrawerProps> = ({
  node,
  onClose,
  onJumpToFlow
}) => {
  const [copied, setCopied] = useState(false);

  if (!node) return null;

  const category = (node.category as string) || 'action';
  const inputs = (node.inputs as Record<string, any>) || {};
  const isGoToFlow = (node.pluginName && node.pluginName.toLowerCase().includes('gotoflow')) ||
                     (node.name && node.name.toLowerCase().includes('go to:'));
  const targetFlowId = inputs.flowId || inputs.targetFlow;

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(node, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="w-96 h-full bg-[#121620] border-l border-[#21262d] flex flex-col shadow-2xl shadow-black z-30 animate-in slide-in-from-right duration-200">
      {/* Drawer Header */}
      <div className="p-4 border-b border-[#21262d] flex items-start justify-between bg-[#161c28]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
              {category}
            </span>
            {node.flowName && (
              <span className="text-[11px] text-slate-400 truncate max-w-[160px]">
                {node.flowName as string}
              </span>
            )}
          </div>
          <h3 className="font-bold text-sm text-slate-100 leading-snug">
            {(node.name as string) || (node.pluginName as string) || 'Node Details'}
          </h3>
          <div className="text-xs font-mono text-slate-400 mt-0.5">
            {(node.pluginName as string) || ''}
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white hover:bg-[#21262d] rounded-md transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {/* Jump to Subflow Action */}
        {isGoToFlow && targetFlowId && onJumpToFlow && (
          <div className="bg-cyan-950/40 border border-cyan-800/80 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-cyan-300 font-semibold">
              <ListTree className="w-4 h-4 text-cyan-400" />
              Subflow Target Link
            </div>
            <p className="text-[11px] text-slate-300">
              This node transfers processing to target flow:{' '}
              <strong className="text-cyan-200">{inputs.flowName || targetFlowId}</strong>
            </p>
            <button
              onClick={() => onJumpToFlow(targetFlowId)}
              className="w-full py-1.5 px-3 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-md flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Jump to Flow
            </button>
          </div>
        )}

        {/* Description */}
        {node.description && (
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Description
            </span>
            <p className="text-slate-300 leading-relaxed bg-[#0d1117] p-2.5 rounded-md border border-[#21262d]">
              {node.description as string}
            </p>
          </div>
        )}

        {/* Configured Inputs */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
            Configured Plugin Inputs ({Object.keys(inputs).length})
          </span>
          {Object.keys(inputs).length === 0 ? (
            <p className="text-slate-500 italic bg-[#0d1117] p-2.5 rounded-md border border-[#21262d]">
              No custom input parameters defined (using plugin defaults).
            </p>
          ) : (
            <div className="bg-[#0d1117] border border-[#21262d] rounded-md divide-y divide-[#21262d]">
              {Object.entries(inputs).map(([key, val]) => (
                <div key={key} className="p-2.5 flex flex-col gap-1">
                  <span className="font-mono text-slate-400 text-[11px]">{key}</span>
                  <div className="font-mono text-sky-400 bg-[#161c28] p-1.5 rounded border border-[#21262d] overflow-x-auto">
                    {typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Raw JSON */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Code2 className="w-3.5 h-3.5 text-slate-500" />
              Raw Node JSON
            </span>
            <button
              onClick={copyJson}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-0.5 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] rounded transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <pre className="bg-[#0d1117] border border-[#21262d] rounded-md p-3 font-mono text-[11px] text-slate-300 max-h-60 overflow-y-auto leading-normal">
            {JSON.stringify(node, null, 2)}
          </pre>
        </div>
      </div>
    </aside>
  );
};
