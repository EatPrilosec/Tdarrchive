import React, { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { FolderGit2, Layers, GripVertical } from 'lucide-react';

export const GroupNode: React.FC<NodeProps> = memo(({ data, selected }) => {
  const color = (data.color as string) || '#06b6d4';
  const flowName = (data.flowName as string) || 'Subflow Group';
  const isRoot = Boolean(data.isRoot);
  const nodeCount = Number(data.nodeCount) || 0;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderColor: color,
        borderWidth: selected ? 2.5 : 2,
        borderStyle: 'dashed',
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        boxShadow: selected ? `0 0 24px ${color}50` : '0 8px 30px rgba(0,0,0,0.5)',
        borderRadius: 16
      }}
      className="relative group transition-all"
    >
      {/* Draggable Cluster Header Badge */}
      <div
        style={{
          backgroundColor: color,
          top: -14,
          left: 20,
        }}
        className="flow-drag-handle absolute px-3 py-1.5 rounded-lg text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-black/80 cursor-grab active:cursor-grabbing hover:brightness-110 select-none z-30 transition-transform active:scale-95"
        title="Drag to reposition this entire flow"
      >
        <GripVertical className="w-3.5 h-3.5 opacity-80" />
        {isRoot ? (
          <Layers className="w-3.5 h-3.5" />
        ) : (
          <FolderGit2 className="w-3.5 h-3.5" />
        )}
        <span className="tracking-wide">{flowName}</span>
        <span className="bg-black/30 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
          {nodeCount} nodes
        </span>
        {isRoot && (
          <span className="bg-amber-400 text-black text-[9px] uppercase px-1.5 py-0.2 rounded font-black">
            Root
          </span>
        )}
      </div>
    </div>
  );
});
