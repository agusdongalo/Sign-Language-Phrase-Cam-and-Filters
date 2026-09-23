import { useEffect, useRef, useState, useCallback } from 'react';
import {
  X,
  Camera,
  CameraOff,
  Eye,
  EyeOff,
  Hand,
  Image,
  MessageSquare,
  Scan,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface DemoModalProps {
  open: boolean;
  onClose: () => void;
}

type EffectKey = 'blur' | 'pixelate' | 'background' | 'signLanguage';

interface Effect {
  key: EffectKey;
  label: string;
  icon: React.ElementType;
  color: string;
  activeColor: string;
  description: string;
}

const effects: Effect[] = [
  {
    key: 'blur',
    label: 'Background Blur',
    icon: Eye,
    color: 'text-cyan-400',
    activeColor: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400',
    description: 'Blurs the entire feed to simulate background blur',
  },
  {
    key: 'pixelate',
    label: 'Pixelation',
    icon: Scan,
    color: 'text-pink-400',
    activeColor: 'bg-pink-500/20 border-pink-500/40 text-pink-400',
    description: 'Applies pixelation effect over the feed',
  },
  {
    key: 'background',
    label: 'Custom BG',
    icon: Image,
    color: 'text-amber-400',
    activeColor: 'bg-amber-500/20 border-amber-500/40 text-amber-400',
    description: 'Replaces background with a virtual scene',
  },
  {
    key: 'signLanguage',
    label: 'Sign Language',
    icon: MessageSquare,
    color: 'text-emerald-400',
    activeColor: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400',
    description: 'Detects and translates hand signs',
  },
];

export default function DemoModal({ open, onClose }: DemoModalProps) {
  const liveBackend = window.location.port === '5000';
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [liveFeedError, setLiveFeedError] = useState<string | null>(null);
  const [liveFeedConnected, setLiveFeedConnected] = useState(false);
  const [feedAttempt, setFeedAttempt] = useState(0);
  const [activeEffects, setActiveEffects] = useState<Record<EffectKey, boolean>>({
    blur: false,
    pixelate: false,
    background: false,
    signLanguage: false,
  });
  const [fullscreen, setFullscreen] = useState(false);
  const [signText, setSignText] = useState('');
  const [fps, setFps] = useState(0);

  const signPhrases = [
    'Hello 👋',
    'Thank you 🙏',
    'Yes ✅',
    'I understand 👍',
    'Peace ✌️',
    'Good job 👏',
    'Welcome 🤝',
  ];

  // Toggle an effect
  const toggleEffect = useCallback((key: EffectKey) => {
    setActiveEffects((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    if (liveBackend) {
      setCameraError(null);
      setLiveFeedError(null);
      setLiveFeedConnected(false);
      setFeedAttempt((attempt) => attempt + 1);
      setCameraActive(true);
      return;
    }

    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setCameraError('Camera access denied or unavailable. Please allow camera permissions.');
      setCameraActive(false);
    }
  }, [liveBackend]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setLiveFeedConnected(false);
    setCameraActive(false);
    cancelAnimationFrame(animFrameRef.current);
  }, []);

  // Pixelation render loop
  useEffect(() => {
    if (!cameraActive || !activeEffects.pixelate) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();
    let frameCount = 0;

    const draw = () => {
      if (!video.videoWidth) {
        animFrameRef.current = requestAnimationFrame(draw);
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const pixelSize = 12;
      // Draw small then scale up for pixelation
      const w = Math.ceil(canvas.width / pixelSize);
      const h = Math.ceil(canvas.height / pixelSize);

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(video, 0, 0, w, h);
      ctx.drawImage(canvas, 0, 0, w, h, 0, 0, canvas.width, canvas.height);

      // FPS counter
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = now;
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [cameraActive, activeEffects.pixelate]);

  // FPS counter for non-pixelate mode
  useEffect(() => {
    if (!cameraActive || activeEffects.pixelate) return;

    let lastTime = performance.now();
    let frameCount = 0;

    const count = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = now;
      }
      animFrameRef.current = requestAnimationFrame(count);
    };
    animFrameRef.current = requestAnimationFrame(count);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [cameraActive, activeEffects.pixelate]);

  // Sign language simulation
  useEffect(() => {
    if (!activeEffects.signLanguage || !cameraActive) {
      setSignText('');
      return;
    }
    const interval = setInterval(() => {
      setSignText(signPhrases[Math.floor(Math.random() * signPhrases.length)]);
    }, 2500);
    setSignText(signPhrases[0]);
    return () => clearInterval(interval);
  }, [activeEffects.signLanguage, cameraActive]);

  // Clean up on close
  useEffect(() => {
    if (!open) {
      stopCamera();
      setActiveEffects({ blur: false, pixelate: false, background: false, signLanguage: false });
      setFullscreen(false);
      setSignText('');
      setFps(0);
    }
  }, [open, stopCamera]);

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  // Build CSS filter for the video
  const videoFilters: string[] = [];
  if (activeEffects.blur) videoFilters.push('blur(8px)');

  const showVideo = cameraActive && !liveBackend && !activeEffects.pixelate;
  const showCanvas = cameraActive && activeEffects.pixelate;
  const showLiveFeed = cameraActive && liveBackend;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative z-10 flex flex-col bg-[#0c1020] border border-white/10 rounded-2xl shadow-2xl shadow-cyan-500/5 overflow-hidden transition-all duration-300 ${
          fullscreen
            ? 'w-full h-full rounded-none'
            : 'w-[95vw] max-w-5xl h-[90vh] max-h-[720px]'
        }`}
      >
        {/* Title bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#0f1528] border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <button
                onClick={onClose}
                className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors"
                title="Close"
              />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div className="flex items-center gap-2 ml-2">
              <Camera className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-semibold text-white">GesturGuard Demo</span>
            </div>
            {cameraActive && (!liveBackend || liveFeedConnected) && (
              <div className="flex items-center gap-2 ml-4">
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">Live</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                  {fps} FPS
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFullscreen((f) => !f)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              title={fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* Video Area */}
          <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
            {/* Virtual background overlay */}
            {activeEffects.background && cameraActive && (
              <div
                className="absolute inset-0 z-0"
                style={{
                  background:
                    'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
                }}
              >
                {/* Starfield */}
                <div className="absolute inset-0 opacity-60" style={{
                  backgroundImage: 'radial-gradient(1px 1px at 20px 30px, white, transparent), radial-gradient(1px 1px at 40px 70px, rgba(255,255,255,0.8), transparent), radial-gradient(1px 1px at 90px 40px, white, transparent), radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.6), transparent), radial-gradient(2px 2px at 160px 30px, white, transparent), radial-gradient(1px 1px at 200px 60px, rgba(255,255,255,0.7), transparent), radial-gradient(1px 1px at 50px 120px, white, transparent), radial-gradient(1px 1px at 100px 150px, rgba(255,255,255,0.5), transparent), radial-gradient(2px 2px at 250px 100px, white, transparent), radial-gradient(1px 1px at 300px 50px, rgba(255,255,255,0.9), transparent)',
                  backgroundSize: '350px 180px',
                }} />
                <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-violet-900/40 to-transparent" />
              </div>
            )}

            {/* Video element */}
            <video
              ref={videoRef}
              playsInline
              muted
              className={`w-full h-full object-cover transition-all duration-300 ${
                showVideo ? 'block' : 'hidden'
              } ${activeEffects.background ? 'relative z-10 mix-blend-luminosity opacity-80' : ''}`}
              style={{
                filter: videoFilters.length ? videoFilters.join(' ') : 'none',
                transform: 'scaleX(-1)',
              }}
            />

            <img
              src={showLiveFeed ? `/video_feed?attempt=${feedAttempt}` : undefined}
              alt="Live gesture-controlled camera feed"
              className={`w-full h-full object-cover ${showLiveFeed ? 'block' : 'hidden'}`}
              onLoad={() => {
                setLiveFeedError(null);
                setLiveFeedConnected(true);
              }}
              onError={() => {
                setLiveFeedConnected(false);
                setFps(0);
                setLiveFeedError(
                  'The Python camera stream could not start. Check macOS Camera permission for the app running Flask, close other camera apps, then try again.'
                );
              }}
            />

            {liveBackend && cameraActive && liveFeedError && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/90 px-6 text-center">
                <CameraOff className="w-10 h-10 text-red-400" />
                <p className="max-w-md text-sm text-red-300">{liveFeedError}</p>
                <button
                  onClick={startCamera}
                  className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-5 py-2.5 text-sm font-medium text-cyan-300 hover:bg-cyan-500/20"
                >
                  Retry Camera
                </button>
              </div>
            )}

            {/* Canvas for pixelation */}
            <canvas
              ref={canvasRef}
              className={`w-full h-full object-cover ${
                showCanvas ? 'block' : 'hidden'
              }`}
              style={{ transform: 'scaleX(-1)' }}
            />

            {/* Camera off placeholder */}
            {!cameraActive && (
              <div className="flex flex-col items-center gap-6 text-center px-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <Camera className="w-10 h-10 text-cyan-400" />
                  </div>
                  <div className="absolute -inset-2 rounded-full bg-cyan-500/5 blur-xl" />
                </div>
                {cameraError ? (
                  <>
                    <p className="text-red-400 text-sm max-w-sm">{cameraError}</p>
                    <button
                      onClick={startCamera}
                      className="px-6 py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium hover:bg-cyan-500/20 hover:border-cyan-400/40 transition-all"
                    >
                      Try Again
                    </button>
                  </>
                ) : (
                  <>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">Open Your Camera</h3>
                      <p className="text-sm text-slate-400 max-w-sm">
                        {liveBackend
                          ? 'The Python backend will process your camera feed and detect hand gestures.'
                          : 'Your video is processed entirely in-browser. Nothing is recorded or sent anywhere.'}
                      </p>
                    </div>
                    <button
                      onClick={startCamera}
                      className="group px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 text-[#0a0e1a] font-semibold text-sm hover:shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      Start Camera
                    </button>
                    <p className="text-[11px] text-slate-600">
                      {liveBackend
                        ? 'MediaPipe gesture detection · Local Flask server'
                        : '100% local · No data leaves your device'}
                    </p>
                  </>
                )}
              </div>
            )}

            {/* HUD overlays when camera is active */}
            {cameraActive && (
              <>
                {/* Active effects badges */}
                <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-20">
                  {effects.filter((e) => activeEffects[e.key]).map((e) => (
                    <span
                      key={e.key}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border ${e.activeColor} backdrop-blur-sm`}
                    >
                      {e.label}
                    </span>
                  ))}
                  {Object.values(activeEffects).every((v) => !v) && (
                    <span className="px-2.5 py-1 rounded-md bg-slate-500/20 border border-slate-500/20 text-slate-400 text-[10px] font-bold tracking-wider uppercase backdrop-blur-sm">
                      No Effects
                    </span>
                  )}
                </div>

                {/* Gesture detection indicator */}
                <div className="absolute top-4 right-4 z-20">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-violet-500/20 border border-violet-500/20 text-violet-400 text-[10px] font-bold tracking-wider uppercase backdrop-blur-sm">
                    <Hand className="w-3 h-3" />
                    🖐️ Gesture Ready
                  </span>
                </div>

                {/* Sign language output */}
                {activeEffects.signLanguage && signText && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 animate-fade-in-up">
                    <div className="px-6 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 backdrop-blur-md">
                      <div className="text-[10px] text-emerald-400/60 uppercase tracking-widest mb-1 font-medium">
                        Detected Sign
                      </div>
                      <div className="text-lg font-bold text-emerald-300 text-center">{signText}</div>
                    </div>
                  </div>
                )}

                {/* Scanning lines effect overlay */}
                <div
                  className="absolute inset-0 z-10 pointer-events-none opacity-[0.03]"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,229,255,0.3) 2px, rgba(0,229,255,0.3) 4px)',
                  }}
                />
              </>
            )}
          </div>

          {/* Sidebar Controls */}
          <div className="w-64 shrink-0 bg-[#0d1120] border-l border-white/5 flex flex-col overflow-y-auto">
            {/* Camera toggle */}
            <div className="p-4 border-b border-white/5">
              <button
                onClick={cameraActive ? stopCamera : startCamera}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                  cameraActive
                    ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20'
                    : 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-[#0a0e1a] hover:shadow-lg hover:shadow-cyan-500/20'
                }`}
              >
                {cameraActive ? (
                  <>
                    <CameraOff className="w-4 h-4" />
                    Stop Camera
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    Start Camera
                  </>
                )}
              </button>
            </div>

            {/* Effects toggles */}
            <div className="p-4 flex-1">
              <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-3">
                Privacy Effects
              </h4>
              <div className="space-y-2">
                {effects.map((e) => {
                  const active = activeEffects[e.key];
                  const IconComp = active ? EyeOff : e.icon;
                  return (
                    <button
                      key={e.key}
                      onClick={() => toggleEffect(e.key)}
                      disabled={!cameraActive || liveBackend}
                      className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-200 border ${
                        active
                          ? e.activeColor
                          : 'border-transparent text-slate-400 hover:bg-white/5 hover:text-white'
                      } ${!cameraActive || liveBackend ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <IconComp className="w-4.5 h-4.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{e.label}</div>
                        <div className="text-[10px] text-slate-500 truncate">{e.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Info */}
            <div className="p-4 border-t border-white/5">
              <div className="rounded-xl bg-cyan-500/5 border border-cyan-500/10 p-3">
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  <span className="text-cyan-400 font-medium">💡 Tip:</span>{' '}
                  {liveBackend
                    ? 'Live Python mode is active. Hold a gesture briefly and watch the camera overlay for the detected effect.'
                    : 'This is a browser preview. The full Python app includes ML-powered gesture detection for hands-free control.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
