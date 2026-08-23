import {
  TdarrFlow,
  FlowSubflowLink,
  FlowTreeHierarchy,
  FlowTreeNode,
  CompositeFlowGraph,
  SubflowCluster
} from '../types/tdarr.js';

const CLUSTER_COLORS = [
  '#06b6d4', // Cyan
  '#8b5cf6', // Purple
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#14b8a6', // Teal
  '#84cc16'  // Lime
];

export class TreeBuilder {
  /**
   * Discovers all sub-flow links across all provided flows.
   */
  public findSubflowLinks(flows: TdarrFlow[]): (FlowSubflowLink & { targetPluginId?: string })[] {
    const flowMap = new Map<string, TdarrFlow>();
    const flowNameMap = new Map<string, string>(); // name lower -> id

    flows.forEach(f => {
      flowMap.set(f._id, f);
      if (f.name) {
        flowNameMap.set(f.name.toLowerCase().trim(), f._id);
      }
    });

    const links: (FlowSubflowLink & { targetPluginId?: string })[] = [];

    flows.forEach(flow => {
      const plugins = flow.flowPlugins || flow.nodes || [];
      plugins.forEach(node => {
        const pluginName = (node.pluginName || '').toLowerCase();
        const nodeName = (node.name || '').toLowerCase();
        const inputs = { ...(node.inputsDB || {}), ...(node.inputs || {}) };

        let targetFlowId: string | null = null;
        let targetFlowName: string | undefined = undefined;
        let targetPluginId: string | undefined = inputs.pluginId;

        // Check 1: inputs.flowId or inputs.targetFlow or inputs.flow
        if (inputs.flowId && flowMap.has(inputs.flowId)) {
          targetFlowId = inputs.flowId;
          targetFlowName = flowMap.get(inputs.flowId)?.name;
        } else if (inputs.flowId && typeof inputs.flowId === 'string') {
          targetFlowId = inputs.flowId;
        } else if (inputs.flowName && flowNameMap.has(inputs.flowName.toLowerCase().trim())) {
          targetFlowId = flowNameMap.get(inputs.flowName.toLowerCase().trim())!;
          targetFlowName = inputs.flowName;
        }

        // Check 2: goToFlow plugin type with any flow string reference
        if (!targetFlowId && (pluginName.includes('gotoflow') || nodeName.includes('go to'))) {
          for (const key of Object.keys(inputs)) {
            const val = String(inputs[key]).trim();
            if (flowMap.has(val)) {
              targetFlowId = val;
              break;
            }
            if (flowNameMap.has(val.toLowerCase())) {
              targetFlowId = flowNameMap.get(val.toLowerCase())!;
              break;
            }
          }
        }

        if (targetFlowId) {
          links.push({
            sourceFlowId: flow._id,
            sourceNodeId: node.id,
            targetFlowId,
            targetFlowName: targetFlowName || flowMap.get(targetFlowId)?.name || targetFlowId,
            pluginName: node.pluginName || 'goToFlow',
            targetPluginId
          });
        }
      });
    });

    return links;
  }

  /**
   * Builds the hierarchy tree starting from a selected root flow (or auto-detected root).
   */
  public buildHierarchy(flows: TdarrFlow[], explicitRootId?: string): FlowTreeHierarchy {
    const flowMap: Record<string, TdarrFlow> = {};
    flows.forEach(f => { flowMap[f._id] = f; });

    const links = this.findSubflowLinks(flows);

    // If explicitRootId provided and exists, use it
    let rootId = explicitRootId;
    if (!rootId || !flowMap[rootId]) {
      // Find flow with lowest priority number or flow with 0 incoming edges
      const sortedByPriority = [...flows].sort((a, b) => {
        const pA = typeof a.priority === 'number' ? a.priority : 99;
        const pB = typeof b.priority === 'number' ? b.priority : 99;
        return pA - pB;
      });
      rootId = sortedByPriority.length > 0 ? sortedByPriority[0]._id : flows[0]._id;
    }

    const rootFlow = flowMap[rootId];
    const visited = new Set<string>();

    const buildNode = (flowId: string, depth: number, parentNodeId?: string): FlowTreeNode => {
      const flow = flowMap[flowId];
      const flowName = flow ? flow.name : flowId;
      const node: FlowTreeNode = {
        flowId,
        flowName,
        depth,
        parentNodeId,
        children: []
      };

      if (visited.has(flowId) || depth > 10) {
        return node;
      }
      visited.add(flowId);

      const outgoing = links.filter(l => l.sourceFlowId === flowId);
      outgoing.forEach(link => {
        if (flowMap[link.targetFlowId] && link.targetFlowId !== flowId) {
          node.children.push(buildNode(link.targetFlowId, depth + 1, link.sourceNodeId));
        }
      });

      return node;
    };

    const tree = buildNode(rootId, 0);

    return {
      rootFlowId: rootId,
      rootFlowName: rootFlow ? rootFlow.name : rootId,
      allFlows: flowMap,
      links,
      tree
    };
  }

