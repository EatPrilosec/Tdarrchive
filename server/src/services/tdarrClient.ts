import { TdarrFlow } from '../types/tdarr.js';

export interface TdarrConnectionConfig {
  url: string;
  apiKey?: string;
  timeoutMs?: number;
}

export interface TdarrConnectionStatus {
  success: boolean;
  message: string;
  serverVersion?: string;
  serverUrl: string;
  totalFlows?: number;
  latencyMs?: number;
}

export class TdarrClient {
  private cleanUrl(url: string): string {
    let clean = url.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `http://${clean}`;
    }
    return clean.replace(/\/+$/, '');
  }

  private getHeaders(apiKey?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (apiKey && apiKey.trim()) {
      headers['x-api-key'] = apiKey.trim();
    }
    return headers;
  }

  public async testConnection(config: TdarrConnectionConfig): Promise<TdarrConnectionStatus> {
    const baseUrl = this.cleanUrl(config.url);
    const headers = this.getHeaders(config.apiKey);
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs || 8000);

      // Attempt 1: Fetch status endpoint (GET /api/v2/status in modern Tdarr)
      let serverVersion = 'Unknown';
      try {
        const statusRes = await fetch(`${baseUrl}/api/v2/status`, {
          method: 'GET',
          headers,
          signal: controller.signal
        });
        if (statusRes.ok) {
          const json: any = await statusRes.json();
          if (json?.version || json?.data?.version) {
            serverVersion = json.version || json.data.version;
          }
        }
      } catch {
        // Continue to cruddb test
      }

      // Attempt 2: Test cruddb access for FlowsJSONDB (or fallback FlowJSONDB)
      let crudRes = await fetch(`${baseUrl}/api/v2/cruddb`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          data: {
            collection: 'FlowsJSONDB',
            mode: 'getAll'
          }
        }),
        signal: controller.signal
      });

      if (!crudRes.ok && crudRes.status === 400) {
        // Fallback for older Tdarr versions with FlowJSONDB
        crudRes = await fetch(`${baseUrl}/api/v2/cruddb`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            data: {
              collection: 'FlowJSONDB',
              mode: 'getAll'
            }
          }),
          signal: controller.signal
        });
      }

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      if (crudRes.ok) {
        const flowsData: any = await crudRes.json();
        const flowsCount = Array.isArray(flowsData)
          ? flowsData.length
          : (flowsData?.data && Array.isArray(flowsData.data) ? flowsData.data.length : 0);

        return {
          success: true,
          message: `Connected successfully to Tdarr! Found ${flowsCount} flow(s).`,
          serverUrl: baseUrl,
          serverVersion,
          totalFlows: flowsCount,
          latencyMs
        };
      }

      if (crudRes.status === 401 || crudRes.status === 403) {
        return {
          success: false,
          message: 'Authentication failed. Please verify your Tdarr API Key.',
          serverUrl: baseUrl,
          latencyMs
        };
      }

      const errorText = await crudRes.text().catch(() => '');
      return {
        success: false,
        message: `Tdarr returned status ${crudRes.status}: ${errorText || crudRes.statusText}`,
        serverUrl: baseUrl,
        latencyMs
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const errorMsg = err.name === 'AbortError'
        ? 'Connection timed out after 8 seconds. Please check IP and port.'
        : (err.message || 'Unknown network error');
      
      return {
        success: false,
        message: `Failed to connect to ${baseUrl}: ${errorMsg}`,
        serverUrl: baseUrl,
        latencyMs
      };
    }
  }

  public async fetchFlows(config: TdarrConnectionConfig): Promise<TdarrFlow[]> {
    const baseUrl = this.cleanUrl(config.url);
    const headers = this.getHeaders(config.apiKey);

    try {
      let response = await fetch(`${baseUrl}/api/v2/cruddb`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          data: {
            collection: 'FlowsJSONDB',
            mode: 'getAll'
          }
        })
      });

      if (!response.ok && response.status === 400) {
        response = await fetch(`${baseUrl}/api/v2/cruddb`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            data: {
              collection: 'FlowJSONDB',
              mode: 'getAll'
            }
          })
        });
      }

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`Failed to fetch flows from Tdarr (${response.status} ${response.statusText}): ${errText}`);
      }

      const data: any = await response.json();
      let rawList: any[] = [];
      if (Array.isArray(data)) {
        rawList = data;
      } else if (data?.data && Array.isArray(data.data)) {
        rawList = data.data;
      } else if (data && typeof data === 'object') {
        rawList = Object.values(data);
      }

      return rawList.map((flow) => this.normalizeFlow(flow));
    } catch (err: any) {
      throw new Error(`Error communicating with Tdarr server at ${baseUrl}: ${err.message}`);
    }
  }

  public async fetchFlowById(config: TdarrConnectionConfig, flowId: string): Promise<TdarrFlow | null> {
    const baseUrl = this.cleanUrl(config.url);
    const headers = this.getHeaders(config.apiKey);

    try {
      let response = await fetch(`${baseUrl}/api/v2/cruddb`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          data: {
            collection: 'FlowsJSONDB',
            mode: 'getById',
            docID: flowId
          }
        })
      });

      if (!response.ok && response.status === 400) {
        response = await fetch(`${baseUrl}/api/v2/cruddb`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            data: {
              collection: 'FlowJSONDB',
              mode: 'getById',
              docID: flowId
            }
          })
        });
      }

      if (!response.ok) {
        return null;
      }

      const data: any = await response.json();
      const rawFlow = data?.data || data;
      if (!rawFlow || !rawFlow._id) {
        return null;
      }

      return this.normalizeFlow(rawFlow);
    } catch (err: any) {
      throw new Error(`Error fetching flow ${flowId}: ${err.message}`);
    }
  }

  public normalizeFlow(raw: any): TdarrFlow {
    const flowId = raw._id || raw.id || `flow-${Math.random().toString(36).substring(2, 9)}`;
    const name = raw.name || raw.flowName || raw.title || `Flow (${flowId})`;
    const description = raw.description || raw.comment || '';
    const templateVersion = raw.templateVersion || raw.version || '2.0.0';

    // Normalize plugins / nodes
    const pluginsRaw = raw.flowPlugins || raw.nodes || raw.plugins || [];
    const flowPlugins = Array.isArray(pluginsRaw) ? pluginsRaw.map((p: any, idx: number) => {
      const pId = p.id || `node-${idx}`;
      const pName = p.name || p.pluginName || p.label || 'Plugin Node';
      const pluginName = p.pluginName || p.type || p.id || 'customPlugin';
      const inputs = { ...(p.inputsDB || {}), ...(p.inputs || {}) };
      
      // Auto-categorize based on plugin name or properties
      let category = p.category || p.sourceType || 'action';
      const lower = pluginName.toLowerCase();
      if (lower.includes('input') || lower.includes('source')) {
        category = 'input';
      } else if (lower.includes('check') || lower.includes('filter') || lower.includes('condition') || lower.includes('has')) {
        category = 'filter';
      } else if (lower.includes('gotoflow') || lower.includes('subflow') || lower.includes('nextflow')) {
        category = 'flow';
      } else if (lower.includes('ffmpeg') || lower.includes('handbrake') || lower.includes('transcode') || lower.includes('encode')) {
        category = 'transcode';
      } else if (lower.includes('notify') || lower.includes('discord') || lower.includes('webhook') || lower.includes('email')) {
        category = 'notify';
      } else if (lower.includes('replace') || lower.includes('move') || lower.includes('delete') || lower.includes('rename')) {
        category = 'file';
      }

      return {
        ...p,
        id: pId,
        name: pName,
        pluginName,
        category,
        position: p.position || { x: 100 + (idx % 4) * 320, y: 150 + Math.floor(idx / 4) * 200 },
        inputs,
        inputsDB: inputs
      };
    }) : [];

    // Normalize edges
    const edgesRaw = raw.flowEdges || raw.edges || raw.connections || [];
    const flowEdges = Array.isArray(edgesRaw) ? edgesRaw.map((e: any, idx: number) => {
      return {
        ...e,
        id: e.id || `edge-${idx}-${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? (e.sourceOutput || null),
        targetHandle: e.targetHandle ?? (e.targetInput || null),
        label: e.label || (e.sourceHandle === 'true' ? 'True' : e.sourceHandle === 'false' ? 'False' : undefined)
      };
    }) : [];

    return {
      ...raw,
      _id: flowId,
      name,
      description,
      templateVersion,
      flowPlugins,
      flowEdges,
      nodes: flowPlugins,
      edges: flowEdges
    };
  }
}
