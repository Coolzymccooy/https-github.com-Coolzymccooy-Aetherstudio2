export type Scene = {
  id: string;
  name: string;
  type: 'CAM' | 'SCREEN' | 'DUAL' | 'GRID' | 'PODCAST';
};

export type Source = {
  id: string;
  name: string;
  status: 'active' | 'standby' | 'offline';
  resolution: string;
  fps: number;
  audioLevel: number; // 0 to 1
};

export type Telemetry = {
  bitrate: string;
  fps: number;
  cpu: number;
  droppedFrames: number;
  network: 'excellent' | 'good' | 'fair' | 'poor';
};

export type ScriptStep = {
  id: string;
  sceneId: string;
  duration: number; // in seconds
  label: string;
  action?: string;
};

export type Script = {
  id: string;
  name: string;
  steps: ScriptStep[];
};

export type Recording = {
  id: string;
  timestamp: string;
  duration: string;
  size: string;
  thumbnail: string;
  fileName: string;
  url?: string;
};
