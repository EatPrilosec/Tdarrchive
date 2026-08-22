import { TdarrFlow, CompositeFlowGraph } from '../types/tdarr.js';

export interface HtmlExportOptions {
  title?: string;
  theme?: 'dark' | 'midnight';
  showMinimap?: boolean;
  allowImageExport?: boolean;
}

export class HtmlExporter {
  public generateSingleFlowHtml(flow: TdarrFlow, options: HtmlExportOptions = {}): string {
    const title = options.title || flow.name || 'Tdarr Flow Viewer';
    const graphData = {
      id: flow._id,
      name: flow.name,
      description: flow.description || '',
      isTreeMode: false,
      nodes: (flow.flowPlugins || flow.nodes || []).map((n, idx) => ({
        id: n.id || `node-${idx}`,
        name: n.name || n.pluginName || 'Node',
        pluginName: n.pluginName || 'customPlugin',
        category: n.category || 'action',
        description: n.description || '',
        position: n.position || { x: 100 + (idx % 3) * 260, y: 150 + Math.floor(idx / 3) * 120 },
        inputs: { ...(n.inputsDB || {}), ...(n.inputs || {}) }
      })),
      edges: (flow.flowEdges || flow.edges || []).map((e, idx) => ({
        id: e.id || `edge-${idx}`,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle != null ? String(e.sourceHandle) : '1',
        targetHandle: e.targetHandle != null ? String(e.targetHandle) : undefined,
        label: e.label
      })),
      clusters: []
    };

    return this.renderHtmlTemplate(title, graphData, options);
  }

  public generateCompositeTreeHtml(composite: CompositeFlowGraph, options: HtmlExportOptions = {}): string {
    const title = options.title || composite.name || 'Tdarr Composite Flow Tree';
    return this.renderHtmlTemplate(title, composite, options);
  }

