import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  MessageSquare,
  HelpCircle,
  Cog,
  ArrowRight,
  AlertTriangle,
  Play
} from 'lucide-react';

export const TdarrNode: React.FC<NodeProps> = memo(({ data, selected }) => {
  const pluginName = ((data.pluginName as string) || '').toLowerCase();
  const name = (data.name as string) || (data.pluginName as string) || 'Plugin';
  const nameLower = name.toLowerCase();

  // 1. Comment Node (Solid blue rounded pill)
  const isComment = pluginName === 'comment' || nameLower.startsWith('comment:');
  
  // 2. Input / Start Node (Purple / Magenta outline)
  const isInput = pluginName === 'inputfile' || pluginName === 'start' || nameLower.includes('input file');

  // 3. Fail / Error Node (Red outline with warning triangle)
  const isFail = pluginName === 'failflow' || pluginName === 'onflowerror' || nameLower.includes('fail');

  // 4. Go To Flow Node (Green / Emerald outline with arrow)
  const isGoTo = pluginName === 'gotoflow' || nameLower.includes('go to');

  // 5. Condition / Check Node (Amber outline with ?)
  const isCheck = pluginName.startsWith('check') ||
                  pluginName.includes('decider') ||
                  pluginName.includes('filter') ||
                  pluginName === 'comparefilesizeratio' ||
                  name.endsWith('?') ||
                  nameLower.includes('is mkv') ||
                  nameLower.includes('show or movie');

  // 6. Resolution Checker (9 outputs)
  const isMultiRes = pluginName === 'checkvideoresolution';

  // Determine card style & icon
  let borderColor = '#22c55e'; // default action green
  let boxShadow = '0 0 8px rgba(34, 197, 94, 0.2)';
  let icon = <Cog className="w-3.5 h-3.5 text-emerald-400" />;

  if (isComment) {
    // Comment pill style
    return (
      <div
        className={`px-3 py-1 rounded-full text-xs font-semibold text-white flex items-center gap-1.5 shadow-md select-none transition-all ${
          selected ? 'ring-2 ring-sky-400 scale-105' : ''
        }`}
        style={{
          backgroundColor: '#1d4ed8',
          border: '1px solid #3b82f6',
          boxShadow: '0 4px 10px rgba(29, 78, 216, 0.4)',
          minWidth: '100px',
          maxWidth: '300px'
        }}
      >
        {/* Top Target Handle */}
        <Handle
          type="target"
          position={Position.Top}
          isConnectable={false}
          style={{
            background: '#77DD77',
            width: 7,
            height: 7,
            border: '1.5px solid #19181e',
            top: -4
          }}
        />

        <MessageSquare className="w-3 h-3 text-sky-200 shrink-0" />
        <span className="truncate leading-tight">{name}</span>

        {/* Bottom Output Handle */}
        <Handle
          type="source"
          position={Position.Bottom}
          id="1"
          isConnectable={false}
          style={{
            background: '#77DD77',
            width: 7,
            height: 7,
            border: '1.5px solid #19181e',
            bottom: -4
          }}
        />
      </div>
    );
  }

  if (isInput) {
    borderColor = '#a855f7';
    boxShadow = '0 0 10px rgba(168, 85, 247, 0.35)';
    icon = <Play className="w-3.5 h-3.5 text-purple-400 fill-purple-400/20" />;
  } else if (isFail) {
    borderColor = '#ef4444';
    boxShadow = '0 0 12px rgba(239, 68, 68, 0.4)';
    icon = <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />;
  } else if (isGoTo) {
    borderColor = '#10b981';
    boxShadow = '0 0 10px rgba(16, 185, 129, 0.35)';
    icon = <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />;
  } else if (isCheck) {
    borderColor = '#f59e0b';
    boxShadow = '0 0 10px rgba(245, 158, 11, 0.35)';
    icon = <HelpCircle className="w-3.5 h-3.5 text-amber-400" />;
  } else if (pluginName.includes('ffmpeg')) {
    borderColor = '#06b6d4';
    boxShadow = '0 0 10px rgba(6, 182, 212, 0.3)';
    icon = <Cog className="w-3.5 h-3.5 text-cyan-400" />;
  }

  return (
    <div
      style={{
        backgroundColor: '#19181e',
        borderColor: selected ? '#38bdf8' : borderColor,
        borderWidth: selected ? '2px' : '1.5px',
        borderStyle: 'solid',
        boxShadow: selected ? '0 0 14px rgba(56, 189, 248, 0.7)' : boxShadow,
        borderRadius: '5px',
        padding: '5px 9px',
        minWidth: '130px',
        maxWidth: '280px',
        opacity: data.fpEnabled === false ? 0.5 : 1
      }}
      className="relative flex items-center gap-2 select-none cursor-pointer transition-all"
    >
      {/* Top Target Handle (Incoming) */}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={false}
        style={{
          background: '#77DD77',
          width: 7,
          height: 7,
          border: '1.5px solid #19181e',
          top: -4
        }}
      />

      {/* Icon Badge */}
      <div className="shrink-0 flex items-center justify-center">
        {icon}
      </div>

      {/* Node Title Text */}
      <div className="text-[11px] font-medium text-slate-100 truncate leading-tight flex-1">
        {pluginName.includes('ffmpegcommand') && !name.includes('FFmpeg') ? (
          <div>
            <div className="text-[9px] text-slate-400 uppercase tracking-tight">FFmpeg Command</div>
            <div>{name}</div>
          </div>
        ) : (
          name
        )}
      </div>

      {/* Right Error Handle (err1) - Exactly matching Tdarr source code GUe */}
      <Handle
        type="source"
        position={Position.Right}
        id="err1"
        isConnectable={false}
        title="Error Output (err1)"
        style={{
          background: '#FF5733',
          width: 7,
          height: 7,
          border: '1.5px solid #19181e',
          right: -4,
          top: '50%',
          transform: 'translateY(-50%)'
        }}
      />

      {/* Bottom Source Handles */}
      {isMultiRes ? (
        // 9-output resolution checker
        <>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <Handle
              key={num}
              type="source"
              position={Position.Bottom}
              id={String(num)}
              isConnectable={false}
              style={{
                left: `${(num / 10) * 100}%`,
                background: '#77DD77',
                width: 7,
                height: 7,
                border: '1.5px solid #19181e',
                bottom: -4
              }}
            />
          ))}
        </>
      ) : isCheck ? (
        // Condition check: Output 1 (True = Green, left 30%), Output 2 (False = Red, right 70%)
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="1"
            isConnectable={false}
            title="True (1)"
            style={{
              left: '30%',
              background: '#77DD77',
              width: 7,
              height: 7,
              border: '1.5px solid #19181e',
              bottom: -4
            }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="2"
            isConnectable={false}
            title="False (2)"
            style={{
              left: '70%',
              background: '#FF6961',
              width: 7,
              height: 7,
              border: '1.5px solid #19181e',
              bottom: -4
            }}
          />
        </>
      ) : (
        // Standard Action: Output 1 (Center 50%)
        <Handle
          type="source"
          position={Position.Bottom}
          id="1"
          isConnectable={false}
          style={{
            left: '50%',
            background: '#77DD77',
            width: 7,
            height: 7,
            border: '1.5px solid #19181e',
            bottom: -4
          }}
        />
      )}
    </div>
  );
});
