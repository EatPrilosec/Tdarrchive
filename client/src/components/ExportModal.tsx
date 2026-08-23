import React, { useState } from 'react';
import {
  X,
  FileCode,
  Image,
  Globe,
  Archive,
  Layers,
  CheckCircle2,
  Loader2,
  Download,
  Sliders
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { toPng, toSvg, toJpeg } from 'html-to-image';
import { TdarrFlow, CompositeFlowGraph, ViewMode } from '../types/flow';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  flow: TdarrFlow | null;
  flows: TdarrFlow[];
  compositeGraph: CompositeFlowGraph | null;
  viewMode: ViewMode;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  flow,
  flows,
  compositeGraph,
  viewMode
}) => {
  const [activeTab, setActiveTab] = useState<'json' | 'image' | 'html' | 'tree' | 'zip'>(
    viewMode === 'tree' ? 'tree' : 'json'
  );
  const [imageScale, setImageScale] = useState<number>(2);
  const [imageFormat, setImageFormat] = useState<'png' | 'jpeg' | 'svg'>('png');
  const [matchViewport, setMatchViewport] = useState(false);
  const [includeScreenshotsInZip, setIncludeScreenshotsInZip] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  if (!isOpen) return null;

  const triggerSuccessConfetti = () => {
    setExportSuccess(true);
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 }
    });
    setTimeout(() => {
      setExportSuccess(false);
    }, 3000);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    triggerSuccessConfetti();
  };

  // 1. Export Flow JSON
  const handleExportJson = async (exportAll: boolean) => {
    setExporting(true);
    try {
      const res = await fetch('/api/export/json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flow: exportAll ? undefined : flow,
          flows: exportAll ? flows : undefined
        })
      });
      const blob = await res.blob();
      const filename = exportAll
        ? 'tdarr_all_flows.json'
        : `${(flow?.name || 'tdarr_flow').replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
      downloadBlob(blob, filename);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  // 2. Export Image (Screenshot) - Auto-cropped tight bounds with zero dead space and native 1:1 scale
  const handleExportImage = async () => {
    setExporting(true);
    try {
      const flowViewport = document.querySelector('.react-flow__viewport') as HTMLElement;
      const flowContainer = document.querySelector('.react-flow') as HTMLElement;
      if (!flowViewport || !flowContainer) throw new Error('React Flow container not found');

      const safeTitle = (viewMode === 'tree' ? (compositeGraph?.name || 'Tdarr_Flow_Tree_MegaViewer') : (flow?.name || 'tdarr_flow')).replace(/[^a-zA-Z0-9_-]/g, '_');

      // If matching current viewport view (user explicitly checked the box)
      if (matchViewport) {
        const fn = imageFormat === 'svg' ? toSvg : imageFormat === 'jpeg' ? toJpeg : toPng;
        const dataUrl = await fn(flowContainer, {
          backgroundColor: '#161922',
          pixelRatio: imageScale,
          filter: (node) => !node.classList?.contains('react-flow__controls') && !node.classList?.contains('react-flow__minimap')
        });
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${safeTitle}.${imageFormat}`;
        a.click();
        triggerSuccessConfetti();
        return;
      }

      // DEFAULT: Auto-crop to exact flow bounds with 0 dead space and 100% native scale!
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      if (viewMode === 'tree' && compositeGraph) {
        (compositeGraph.nodes || []).forEach(n => {
          const isGroup = n.type === 'groupNode';
          const px = n.position?.x ?? 0;
          const py = n.position?.y ?? 0;
          const w = isGroup ? (n.style?.width ?? 300) : 230;
          const h = isGroup ? (n.style?.height ?? 150) : 55;

          if (!isGroup && n.parentId) {
            const parent = compositeGraph.nodes.find(p => p.id === n.parentId);
            const parentX = parent?.position?.x ?? 0;
            const parentY = parent?.position?.y ?? 0;
            minX = Math.min(minX, parentX + px);
            minY = Math.min(minY, parentY + py);
            maxX = Math.max(maxX, parentX + px + w);
            maxY = Math.max(maxY, parentY + py + h);
          } else {
            minX = Math.min(minX, px);
            minY = Math.min(minY, py);
            maxX = Math.max(maxX, px + w);
            maxY = Math.max(maxY, py + h);
          }
        });
      } else if (flow) {
        const plugins = flow.flowPlugins || flow.nodes || [];
        plugins.forEach((p, idx) => {
          const px = p.position?.x ?? (100 + (idx % 3) * 260);
          const py = p.position?.y ?? (120 + Math.floor(idx / 3) * 120);
          minX = Math.min(minX, px);
          minY = Math.min(minY, py);
          maxX = Math.max(maxX, px + 240);
          maxY = Math.max(maxY, py + 55);
        });
      }

      if (!isFinite(minX) || !isFinite(minY)) {
        minX = 0; minY = 0; maxX = 1200; maxY = 800;
      }

      // Add a clean, consistent 32px padding around the flow
      const pad = 32;
      const cropWidth = Math.ceil(maxX - minX + pad * 2);
      const cropHeight = Math.ceil(maxY - minY + pad * 2);

      const fn = imageFormat === 'svg' ? toSvg : imageFormat === 'jpeg' ? toJpeg : toPng;
      const dataUrl = await fn(flowViewport, {
        backgroundColor: '#161922',
        width: cropWidth,
        height: cropHeight,
        style: {
          width: `${cropWidth}px`,
          height: `${cropHeight}px`,
          transform: `translate(${-(minX - pad)}px, ${-(minY - pad)}px) scale(1)`
        },
        pixelRatio: imageScale,
        filter: (node) => {
          return !node.classList?.contains('react-flow__controls') && !node.classList?.contains('react-flow__minimap');
        }
      });

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${safeTitle}.${imageFormat}`;
      a.click();
      triggerSuccessConfetti();
    } catch (err) {
      console.error('Image capture error:', err);
      // Fallback
      try {
        const flowContainer = document.querySelector('.react-flow') as HTMLElement;
        if (flowContainer) {
          const fn = imageFormat === 'svg' ? toSvg : imageFormat === 'jpeg' ? toJpeg : toPng;
          const dataUrl = await fn(flowContainer, {
            backgroundColor: '#161922',
            pixelRatio: imageScale
          });
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = `flow_screenshot.${imageFormat}`;
          a.click();
          triggerSuccessConfetti();
        }
      } catch (fallbackErr) {
        console.error('Fallback export failed:', fallbackErr);
      }
    } finally {
      setExporting(false);
    }
  };

  // 3. Export Single Flow Portable HTML
  const handleExportHtml = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/export/html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flow, isTreeMode: false })
      });
      const blob = await res.blob();
      const filename = `${(flow?.name || 'tdarr_flow_viewer').replace(/[^a-zA-Z0-9_-]/g, '_')}.html`;
      downloadBlob(blob, filename);
      triggerSuccessConfetti();
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  // 4. Export Flow Tree Mega-Viewer HTML
  const handleExportTreeHtml = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/export/html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compositeGraph: compositeGraph || undefined,
          flows,
          isTreeMode: true,
          title: compositeGraph?.name || 'Tdarr Flow Tree Mega-Viewer'
        })
      });
      const blob = await res.blob();
      const filename = `Tdarr_Flow_Tree_MegaViewer.html`;
      downloadBlob(blob, filename);
      triggerSuccessConfetti();
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  // 5. Export Complete ZIP Bundle
  const handleExportZip = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/export/zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flows,
          includeImages: includeScreenshotsInZip
        })
      });
      const blob = await res.blob();
      downloadBlob(blob, 'tdarr_archive_bundle.zip');
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-[#141923] border border-[#2d3748] rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#21262d] bg-[#181f2c] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-cyan-500/20 to-sky-500/20 rounded-lg border border-cyan-500/30 text-cyan-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">Export Tdarr Flow Hub</h2>
              <p className="text-[11px] text-slate-400">
                Target: <span className="text-cyan-300 font-semibold">{viewMode === 'tree' ? 'Composite Flow Tree' : flow?.name}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-[#21262d] rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Export Mode Tabs */}
        <div className="grid grid-cols-5 border-b border-[#21262d] bg-[#0d1117] text-xs font-semibold">
          <button
            onClick={() => setActiveTab('json')}
            className={`py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'json'
                ? 'border-sky-400 text-sky-400 bg-[#161c28]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            JSON
          </button>

          <button
            onClick={() => setActiveTab('image')}
            className={`py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'image'
                ? 'border-sky-400 text-sky-400 bg-[#161c28]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Image className="w-3.5 h-3.5" />
            Screenshot
          </button>

          <button
            onClick={() => setActiveTab('html')}
            className={`py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'html'
                ? 'border-sky-400 text-sky-400 bg-[#161c28]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            HTML Viewer
          </button>

          <button
            onClick={() => setActiveTab('tree')}
            className={`py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'tree'
                ? 'border-cyan-400 text-cyan-400 bg-[#0e3a47]/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            Flow Tree HTML
          </button>

          <button
            onClick={() => setActiveTab('zip')}
            className={`py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'zip'
                ? 'border-sky-400 text-sky-400 bg-[#161c28]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            Full ZIP
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 text-xs min-h-[260px] flex flex-col justify-between">
          {/* TAB 1: JSON */}
          {activeTab === 'json' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-sky-400" />
                  Tdarr Importable JSON Template
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  Generates a clean JSON file formatted specifically for Tdarr. You can paste this directly into Tdarr's <strong>"Import JSON Template"</strong> box or distribute it to the community.
                </p>
              </div>

              <div className="bg-[#0b0e14] border border-[#21262d] rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-slate-300 font-mono text-[11px]">
                  <span>Target Flow:</span>
                  <span className="text-sky-400 font-bold">{flow?.name || 'None'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300 font-mono text-[11px]">
                  <span>Nodes / Plugins:</span>
                  <span>{(flow?.flowPlugins || flow?.nodes || []).length} items</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => handleExportJson(false)}
                  disabled={!flow || exporting}
                  className="flex-1 py-2.5 px-4 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  Export Current Flow JSON
                </button>
                <button
                  onClick={() => handleExportJson(true)}
                  disabled={flows.length === 0 || exporting}
                  className="py-2.5 px-4 bg-[#1f2633] hover:bg-[#283243] text-slate-200 border border-[#303c4f] font-semibold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  Export All ({flows.length}) Flows JSON
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Image Screenshot */}
          {activeTab === 'image' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <Image className="w-4 h-4 text-sky-400" />
                  High-Resolution Flow Screenshot
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  Renders the complete diagram using Tdarr's exact theme, node categorization, and handle connector curves without cropping.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-[#0b0e14] border border-[#21262d] rounded-lg p-3.5">
                {/* Resolution */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Sliders className="w-3 h-3 text-slate-400" />
                    Resolution Scaling
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[1, 2, 4].map((scale) => (
                      <button
                        key={scale}
                        type="button"
                        onClick={() => setImageScale(scale)}
                        className={`py-1.5 text-center rounded-md font-mono text-[11px] font-bold border transition-colors ${
                          imageScale === scale
                            ? 'bg-sky-500 text-slate-950 border-sky-400'
                            : 'bg-[#161c28] text-slate-300 border-[#2d3748] hover:border-slate-400'
                        }`}
                      >
                        {scale}x {scale === 4 ? '(4K)' : scale === 2 ? '(HD)' : ''}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Format */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">File Format</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['png', 'jpeg', 'svg'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setImageFormat(fmt)}
                        className={`py-1.5 text-center rounded-md font-mono text-[11px] font-bold uppercase border transition-colors ${
                          imageFormat === fmt
                            ? 'bg-sky-500 text-slate-950 border-sky-400'
                            : 'bg-[#161c28] text-slate-300 border-[#2d3748] hover:border-slate-400'
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Viewport vs Auto-Crop Option */}
              <label className="flex items-center gap-2.5 text-slate-300 text-[11px] cursor-pointer select-none bg-[#0b0e14] border border-[#21262d] rounded-lg p-2.5 hover:border-slate-500 transition-colors">
                <input
                  type="checkbox"
                  checked={matchViewport}
                  onChange={(e) => setMatchViewport(e.target.checked)}
                  className="rounded border-[#2d3748] bg-[#161c28] text-sky-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                />
                <span className="leading-tight">
                  Match current Web UI zoom & pan <span className="text-slate-400 font-normal">(Default: OFF &mdash; auto-crops full flow tightly with 0 dead space and 100% native scale)</span>
                </span>
              </label>

              <div className="pt-1">
                <button
                  onClick={handleExportImage}
                  disabled={exporting}
                  className="w-full py-2.5 px-4 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  Capture & Download {imageFormat.toUpperCase()} ({imageScale}x DPI)
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Portable HTML */}
          {activeTab === 'html' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-sky-400" />
                  Standalone Portable HTML Viewer
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  Creates a single, self-contained <code>.html</code> file with <strong>zero external dependencies</strong>. Anyone can open it in any web browser to interactively zoom, pan, search nodes, view minimap, and inspect plugin parameters offline.
                </p>
              </div>

              <div className="bg-[#0b0e14] border border-[#21262d] rounded-lg p-3 space-y-1.5 text-slate-300 text-[11px]">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>100% Offline Compatible & Air-Gapped Ready</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Interactive Pan & Zoom + Minimap Viewport</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Click-to-Inspect Node JSON Drawer</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleExportHtml}
                  disabled={!flow || exporting}
                  className="w-full py-2.5 px-4 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  Download Standalone HTML Viewer
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: Flow Tree HTML */}
          {activeTab === 'tree' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-cyan-300 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Flow Tree Mega-Viewer (HTML)
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  Stitches all flows that branch into other flows (via <code>goToFlow</code>) into <strong>one unified interactive mega-flow diagram</strong>. Includes visual cluster bounding boxes, colored group tags, and cross-flow animated paths.
                </p>
              </div>

              <div className="bg-[#0b0e14] border border-cyan-800/40 rounded-lg p-3.5 space-y-2">
                <div className="flex items-center justify-between text-slate-300 font-mono text-[11px]">
                  <span>Participating Flows:</span>
                  <span className="text-cyan-400 font-bold">{flows.length} Flows</span>
                </div>
                <div className="flex items-center justify-between text-slate-300 font-mono text-[11px]">
                  <span>Total Merged Nodes:</span>
                  <span>{compositeGraph?.nodes.length || 0} Nodes</span>
                </div>
                <div className="flex items-center justify-between text-slate-300 font-mono text-[11px]">
                  <span>Subflow Cluster Boundaries:</span>
                  <span>{compositeGraph?.clusters.length || 0} Clusters</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleExportTreeHtml}
                  disabled={flows.length === 0 || exporting}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-slate-950 font-extrabold rounded-lg transition-colors shadow-lg shadow-cyan-950/60 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  Export Composite Flow Tree HTML
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: ZIP Archive */}
          {activeTab === 'zip' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <Archive className="w-4 h-4 text-sky-400" />
                  Complete Archival ZIP Package
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  Downloads a complete zip archive containing all individual flow JSON templates, standalone HTML viewers, Flow Tree Mega-Viewer, and screenshots.
                </p>
              </div>

              <div className="bg-[#0b0e14] border border-[#21262d] rounded-lg p-3.5 space-y-2.5">
                <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeScreenshotsInZip}
                    onChange={(e) => setIncludeScreenshotsInZip(e.target.checked)}
                    className="rounded border-[#2d3748] text-sky-500 focus:ring-sky-500 bg-[#161c28]"
                  />
                  <span>Include HD screenshot images for each flow inside ZIP</span>
                </label>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleExportZip}
                  disabled={flows.length === 0 || exporting}
                  className="w-full py-2.5 px-4 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  Download Complete Archive (.ZIP)
                </button>
              </div>
            </div>
          )}

          {/* Exporting Loading Overlay */}
          {exporting && (
            <div className="flex items-center justify-center gap-2 text-sky-400 pt-3">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating and packaging export...</span>
            </div>
          )}

          {exportSuccess && (
            <div className="flex items-center justify-center gap-2 text-emerald-400 font-semibold pt-3 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>Export downloaded successfully!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