  /**
   * Generates a single composite mega-flow graph containing all stitched flows and clusters.
   */
  public buildCompositeMegaGraph(flows: TdarrFlow[], rootFlowId?: string): CompositeFlowGraph {
    const hierarchy = this.buildHierarchy(flows, rootFlowId);
    const flowMap = hierarchy.allFlows;
    const links = this.findSubflowLinks(flows);

    // Calculate topological levels for all flows
    // Priority order + DAG distance from entry
    const flowLevels = new Map<string, number>();
    const flowPriorityMap = new Map<string, number>();

    flows.forEach(f => {
      let prio = typeof f.priority === 'number' ? f.priority : 99;
      // Also parse leading numbers from name like "01. Initial processing"
      const match = (f.name || '').match(/^(\d+)\./);
      if (match) {
        prio = parseInt(match[1], 10);
      }
      flowPriorityMap.set(f._id, prio);
    });

    // Sort flows into distinct visual columns based on their priority / flow sequence
    const uniquePriorities = Array.from(new Set(flows.map(f => flowPriorityMap.get(f._id) ?? 99))).sort((a, b) => a - b);
    
    // Group flows by priority / sequence level
    const columns: TdarrFlow[][] = [];
    uniquePriorities.forEach(prio => {
      const matching = flows.filter(f => (flowPriorityMap.get(f._id) ?? 99) === prio);
      columns.push(matching);
    });

    const compositeNodes: any[] = [];
    const compositeEdges: any[] = [];
    const clusters: SubflowCluster[] = [];

    let colorIdx = 0;
    let globalXOffset = 100;

    columns.forEach(columnFlows => {
      let columnYOffset = 100;
      let maxColumnWidth = 0;

      columnFlows.forEach(flow => {
        const clusterColor = CLUSTER_COLORS[colorIdx % CLUSTER_COLORS.length];
        colorIdx++;

        const plugins = flow.flowPlugins || flow.nodes || [];
        const edges = flow.flowEdges || flow.edges || [];

        // Calculate flow's local internal bounding box accurately
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        plugins.forEach(p => {
          if (p.position) {
            minX = Math.min(minX, p.position.x);
            minY = Math.min(minY, p.position.y);
            maxX = Math.max(maxX, p.position.x + 220); // standard card width
            maxY = Math.max(maxY, p.position.y + 46);  // standard card height
          }
        });

        if (minX === Infinity) {
          minX = 0; minY = 0; maxX = 300; maxY = 150;
        }

        const flowInternalWidth = maxX - minX;
        const flowInternalHeight = maxY - minY;

        // Clean, balanced padding around the flow cluster (eliminating empty dead space)
        const padX = 36;
        const padTop = 44;
        const padBottom = 28;

        const clusterWidth = Math.max(flowInternalWidth + padX * 2, 280);
        const clusterHeight = Math.max(flowInternalHeight + padTop + padBottom, 120);

        maxColumnWidth = Math.max(maxColumnWidth, clusterWidth);

        const flowNodeOffsetX = globalXOffset + padX - minX;
        const flowNodeOffsetY = columnYOffset + padTop - minY;

        // Cluster metadata
        const cluster: SubflowCluster = {
          id: `cluster-${flow._id}`,
          flowId: flow._id,
          flowName: flow.name,
          color: clusterColor,
          bounds: {
            minX: globalXOffset,
            minY: columnYOffset,
            maxX: globalXOffset + clusterWidth,
            maxY: columnYOffset + clusterHeight,
            width: clusterWidth,
            height: clusterHeight
          },
          nodeCount: plugins.length
        };
        clusters.push(cluster);

        // Add Cluster Group Node
        compositeNodes.push({
          id: `group-${flow._id}`,
          type: 'groupNode',
          position: { x: cluster.bounds.minX, y: cluster.bounds.minY },
          style: {
            width: cluster.bounds.width,
            height: cluster.bounds.height,
            zIndex: -1,
            pointerEvents: 'none'
          },
          data: {
            flowId: flow._id,
            flowName: flow.name,
            description: flow.description,
            color: clusterColor,
            isRoot: flow._id === hierarchy.rootFlowId,
            nodeCount: plugins.length,
            priority: flowPriorityMap.get(flow._id)
          },
          selectable: false,
          draggable: true,
          dragHandle: '.flow-drag-handle'
        });

        // Add individual nodes with relative coordinates inside group
        plugins.forEach(node => {
          const namespacedId = `${flow._id}__${node.id}`;
          const localX = (node.position?.x ?? minX) - minX + 60;
          const localY = (node.position?.y ?? minY) - minY + 80;

          compositeNodes.push({
            id: namespacedId,
            type: 'tdarrNode',
            parentId: `group-${flow._id}`,
            position: { x: localX, y: localY },
            data: {
              ...node,
              originalId: node.id,
              flowId: flow._id,
              flowName: flow.name,
              clusterColor
            },
            draggable: false,
            selectable: true
          });
        });

        // Add internal flow edges with correct handle mapping
        edges.forEach((edge, eIdx) => {
          compositeEdges.push({
            id: `${flow._id}__${edge.id || eIdx}`,
            source: `${flow._id}__${edge.source}`,
            target: `${flow._id}__${edge.target}`,
            sourceHandle: edge.sourceHandle != null ? String(edge.sourceHandle) : '1',
            targetHandle: edge.targetHandle != null ? String(edge.targetHandle) : undefined,
            label: edge.label,
            type: 'smoothstep',
            animated: edge.animated ?? false,
            style: { stroke: '#64748b', strokeWidth: 2 }
          });
        });

        columnYOffset += clusterHeight + 140;
      });

      globalXOffset += maxColumnWidth + 240;
    });

    // Add cross-flow connecting edges (from GoToFlow node handle -> destination entry node)
    links.forEach((link, idx) => {
      const targetFlow = flowMap[link.targetFlowId];
      if (!targetFlow) return;

      const targetPlugins = targetFlow.flowPlugins || targetFlow.nodes || [];
      if (targetPlugins.length === 0) return;

      // Determine target entry node:
      // 1. If link specifies targetPluginId and it exists
      let targetNode = link.targetPluginId && link.targetPluginId !== 'start'
        ? targetPlugins.find(p => p.id === link.targetPluginId)
        : null;

      // 2. If not found, look for inputFile
      if (!targetNode) {
        targetNode = targetPlugins.find(p => p.pluginName === 'inputFile' || p.name?.toLowerCase().includes('input'));
      }

      // 3. Fallback to first node with no incoming internal edges, or index 0
      if (!targetNode) {
        const internalTargets = new Set((targetFlow.flowEdges || targetFlow.edges || []).map(e => e.target));
        targetNode = targetPlugins.find(p => !internalTargets.has(p.id)) || targetPlugins[0];
      }

      if (!targetNode) return;

      const crossSourceId = `${link.sourceFlowId}__${link.sourceNodeId}`;
      const crossTargetId = `${link.targetFlowId}__${targetNode.id}`;

      compositeEdges.push({
        id: `cross-flow-edge-${idx}-${link.sourceFlowId}-to-${link.targetFlowId}`,
        source: crossSourceId,
        target: crossTargetId,
        sourceHandle: '1',
        targetHandle: undefined,
        label: `↳ Jump to: ${link.targetFlowName}`,
        type: 'smoothstep',
        animated: true,
        style: {
          stroke: '#06b6d4',
          strokeWidth: 3,
          strokeDasharray: '6,6'
        },
        data: {
          isCrossFlow: true,
          sourceFlowId: link.sourceFlowId,
          targetFlowId: link.targetFlowId
        }
      });
    });

    return {
      id: `composite-tree-${hierarchy.rootFlowId}`,
      name: `${hierarchy.rootFlowName} (Complete Subflow Tree)`,
      description: `Unified composite flow tree encompassing ${flows.length} interconnected flows.`,
      isTreeMode: true,
      rootFlowId: hierarchy.rootFlowId,
      nodes: compositeNodes,
      edges: compositeEdges,
      clusters
    };
  }
}
