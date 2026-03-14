/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Activity, 
  Camera, 
  Monitor, 
  Mic, 
  MicOff, 
  Settings, 
  Play, 
  Square, 
  Radio, 
  Cpu, 
  Network, 
  ChevronRight, 
  Maximize2, 
  ExternalLink,
  Brain,
  Layers,
  Image as ImageIcon,
  MessageSquare,
  AlertCircle,
  Volume2,
  VolumeX,
  Check,
  QrCode,
  Video,
  History,
  Edit3,
  X,
  Trash2,
  Download,
  Plus,
  Terminal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Scene, Source, Telemetry, Script, ScriptStep, Recording } from './types';

import { io } from 'socket.io-client';
import Peer from 'simple-peer';

import { Compositor } from './components/Compositor';

// --- Constants ---

const SCENES: Scene[] = [
  { id: '1', name: 'Cam 1', type: 'CAM' },
  { id: '2', name: 'Cam 2', type: 'CAM' },
  { id: '3', name: 'Screen', type: 'SCREEN' },
  { id: '4', name: 'Dual View', type: 'DUAL' },
  { id: '5', name: 'Grid', type: 'GRID' },
  { id: '6', name: 'Podcast', type: 'PODCAST' },
];

const SOURCES: Source[] = [
  { id: '1', name: 'Cam 1', status: 'active', resolution: '1080p', fps: 60, audioLevel: 0.65 },
  { id: '2', name: 'Cam 2', status: 'standby', resolution: '1080p', fps: 60, audioLevel: 0.12 },
  { id: '3', name: 'Screen Share', status: 'standby', resolution: '4K', fps: 30, audioLevel: 0.0 },
  { id: '4', name: 'Media Loop', status: 'offline', resolution: '1080p', fps: 24, audioLevel: 0.0 },
  { id: '5', name: 'Browser Source', status: 'active', resolution: '1080p', fps: 60, audioLevel: 0.45 },
];

const AUDIO_CHANNELS = [
  { name: 'Mic 1', level: 0.6, peak: 0.8, muted: false },
  { name: 'Mic 2', level: 0.2, peak: 0.3, muted: true },
  { name: 'System', level: 0.4, peak: 0.5, muted: false },
  { name: 'Media', level: 0.0, peak: 0.0, muted: false },
];

const SAMPLE_SCRIPT: Script = {
  id: 'script-1',
  name: 'Podcast Intro',
  steps: [
    { id: 's1', sceneId: '1', duration: 5, label: 'Intro: Host' },
    { id: 's2', sceneId: '4', duration: 10, label: 'Dual: Discussion' },
    { id: 's3', sceneId: '2', duration: 5, label: 'Guest: Reaction' },
    { id: 's4', sceneId: '5', duration: 8, label: 'Grid: Group Chat' },
    { id: 's5', sceneId: '3', duration: 12, label: 'Screen: Demo' },
    { id: 's6', sceneId: '1', duration: 5, label: 'Outro: Host' },
  ]
};

// --- Sub-components ---

