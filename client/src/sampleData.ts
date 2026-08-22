import { TdarrFlow } from './types/flow';

export const CLIENT_SAMPLE_FLOWS: TdarrFlow[] = [
  {
    _id: 'flow-master-pipeline',
    name: 'Master Video Ingestion & Triage Pipeline',
    description: 'Root flow that inspects incoming media, filters out already-processed files, and branches into sub-flows using GoToFlow.',
    templateVersion: '2.0.0',
    flowPlugins: [
      {
        id: 'node-input-1',
        name: 'Input File',
        pluginName: 'inputFile',
        category: 'input',
        description: 'Receives the source video file from Tdarr library scan',
        position: { x: 80, y: 220 },
        inputs: { cacheFile: false }
      },
      {
        id: 'node-check-codec',
        name: 'Check Video Codec',
        pluginName: 'checkVideoCodec',
        category: 'filter',
        description: 'Checks if video stream is HEVC or AV1',
        position: { x: 380, y: 220 },
        inputs: { codecs: 'hevc,av1,vp9', condition: 'includes' }
      },
      {
        id: 'node-check-res',
        name: 'Check Resolution (4K / 1080p)',
        pluginName: 'checkResolution',
        category: 'filter',
        description: 'Inspects height/width to determine transcoding tier',
        position: { x: 720, y: 120 },
        inputs: { targetResolution: '4k', strictMatch: false }
      },
      {
        id: 'node-goto-4k-transcode',
        name: 'Go To: 4K Transcode Flow',
        pluginName: 'goToFlow',
        category: 'flow',
        description: 'Redirects processing to the high-bitrate 4K NVENC sub-flow',
        position: { x: 1080, y: 80 },
        inputs: { flowId: 'flow-4k-transcode', flowName: '4K NVENC Heavy Transcode Subflow' }
      },
      {
        id: 'node-goto-1080p-transcode',
        name: 'Go To: 1080p Standard Flow',
        pluginName: 'goToFlow',
        category: 'flow',
        description: 'Redirects processing to standard 1080p CPU/GPU sub-flow',
        position: { x: 1080, y: 220 },
        inputs: { flowId: 'flow-1080p-transcode', flowName: '1080p Efficient AV1/HEVC Subflow' }
      },
      {
        id: 'node-goto-audio-subflow',
        name: 'Go To: Audio Cleanup Flow',
        pluginName: 'goToFlow',
        category: 'flow',
        description: 'If video codec is already optimal, route directly to audio cleanup',
        position: { x: 720, y: 360 },
        inputs: { flowId: 'flow-audio-cleanup', flowName: 'Audio Normalization & Subtitle Cleanup' }
      }
    ],
    flowEdges: [
      { id: 'e1', source: 'node-input-1', target: 'node-check-codec', sourceHandle: 'output', targetHandle: 'input' },
      { id: 'e2', source: 'node-check-codec', target: 'node-goto-audio-subflow', sourceHandle: 'true', targetHandle: 'input', label: 'Codec OK' },
      { id: 'e3', source: 'node-check-codec', target: 'node-check-res', sourceHandle: 'false', targetHandle: 'input', label: 'Needs Transcode' },
      { id: 'e4', source: 'node-check-res', target: 'node-goto-4k-transcode', sourceHandle: 'true', targetHandle: 'input', label: '4K UHD' },
      { id: 'e5', source: 'node-check-res', target: 'node-goto-1080p-transcode', sourceHandle: 'false', targetHandle: 'input', label: '≤ 1080p' }
    ]
  },
  {
    _id: 'flow-4k-transcode',
    name: '4K NVENC Heavy Transcode Subflow',
    description: 'Specialized 10-bit HDR transcode pipeline using GPU hardware acceleration.',
    templateVersion: '2.0.0',
    flowPlugins: [
      { id: 'n4k-entry', name: 'Input File (From Parent)', pluginName: 'inputFile', category: 'input', position: { x: 80, y: 180 }, inputs: {} },
      { id: 'n4k-check-hdr', name: 'Check HDR / Dolby Vision', pluginName: 'checkHdr', category: 'filter', position: { x: 380, y: 180 }, inputs: { preserveMetadata: true } },
      { id: 'n4k-ffmpeg-nvenc', name: 'FFmpeg NVENC 10-Bit Transcode', pluginName: 'ffmpegCommandCustom', category: 'transcode', position: { x: 720, y: 120 }, inputs: { encoder: 'hevc_nvenc', cq: 22, pix_fmt: 'p010le' } },
      { id: 'n4k-ffmpeg-cpu', name: 'FFmpeg CPU SVT-AV1 Transcode', pluginName: 'ffmpegCommandCustom', category: 'transcode', position: { x: 720, y: 280 }, inputs: { encoder: 'libsvtav1', crf: 24 } },
      { id: 'n4k-goto-audio', name: 'Go To: Audio Cleanup Flow', pluginName: 'goToFlow', category: 'flow', position: { x: 1080, y: 200 }, inputs: { flowId: 'flow-audio-cleanup', flowName: 'Audio Normalization & Subtitle Cleanup' } }
    ],
    flowEdges: [
      { id: 'e4k-1', source: 'n4k-entry', target: 'n4k-check-hdr', sourceHandle: 'output', targetHandle: 'input' },
      { id: 'e4k-2', source: 'n4k-check-hdr', target: 'n4k-ffmpeg-nvenc', sourceHandle: 'true', targetHandle: 'input', label: 'HDR / DoVi' },
      { id: 'e4k-3', source: 'n4k-check-hdr', target: 'n4k-ffmpeg-cpu', sourceHandle: 'false', targetHandle: 'input', label: 'SDR' },
      { id: 'e4k-4', source: 'n4k-ffmpeg-nvenc', target: 'n4k-goto-audio', sourceHandle: 'output', targetHandle: 'input' },
      { id: 'e4k-5', source: 'n4k-ffmpeg-cpu', target: 'n4k-goto-audio', sourceHandle: 'output', targetHandle: 'input' }
    ]
  },
  {
    _id: 'flow-1080p-transcode',
    name: '1080p Efficient AV1/HEVC Subflow',
    description: 'High efficiency transcode for standard definition and 1080p content.',
    templateVersion: '2.0.0',
    flowPlugins: [
      { id: 'n1080-entry', name: 'Input File (From Parent)', pluginName: 'inputFile', category: 'input', position: { x: 80, y: 150 }, inputs: {} },
      { id: 'n1080-handbrake', name: 'HandBrake HEVC QSV / NVENC', pluginName: 'handbrakeCustomArguments', category: 'transcode', position: { x: 400, y: 150 }, inputs: { quality: 20, autocrop: true } },
      { id: 'n1080-goto-audio', name: 'Go To: Audio Cleanup Flow', pluginName: 'goToFlow', category: 'flow', position: { x: 740, y: 150 }, inputs: { flowId: 'flow-audio-cleanup', flowName: 'Audio Normalization & Subtitle Cleanup' } }
    ],
    flowEdges: [
      { id: 'e1080-1', source: 'n1080-entry', target: 'n1080-handbrake', sourceHandle: 'output', targetHandle: 'input' },
      { id: 'e1080-2', source: 'n1080-handbrake', target: 'n1080-goto-audio', sourceHandle: 'output', targetHandle: 'input' }
    ]
  },
  {
    _id: 'flow-audio-cleanup',
    name: 'Audio Normalization & Subtitle Cleanup',
    description: 'Sub-flow handling track retention, downmixing 5.1/7.1 to stereo fallback, and subtitle extraction.',
    templateVersion: '2.0.0',
    flowPlugins: [
      { id: 'naud-entry', name: 'Input File (From Transcode)', pluginName: 'inputFile', category: 'input', position: { x: 80, y: 180 }, inputs: {} },
      { id: 'naud-reorder', name: 'Reorder Audio Streams', pluginName: 'reorderAudioStreams', category: 'tools', position: { x: 380, y: 180 }, inputs: { languages: ['eng', 'und'] } },
      { id: 'naud-check-stereo', name: 'Check 2.0 Stereo Track', pluginName: 'checkAudioChannels', category: 'filter', position: { x: 700, y: 180 }, inputs: { channels: 2 } },
      { id: 'naud-add-stereo', name: 'Add Downmixed AAC 2.0', pluginName: 'addAudioTrackDownmix', category: 'transcode', position: { x: 1020, y: 100 }, inputs: { bitrate: '192k' } },
      { id: 'naud-goto-notify', name: 'Go To: Finish & Notification Flow', pluginName: 'goToFlow', category: 'flow', position: { x: 1360, y: 180 }, inputs: { flowId: 'flow-finish-notify', flowName: 'Finish & Notification Flow' } }
    ],
    flowEdges: [
      { id: 'eaud-1', source: 'naud-entry', target: 'naud-reorder', sourceHandle: 'output', targetHandle: 'input' },
      { id: 'eaud-2', source: 'naud-reorder', target: 'naud-check-stereo', sourceHandle: 'output', targetHandle: 'input' },
      { id: 'eaud-3', source: 'naud-check-stereo', target: 'naud-add-stereo', sourceHandle: 'false', targetHandle: 'input', label: 'Missing' },
      { id: 'eaud-4', source: 'naud-check-stereo', target: 'naud-goto-notify', sourceHandle: 'true', targetHandle: 'input', label: 'Exists' },
      { id: 'eaud-5', source: 'naud-add-stereo', target: 'naud-goto-notify', sourceHandle: 'output', targetHandle: 'input' }
    ]
  },
  {
    _id: 'flow-finish-notify',
    name: 'Finish & Notification Flow',
    description: 'Final step: Replaces original file, updates Radarr/Sonarr, and sends Discord webhook alert.',
    templateVersion: '2.0.0',
    flowPlugins: [
      { id: 'nfin-entry', name: 'Working Output File', pluginName: 'inputFile', category: 'input', position: { x: 80, y: 160 }, inputs: {} },
      { id: 'nfin-replace', name: 'Replace Original File', pluginName: 'replaceOriginalFile', category: 'file', position: { x: 380, y: 160 }, inputs: { deleteSourceOnSuccess: true } },
      { id: 'nfin-notify-arr', name: 'Notify Radarr / Sonarr', pluginName: 'notifyRadarrOrSonarr', category: 'tools', position: { x: 700, y: 160 }, inputs: { rescanAfterSave: true } },
      { id: 'nfin-discord', name: 'Send Discord Webhook Alert', pluginName: 'sendDiscordNotification', category: 'notify', position: { x: 1020, y: 160 }, inputs: { includeSavings: true } }
    ],
    flowEdges: [
      { id: 'efin-1', source: 'nfin-entry', target: 'nfin-replace', sourceHandle: 'output', targetHandle: 'input' },
      { id: 'efin-2', source: 'nfin-replace', target: 'nfin-notify-arr', sourceHandle: 'output', targetHandle: 'input' },
      { id: 'efin-3', source: 'nfin-notify-arr', target: 'nfin-discord', sourceHandle: 'output', targetHandle: 'input' }
    ]
  }
];
