export interface TdarrFlowNode {
  id: string;
  name?: string;
  pluginName?: string;
  sourceType?: string;
  category?: 'input' | 'filter' | 'transcode' | 'flow' | 'notify' | 'file' | 'action' | string;
  description?: string;
  version?: string;
  position?: { x: number; y: number };
  inputs?: Record<string, any>;
  inputsDB?: Record<string, any>;
  [key: string]: any;
}

export interface TdarrFlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  label?: string;
  type?: string;
  animated?: boolean;
  style?: Record<string, any>;
  [key: string]: any;
}

export interface TdarrFlow {
  _id: string;
  name: string;
  description?: string;
  templateVersion?: string | number;
  flowPlugins?: TdarrFlowNode[];
  flowEdges?: TdarrFlowEdge[];
  nodes?: TdarrFlowNode[];
  edges?: TdarrFlowEdge[];
  libraryId?: string;
  libraryName?: string;
  [key: string]: any;
}

export interface SubflowCluster {
  id: string;
  flowId: string;
  flowName: string;
  color: string;
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
  nodeCount: number;
}

export interface CompositeFlowGraph {
  id: string;
  name: string;
  description?: string;
  isTreeMode: boolean;
  rootFlowId?: string;
  nodes: any[];
  edges: any[];
  clusters: SubflowCluster[];
}

export interface TdarrConnectionConfig {
  url: string;
  apiKey: string;
  isConnected: boolean;
  serverVersion?: string;
  lastTested?: string;
}

export type ViewMode = 'single' | 'tree';
