import React, { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { FolderGit2, Layers } from 'lucide-react';

export const GroupNode: React.FC<NodeProps> = memo(({ data }) => {
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
        borderWidth: 2,
        borderStyle: 'dashed',
        backgroundColor: 'rgba(15, 23, 42, 0.35)',
        backdropFilter: 'blur(4px)'
      }}
      className="rounded-2xl relative pointer-events-none"
    >
      {/* Cluster Header Badge */}
      <div
        style={{
          backgroundColor: color,
          top: -14,
          left: 24,
        }}
        className="absolute px-3 py-1 rounded-lg text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-black/60 pointer-events-auto"
      >
        {isRoot ? (
          <Layers className="w-3.5 h-3.5" />
        ) : (
          <FolderGit2 className="w-3.5 h-3.5" />
        )}
        <span>{flowName}</span>
        <span className="bg-black/30 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
          {nodeCount} nodes
        </span>
        {isRoot && (
          <span className="bg-amber-500/80 text-black text-[9px] uppercase px-1.5 py-0.2 rounded font-black">
            Root
          </span>
        )}
      </div>
    </div>
  );
});