  private renderHtmlTemplate(title: string, graphData: any, _options: HtmlExportOptions): string {
    const serializedData = JSON.stringify(graphData).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(title)} - Tdarrchive Standalone Flow</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #161922;
      color: #f0f6fc;
      overflow: hidden;
      height: 100vh;
      width: 100vw;
      user-select: none;
    }
    #app {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100vw;
      position: relative;
    }
    /* Top Toolbar */
    .toolbar {
      height: 52px;
      background: rgba(19, 22, 31, 0.95);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid #2d3748;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 18px;
      z-index: 50;
    }
    .flow-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .badge-tag {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 9999px;
      background: #06b6d420;
      color: #22d3ee;
      border: 1px solid #06b6d450;
      text-transform: uppercase;
    }
    .flow-title {
      font-size: 15px;
      font-weight: 700;
      color: #fff;
    }
    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .search-input {
      background: #0e1117;
      border: 1px solid #2d3748;
      color: #f0f6fc;
      font-size: 13px;
      padding: 5px 10px;
      border-radius: 6px;
      outline: none;
      width: 220px;
    }
    .search-input:focus {
      border-color: #06b6d4;
    }
    .btn {
      background: #1f2430;
      border: 1px solid #2d3748;
      color: #c9d1d9;
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    }
    .btn:hover {
      background: #2d3748;
      color: #fff;
    }
    /* Viewport & Canvas */
    .viewport {
      flex: 1;
      position: relative;
      overflow: hidden;
      cursor: grab;
      background-color: #161922;
      background-image: radial-gradient(#2e3648 1.2px, transparent 1.2px);
      background-size: 18px 18px;
    }
    .viewport.grabbing {
      cursor: grabbing;
    }
    .canvas {
      position: absolute;
      top: 0;
      left: 0;
      transform-origin: 0 0;
      will-change: transform;
    }
    /* SVG Layer */
    .connections-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 40000px;
      height: 40000px;
      pointer-events: none;
      z-index: 10;
    }
    .edge-path {
      fill: none;
      stroke: #cbd5e1;
      stroke-width: 1.5;
      stroke-linecap: round;
    }
    .edge-path.edge-false {
      stroke: #94a3b8;
      stroke-dasharray: 4 4;
    }
    .edge-path.edge-err {
      stroke: #ef4444;
      stroke-dasharray: 4 4;
    }
    .edge-path.edge-cross {
      stroke: #06b6d4;
      stroke-width: 2.5;
      stroke-dasharray: 6 6;
      animation: dash 1s linear infinite;
    }
    @keyframes dash {
      to { stroke-dashoffset: -12; }
    }
    /* Cluster Boxes */
    .cluster-box {
      position: absolute;
      border-radius: 12px;
      border: 2px dashed;
      background: rgba(15, 23, 42, 0.4);
      pointer-events: none;
      z-index: 5;
    }
    .cluster-header {
      position: absolute;
      top: -12px;
      left: 18px;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      color: #fff;
    }
    /* Compact Tdarr Node Cards */
    .tdarr-node {
      position: absolute;
      background-color: #19181e;
      border-radius: 5px;
      padding: 5px 9px;
      display: flex;
      align-items: center;
      gap: 7px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      cursor: pointer;
      z-index: 20;
      border-width: 1.5px;
      border-style: solid;
      white-space: nowrap;
      transition: all 0.15s;
    }
    .tdarr-node:hover {
      box-shadow: 0 0 12px rgba(56, 189, 248, 0.6);
      border-color: #38bdf8 !important;
      z-index: 35;
    }
    .tdarr-node.selected {
      border-color: #38bdf8 !important;
      border-width: 2px;
      box-shadow: 0 0 16px rgba(56, 189, 248, 0.8);
      z-index: 40;
    }
    .tdarr-node.highlighted {
      box-shadow: 0 0 16px #f59e0b;
      border-color: #f59e0b !important;
    }
    .tdarr-node-comment {
      border-radius: 9999px !important;
      background-color: #1d4ed8 !important;
      border: 1px solid #3b82f6 !important;
      color: #fff !important;
      padding: 4px 12px !important;
      box-shadow: 0 4px 10px rgba(29, 78, 216, 0.4);
    }
    .node-icon-box {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
    }
    .node-text {
      font-size: 11px;
      font-weight: 500;
      color: #f1f5f9;
    }
    /* Port Handles */
    .handle-dot {
      position: absolute;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #77DD77;
      border: 1.5px solid #19181e;
      z-index: 25;
    }
    .handle-top {
      top: -4px;
      left: 50%;
      transform: translateX(-50%);
    }
    .handle-bottom-1 {
      bottom: -4px;
      left: 50%;
      transform: translateX(-50%);
    }
    .handle-bottom-true {
      bottom: -4px;
      left: 30%;
      transform: translateX(-50%);
      background: #77DD77;
    }
    .handle-bottom-false {
      bottom: -4px;
      left: 70%;
      transform: translateX(-50%);
      background: #FF6961;
    }
    .handle-right-err {
      right: -4px;
      top: 50%;
      transform: translateY(-50%);
      background: #FF5733;
    }
    /* Controls */
    .canvas-controls {
      position: absolute;
      bottom: 24px;
      left: 24px;
      background: rgba(19, 22, 31, 0.95);
      border: 1px solid #2d3748;
      border-radius: 8px;
      padding: 4px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      z-index: 45;
    }
    .ctrl-btn {
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #1f2430;
      border: 1px solid #2d3748;
      color: #c9d1d9;
      border-radius: 6px;
      font-size: 15px;
      cursor: pointer;
    }
    .ctrl-btn:hover {
      background: #2d3748;
      color: #fff;
    }
    /* Drawer Inspector */
    .drawer {
      position: absolute;
      top: 52px;
      right: -380px;
      width: 360px;
      height: calc(100vh - 52px);
      background: #161b22;
      border-left: 1px solid #30363d;
      box-shadow: -8px 0 32px rgba(0,0,0,0.6);
      transition: right 0.2s ease;
      z-index: 48;
      display: flex;
      flex-direction: column;
    }
    .drawer.open { right: 0; }
    .drawer-header {
      padding: 14px;
      border-bottom: 1px solid #30363d;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .drawer-close {
      background: transparent;
      border: none;
      color: #8b949e;
      font-size: 18px;
      cursor: pointer;
    }
    .drawer-content {
      padding: 14px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .json-box {
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 6px;
      padding: 8px;
      font-family: monospace;
      font-size: 11px;
      color: #79c0ff;
      max-height: 250px;
      overflow-y: auto;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <div id="app">
    <header class="toolbar">
      <div class="flow-info">
        <span class="badge-tag">${graphData.isTreeMode ? 'Flow Tree' : 'Tdarr Flow'}</span>
        <h1 class="flow-title">${this.escapeHtml(title)}</h1>
      </div>
      <div class="toolbar-actions">
        <input type="text" id="searchInput" class="search-input" placeholder="Search nodes...">
        <button id="btnFit" class="btn">Fit View</button>
        <button id="btnReset" class="btn">Reset</button>
      </div>
    </header>

    <main id="viewport" class="viewport">
      <div id="canvas" class="canvas">
        <svg id="connectionsLayer" class="connections-layer"></svg>
        <div id="clustersContainer"></div>
        <div id="nodesContainer"></div>
      </div>

      <div class="canvas-controls">
        <button id="btnZoomIn" class="ctrl-btn">+</button>
        <button id="btnZoomOut" class="ctrl-btn">−</button>
        <button id="btnFit2" class="ctrl-btn">⛶</button>
      </div>

      <aside id="nodeDrawer" class="drawer">
        <div class="drawer-header">
          <h3 id="drawerNodeName" style="font-size: 14px; font-weight: 700;">Node Details</h3>
          <button id="drawerCloseBtn" class="drawer-close">✕</button>
        </div>
        <div class="drawer-content">
          <div>
            <div style="font-size: 10px; font-weight: 700; color: #8b949e; text-transform: uppercase;">Plugin</div>
            <div id="drawerPluginName" style="font-family: monospace; font-size: 12px; color: #58a6ff; margin-top: 2px;"></div>
          </div>
          <div>
            <div style="font-size: 10px; font-weight: 700; color: #8b949e; text-transform: uppercase;">Configured Inputs</div>
            <div id="drawerInputsJson" class="json-box" style="margin-top: 4px;"></div>
          </div>
          <div>
            <div style="font-size: 10px; font-weight: 700; color: #8b949e; text-transform: uppercase;">Raw Node JSON</div>
            <div id="drawerRawJson" class="json-box" style="margin-top: 4px;"></div>
          </div>
        </div>
      </aside>
    </main>
  </div>

  <script>
    const GRAPH_DATA = ${serializedData};
    let transform = { x: 0, y: 0, scale: 1 };
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let selectedNodeId = null;

    const viewport = document.getElementById('viewport');
    const canvas = document.getElementById('canvas');
    const svgLayer = document.getElementById('connectionsLayer');
    const clustersContainer = document.getElementById('clustersContainer');
    const nodesContainer = document.getElementById('nodesContainer');
    const drawer = document.getElementById('nodeDrawer');
    const searchInput = document.getElementById('searchInput');

    function init() {
      renderClusters();
      renderNodes();
      renderEdges();
      fitView();
      setupEvents();
    }

    function renderClusters() {
      clustersContainer.innerHTML = '';
      if (!GRAPH_DATA.clusters || GRAPH_DATA.clusters.length === 0) return;

      GRAPH_DATA.clusters.forEach(c => {
        const box = document.createElement('div');
        box.className = 'cluster-box';
        box.style.left = c.bounds.minX + 'px';
        box.style.top = c.bounds.minY + 'px';
        box.style.width = c.bounds.width + 'px';
        box.style.height = c.bounds.height + 'px';
        box.style.borderColor = c.color;

        const header = document.createElement('div');
        header.className = 'cluster-header';
        header.style.background = c.color;
        header.innerText = '📁 ' + c.flowName + ' (' + c.nodeCount + ' nodes)';
        box.appendChild(header);

        clustersContainer.appendChild(box);
      });
    }

    function renderNodes() {
      nodesContainer.innerHTML = '';
      const nodes = GRAPH_DATA.nodes || [];

      nodes.forEach(node => {
        if (node.type === 'groupNode') return;

        const data = node.data || node;
        const pluginName = (data.pluginName || '').toLowerCase();
        const name = data.name || data.pluginName || 'Plugin';
        const nameLower = name.toLowerCase();

        const isComment = pluginName === 'comment' || nameLower.startsWith('comment:');
        const isInput = pluginName === 'inputfile' || pluginName === 'start' || nameLower.includes('input file');
        const isFail = pluginName === 'failflow' || pluginName === 'onflowerror' || nameLower.includes('fail');
        const isGoTo = pluginName === 'gotoflow' || nameLower.includes('go to');
        const isCheck = pluginName.startsWith('check') || pluginName.includes('decider') || name.endsWith('?') || nameLower.includes('is mkv') || nameLower.includes('show or movie');

        const card = document.createElement('div');
        card.id = 'dom-node-' + node.id;
        card.style.left = node.position.x + 'px';
        card.style.top = node.position.y + 'px';

        if (isComment) {
          card.className = 'tdarr-node tdarr-node-comment';
          card.innerHTML = '<span class="node-icon-box">💬</span><span class="node-text">' + escapeText(name) + '</span>';
          
          const inHandle = document.createElement('div');
          inHandle.className = 'handle-dot handle-top';
          card.appendChild(inHandle);

          const outHandle = document.createElement('div');
          outHandle.className = 'handle-dot handle-bottom-1';
          card.appendChild(outHandle);
        } else {
          card.className = 'tdarr-node';
          let border = '#22c55e';
          let icon = '⚙';

          if (isInput) { border = '#a855f7'; icon = '▶'; }
          else if (isFail) { border = '#ef4444'; icon = '▲'; }
          else if (isGoTo) { border = '#10b981'; icon = '➜'; }
          else if (isCheck) { border = '#f59e0b'; icon = '?'; }
          else if (pluginName.includes('ffmpeg')) { border = '#06b6d4'; icon = '⚙'; }

          card.style.borderColor = border;
          card.innerHTML = '<span class="node-icon-box">' + icon + '</span><span class="node-text">' + escapeText(name) + '</span>';

          if (!isInput) {
            const inHandle = document.createElement('div');
            inHandle.className = 'handle-dot handle-top';
            card.appendChild(inHandle);
          }

          const errHandle = document.createElement('div');
          errHandle.className = 'handle-dot handle-right-err';
          card.appendChild(errHandle);

          if (isCheck) {
            const tHandle = document.createElement('div');
            tHandle.className = 'handle-dot handle-bottom-true';
            card.appendChild(tHandle);

            const fHandle = document.createElement('div');
            fHandle.className = 'handle-dot handle-bottom-false';
            card.appendChild(fHandle);
          } else {
            const outHandle = document.createElement('div');
            outHandle.className = 'handle-dot handle-bottom-1';
            card.appendChild(outHandle);
          }
        }

        card.addEventListener('click', (e) => {
          e.stopPropagation();
          selectNode(node);
        });

        nodesContainer.appendChild(card);
      });
    }

    function renderEdges() {
      svgLayer.innerHTML = '';
      const edges = GRAPH_DATA.edges || [];
      const nodeMap = {};
      (GRAPH_DATA.nodes || []).forEach(n => {
        if (n.type !== 'groupNode') nodeMap[n.id] = n;
      });

      // Get rendered node dimensions
      requestAnimationFrame(() => {
        edges.forEach(edge => {
          const sourceNode = nodeMap[edge.source];
          const targetNode = nodeMap[edge.target];
          if (!sourceNode || !targetNode) return;

          const sDom = document.getElementById('dom-node-' + edge.source);
          const tDom = document.getElementById('dom-node-' + edge.target);
          const sW = sDom ? sDom.offsetWidth : 160;
          const sH = sDom ? sDom.offsetHeight : 30;
          const tW = tDom ? tDom.offsetWidth : 160;

          const isCross = edge.id.includes('cross-flow');
          const isErr = edge.sourceHandle === 'err1';
          const isFalse = edge.sourceHandle === '2';

          let sx = sourceNode.position.x + sW / 2;
          let sy = sourceNode.position.y + sH;

          if (isErr) {
            sx = sourceNode.position.x + sW;
            sy = sourceNode.position.y + sH / 2;
          } else if (isFalse) {
            sx = sourceNode.position.x + sW * 0.7;
          } else if (edge.sourceHandle === '1' && sDom && sDom.querySelector('.handle-bottom-true')) {
            sx = sourceNode.position.x + sW * 0.3;
          }

          const tx = targetNode.position.x + tW / 2;
          const ty = targetNode.position.y;

          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          let d = '';
          if (isErr) {
            // Error path starts on right side and steps down
            const midX = sx + 40;
            const midY = (sy + ty) / 2;
            d = \`M \${sx} \${sy} L \${midX} \${sy} L \${midX} \${midY} L \${tx} \${midY} L \${tx} \${ty}\`;
          } else {
            const midY = (sy + ty) / 2;
            d = \`M \${sx} \${sy} L \${sx} \${midY} L \${tx} \${midY} L \${tx} \${ty}\`;
          }

          path.setAttribute('d', d);
          let cls = 'edge-path';
          if (isCross) cls += ' edge-cross';
          else if (isErr) cls += ' edge-err';
          else if (isFalse) cls += ' edge-false';
          path.setAttribute('class', cls);
          svgLayer.appendChild(path);
        });
      });
    }

    function selectNode(node) {
      selectedNodeId = node.id;
      document.querySelectorAll('.tdarr-node').forEach(el => el.classList.remove('selected'));
      const domNode = document.getElementById('dom-node-' + node.id);
      if (domNode) domNode.classList.add('selected');

      const data = node.data || node;
      document.getElementById('drawerNodeName').innerText = data.name || data.pluginName || 'Node';
      document.getElementById('drawerPluginName').innerText = data.pluginName || 'N/A';
      document.getElementById('drawerInputsJson').innerText = JSON.stringify(data.inputs || {}, null, 2);
      document.getElementById('drawerRawJson').innerText = JSON.stringify(node, null, 2);

      drawer.classList.add('open');
    }

    function applyTransform() {
      canvas.style.transform = \`translate(\${transform.x}px, \${transform.y}px) scale(\${transform.scale})\`;
    }

    function fitView() {
      const nodes = (GRAPH_DATA.nodes || []).filter(n => n.type !== 'groupNode');
      if (nodes.length === 0) return;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodes.forEach(n => {
        minX = Math.min(minX, n.position.x);
        minY = Math.min(minY, n.position.y);
        maxX = Math.max(maxX, n.position.x + 240);
        maxY = Math.max(maxY, n.position.y + 60);
      });

      const pad = 80;
      const w = maxX - minX + pad * 2;
      const h = maxY - minY + pad * 2;
      const vw = viewport.clientWidth;
      const vh = viewport.clientHeight;

      const scale = Math.min(Math.max(Math.min(vw / w, vh / h), 0.05), 1.2);
      transform.scale = scale;
      transform.x = (vw - (maxX - minX) * scale) / 2 - minX * scale;
      transform.y = (vh - (maxY - minY) * scale) / 2 - minY * scale;
      applyTransform();
    }

    function setupEvents() {
      viewport.addEventListener('mousedown', (e) => {
        if (e.target.closest('.tdarr-node') || e.target.closest('.canvas-controls') || e.target.closest('.drawer')) return;
        isDragging = true;
        dragStart = { x: e.clientX - transform.x, y: e.clientY - transform.y };
        viewport.classList.add('grabbing');
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        transform.x = e.clientX - dragStart.x;
        transform.y = e.clientY - dragStart.y;
        applyTransform();
      });

      window.addEventListener('mouseup', () => {
        isDragging = false;
        viewport.classList.remove('grabbing');
      });

      viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const factor = 1.1;
        const delta = e.deltaY < 0 ? factor : 1 / factor;
        const newScale = Math.min(Math.max(transform.scale * delta, 0.02), 3.0);
        const rect = viewport.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        transform.x = mouseX - (mouseX - transform.x) * (newScale / transform.scale);
        transform.y = mouseY - (mouseY - transform.y) * (newScale / transform.scale);
        transform.scale = newScale;
        applyTransform();
      }, { passive: false });

      document.getElementById('btnZoomIn').addEventListener('click', () => {
        transform.scale = Math.min(transform.scale * 1.25, 3.0);
        applyTransform();
      });
      document.getElementById('btnZoomOut').addEventListener('click', () => {
        transform.scale = Math.max(transform.scale / 1.25, 0.02);
        applyTransform();
      });
      document.getElementById('btnFit').addEventListener('click', fitView);
      document.getElementById('btnFit2').addEventListener('click', fitView);
      document.getElementById('btnReset').addEventListener('click', () => {
        transform = { x: 50, y: 50, scale: 1 };
        applyTransform();
      });

      document.getElementById('drawerCloseBtn').addEventListener('click', () => {
        drawer.classList.remove('open');
        document.querySelectorAll('.tdarr-node').forEach(el => el.classList.remove('selected'));
      });

      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        document.querySelectorAll('.tdarr-node').forEach(card => card.classList.remove('highlighted'));
        if (!query) return;

        (GRAPH_DATA.nodes || []).forEach(node => {
          if (node.type === 'groupNode') return;
          const data = node.data || node;
          const name = (data.name || '').toLowerCase();
          const plugin = (data.pluginName || '').toLowerCase();
          if (name.includes(query) || plugin.includes(query)) {
            const dom = document.getElementById('dom-node-' + node.id);
            if (dom) dom.classList.add('highlighted');
          }
        });
      });
    }

    function escapeText(str) {
      const div = document.createElement('div');
      div.innerText = str || '';
      return div.innerHTML;
    }

    window.addEventListener('load', init);
    window.addEventListener('resize', fitView);
  </script>
</body>
</html>`;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
