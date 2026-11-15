"use client";

import { useEffect, useRef } from "react";
export type Observation = { face: boolean; gaze: boolean; yaw: number; pitch: number; gazeX?: number; gazeY?: number; blinkStrength?: number; screenFeatures?: number[]; screenPoint?: {x:number;y:number} | null };
type Point = { x: number; y: number };
type Props = {
  deviceId: string;
  visible: boolean;
  onResult: (o: Observation) => void;
  onError: (message: string, source: "camera" | "tracking") => void;
  onCameraReady: (devices: MediaDeviceInfo[]) => void;
  onDevices: (devices: MediaDeviceInfo[]) => void;
  onReady: () => void;
};

function draw(ctx: CanvasRenderingContext2D, points: Float32Array, o: Observation) {
  ctx.clearRect(0, 0, 640, 480);
  if (!o.face) return;
  const point = (id: number): Point | undefined => points.length > id * 2 + 1 ? { x: points[id * 2], y: points[id * 2 + 1] } : undefined;
  const line = (ids: number[], color: string, close = false) => {
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2;
    ids.forEach((id, i) => { const p = point(id); if (p) { if (i === 0) ctx.moveTo(p.x * 640, p.y * 480); else ctx.lineTo(p.x * 640, p.y * 480); } });
    if (close) ctx.closePath(); ctx.stroke();
  };
  line([10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109], "#71cfff", true);
  line([33,160,158,133,153,144], "#b4f888", true);
  line([362,385,387,263,373,380], "#b4f888", true);
  line([469,470,471,472], "#ffda7a", true);
  line([474,475,476,477], "#ffda7a", true);
  line([168,6,197,195,5,4,1], "#71cfff");
  const nose = point(1);
  if (nose) {
    const x = nose.x * 640, y = nose.y * 480;
    ctx.strokeStyle = o.gaze ? "#ff947a" : "#71cfff"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(o.yaw * Math.PI / 180) * 150, y + Math.sin(o.pitch * Math.PI / 180) * 150 - 45); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.stroke();
  }
}

export default function FocusTracker(props: Props) {
  const video = useRef<HTMLVideoElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const callbacks = useRef(props);
  useEffect(() => { callbacks.current = props; });
  useEffect(() => {
    const preview = video.current;
    let disposed = false, stream: MediaStream | undefined, worker: Worker | undefined;
    let timer: ReturnType<typeof setInterval> | undefined, busy = false, ready = false, last = 0, lastFrameTime = -1, announced = false;
    const stopTracking = () => {
      if (timer) clearInterval(timer);
      const closing = worker; worker = undefined;
      if (closing) { closing.onmessage = null; closing.onerror = null; closing.postMessage({ type: "close" }); setTimeout(() => closing.terminate(), 150); }
    };
    const trackingError = (message: string) => { if (disposed) return; stopTracking(); callbacks.current.onError(message, "tracking"); };
    const cameraError = (e: unknown) => {
      if (disposed) return;
      stopTracking(); stream?.getTracks().forEach(t => t.stop());
      const name = e instanceof Error ? e.name : "Error";
      const advice: Record<string, string> = {
        NotAllowedError: "Camera access was denied. In Windows Settings > Privacy & security > Camera, enable Camera access and Let desktop apps access your camera, then retry.",
        NotFoundError: "No camera was found. Connect a webcam and retry.",
        NotReadableError: "The camera could not start. Close other camera apps, check its privacy shutter, and retry.",
        OverconstrainedError: "This camera does not support the requested settings. Choose another camera or use Default camera.",
      };
      callbacks.current.onError(advice[name] || "Camera could not start: " + String(e), "camera");
    };
    (async () => {
      try {
        const available = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        if (disposed) return;
        callbacks.current.onDevices(available.filter(d => d.kind === "videoinput"));
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 480 }, height: { ideal: 360 }, frameRate: { ideal: 15, max: 20 }, ...(props.deviceId ? { deviceId: { exact: props.deviceId } } : {}) }, audio: false });
        if (disposed) { stream.getTracks().forEach(t => t.stop()); return; }
        stream.getVideoTracks()[0].onended = () => cameraError(new Error("Camera disconnected. Reconnect it and retry."));
        const v = preview!; v.srcObject = stream; await v.play();
        if (disposed) { stream.getTracks().forEach(t => t.stop()); return; }
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        if (disposed) return;
        callbacks.current.onCameraReady(devices.filter(d => d.kind === "videoinput"));
        // Camera preview is independent of model initialization and remains visible on model failure.
        worker = new Worker("/tracking/worker.js");
        worker.onerror = () => trackingError("Tracking model failed to load. Camera preview is still available. Retry tracking.");
        worker.onmessage = ({ data }) => {
          if (disposed) return;
          busy = false; last = performance.now();
          if (data.type === "ready") ready = true;
          else if (data.type === "error") trackingError("Tracking model: " + data.message);
          else if (data.type === "result") {
            if (!announced) { callbacks.current.onReady(); announced = true; }
            callbacks.current.onResult({ face: data.face, gaze: data.gaze, yaw: data.yaw, pitch: data.pitch, gazeX: data.gazeX, gazeY: data.gazeY, blinkStrength: data.blinkStrength, screenFeatures:data.screenFeatures });
            const ctx = canvas.current?.getContext("2d");
            if (ctx && callbacks.current.visible && data.landmarks) { ctx.setTransform(.75, 0, 0, .75, 0, 0); draw(ctx, data.landmarks, data); }
          }
        };
        worker.postMessage({ type: "init", base: location.origin }); last = performance.now();
        timer = setInterval(async () => {
          if (disposed) return;
          if (performance.now() - last > 15000) { trackingError("Tracking timed out. Camera preview is still available. Retry tracking."); return; }
          if (!ready || busy || v.readyState < 2 || v.currentTime === lastFrameTime) return;
          if (!callbacks.current.visible && performance.now() - last < 100) return;
          busy = true; lastFrameTime = v.currentTime;
          try { const frame = await createImageBitmap(v); if (disposed || !worker) { frame.close(); return; } worker.postMessage({ type: "frame", frame, time: performance.now(), preview: callbacks.current.visible }, [frame]); }
          catch (e) { trackingError(String(e)); }
        }, 67);
      } catch (e) { cameraError(e); }
    })();
    return () => { disposed = true; stopTracking(); stream?.getTracks().forEach(t => t.stop()); if (preview) preview.srcObject = null; };
  }, [props.deviceId]);
  return <div className="camera"><video ref={video} autoPlay muted playsInline /><canvas ref={canvas} width={480} height={360} /></div>;
}
