import React, { useEffect, useRef } from 'react';
import { Scene, Source } from '../types';

interface CompositorProps {
  activeScene: Scene;
  sources: Source[];
  isStreaming: boolean;
  webcamStream: MediaStream | null;
  remoteStreams?: Map<string, MediaStream>;
  screenStream?: MediaStream | null;
  transitionType?: string;
  layout?: string;
}

export const Compositor: React.FC<CompositorProps> = ({ 
  activeScene, 
  sources, 
  isStreaming, 
  webcamStream,
  remoteStreams = new Map(),
  screenStream = null,
  transitionType = 'Cut',
  layout = 'Solo'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const requestRef = useRef<number>(0);
  
  // Transition state
  const prevSceneRef = useRef<Scene | null>(null);
  const transitionProgressRef = useRef<number>(1); // 1 = transition finished
  const lastSceneIdRef = useRef<string>(activeScene.id);

  useEffect(() => {
    if (activeScene.id !== lastSceneIdRef.current) {
      if (transitionType === 'Cut') {
        transitionProgressRef.current = 1;
      } else {
        // We'll just trigger a fade/wipe on the new scene
        transitionProgressRef.current = 0;
      }
      lastSceneIdRef.current = activeScene.id;
    }
  }, [activeScene, transitionType]);

  useEffect(() => {
    if (webcamStream) {
      const video = document.createElement('video');
      video.srcObject = webcamStream;
      video.muted = true;
      video.playsInline = true;
      video.play().catch(err => console.error('Compositor: Video play error:', err));
      videoRef.current = video;
      
      return () => {
        video.pause();
        video.srcObject = null;
      };
    } else {
      videoRef.current = null;
    }
  }, [webcamStream]);

  useEffect(() => {
    if (screenStream) {
      const video = document.createElement('video');
      video.srcObject = screenStream;
      video.muted = true;
      video.playsInline = true;
      video.play().catch(err => console.error('Compositor: Screen video play error:', err));
      screenVideoRef.current = video;
      
      return () => {
        video.pause();
        video.srcObject = null;
      };
    } else {
      screenVideoRef.current = null;
    }
  }, [screenStream]);

  useEffect(() => {
    // Sync remote video elements
    remoteStreams.forEach((stream, id) => {
      if (!remoteVideoRefs.current.has(id)) {
        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        video.play().catch(err => console.error('Compositor: Remote video play error:', err));
        remoteVideoRefs.current.set(id, video);
      }
    });

    // Cleanup old ones
    Array.from(remoteVideoRefs.current.keys()).forEach(id => {
      if (!remoteStreams.has(id)) {
        const v = remoteVideoRefs.current.get(id);
        if (v) {
          v.pause();
          v.srcObject = null;
        }
        remoteVideoRefs.current.delete(id);
      }
    });
  }, [remoteStreams]);

  const drawScene = (ctx: CanvasRenderingContext2D, scene: Scene, frameCount: number) => {
    const { width, height } = ctx.canvas;
    const remoteVideos = Array.from(remoteVideoRefs.current.values()) as HTMLVideoElement[];
    const screenVideo = screenVideoRef.current;

    if (scene.type === 'CAM') {
      const video = videoRef.current;
      const remoteVideo = remoteVideos[0];
      
      if (scene.name === 'Cam 2') {
        if (remoteVideo && remoteVideo.readyState >= 2) {
          ctx.drawImage(remoteVideo, 0, 0, width, height);
        } else if (remoteVideoRefs.current.has('local-cam-2')) {
          const local2 = remoteVideoRefs.current.get('local-cam-2');
          if (local2 && local2.readyState >= 2) ctx.drawImage(local2, 0, 0, width, height);
        } else {
          drawSimulatedFeed(ctx, 'REMOTE CAM 2', 0, 0, width, height, frameCount);
        }
      } else {
        if (video && video.readyState >= 2) {
          ctx.drawImage(video, 0, 0, width, height);
        } else {
          drawSimulatedFeed(ctx, 'LOCAL CAM 1', 0, 0, width, height, frameCount);
        }
      }
    } else if (scene.type === 'DUAL') {
      const video = videoRef.current;
      const remoteVideo = remoteVideos[0] || remoteVideoRefs.current.get('local-cam-2');
      
      if (layout === 'Side-by-Side' || layout === 'Solo') {
        if (video && video.readyState >= 2) {
          ctx.drawImage(video, 0, 0, width / 2, height);
        } else {
          drawSimulatedFeed(ctx, 'LOCAL CAM 1', 0, 0, width / 2, height, frameCount);
        }

        if (remoteVideo && remoteVideo.readyState >= 2) {
          ctx.drawImage(remoteVideo, width / 2, 0, width / 2, height);
        } else {
          drawSimulatedFeed(ctx, 'REMOTE CAM 2', width / 2, 0, width / 2, height, frameCount + 100);
        }
        
        ctx.strokeStyle = '#1F2A37';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width / 2, height);
        ctx.stroke();
      } else if (layout === 'Picture-in-Pic') {
        // Remote as background, local as PiP
        if (remoteVideo && remoteVideo.readyState >= 2) {
          ctx.drawImage(remoteVideo, 0, 0, width, height);
        } else {
          drawSimulatedFeed(ctx, 'REMOTE CAM 2', 0, 0, width, height, frameCount);
        }

        const pipW = width / 4;
        const pipH = height / 4;
        const pipX = width - pipW - 40;
        const pipY = height - pipH - 40;

        if (video && video.readyState >= 2) {
          ctx.drawImage(video, pipX, pipY, pipW, pipH);
        } else {
          drawSimulatedFeed(ctx, 'LOCAL CAM 1', pipX, pipY, pipW, pipH, frameCount + 200);
        }
        ctx.strokeStyle = '#00E5FF';
        ctx.lineWidth = 2;
        ctx.strokeRect(pipX, pipY, pipW, pipH);
      }
    } else if (scene.type === 'SCREEN') {
      if (screenVideo && screenVideo.readyState >= 2) {
        ctx.drawImage(screenVideo, 0, 0, width, height);
      } else {
        drawSimulatedFeed(ctx, 'Screen Share', 0, 0, width, height, frameCount, '#00E5FF');
      }
    } else if (scene.type === 'GRID') {
      const cols = 2;
      const rows = 2;
      const w = width / cols;
      const h = height / rows;
      const video = videoRef.current;
      for (let i = 0; i < 4; i++) {
        const x = (i % cols) * w;
        const y = Math.floor(i / cols) * h;
        if (i === 0 && video && video.readyState >= 2) {
           ctx.drawImage(video, x, y, w, h);
        } else if (i > 0 && remoteVideos[i-1] && remoteVideos[i-1].readyState >= 2) {
           ctx.drawImage(remoteVideos[i-1], x, y, w, h);
        } else {
          drawSimulatedFeed(ctx, `Source ${i + 1}`, x, y, w, h, frameCount + i * 50);
        }
      }
    } else if (scene.type === 'PODCAST') {
      const video = videoRef.current;
      const remoteVideo = remoteVideos[0] || remoteVideoRefs.current.get('local-cam-2');

      if (remoteVideo && remoteVideo.readyState >= 2) {
        ctx.drawImage(remoteVideo, 0, 0, width, height);
      } else {
        drawSimulatedFeed(ctx, 'GUEST (REMOTE)', 0, 0, width, height, frameCount);
      }

      const pipW = width / 4;
      const pipH = height / 4;
      const pipX = width - pipW - 40;
      const pipY = height - pipH - 40;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(pipX, pipY, pipW, pipH, 12);
      ctx.clip();
      
      if (video && video.readyState >= 2) {
        ctx.drawImage(video, pipX, pipY, pipW, pipH);
      } else {
        drawSimulatedFeed(ctx, 'HOST', pipX, pipY, pipW, pipH, frameCount + 200);
      }
      ctx.restore();

      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 2;
      ctx.strokeRect(pipX, pipY, pipW, pipH);
    }
  };

  const draw = (ctx: CanvasRenderingContext2D, frameCount: number) => {
    const { width, height } = ctx.canvas;

    // 1. Clear Background
    ctx.fillStyle = '#0B0F14';
    ctx.fillRect(0, 0, width, height);

    // 2. Handle Transitions
    if (transitionProgressRef.current < 1) {
      transitionProgressRef.current += 0.05; // 20 frames for transition (~0.6s at 30fps)
      if (transitionProgressRef.current > 1) transitionProgressRef.current = 1;

      const progress = transitionProgressRef.current;

      if (transitionType === 'Fade') {
        // Draw current scene with globalAlpha
        drawScene(ctx, activeScene, frameCount);
        ctx.fillStyle = `rgba(11, 15, 20, ${1 - progress})`;
        ctx.fillRect(0, 0, width, height);
      } else if (transitionType === 'Wipe') {
        drawScene(ctx, activeScene, frameCount);
        ctx.save();
        ctx.beginPath();
        ctx.rect(width * progress, 0, width * (1 - progress), height);
        ctx.clip();
        ctx.fillStyle = '#0B0F14';
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      } else {
        drawScene(ctx, activeScene, frameCount);
      }
    } else {
      drawScene(ctx, activeScene, frameCount);
    }

    // 3. Draw Overlays (Mock Graphics)
    drawOverlays(ctx, width, height, frameCount);

    // 4. Draw "Streaming" Indicator
    if (isStreaming) {
      ctx.fillStyle = '#FF4C4C';
      ctx.beginPath();
      ctx.arc(width - 30, 30, 6, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px Inter';
      ctx.textAlign = 'right';
      ctx.fillText('LIVE', width - 45, 34);
    }
  };

  const drawSimulatedFeed = (
    ctx: CanvasRenderingContext2D, 
    label: string, 
    x: number, 
    y: number, 
    w: number, 
    h: number, 
    frameCount: number,
    color: string = '#111821'
  ) => {
    // Background
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);

    // Dynamic pattern to simulate motion
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      const offset = (frameCount + i * 20) % w;
      ctx.beginPath();
      ctx.moveTo(x + offset, y);
      ctx.lineTo(x + offset, y + h);
      ctx.stroke();
    }

    // Label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = 'bold 14px IBM Plex Mono';
    ctx.textAlign = 'center';
    ctx.fillText(label.toUpperCase(), x + w / 2, y + h / 2);
    
    // Scanlines
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    for (let i = 0; i < h; i += 4) {
      ctx.fillRect(x, y + i, w, 1);
    }
  };

  const drawOverlays = (ctx: CanvasRenderingContext2D, width: number, height: number, frameCount: number) => {
    // Lower Third Mock
    const l3Width = 300;
    const l3Height = 60;
    const l3X = 50;
    const l3Y = height - 110;

    ctx.fillStyle = 'rgba(17, 24, 33, 0.8)';
    ctx.fillRect(l3X, l3Y, l3Width, l3Height);
    
    ctx.fillStyle = '#00E5FF';
    ctx.fillRect(l3X, l3Y, 4, l3Height);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px Inter';
    ctx.textAlign = 'left';
    ctx.fillText('AETHER STUDIO', l3X + 20, l3Y + 30);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '12px Inter';
    ctx.fillText('AI BROADCAST ENGINE v1.0', l3X + 20, l3Y + 50);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d', { alpha: false }); // Optimization: disable alpha
    if (!context) return;

    let frameCount = 0;
    let lastTime = 0;
    const fps = 30;
    const interval = 1000 / fps;

    const render = (time: number) => {
      const deltaTime = time - lastTime;
      
      if (deltaTime >= interval) {
        frameCount++;
        draw(context, frameCount);
        lastTime = time - (deltaTime % interval);
      }
      
      requestRef.current = requestAnimationFrame(render);
    };
    
    requestRef.current = requestAnimationFrame(render);

    return () => cancelAnimationFrame(requestRef.current);
  }, [activeScene, isStreaming, sources, webcamStream, remoteStreams, transitionType]);

  return (
    <canvas 
      ref={canvasRef} 
      width={1920} 
      height={1080} 
      className="w-full h-full object-contain bg-black"
    />
  );
};
