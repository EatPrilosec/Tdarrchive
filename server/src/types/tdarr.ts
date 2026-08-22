export interface TdarrFlowNode {
  id: string;
  name?: string;
  pluginName?: string;
  sourceType?: string;
  category?: string;
  description?: string;
  version?: string;
  position?: { x: number; y: number };
  inputs?: Record<string, any>;
  inputsDB?: Record<string, any>;
  type?: string;
  data?: Record<string, any>;
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
  createdAt?: string | number;
  updatedAt?: string | number;
  [key: string]: any;
}

export interface FlowSubflowLink {
  sourceFlowId: string;
  sourceNodeId: string;
  targetFlowId: string;
  targetFlowName?: string;
  pluginName: string;
}

export interface FlowTreeHierarchy {
  rootFlowId: string;
  rootFlowName: string;
  allFlows: Record<string, TdarrFlow>;
  links: FlowSubflowLink[];
  tree: FlowTreeNode;
}

export interface FlowTreeNode {
  flowId: string;
  flowName: string;
  depth: number;
  parentNodeId?: string;
  children: FlowTreeNode[];
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