const MenuBar = ({ 
  onOpenGallery, 
  onOpenEditor,
  onAction
}: { 
  onOpenGallery: () => void, 
  onOpenEditor: () => void,
  onAction: (action: string) => void
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const menuConfig: Record<string, string[]> = {
    'File': ['New Project', 'Open...', 'Save', 'Save As...', 'Export Recording', 'Exit'],
    'Edit': ['Undo', 'Redo', 'Cut', 'Copy', 'Paste', 'Preferences'],
    'Sources': ['Add Camera', 'Add Screen Share', 'Add Media File', 'Add Browser Source'],
    'Scenes': ['New Scene', 'Duplicate Scene', 'Delete Scene', 'Scene Transitions'],
    'Stream': ['Start Streaming', 'Stop Streaming', 'Stream Settings', 'Output Quality'],
    'Tools': ['AI Director Settings', 'Script Editor', 'Recording Gallery', 'Diagnostics'],
    'Window': ['Audio Mixer', 'Source Rack', 'Director Rack', 'Reset Layout'],
    'Help': ['Documentation', 'Keyboard Shortcuts', 'Check for Updates', 'About Aether Studio']
  };

  const handleMenuAction = (menu: string, item: string) => {
    if (item === 'Recording Gallery') onOpenGallery();
    else if (item === 'Script Editor') onOpenEditor();
    else onAction(`${menu}:${item}`);
    setActiveMenu(null);
  };

  return (
    <div className="h-8 bg-bg border-b border-border flex items-center px-2 gap-1 text-xs font-medium relative z-[100]">
      {Object.keys(menuConfig).map(menu => (
        <div key={menu} className="relative">
          <button 
            onMouseEnter={() => activeMenu && setActiveMenu(menu)}
            onClick={() => setActiveMenu(activeMenu === menu ? null : menu)}
            className={`hover:bg-white/10 px-3 py-1 rounded-sm transition-colors cursor-default ${activeMenu === menu ? 'bg-white/10 text-white' : 'text-gray-400'}`}
          >
            {menu}
          </button>
          
          <AnimatePresence>
            {activeMenu === menu && (
              <>
                <div className="fixed inset-0 z-[-1]" onClick={() => setActiveMenu(null)} />
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute top-full left-0 w-48 bg-panel border border-border rounded-sm shadow-2xl py-1 mt-0.5 overflow-hidden"
                >
                  {menuConfig[menu].map((item, idx) => (
                    <React.Fragment key={item}>
                      {item === 'Exit' || item === 'Preferences' || item === 'Output Quality' || item === 'Diagnostics' || item === 'About Aether Studio' ? (
                        <div className="h-px bg-border my-1 mx-2" />
                      ) : null}
                      <button 
                        onClick={() => handleMenuAction(menu, item)}
                        className="w-full text-left px-4 py-1.5 hover:bg-accent-cyan hover:text-bg transition-colors flex items-center justify-between group"
                      >
                        <span>{item}</span>
                        {item.includes('...') && <span className="opacity-40 group-hover:opacity-100">...</span>}
                      </button>
                    </React.Fragment>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      ))}
      
      <div className="flex-1" />
      <div className="flex items-center gap-2 mr-4">
        <button 
          onClick={onOpenEditor}
          className="flex items-center gap-1.5 px-2 py-1 rounded-sm hover:bg-white/5 text-gray-400 hover:text-accent-cyan transition-colors"
        >
          <Edit3 size={12} />
          <span>Scripts</span>
        </button>
        <button 
          onClick={onOpenGallery}
          className="flex items-center gap-1.5 px-2 py-1 rounded-sm hover:bg-white/5 text-gray-400 hover:text-accent-cyan transition-colors"
        >
          <History size={12} />
          <span>Gallery</span>
        </button>
      </div>
      <button className="text-gray-500 hover:text-white p-1 active:scale-90 transition-transform">
        <Settings size={14} />
      </button>
    </div>
  );
};

const TelemetryBar = ({ telemetry, isStreaming, isRecording }: { telemetry: Telemetry, isStreaming: boolean, isRecording: boolean }) => {
  return (
    <div className="h-10 bg-panel border-b border-border flex items-center px-4 gap-6 text-[11px] font-mono uppercase tracking-wider">
      <div className="flex items-center gap-4 border-r border-border pr-6">
        <div className="flex items-center gap-2">
          <div className="led-indicator bg-accent-green" />
          <span className="text-accent-green font-bold">READY</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`led-indicator ${isStreaming ? 'bg-accent-red animate-pulse' : 'bg-gray-700'}`} />
          <span className={isStreaming ? 'text-accent-red font-bold' : 'text-gray-500'}>LIVE</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`led-indicator ${isRecording ? 'bg-accent-red animate-pulse' : 'bg-gray-700'}`} />
          <span className={isRecording ? 'text-accent-red font-bold' : 'text-gray-500'}>RECORDING</span>
        </div>
      </div>
      
      <div className="flex items-center gap-6 text-gray-400">
        <div className="flex items-center gap-2">
          <Radio size={12} className={isStreaming ? 'text-accent-cyan' : 'text-gray-600'} />
          <span>Bitrate: <span className="text-white">{isStreaming ? telemetry.bitrate : '0.0 Mbps'}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <Activity size={12} className="text-accent-cyan" />
          <span>FPS: <span className="text-white">{telemetry.fps}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <Cpu size={12} className="text-accent-cyan" />
          <span>CPU: <span className="text-white">{telemetry.cpu}%</span></span>
        </div>
        <div className="flex items-center gap-2">
          <AlertCircle size={12} className="text-accent-red" />
          <span>Dropped: <span className="text-white">{telemetry.droppedFrames}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <Network size={12} className={telemetry.network === 'excellent' ? 'text-accent-green' : 'text-accent-red'} />
          <span className="capitalize">{telemetry.network}</span>
        </div>
      </div>
    </div>
  );
};

const SourceRack = ({ sources, onSourceClick }: { sources: Source[], onSourceClick: (s: Source) => void }) => {
  return (
    <div className="w-64 border-r border-border flex flex-col bg-bg">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Source Rack</h3>
        <button className="text-gray-500 hover:text-white active:rotate-90 transition-transform">
          <Settings size={12} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sources.map(source => (
          <div 
            key={source.id} 
            onClick={() => onSourceClick(source)}
            className="rack-module p-2 group cursor-pointer hover:border-gray-600 transition-colors active:bg-white/5"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className={`led-indicator ${source.status === 'active' ? 'bg-accent-green' : source.status === 'standby' ? 'bg-orange-500' : 'bg-gray-700'}`} />
                <span className="text-xs font-medium text-gray-200">{source.name}</span>
              </div>
              <span className="text-[9px] text-gray-500 font-mono">{source.resolution}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex-1 h-1 bg-gray-900 rounded-full overflow-hidden mr-4">
                <motion.div 
                  className="h-full bg-accent-green"
                  initial={{ width: 0 }}
                  animate={{ width: `${source.audioLevel * 100}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <span className="text-[9px] text-gray-600 font-mono">{source.fps} FPS</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProgramView = ({ 
  activeScene, 
  sources,
  isStreaming, 
  isRecording, 
  onToggleStreaming, 
  onToggleRecording,
  webcamStream,
  remoteStreams,
  screenStream,
  transitionType,
  layout
}: { 
  activeScene: Scene, 
  sources: Source[],
  isStreaming: boolean, 
  isRecording: boolean,
  onToggleStreaming: () => void,
  onToggleRecording: () => void,
  webcamStream: MediaStream | null,
  remoteStreams: Map<string, MediaStream>,
  screenStream: MediaStream | null,
  transitionType: string,
  layout: string
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };

  const openPopout = () => {
    window.open(window.location.href, 'AetherPopout', 'width=1280,height=720');
  };

  return (
    <div ref={containerRef} className="flex-1 flex flex-col bg-black relative">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
        {isStreaming && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-accent-red text-white text-[10px] font-bold px-2 py-0.5 rounded-sm flex items-center gap-1.5"
          >
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            LIVE
          </motion.div>
        )}
        <div className="bg-black/60 backdrop-blur-md border border-white/10 text-white text-[10px] font-mono px-2 py-0.5 rounded-sm">
          1080p | 60fps | {isStreaming ? '4.2 Mbps' : 'IDLE'}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="aspect-video w-full max-w-5xl bg-gray-900 shadow-2xl border border-white/5 relative overflow-hidden flex items-center justify-center">
          <Compositor 
            activeScene={activeScene} 
            sources={sources} 
            isStreaming={isStreaming} 
            webcamStream={webcamStream} 
            remoteStreams={remoteStreams}
            screenStream={screenStream}
            transitionType={transitionType}
            layout={layout}
          />
          
          {/* Program Overlay */}
          <div className="absolute bottom-4 right-4 text-right pointer-events-none">
            <p className="text-white/20 text-4xl font-black italic tracking-tighter uppercase select-none">Aether Studio</p>
          </div>
        </div>
      </div>

      <div className="h-12 bg-panel border-t border-border flex items-center px-4 justify-between">
        <div className="flex items-center gap-4">
          <button className="btn-hardware flex items-center gap-2" onClick={toggleFullscreen}>
            <Maximize2 size={12} /> Fullscreen
          </button>
          <button className="btn-hardware flex items-center gap-2" onClick={openPopout}>
            <ExternalLink size={12} /> Popout
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onToggleRecording}
            className={`btn-hardware flex items-center gap-2 transition-colors ${isRecording ? 'text-accent-red border-accent-red/30 bg-accent-red/10' : 'text-gray-400'}`}
          >
            {isRecording ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>
          <button 
            onClick={onToggleStreaming}
            className={`btn-hardware flex items-center gap-2 transition-colors ${isStreaming ? 'text-accent-cyan border-accent-cyan/30 bg-accent-cyan/10' : 'text-gray-400'}`}
          >
            <Radio size={12} />
            {isStreaming ? 'Stop Streaming' : 'Start Streaming'}
          </button>
        </div>
      </div>
    </div>
  );
};

const DirectorRack = ({ 
  aiMode, 
  setAiMode, 
  layout, 
  setLayout,
  activeGraphics,
  toggleGraphic,
  telemetry,
  script,
  currentStepIndex,
  isScriptRunning,
  toggleScript,
  skipStep,
  isRemoteConnected,
  toggleRemote
}: { 
  aiMode: 'AUTO' | 'MANUAL', 
  setAiMode: (m: 'AUTO' | 'MANUAL') => void,
  layout: string,
  setLayout: (l: string) => void,
  activeGraphics: Set<string>,
  toggleGraphic: (g: string) => void,
  telemetry: Telemetry,
  script: Script,
  currentStepIndex: number,
  isScriptRunning: boolean,
  toggleScript: () => void,
  skipStep: () => void,
  isRemoteConnected: boolean,
  toggleRemote: () => void
}) => {
  return (
    <div className="w-72 border-l border-border flex flex-col bg-bg overflow-y-auto">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Director Rack</h3>
        <button className="text-gray-500 hover:text-white active:scale-90 transition-transform">
          <Layers size={12} />
        </button>
      </div>

      <div className="p-3 space-y-4">
        {/* Remote Camera Module */}
        <div className="rack-module">
          <div className="bg-gray-800/50 p-2 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode size={14} className={isRemoteConnected ? 'text-accent-green' : 'text-gray-400'} />
              <span className="text-[11px] font-bold uppercase tracking-wider">Remote Camera</span>
            </div>
            <div className={`text-[9px] px-1.5 rounded-full font-bold ${isRemoteConnected ? 'bg-accent-green/20 text-accent-green' : 'bg-gray-700 text-gray-400'}`}>
              {isRemoteConnected ? 'CONNECTED' : 'OFFLINE'}
            </div>
          </div>
          <div className="p-3 flex flex-col items-center gap-3">
            {!isRemoteConnected ? (
              <>
                <div className="w-24 h-24 bg-white p-1 rounded-sm">
                  <div className="w-full h-full bg-black flex items-center justify-center relative overflow-hidden">
                    {/* Simulated QR Code */}
                    <div className="grid grid-cols-8 gap-0.5 p-1">
                      {Array.from({ length: 64 }).map((_, i) => (
                        <div key={i} className={`w-2 h-2 ${Math.random() > 0.5 ? 'bg-white' : 'bg-transparent'}`} />
                      ))}
                    </div>
                    <div className="absolute inset-0 border-4 border-white/20 pointer-events-none" />
                  </div>
                </div>
                <p className="text-[9px] text-gray-500 text-center uppercase leading-tight">
                  Open this URL on your phone to <br /> connect as wireless camera:
                </p>
                <div className="w-full bg-black/40 p-2 rounded border border-white/5 text-[8px] font-mono break-all text-accent-cyan select-all">
                  {window.location.origin}?mode=remote
                </div>
                <button 
                  onClick={() => {
                    const url = `${window.location.origin}?mode=remote`;
                    navigator.clipboard.writeText(url);
                  }}
                  className="w-full btn-hardware text-[10px] uppercase font-bold py-1.5"
                >
                  Copy Link
                </button>
              </>
            ) : (
              <div className="w-full space-y-3">
                <div className="aspect-video bg-black rounded-sm overflow-hidden relative border border-white/10">
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-accent-red rounded-full animate-pulse" />
                    <span className="text-[9px] font-bold text-white shadow-sm">REMOTE_01</span>
                  </div>
                  <div className="w-full h-full flex items-center justify-center opacity-20">
                    <Video size={32} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
                  <div className="flex flex-col">
                    <span className="text-gray-500">Latency</span>
                    <span className="text-accent-green">42ms</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500">Battery</span>
                    <span className="text-yellow-500">84%</span>
                  </div>
                </div>
                <button 
                  onClick={toggleRemote}
                  className="w-full btn-hardware text-[10px] uppercase font-bold py-1.5 text-accent-red border-accent-red/20"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Script Runner Module */}
        <div className="rack-module">
          <div className="bg-gray-800/50 p-2 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Play size={14} className={isScriptRunning ? 'text-accent-green' : 'text-gray-400'} />
              <span className="text-[11px] font-bold uppercase tracking-wider">Script Runner</span>
            </div>
            <div className="text-[9px] text-gray-500 font-mono uppercase">
              {script.name}
            </div>
          </div>
          <div className="p-3 space-y-3">
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {script.steps.map((step, idx) => (
                <div 
                  key={step.id} 
                  className={`flex items-center gap-2 p-1.5 rounded-sm border transition-colors ${idx === currentStepIndex ? 'bg-accent-green/10 border-accent-green/30 text-white' : 'border-transparent text-gray-500'}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${idx === currentStepIndex ? 'bg-accent-green animate-pulse' : idx < currentStepIndex ? 'bg-gray-600' : 'bg-gray-800'}`} />
                  <span className="text-[10px] flex-1 truncate">{step.label}</span>
                  <span className="text-[9px] font-mono opacity-50">{step.duration}s</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={toggleScript}
                className={`btn-hardware flex items-center justify-center gap-2 ${isScriptRunning ? 'text-accent-red border-accent-red/20' : 'text-accent-green border-accent-green/20'}`}
              >
                {isScriptRunning ? <Square size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
                <span className="text-[10px] uppercase font-bold">{isScriptRunning ? 'Stop' : 'Run'}</span>
              </button>
              <button 
                onClick={skipStep}
                disabled={!isScriptRunning}
                className="btn-hardware flex items-center justify-center gap-2 disabled:opacity-30"
              >
                <ChevronRight size={12} />
                <span className="text-[10px] uppercase font-bold">Skip</span>
              </button>
            </div>
          </div>
        </div>

        {/* AI Director Module */}
        <div className="rack-module">
          <div className="bg-gray-800/50 p-2 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain size={14} className="text-accent-cyan" />
              <span className="text-[11px] font-bold uppercase tracking-wider">AI Director</span>
            </div>
            <div className={`text-[9px] px-1.5 rounded-full font-bold transition-colors ${aiMode === 'AUTO' ? 'bg-accent-cyan/20 text-accent-cyan' : 'bg-gray-700 text-gray-400'}`}>
              {aiMode}
            </div>
          </div>
          <div className="p-3 space-y-3">
            <div className="space-y-1">
              <p className="text-[10px] text-gray-500 uppercase font-medium">Mode Selection</p>
              <div className="grid grid-cols-2 gap-1 bg-black/40 p-1 rounded-sm border border-white/5">
                <button 
                  onClick={() => setAiMode('MANUAL')}
                  className={`text-[10px] py-1 rounded-sm transition-colors ${aiMode === 'MANUAL' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  Manual
                </button>
                <button 
                  onClick={() => setAiMode('AUTO')}
                  className={`text-[10px] py-1 rounded-sm transition-colors ${aiMode === 'AUTO' ? 'bg-accent-cyan text-bg font-bold' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  Auto
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] text-gray-500 uppercase">
                <span>Confidence</span>
                <span>88%</span>
              </div>
              <div className="h-1 bg-gray-900 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-accent-cyan"
                  initial={{ width: 0 }}
                  animate={{ width: '88%' }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-hardware btn-hardware-active text-[10px]" onClick={() => console.log('AI Action Executed')}>Execute</button>
              <button className="btn-hardware text-[10px]" onClick={() => console.log('AI Action Ignored')}>Ignore</button>
            </div>
          </div>
        </div>

        {/* Diagnostics Module */}
        <div className="rack-module">
          <div className="bg-gray-800/50 p-2 border-b border-border flex items-center gap-2">
            <Activity size={14} className="text-accent-green" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Diagnostics</span>
          </div>
          <div className="p-3 space-y-2 font-mono text-[10px]">
            <div className="flex justify-between">
              <span className="text-gray-500">Frame Time:</span>
              <span className="text-white">16.6ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Jitter:</span>
              <span className="text-white">1.2ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Buffer:</span>
              <span className="text-accent-green">STABLE</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Enc:</span>
              <span className="text-white">H.264 NVENC</span>
            </div>
          </div>
        </div>

        {/* Layout Engine */}
        <div className="rack-module">
          <div className="bg-gray-800/50 p-2 border-b border-border flex items-center gap-2">
            <Layers size={14} className="text-gray-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Layout Engine</span>
          </div>
          <div className="p-3 grid grid-cols-2 gap-2">
            {['Solo', 'Side-by-Side', 'Picture-in-Pic', 'Grid'].map(l => (
              <button 
                key={l}
                onClick={() => setLayout(l)}
                className={`btn-hardware transition-colors ${layout === l ? 'btn-hardware-active' : ''}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Graphics Manager */}
        <div className="rack-module">
          <div className="bg-gray-800/50 p-2 border-b border-border flex items-center gap-2">
            <ImageIcon size={14} className="text-gray-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Graphics</span>
          </div>
          <div className="p-2 space-y-1">
            {['Lower Third - Name', 'Bug - Logo', 'Overlay - Socials'].map(g => (
              <button 
                key={g} 
                onClick={() => toggleGraphic(g)}
                className={`w-full flex items-center justify-between p-1.5 hover:bg-white/5 rounded-sm transition-colors text-[11px] ${activeGraphics.has(g) ? 'text-accent-cyan' : 'text-gray-400'}`}
              >
                <span>{g}</span>
                <div className={`w-3 h-3 border rounded-sm flex items-center justify-center transition-colors ${activeGraphics.has(g) ? 'bg-accent-cyan border-accent-cyan' : 'border-gray-600'}`}>
                  {activeGraphics.has(g) && <Check size={8} className="text-bg" />}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const SceneSwitcher = ({ 
  scenes, 
  activeScene, 
  onSceneChange,
  transition,
  setTransition
}: { 
  scenes: Scene[], 
  activeScene: Scene, 
  onSceneChange: (s: Scene) => void,
  transition: string,
  setTransition: (t: string) => void
}) => {
  return (
    <div className="flex-1 border-t border-border flex bg-panel">
      <div className="w-64 border-r border-border p-3 flex flex-col gap-2">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Transitions</h3>
        <div className="grid grid-cols-2 gap-2">
          {['Cut', 'Fade', 'Wipe', 'Slide'].map(t => (
            <button 
              key={t}
              onClick={() => setTransition(t)}
              className={`btn-hardware transition-colors ${transition === t ? 'btn-hardware-active' : ''}`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="mt-auto">
           <p className="text-[9px] text-gray-600 uppercase mb-1">Duration: 300ms</p>
           <div className="h-1 bg-gray-900 rounded-full">
              <div className="h-full bg-accent-cyan w-1/3" />
           </div>
        </div>
      </div>

      <div className="flex-1 p-3 flex flex-col">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3">Scenes</h3>
        <div className="flex flex-wrap gap-3">
          {scenes.map(scene => (
            <button 
              key={scene.id}
              onClick={() => onSceneChange(scene)}
              className={`w-28 h-20 rack-module flex flex-col items-center justify-center gap-2 transition-all active:scale-95 ${activeScene.id === scene.id ? 'border-accent-cyan ring-1 ring-accent-cyan/50 bg-accent-cyan/5' : 'hover:border-gray-600'}`}
            >
              {scene.type === 'CAM' && <Camera size={20} className={activeScene.id === scene.id ? 'text-accent-cyan' : 'text-gray-500'} />}
              {scene.type === 'SCREEN' && <Monitor size={20} className={activeScene.id === scene.id ? 'text-accent-cyan' : 'text-gray-500'} />}
              {scene.type === 'DUAL' && <Layers size={20} className={activeScene.id === scene.id ? 'text-accent-cyan' : 'text-gray-500'} />}
              {scene.type === 'GRID' && <Activity size={20} className={activeScene.id === scene.id ? 'text-accent-cyan' : 'text-gray-500'} />}
              {scene.type === 'PODCAST' && <Mic size={20} className={activeScene.id === scene.id ? 'text-accent-cyan' : 'text-gray-500'} />}
              <span className={`text-[10px] font-bold uppercase tracking-wider ${activeScene.id === scene.id ? 'text-white' : 'text-gray-500'}`}>{scene.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const AudioMixer = ({ 
  channels, 
  onToggleMute, 
  onLevelChange 
}: { 
  channels: any[], 
  onToggleMute: (name: string) => void,
  onLevelChange: (name: string, val: number) => void
}) => {
  return (
    <div className="w-80 border-l border-border bg-panel p-3 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Audio Mixer</h3>
        <div className="flex gap-2">
          <Volume2 size={12} className="text-gray-500" />
          <Settings size={12} className="text-gray-500 active:rotate-45 transition-transform cursor-pointer" />
        </div>
      </div>
      
      <div className="flex-1 space-y-4 overflow-y-auto">
        {channels.map(ch => (
          <div key={ch.name} className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] uppercase font-medium">
              <span className={ch.muted ? 'text-gray-600' : 'text-gray-300'}>{ch.name}</span>
              <button 
                onClick={() => onToggleMute(ch.name)}
                className={`p-1 rounded-sm transition-colors ${ch.muted ? 'text-accent-red bg-accent-red/10' : 'text-gray-500 hover:text-white active:bg-white/5'}`}
              >
                {ch.muted ? <MicOff size={10} /> : <Mic size={10} />}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 space-y-1">
                <div className="h-2 bg-black rounded-sm relative overflow-hidden">
                  <motion.div 
                    className={`h-full bg-gradient-to-r from-accent-green via-yellow-400 to-accent-red transition-opacity ${ch.muted ? 'opacity-20' : 'opacity-100'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${ch.level * 100}%` }}
                    transition={{ duration: 0.1 }}
                  />
                  <div className="absolute top-0 bottom-0 w-0.5 bg-white/40" style={{ left: `${ch.peak * 100}%` }} />
                </div>
                <input 
                  type="range" 
                  className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-accent-cyan"
                  value={ch.level * 100}
                  onChange={(e) => onLevelChange(ch.name, parseInt(e.target.value) / 100)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <button className="p-1 text-[8px] border border-border rounded-sm hover:bg-white/5 active:bg-accent-cyan/20">M</button>
                <button className="p-1 text-[8px] border border-border rounded-sm hover:bg-white/5 active:bg-yellow-500/20">S</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const RecordingGallery = ({ 
  recordings, 
  onClose,
  onDelete
}: { 
  recordings: Recording[], 
  onClose: () => void,
  onDelete: (id: string) => void
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/80 backdrop-blur-sm"
    >
      <div className="w-full max-w-4xl bg-bg border border-border rounded-lg shadow-2xl flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History className="text-accent-cyan" size={20} />
            <h2 className="text-lg font-bold uppercase tracking-tight">Recording Gallery</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recordings.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500 gap-4">
              <Video size={48} className="opacity-20" />
              <p className="text-sm uppercase font-bold tracking-widest">No recordings found</p>
            </div>
          ) : (
            recordings.map(rec => (
              <div key={rec.id} className="rack-module group overflow-hidden">
                <div className="aspect-video bg-black relative">
                  <img src={rec.thumbnail} alt={rec.fileName} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="w-12 h-12 bg-accent-cyan rounded-full flex items-center justify-center text-bg shadow-xl active:scale-90 transition-transform">
                      <Play size={24} fill="currentColor" />
                    </button>
                  </div>
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-[10px] font-mono rounded-sm">
                    {rec.duration}
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold truncate max-w-[150px]">{rec.fileName}</span>
                      <span className="text-[9px] text-gray-500">{rec.timestamp}</span>
                    </div>
                    <span className="text-[9px] font-mono text-gray-400">{rec.size}</span>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-border/50">
                    <button className="flex-1 btn-hardware text-[9px] py-1 flex items-center justify-center gap-1.5">
                      <Download size={10} /> Download
                    </button>
                    <button 
                      onClick={() => onDelete(rec.id)}
                      className="p-1.5 btn-hardware text-accent-red border-accent-red/20 hover:bg-accent-red/10"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
};

const ScriptEditor = ({ 
  script, 
  onClose,
  onSave
}: { 
  script: Script, 
  onClose: () => void,
  onSave: (s: Script) => void
}) => {
  const [editedScript, setEditedScript] = useState<Script>(JSON.parse(JSON.stringify(script)));

  const addStep = () => {
    const newStep: ScriptStep = {
      id: `s-${Date.now()}`,
      sceneId: '1',
      duration: 5,
      label: 'New Step'
    };
    setEditedScript(prev => ({ ...prev, steps: [...prev.steps, newStep] }));
  };

  const updateStep = (id: string, updates: Partial<ScriptStep>) => {
    setEditedScript(prev => ({
      ...prev,
      steps: prev.steps.map(s => s.id === id ? { ...s, ...updates } : s)
    }));
  };

  const removeStep = (id: string) => {
    setEditedScript(prev => ({
      ...prev,
      steps: prev.steps.filter(s => s.id !== id)
    }));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/80 backdrop-blur-sm"
    >
      <div className="w-full max-w-2xl bg-bg border border-border rounded-lg shadow-2xl flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Edit3 className="text-accent-cyan" size={20} />
            <h2 className="text-lg font-bold uppercase tracking-tight">Script Editor</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 bg-panel border-b border-border">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-gray-500">Script Name</label>
            <input 
              type="text" 
              value={editedScript.name}
              onChange={(e) => setEditedScript(prev => ({ ...prev, name: e.target.value }))}
              className="bg-black/40 border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-accent-cyan transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {editedScript.steps.map((step, idx) => (
            <div key={step.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-sm border border-white/5 group">
              <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-500">
                {idx + 1}
              </div>
              <div className="flex-1 grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] uppercase font-bold text-gray-600">Label</label>
                  <input 
                    type="text" 
                    value={step.label}
                    onChange={(e) => updateStep(step.id, { label: e.target.value })}
                    className="bg-black/40 border border-border rounded-sm px-2 py-1 text-[11px] focus:outline-none focus:border-accent-cyan"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] uppercase font-bold text-gray-600">Scene</label>
                  <select 
                    value={step.sceneId}
                    onChange={(e) => updateStep(step.id, { sceneId: e.target.value })}
                    className="bg-black/40 border border-border rounded-sm px-2 py-1 text-[11px] focus:outline-none focus:border-accent-cyan"
                  >
                    {SCENES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] uppercase font-bold text-gray-600">Duration (s)</label>
                  <input 
                    type="number" 
                    value={step.duration}
                    onChange={(e) => updateStep(step.id, { duration: parseInt(e.target.value) || 0 })}
                    className="bg-black/40 border border-border rounded-sm px-2 py-1 text-[11px] focus:outline-none focus:border-accent-cyan"
                  />
                </div>
              </div>
              <button 
                onClick={() => removeStep(step.id)}
                className="p-2 text-gray-600 hover:text-accent-red transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button 
            onClick={addStep}
            className="w-full py-3 border border-dashed border-border rounded-sm text-gray-500 hover:text-white hover:border-gray-500 transition-all flex items-center justify-center gap-2 text-[11px] uppercase font-bold"
          >
            <Plus size={14} /> Add Step
          </button>
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-3">
          <button onClick={onClose} className="btn-hardware px-6 py-2 text-[11px] uppercase font-bold">Cancel</button>
          <button 
            onClick={() => onSave(editedScript)}
            className="btn-hardware px-6 py-2 text-[11px] uppercase font-bold bg-accent-cyan text-bg border-accent-cyan"
          >
            Save Script
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// --- Main App ---

const RemoteCameraView = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState('Initializing...');
  const socketRef = useRef<any>(null);
  const peersRef = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    const start = async () => {
      try {
        console.log('Remote: Requesting camera...');
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(s);
        setStatus('Camera ready. Connecting to studio...');

        const socket = io();
        socketRef.current = socket;

        const params = new URLSearchParams(window.location.search);
        const roomId = params.get('room') || 'default-room';
        
        socket.emit('join-room', roomId);

        socket.on('user-joined', (userId) => {
          console.log('Remote: Studio joined:', userId);
          setStatus('Studio detected. Establishing P2P...');
          
          const peer = new Peer({ initiator: true, stream: s, trickle: false });
          
          peer.on('signal', (data) => {
            socket.emit('signal', { roomId, signal: data, to: userId });
          });
          
          peer.on('connect', () => {
            console.log('Remote: Peer connected');
            setStatus('CONNECTED TO STUDIO');
          });

          peer.on('error', (err) => {
            console.error('Remote: Peer error:', err);
            setStatus('Connection Error');
          });

          peersRef.current.set(userId, peer);
        });

        socket.on('signal', (data) => {
          console.log('Remote: Received signal from', data.from);
          const peer = peersRef.current.get(data.from);
          if (peer) {
            peer.signal(data.signal);
          }
        });

      } catch (err: any) {
        console.error('Remote: Error:', err);
        setStatus('Error: ' + err.message);
      }
    };
    start();

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      peersRef.current.forEach(p => p.destroy());
    };
  }, []);

  return (
    <div className="h-screen bg-bg flex flex-col items-center justify-center p-4 text-white font-sans">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-accent-cyan rounded-full animate-pulse" />
            <h1 className="text-sm font-bold uppercase tracking-widest">Aether Remote</h1>
          </div>
          <div className="text-[10px] font-mono text-gray-500">v1.0.4</div>
        </div>

        <div className="aspect-video bg-black rounded-xl overflow-hidden relative border border-white/10 shadow-2xl">
          {stream ? (
            <video 
              autoPlay 
              muted 
              playsInline 
              ref={el => { if (el) el.srcObject = stream; }} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-700">
              <Camera size={48} />
            </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
          
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[9px] text-gray-400 uppercase font-bold tracking-tighter">Status</span>
              <span className={`text-xs font-bold ${status.includes('CONNECTED') ? 'text-accent-green' : 'text-accent-cyan'}`}>
                {status}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/5 rounded-full backdrop-blur-md border border-white/10">
                <Mic size={14} className="text-accent-cyan" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-panel p-4 rounded-xl border border-border space-y-2">
          <p className="text-[10px] text-gray-400 leading-relaxed">
            This device is now acting as a wireless camera source. 
            Keep this tab open and your screen on for continuous streaming.
          </p>
          <div className="h-px bg-border my-2" />
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-gray-500 uppercase">Room ID</span>
            <span className="text-white">DEFAULT-ROOM</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [isRemoteMode, setIsRemoteMode] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'remote') {
      setIsRemoteMode(true);
    }
  }, []);

  if (isRemoteMode) {
    return <RemoteCameraView />;
  }

  return <StudioView />;
}

function StudioView() {
  // --- State ---
  const [activeScene, setActiveScene] = useState<Scene>(SCENES[0]);
  const [scenes, setScenes] = useState<Scene[]>(SCENES);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [aiMode, setAiMode] = useState<'AUTO' | 'MANUAL'>('MANUAL');
  const [layout, setLayout] = useState('Solo');
  const [transition, setTransition] = useState('Cut');
  const [activeGraphics, setActiveGraphics] = useState<Set<string>>(new Set());
  const [audioChannels, setAudioChannels] = useState(AUDIO_CHANNELS);
  const [sources, setSources] = useState(SOURCES);
  const [telemetry, setTelemetry] = useState<Telemetry>({
    bitrate: '0.0 Mbps',
    fps: 60,
    cpu: 12,
    droppedFrames: 0,
    network: 'excellent'
  });
  const [serverLogs, setServerLogs] = useState<{ message: string, type: string, id: number }[]>([]);
  const [showServerLogs, setShowServerLogs] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{ scene: string, reason: string } | null>(null);

  // Script Runner State
  const [activeScript, setActiveScript] = useState<Script>(SAMPLE_SCRIPT);
  const [isScriptRunning, setIsScriptRunning] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepTimeRemaining, setStepTimeRemaining] = useState(0);

  // Feature States
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isRemoteConnected, setIsRemoteConnected] = useState(false);
  const [showRecordingGallery, setShowRecordingGallery] = useState(false);
  const [showScriptEditor, setShowScriptEditor] = useState(false);
  const [showStreamSettings, setShowStreamSettings] = useState(false);
  const [showHardwareSetup, setShowHardwareSetup] = useState(false);
  const [streamKey, setStreamKey] = useState('');
  const [rtmpUrl, setRtmpUrl] = useState('rtmps://a.rtmp.youtube.com:443/live2');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [selectedVideoDevice2, setSelectedVideoDevice2] = useState<string>('');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>([
    {
      id: 'rec-1',
      timestamp: '2026-03-14 10:30',
      duration: '00:45:12',
      size: '1.2 GB',
      thumbnail: 'https://picsum.photos/seed/rec1/320/180',
      fileName: 'Podcast_Ep12_Final.mp4'
    },
    {
      id: 'rec-2',
      timestamp: '2026-03-13 14:15',
      duration: '00:12:05',
      size: '450 MB',
      thumbnail: 'https://picsum.photos/seed/rec2/320/180',
      fileName: 'Interview_Snippet.mp4'
    }
  ]);

  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const socketRef = useRef<any>(null);

  // --- Effects ---

  const reconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    console.log('Studio: Reconnecting signaling...');
    const socket = io();
    socketRef.current = socket;
    const roomId = 'default-room';
    
    socket.on('connect', () => setIsSocketConnected(true));
    socket.on('disconnect', () => setIsSocketConnected(false));
    
    socket.emit('join-room', roomId);

    socket.on('signal', (data) => {
      console.log('Studio: Received signal from remote', data.from);
      const peer = new Peer({ initiator: false, trickle: false });
      peer.on('signal', (signal) => {
        socket.emit('signal', { roomId, signal, to: data.from });
      });
      peer.on('stream', (stream) => {
        setRemoteStreams(prev => {
          const next = new Map(prev);
          next.set(data.from, stream);
          return next;
        });
        setIsRemoteConnected(true);
      });
      peer.on('error', (err) => console.error('Studio: Peer error:', err));
      peer.signal(data.signal);
    });

    socket.on('server-log', (log) => {
      setServerLogs(prev => [{ ...log, id: Date.now() }, ...prev].slice(0, 50));
    });
  }, []);

  useEffect(() => {
    reconnectSocket();
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [reconnectSocket]);

  useEffect(() => {
    const getDevices = async () => {
      try {
        const devs = await navigator.mediaDevices.enumerateDevices();
        setDevices(devs);
        const video = devs.find(d => d.kind === 'videoinput');
        const audio = devs.find(d => d.kind === 'audioinput');
        if (video) setSelectedVideoDevice(video.deviceId);
        if (audio) setSelectedAudioDevice(audio.deviceId);
      } catch (err) {
        console.error('Error enumerating devices:', err);
      }
    };
    getDevices();
  }, []);

  const startCamera = async (videoId?: string, audioId?: string, videoId2?: string) => {
    console.log('App: Starting camera...', videoId, audioId, videoId2);
    try {
      const constraints = {
        video: videoId ? { deviceId: { exact: videoId }, width: 1920, height: 1080 } : { width: 1920, height: 1080 },
        audio: audioId ? { deviceId: { exact: audioId } } : true
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setWebcamStream(stream);
      
      if (videoId2) {
        const stream2 = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: videoId2 }, width: 1920, height: 1080 }
        });
        // We'll store the second stream in remoteStreams for now to reuse the Compositor logic
        setRemoteStreams(prev => {
          const next = new Map(prev);
          next.set('local-cam-2', stream2);
          return next;
        });
      }

      setSources(prev => prev.map(s => s.name === 'Cam 1' ? { ...s, status: 'active' } : s));
      setShowHardwareSetup(false);
    } catch (err) {
      console.error('App: Error accessing camera:', err);
    }
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      setScreenStream(stream);
      setSources(prev => prev.map(s => s.name === 'Screen Share' ? { ...s, status: 'active' } : s));
      
      stream.getVideoTracks()[0].onended = () => {
        setScreenStream(null);
        setSources(prev => prev.map(s => s.name === 'Screen Share' ? { ...s, status: 'standby' } : s));
      };
    } catch (err) {
      console.error('Error starting screen share:', err);
    }
  };

  const stopCamera = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
      setWebcamStream(null);
      setSources(prev => prev.map(s => s.name === 'Cam 1' ? { ...s, status: 'standby' } : s));
    }
  };

  const startStreaming = () => {
    if (!streamKey) {
      setShowStreamSettings(true);
      return;
    }

    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const stream = canvas.captureStream(30);
    if (webcamStream) {
      webcamStream.getAudioTracks().forEach(track => stream.addTrack(track));
    }

    const recorder = new MediaRecorder(stream, { 
      mimeType: 'video/webm',
      videoBitsPerSecond: 5000000 // Increased to 5Mbps for better sharpness
    });

    recorder.ondataavailable = async (e) => {
      if (e.data.size > 0 && socketRef.current?.connected) {
        const buffer = await e.data.arrayBuffer();
        
        // Update local telemetry bitrate
        const mbps = (e.data.size * 8) / (1000000); 
        setTelemetry(prev => ({ ...prev, bitrate: `${mbps.toFixed(1)} Mbps` }));

        socketRef.current.emit('stream-chunk', {
          chunk: buffer,
          rtmpUrl: `${rtmpUrl}/${streamKey}`
        });
      }
    };

    recorder.onerror = (err) => {
      console.error('MediaRecorder Error:', err);
      setIsStreaming(false);
      setServerLogs(prev => [{ message: `Recorder Error: ${err}`, type: 'error', id: Date.now() }, ...prev]);
    };

    try {
      recorder.start(1000); // Send 1s chunks
      mediaRecorderRef.current = recorder;
      setIsStreaming(true);
      socketRef.current.emit('start-stream', { rtmpUrl: `${rtmpUrl}/${streamKey}` });
    } catch (err) {
      console.error('Failed to start recorder:', err);
      setIsStreaming(false);
    }
  };

  const stopStreaming = () => {
    if (mediaRecorderRef.current && isStreaming) {
      mediaRecorderRef.current.stop();
      setIsStreaming(false);
      socketRef.current.emit('stop-stream');
    }
  };

  const handleToggleStreaming = () => {
    if (isStreaming) {
      stopStreaming();
    } else {
      startStreaming();
    }
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const stream = canvas.captureStream(60);
    // Add audio if available
    if (webcamStream) {
      webcamStream.getAudioTracks().forEach(track => stream.addTrack(track));
    }

    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
    recordedChunksRef.current = [];
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const newRecording: Recording = {
        id: `rec-${Date.now()}`,
        fileName: `Broadcast_${new Date().toISOString().replace(/[:.]/g, '-')}.webm`,
        timestamp: new Date().toLocaleString(),
        duration: '00:00:10', // Simplified for demo
        size: `${(blob.size / (1024 * 1024)).toFixed(1)} MB`,
        thumbnail: url, // Using the video URL as thumbnail for now
        url: url
      };
      setRecordings(prev => [newRecording, ...prev]);
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleMenuAction = (action: string) => {
    console.log('Menu Action:', action);
    const [menu, item] = action.split(':');

    switch (item) {
      case 'Add Camera':
        setShowHardwareSetup(true);
        break;
      case 'Add Screen Share':
        startScreenShare();
        break;
      case 'Exit':
        stopCamera();
        window.close();
        break;
      case 'Start Streaming':
        setShowStreamSettings(true);
        break;
      case 'Stop Streaming':
        stopStreaming();
        break;
      case 'New Scene':
        const newScene: Scene = {
          id: `scene-${Date.now()}`,
          name: `Scene ${scenes.length + 1}`,
          type: 'CAM'
        };
        setScenes(prev => [...prev, newScene]);
        break;
      default:
        break;
    }
  };

  // Script Runner Logic
  useEffect(() => {
    if (!isScriptRunning) return;

    const currentStep = activeScript.steps[currentStepIndex];
    if (!currentStep) {
      setIsScriptRunning(false);
      return;
    }

    // Switch scene on step start
    const targetScene = scenes.find(s => s.id === currentStep.sceneId);
    if (targetScene && activeScene.id !== targetScene.id) {
      setActiveScene(targetScene);
    }

    setStepTimeRemaining(currentStep.duration);

    const timer = setInterval(() => {
      setStepTimeRemaining(prev => {
        if (prev <= 1) {
          // Move to next step
          if (currentStepIndex < activeScript.steps.length - 1) {
            setCurrentStepIndex(idx => idx + 1);
          } else {
            setIsScriptRunning(false);
            setCurrentStepIndex(0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isScriptRunning, currentStepIndex, activeScript]);

  // Simulated Telemetry & Audio Levels
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry(prev => ({
        ...prev,
        bitrate: isStreaming ? `${(4.1 + Math.random() * 0.3).toFixed(1)} Mbps` : '0.0 Mbps',
        cpu: Math.floor(10 + Math.random() * 15),
        droppedFrames: prev.droppedFrames + (Math.random() > 0.99 ? 1 : 0)
      }));

      // Update source audio levels
      setSources(prev => prev.map(s => ({
        ...s,
        audioLevel: Math.max(0.05, Math.min(0.95, s.audioLevel + (Math.random() - 0.5) * 0.2))
      })));

      // Update mixer audio levels
      setAudioChannels(prev => prev.map(c => ({
        ...c,
        level: Math.max(0.05, Math.min(0.95, c.level + (Math.random() - 0.5) * 0.2)),
        peak: Math.max(c.peak || 0, c.level)
      })));
    }, 100);
    return () => clearInterval(interval);
  }, [isStreaming]);

  // AI Director Logic
  useEffect(() => {
    if (aiMode === 'AUTO') {
      const checkInterval = setInterval(() => {
        const activeSource = sources.find(s => s.audioLevel > 0.8);
        if (activeSource && activeSource.name !== activeScene.name) {
          const targetScene = scenes.find(s => s.name === activeSource.name);
          if (targetScene) {
            setAiSuggestion({
              scene: targetScene.name,
              reason: `High audio activity detected on ${targetScene.name}`
            });
            // If in AUTO mode, actually switch
            if (aiMode === 'AUTO') {
              setActiveScene(targetScene);
            }
          }
        }
      }, 3000);
      return () => clearInterval(checkInterval);
    } else {
      setAiSuggestion(null);
    }
  }, [aiMode, sources, activeScene, scenes]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '6') {
        const index = parseInt(e.key) - 1;
        if (scenes[index]) setActiveScene(scenes[index]);
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setTransition('Cut');
        console.log('CUT executed');
      }
      if (e.key === 'f' || e.key === 'F') {
        setTransition('Fade');
        console.log('FADE executed');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- Handlers ---
  const toggleGraphic = (g: string) => {
    const next = new Set(activeGraphics);
    if (next.has(g)) next.delete(g);
    else next.add(g);
    setActiveGraphics(next);
  };

  const toggleMute = (name: string) => {
    setAudioChannels(prev => prev.map(c => c.name === name ? { ...c, muted: !c.muted } : c));
  };

  const onLevelChange = (name: string, val: number) => {
    setAudioChannels(prev => prev.map(c => c.name === name ? { ...c, level: val } : c));
  };

  const executeAiSuggestion = () => {
    if (aiSuggestion) {
      const targetScene = scenes.find(s => s.name === aiSuggestion.scene);
      if (targetScene) {
        setActiveScene(targetScene);
        setAiSuggestion(null);
      }
    }
  };

  return (
    <div className="h-screen flex flex-col bg-bg text-gray-300 overflow-hidden select-none font-sans">
      <MenuBar 
        onOpenGallery={() => setShowRecordingGallery(true)} 
        onOpenEditor={() => setShowScriptEditor(true)} 
        onAction={handleMenuAction}
      />
      <div className="flex items-center justify-end px-4 py-1 bg-black/20 border-b border-border gap-4">
        <div className="flex items-center gap-2 mr-auto">
          <div className={`w-2 h-2 rounded-full ${isSocketConnected ? 'bg-accent-cyan animate-pulse' : 'bg-accent-red'}`} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
            {isSocketConnected ? 'Engine Connected' : 'Engine Offline'}
          </span>
          {!isSocketConnected && (
            <button 
              onClick={reconnectSocket}
              className="text-[10px] text-accent-cyan underline hover:text-white ml-2"
            >
              Reconnect
            </button>
          )}
        </div>
        <button 
          onClick={() => setShowServerLogs(!showServerLogs)}
          className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 px-2 py-1 rounded transition-colors ${showServerLogs ? 'bg-accent-cyan text-bg' : 'text-accent-cyan hover:bg-accent-cyan/10'}`}
        >
          <Terminal size={12} />
          Server Logs
        </button>
      </div>
      <TelemetryBar telemetry={telemetry} isStreaming={isStreaming} isRecording={isRecording} />
      
      <div className="flex-1 flex overflow-hidden">
        <SourceRack sources={sources} onSourceClick={(s) => {
          const scene = scenes.find(sc => sc.name === s.name);
          if (scene) setActiveScene(scene);
        }} />
        
        <div className="flex-1 flex flex-col min-w-0">
          <ProgramView 
            activeScene={activeScene} 
            sources={sources}
            isStreaming={isStreaming} 
            isRecording={isRecording}
            onToggleStreaming={handleToggleStreaming}
            onToggleRecording={handleToggleRecording}
            webcamStream={webcamStream}
            remoteStreams={remoteStreams}
            screenStream={screenStream}
            transitionType={transition}
            layout={layout}
          />
          
          <div className="h-64 flex border-t border-border bg-panel">
            <SceneSwitcher 
              scenes={scenes}
              activeScene={activeScene} 
              onSceneChange={setActiveScene} 
              transition={transition}
              setTransition={setTransition}
            />
            <AudioMixer 
              channels={audioChannels} 
              onToggleMute={toggleMute} 
              onLevelChange={onLevelChange}
            />
          </div>
        </div>

        <DirectorRack 
          aiMode={aiMode} 
          setAiMode={setAiMode} 
          layout={layout} 
          setLayout={setLayout}
          activeGraphics={activeGraphics}
          toggleGraphic={toggleGraphic}
          telemetry={telemetry}
          script={activeScript}
          currentStepIndex={currentStepIndex}
          isScriptRunning={isScriptRunning}
          toggleScript={() => {
            if (!isScriptRunning) setCurrentStepIndex(0);
            setIsScriptRunning(!isScriptRunning);
          }}
          skipStep={() => {
            if (currentStepIndex < activeScript.steps.length - 1) {
              setCurrentStepIndex(idx => idx + 1);
            } else {
              setIsScriptRunning(false);
              setCurrentStepIndex(0);
            }
          }}
          isRemoteConnected={isRemoteConnected}
          toggleRemote={() => setIsRemoteConnected(!isRemoteConnected)}
        />
      </div>

      {/* Server Logs Overlay */}
      <AnimatePresence>
        {showServerLogs && (
          <motion.div 
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            className="fixed top-12 right-0 bottom-0 w-96 bg-panel border-l border-border z-40 flex flex-col shadow-2xl"
          >
            <div className="p-4 border-b border-border flex items-center justify-between bg-white/5">
              <h3 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                <Terminal size={14} className="text-accent-cyan" />
                Server Streaming Logs
              </h3>
              <button onClick={() => setShowServerLogs(false)} className="text-gray-500 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-[10px] space-y-1 bg-black/50">
              {serverLogs.length === 0 && <div className="text-gray-600 italic">No logs yet...</div>}
              {serverLogs.map(log => (
                <div key={log.id} className={`
                  ${log.type === 'error' ? 'text-accent-red' : ''}
                  ${log.type === 'success' ? 'text-accent-cyan' : ''}
                  ${log.type === 'ffmpeg' ? 'text-gray-500' : 'text-gray-300'}
                `}>
                  <span className="opacity-30 mr-2">[{new Date(log.id).toLocaleTimeString()}]</span>
                  {log.message}
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-border bg-black/20">
              <button 
                onClick={() => setServerLogs([])}
                className="w-full py-2 border border-border rounded text-[10px] uppercase font-bold hover:bg-white/5"
              >
                Clear Logs
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {showHardwareSetup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-panel border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-border flex items-center justify-between bg-white/5">
                <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                  <Settings size={16} className="text-accent-cyan" />
                  Hardware Setup
                </h2>
                <button onClick={() => setShowHardwareSetup(false)} className="text-gray-500 hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Primary Camera</label>
                  <select 
                    value={selectedVideoDevice}
                    onChange={(e) => setSelectedVideoDevice(e.target.value)}
                    className="w-full bg-black border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-cyan"
                  >
                    <option value="">None</option>
                    {devices.filter(d => d.kind === 'videoinput').map(d => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 4)}`}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Secondary Camera (Optional)</label>
                  <select 
                    value={selectedVideoDevice2}
                    onChange={(e) => setSelectedVideoDevice2(e.target.value)}
                    className="w-full bg-black border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-cyan"
                  >
                    <option value="">None</option>
                    {devices.filter(d => d.kind === 'videoinput').map(d => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 4)}`}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Microphone Source</label>
                  <select 
                    value={selectedAudioDevice}
                    onChange={(e) => setSelectedAudioDevice(e.target.value)}
                    className="w-full bg-black border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-cyan"
                  >
                    {devices.filter(d => d.kind === 'audioinput').map(d => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 4)}`}</option>
                    ))}
                  </select>
                </div>
                <button 
                  onClick={() => startCamera(selectedVideoDevice, selectedAudioDevice, selectedVideoDevice2)}
                  className="w-full bg-accent-cyan hover:bg-accent-cyan/80 text-black font-bold py-3 rounded-xl transition-all uppercase tracking-widest text-xs"
                >
                  Initialize Hardware
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showStreamSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-panel border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-border flex items-center justify-between bg-white/5">
                <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                  <Radio size={16} className="text-accent-red" />
                  Stream Settings
                </h2>
                <button onClick={() => setShowStreamSettings(false)} className="text-gray-500 hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">RTMP URL</label>
                  <input 
                    type="text"
                    value={rtmpUrl}
                    onChange={(e) => setRtmpUrl(e.target.value)}
                    className="w-full bg-black border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-cyan"
                    placeholder="rtmp://a.rtmp.youtube.com/live2"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Stream Key</label>
                  <input 
                    type="password"
                    value={streamKey}
                    onChange={(e) => setStreamKey(e.target.value)}
                    className="w-full bg-black border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-cyan"
                    placeholder="Paste your YouTube stream key here"
                  />
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowStreamSettings(false)}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition-all uppercase tracking-widest text-xs"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      setShowStreamSettings(false);
                      startStreaming();
                    }}
                    className="flex-1 bg-accent-red hover:bg-accent-red/80 text-white font-bold py-3 rounded-xl transition-all uppercase tracking-widest text-xs"
                  >
                    Start Broadcast
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Overlays */}
      <AnimatePresence>
        {aiSuggestion && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 right-80 z-50 w-80 bg-bg border border-accent-cyan/30 shadow-2xl rounded-lg overflow-hidden"
          >
            <div className="bg-accent-cyan/10 p-3 border-b border-accent-cyan/20 flex items-center gap-2">
              <Brain size={16} className="text-accent-cyan" />
              <span className="text-xs font-bold uppercase tracking-wider text-accent-cyan">AI Director Suggestion</span>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-white">Switch to <span className="font-bold text-accent-cyan">{aiSuggestion.scene}</span>?</p>
              <p className="text-[10px] text-gray-500 italic">"{aiSuggestion.reason}"</p>
              <div className="flex gap-2">
                <button 
                  onClick={executeAiSuggestion}
                  className="flex-1 bg-accent-cyan text-bg text-[10px] font-bold py-1.5 rounded-sm hover:bg-cyan-400 active:scale-95 transition-all"
                >
                  Execute
                </button>
                <button 
                  onClick={() => setAiSuggestion(null)}
                  className="flex-1 bg-gray-800 text-gray-400 text-[10px] font-bold py-1.5 rounded-sm hover:text-white active:scale-95 transition-all"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {showRecordingGallery && (
          <RecordingGallery 
            recordings={recordings} 
            onClose={() => setShowRecordingGallery(false)}
            onDelete={(id) => setRecordings(prev => prev.filter(r => r.id !== id))}
          />
        )}

        {showScriptEditor && (
          <ScriptEditor 
            script={activeScript}
            onClose={() => setShowScriptEditor(false)}
            onSave={(s) => {
              setActiveScript(s);
              setShowScriptEditor(false);
              setCurrentStepIndex(0);
              setIsScriptRunning(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Status Bar */}
      <div className="h-6 bg-bg border-t border-border flex items-center px-3 justify-between text-[10px] text-gray-500 font-medium">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-green" />
            System: Nominal
          </span>
          <span>Buffer: 0.2s</span>
        </div>
        <div className="flex items-center gap-4">
          <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
          <span className="text-gray-600">v1.0.4-stable</span>
        </div>
      </div>
    </div>
  );
}
