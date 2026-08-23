import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { FlowCanvas } from './components/FlowCanvas';
import { NodeDetailDrawer } from './components/NodeDetailDrawer';
import { ConnectionModal } from './components/ConnectionModal';
import { ImportModal } from './components/ImportModal';
import { ExportModal } from './components/ExportModal';
import { CLIENT_SAMPLE_FLOWS } from './sampleData';
import {
  TdarrFlow,
  TdarrFlowNode,
  CompositeFlowGraph,
  TdarrConnectionConfig,
  ViewMode
} from './types/flow';

const STORAGE_KEY_CONN = 'tdarrchive_conn_config';
const STORAGE_KEY_FLOWS = 'tdarrchive_cached_flows';

export const App: React.FC = () => {
  // State: Flows
  const [flows, setFlows] = useState<TdarrFlow[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_FLOWS);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    return CLIENT_SAMPLE_FLOWS;
  });

  const [activeFlowId, setActiveFlowId] = useState<string | null>(() => {
    return flows.length > 0 ? flows[0]._id : null;
  });

  const [selectedNode, setSelectedNode] = useState<TdarrFlowNode | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [compositeGraph, setCompositeGraph] = useState<CompositeFlowGraph | null>(null);

  // State: Connection
  const [connection, setConnection] = useState<TdarrConnectionConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONN);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return {
      url: 'http://localhost:8265',
      apiKey: '',
      isConnected: false
    };
  });

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Active Flow Object
  const activeFlow = useMemo(() => {
    return flows.find(f => f._id === activeFlowId) || flows[0] || null;
  }, [flows, activeFlowId]);

  // Build Composite Flow Tree whenever flows change
  const refreshFlowTree = useCallback(async (currentFlows: TdarrFlow[]) => {
    if (currentFlows.length === 0) {
      setCompositeGraph(null);
      return;
    }

    try {
      const res = await fetch('/api/export/tree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flows: currentFlows, rootFlowId: activeFlowId || undefined })
      });
      if (res.ok) {
        const data = await res.json();
        setCompositeGraph(data.compositeGraph);
      }
    } catch (err) {
      console.warn('Failed to build flow tree from backend:', err);
    }
  }, [activeFlowId]);

  useEffect(() => {
    refreshFlowTree(flows);
    try {
      localStorage.setItem(STORAGE_KEY_FLOWS, JSON.stringify(flows));
    } catch {
      // Storage full or quota exceeded
    }
  }, [flows, refreshFlowTree]);

  // Handle saving connection config and fetching flows from live Tdarr server
  const handleSaveConnection = async (url: string, apiKey: string) => {
    try {
      const testRes = await fetch('/api/tdarr/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, apiKey })
      });
      const testData = await testRes.json();

      const newConfig: TdarrConnectionConfig = {
        url,
        apiKey,
        isConnected: testData.success,
        serverVersion: testData.serverVersion,
        lastTested: new Date().toISOString()
      };

      setConnection(newConfig);
      localStorage.setItem(STORAGE_KEY_CONN, JSON.stringify(newConfig));

      if (testData.success) {
        // Fetch all flows
        const flowsRes = await fetch('/api/tdarr/flows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, apiKey })
        });
        const flowsData = await flowsRes.json();
        if (flowsData.success && Array.isArray(flowsData.flows) && flowsData.flows.length > 0) {
          setFlows(flowsData.flows);
          setActiveFlowId(flowsData.flows[0]._id);
        }
      }
    } catch (err) {
      console.error('Connection error:', err);
      throw err;
    }
  };

  const handleImportFlows = (newFlows: TdarrFlow[]) => {
    setFlows(prev => {
      const merged = [...newFlows, ...prev.filter(p => !newFlows.some(n => n._id === p._id))];
      return merged;
    });
    if (newFlows.length > 0) {
      setActiveFlowId(newFlows[0]._id);
    }
  };

  const handleLoadSamples = () => {
    setFlows(CLIENT_SAMPLE_FLOWS);
    setActiveFlowId(CLIENT_SAMPLE_FLOWS[0]._id);
    setSelectedNode(null);
  };

  const handleJumpToFlow = (targetFlowId: string) => {
    const target = flows.find(f => f._id === targetFlowId || f.name.toLowerCase() === targetFlowId.toLowerCase());
    if (target) {
      setActiveFlowId(target._id);
      setViewMode('single');
      setSelectedNode(null);
    } else {
      alert(`Target flow "${targetFlowId}" not found in currently loaded flows.`);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0b0f17] text-slate-100 overflow-hidden font-sans">
      {/* Top Navigation Bar */}
      <Header
        connection={connection}
        viewMode={viewMode}
        activeFlow={activeFlow}
        flowsCount={flows.length}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenImport={() => setIsImportOpen(true)}
        onLoadSamples={handleLoadSamples}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar */}
        <Sidebar
          flows={flows}
          activeFlowId={activeFlowId}
          onSelectFlow={(id) => {
            setActiveFlowId(id);
            setSelectedNode(null);
          }}
          viewMode={viewMode}
          onSetViewMode={(mode) => {
            setViewMode(mode);
            setSelectedNode(null);
          }}
          onOpenImportModal={() => setIsImportOpen(true)}
          onLoadSamples={handleLoadSamples}
        />

        {/* Center Flow Canvas */}
        <main className="flex-1 h-full relative bg-[#0b0e14]">
          <FlowCanvas
            flow={activeFlow}
            compositeGraph={compositeGraph}
            isTreeMode={viewMode === 'tree'}
            onSelectNode={setSelectedNode}
            selectedNodeId={selectedNode?.id || null}
            onResetTreeLayout={() => refreshFlowTree(flows)}
            onUpdateCompositeGraph={(updated) => setCompositeGraph(updated)}
          />
        </main>

        {/* Right Slide-out Node Inspector */}
        {selectedNode && (
          <NodeDetailDrawer
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onJumpToFlow={handleJumpToFlow}
          />
        )}
      </div>

      {/* Modals */}
      <ConnectionModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={connection}
        onSaveConfig={handleSaveConnection}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportFlows={handleImportFlows}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        flow={activeFlow}
        flows={flows}
        compositeGraph={compositeGraph}
        viewMode={viewMode}
      />
    </div>
  );
};
