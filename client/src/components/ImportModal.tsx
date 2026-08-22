import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileCode,
  AlertCircle,
  Check
} from 'lucide-react';
import { TdarrFlow } from '../types/flow';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportFlows: (newFlows: TdarrFlow[]) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportFlows
}) => {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const processFlowData = (raw: any): TdarrFlow[] => {
    let list: any[] = [];
    if (Array.isArray(raw)) {
      list = raw;
    } else if (raw && typeof raw === 'object') {
      if (raw.flowPlugins || raw.nodes || raw._id || raw.name) {
        list = [raw];
      } else if (raw.data && Array.isArray(raw.data)) {
        list = raw.data;
      } else {
        list = Object.values(raw).filter((v: any) => typeof v === 'object' && v !== null);
      }
    }

    if (list.length === 0) {
      throw new Error('No valid flow structures detected in JSON.');
    }

    return list.map((item, idx) => {
      const flowId = item._id || item.id || `imported-flow-${Date.now()}-${idx}`;
      const name = item.name || item.flowName || item.title || `Imported Flow #${idx + 1}`;
      const description = item.description || item.comment || '';
      const plugins = item.flowPlugins || item.nodes || [];
      const edges = item.flowEdges || item.edges || [];

      return {
        ...item,
        _id: flowId,
        name,
        description,
        templateVersion: item.templateVersion || '2.0.0',
        flowPlugins: plugins,
        flowEdges: edges,
        nodes: plugins,
        edges: edges
      };
    });
  };

  const handleTextImport = () => {
    setError(null);
    if (!jsonText.trim()) {
      setError('Please paste JSON template text.');
      return;
    }

    try {
      const parsed = JSON.parse(jsonText);
      const flows = processFlowData(parsed);
      onImportFlows(flows);
      onClose();
    } catch (err: any) {
      setError(`JSON Parsing Error: ${err.message}`);
    }
  };

  const handleFiles = async (files: FileList) => {
    setError(null);
    const imported: TdarrFlow[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const flows = processFlowData(parsed);
        imported.push(...flows);
      } catch (err: any) {
        setError(`Failed reading ${file.name}: ${err.message}`);
        return;
      }
    }

    if (imported.length > 0) {
      onImportFlows(imported);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-[#141923] border border-[#2d3748] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#21262d] bg-[#181f2c] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-500/10 rounded-lg border border-sky-500/20 text-sky-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">Import Tdarr Flow JSON</h2>
              <p className="text-[11px] text-slate-400">Import flows from JSON files or paste raw template</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-[#21262d] rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Drag and Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-sky-400 bg-sky-950/30'
                : 'border-[#2d3748] hover:border-slate-400 bg-[#0d1117]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFiles(e.target.files);
              }}
            />
            <FileCode className="w-8 h-8 text-sky-400 mx-auto mb-2" />
            <p className="font-semibold text-slate-200">
              Click to browse or drop Tdarr JSON flow files here
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Supports single flow JSONs or array of multiple flows
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[#21262d]" />
            <span className="text-[10px] uppercase font-bold text-slate-500">OR PASTE JSON TEMPLATE</span>
            <div className="h-px flex-1 bg-[#21262d]" />
          </div>

          {/* Paste JSON Text Area */}
          <div className="space-y-1.5">
            <textarea
              rows={6}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder="Paste Tdarr flow JSON template here..."
              className="w-full bg-[#0b0e14] border border-[#2d3748] rounded-lg p-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono text-[11px] leading-relaxed resize-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-lg text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#21262d]">
            <button
              onClick={onClose}
              className="py-2 px-3.5 bg-transparent hover:bg-[#1f2633] text-slate-400 hover:text-slate-200 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleTextImport}
              disabled={!jsonText.trim()}
              className="py-2 px-4 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg transition-colors shadow-md shadow-sky-950 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Import Flow
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
