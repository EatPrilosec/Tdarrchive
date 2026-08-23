import React, { useMemo, useEffect, useRef, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  useReactFlow,
  ReactFlowProvider,
  BackgroundVariant
} from '@xyflow/react';
import { RotateCcw, Move, Zap, ZapOff } from 'lucide-react';
import { TdarrNode } from './nodes/TdarrNode';
import { GroupNode } from './nodes/GroupNode';
import { TdarrFlow, CompositeFlowGraph, TdarrFlowNode } from '../types/flow';

interface FlowCanvasProps {
  flow: TdarrFlow | null;
  compositeGraph: CompositeFlowGraph | null;
  isTreeMode: boolean;
  onSelectNode: (node: TdarrFlowNode | null) => void;
  selectedNodeId: string | null;
  animationsEnabled?: boolean;
  onToggleAnimations?: () => void;
  onResetTreeLayout?: () => void;
  onUpdateCompositeGraph?: (updatedGraph: CompositeFlowGraph) => void;
}

const nodeTypes = {
  tdarrNode: TdarrNode,
  groupNode: GroupNode
};

const CanvasInner: React.FC<FlowCanvasProps> = ({
  flow,
  compositeGraph,
  isTreeMode,
  onSelectNode,
  selectedNodeId,
  animationsEnabled = true,
  onToggleAnimations,
  onResetTreeLayout,
  onUpdateCompositeGraph
}) => {
  const { fitView } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const prevFlowIdRef = useRef<string | null>(null);

  // Transform Tdarr flow into ReactFlow nodes & edges
  const { initialNodes, initialEdges } = useMemo(() => {
    if (isTreeMode && compositeGraph) {
      const rfNodes: Node[] = compositeGraph.nodes.map(n => {
        const isGroup = n.type === 'groupNode';
        return {
          id: n.id,
          type: n.type || 'tdarrNode',
          parentId: n.parentId,
          position: n.position || { x: 0, y: 0 },
          data: n.data || n,
          style: isGroup ? { ...n.style, pointerEvents: 'none' } : n.style,
          selected: n.id === selectedNodeId,
          draggable: isGroup, // Groups are draggable to move entire flows!
          dragHandle: isGroup ? '.flow-drag-handle' : undefined,
          selectable: !isGroup,
          deletable: false
        };
      });

      const rfEdges: Edge[] = compositeGraph.edges.map((e, idx) => {
        const isCross = e.id.includes('cross-flow');
        const isErr = e.sourceHandle === 'err1';
        const isFalse = e.sourceHandle === '2';

        return {
          id: e.id || `edge-${idx}`,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle != null ? String(e.sourceHandle) : '1',
          targetHandle: e.targetHandle != null ? String(e.targetHandle) : undefined,
          label: isCross ? e.label : undefined,
          type: 'smoothstep',
          animated: animationsEnabled && isCross,
          style: {
            stroke: isCross ? '#06b6d4' : isErr ? '#ef4444' : isFalse ? '#94a3b8' : '#cbd5e1',
            strokeWidth: isCross ? 2.5 : 1.5,
            strokeDasharray: (isCross || isErr || isFalse) ? '4,4' : undefined
          },
          className: isCross ? (animationsEnabled ? 'edge-cross-flow' : 'edge-cross-flow-static') : undefined
        };
      });

      return { initialNodes: rfNodes, initialEdges: rfEdges };
    }

    if (flow) {
      const plugins = flow.flowPlugins || flow.nodes || [];
      const flowEdges = flow.flowEdges || flow.edges || [];

      const rfNodes: Node[] = plugins.map((p, idx) => ({
        id: p.id || `node-${idx}`,
        type: 'tdarrNode',
        position: p.position || { x: 100 + (idx % 3) * 260, y: 120 + Math.floor(idx / 3) * 120 },
        data: p,
        selected: p.id === selectedNodeId,
        draggable: false, // Individual nodes in flow are locked to faithfully represent Tdarr
        selectable: true,
        deletable: false
      }));

      const rfEdges: Edge[] = flowEdges.map((e, idx) => {
        const isErr = e.sourceHandle === 'err1';
        const isFalse = e.sourceHandle === '2';

        return {
          id: e.id || `edge-${idx}`,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle != null ? String(e.sourceHandle) : '1',
          targetHandle: e.targetHandle != null ? String(e.targetHandle) : undefined,
          type: 'smoothstep',
          animated: false,
          style: {
            stroke: isErr ? '#ef4444' : isFalse ? '#94a3b8' : '#cbd5e1',
            strokeWidth: 1.5,
            strokeDasharray: (isErr || isFalse) ? '4,4' : undefined
          }
        };
      });

      return { initialNodes: rfNodes, initialEdges: rfEdges };
    }

    return { initialNodes: [], initialEdges: [] };
  }, [flow, compositeGraph, isTreeMode, selectedNodeId, animationsEnabled]);

  // Sync state with incoming props
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Auto-fit view when flow changes or view mode toggles
  useEffect(() => {
    const currentId = isTreeMode ? 'tree' : (flow ? flow._id : null);
    if (currentId && currentId !== prevFlowIdRef.current) {
      prevFlowIdRef.current = currentId;
      const timer = setTimeout(() => {
        fitView({ padding: 0.2, duration: 400 });
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [flow, isTreeMode, fitView]);

  // Node selection handlers
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === 'groupNode') return;

      const pData = node.data as unknown as TdarrFlowNode;
      if (pData) {
        onSelectNode(pData);
      }
    },
    [onSelectNode]
  );

  const handlePaneClick = useCallback(() => {
    onSelectNode(null);
  }, [onSelectNode]);

  // Handle dragging flow groups in tree mode
  const handleNodeDragStop = useCallback((_: MouseEvent | TouchEvent, node: Node) => {
    if (!isTreeMode || !compositeGraph || !onUpdateCompositeGraph) return;

    if (node.type === 'groupNode') {
      const flowId = (node.data as any)?.flowId || node.id.replace('group-', '');
      const prevCluster = compositeGraph.clusters.find(c => c.flowId === flowId);
      if (!prevCluster) return;

      // Move group node itself
      const updatedNodes = compositeGraph.nodes.map(n => {
        if (n.id === node.id) {
          return { ...n, position: { x: node.position.x, y: node.position.y } };
        }
        if (n.parentId === node.id) {
          return n;
        }
        return n;
      });

      // Update cluster bounds
      const updatedClusters = compositeGraph.clusters.map(c => {
        if (c.flowId === flowId) {
          return {
            ...c,
            bounds: {
              ...c.bounds,
              minX: node.position.x,
              minY: node.position.y,
              maxX: node.position.x + c.bounds.width,
              maxY: node.position.y + c.bounds.height
            }
          };
        }
        return c;
      });

      onUpdateCompositeGraph({
        ...compositeGraph,
        nodes: updatedNodes,
        clusters: updatedClusters
      });
    }
  }, [isTreeMode, compositeGraph, onUpdateCompositeGraph]);

  return (
    <div className={`w-full h-full relative ${!animationsEnabled ? 'no-canvas-animations' : ''}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={handleNodeDragStop}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodesDraggable={isTreeMode} // In tree mode, groups can be moved!
        nodesConnectable={false}
        nodesFocusable={false}
        elementsSelectable={true}
        panOnDrag={true}
        selectionOnDrag={false}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: '#cbd5e1', strokeWidth: 1.5 }
        }}
        minZoom={0.02}
        maxZoom={3.0}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={18}
          size={1.2}
          color="#2e3648"
        />
        <Controls
          showInteractive={false}
          className="!bottom-6 !left-6"
        />
        <MiniMap
          nodeStrokeWidth={3}
          nodeColor={(node) => {
            if (node.type === 'groupNode') return (node.data?.color as string) || '#06b6d4';
            const pName = ((node.data?.pluginName as string) || '').toLowerCase();
            if (pName === 'comment') return '#1d4ed8';
            if (pName.startsWith('check')) return '#f59e0b';
            if (pName.includes('fail')) return '#ef4444';
            if (pName.includes('gotoflow')) return '#10b981';
            return '#22c55e';
          }}
          className="!bottom-6 !right-6 !w-48 !h-32 !bg-[#13161f]/95 !border-[#2d3748]"
        />
      </ReactFlow>

      {/* Floating Canvas Animation Toggle Button (Visible in both Web UI and HTML Viewers) */}
      {onToggleAnimations && (
        <div className="absolute bottom-6 left-20 z-20 flex items-center gap-1.5 bg-[#121620]/90 backdrop-blur-md border border-[#2d3748] px-2.5 py-1 rounded-lg shadow-xl">
          <button
            onClick={onToggleAnimations}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold transition-all ${
              animationsEnabled
                ? 'bg-cyan-950/80 border border-cyan-800 text-cyan-300 hover:bg-cyan-900/80'
                : 'bg-[#1e2433] border border-[#2d3748] text-slate-400 hover:text-slate-200'
            }`}
            title={animationsEnabled ? 'Click to pause/disable line animations' : 'Click to enable line animations'}
          >
            {animationsEnabled ? (
              <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/20" />
            ) : (
              <ZapOff className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span className="text-[11px]">{animationsEnabled ? 'Animations ON' : 'Animations OFF'}</span>
          </button>
        </div>
      )}

      {/* Floating Toolbar for Flow Tree Mode (Live Web UI only) */}
      {isTreeMode && onResetTreeLayout && (
        <div className="absolute top-4 left-6 flex items-center gap-2 bg-[#121620]/90 backdrop-blur-md border border-[#2d3748] px-3 py-1.5 rounded-lg shadow-xl z-20">
          <div className="flex items-center gap-1.5 text-xs text-sky-300 font-medium">
            <Move className="w-3.5 h-3.5 text-sky-400" />
            <span>Drag flow header badges to shape layout</span>
          </div>
          <div className="h-3.5 w-px bg-[#2d3748]" />
          <button
            onClick={onResetTreeLayout}
            className="flex items-center gap-1 px-2 py-0.5 bg-[#1e2433] hover:bg-[#2d3748] text-slate-300 hover:text-white rounded text-[11px] font-medium transition-colors"
            title="Reset to default topological column layout"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Layout</span>
          </button>
        </div>
      )}
    </div>
  );
};

export const FlowCanvas: React.FC<FlowCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
};
