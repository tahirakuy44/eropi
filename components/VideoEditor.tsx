import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Subtitle, VisualizerSettings, VideoEditorHandle, TextSettings, ImageLayer, TextLayer } from '../types';

// Icons
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const PauseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>;
const StopIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>;
const RewindIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m11 17-5-5 5-5"/><path d="m18 17-5-5 5-5"/></svg>;
const ForwardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m13 17 5-5-5-5"/><path d="m6 17 5-5-5-5"/></svg>;

interface VideoEditorProps {
  images: ImageLayer[];
  textLayers: TextLayer[]; // Added text layers
  audioSrc: string | null;
  subtitles: Subtitle[];
  subtitleOffset: number;
  visualizerSettings: VisualizerSettings;
  textSettings: TextSettings;
  isPlaying: boolean;
  onPlayStateChange: (isPlaying: boolean) => void;
  onTimeUpdate: (currentTime: number) => void;
  onDurationChange: (duration: number) => void;
  onEnded: () => void;
  isRendering: boolean;
  onRenderComplete: (blob: Blob) => void;
  totalDuration?: number; 
}

// Helper: Cubic Ease Out for smooth sliding
const easeOutCubic = (x: number): number => {
  return 1 - Math.pow(1 - x, 3);
};

// Helper: Linear Interpolation
const lerp = (start: number, end: number, t: number) => {
  return start * (1 - t) + end * t;
};

// Helper: Parse Hex to RGB
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
};

// Helper: Interpolate Color
const lerpColor = (c1: string, c2: string, t: number) => {
  const color1 = hexToRgb(c1);
  const color2 = hexToRgb(c2);
  const r = Math.round(lerp(color1.r, color2.r, t));
  const g = Math.round(lerp(color1.g, color2.g, t));
  const b = Math.round(lerp(color1.b, color2.b, t));
  return `rgb(${r},${g},${b})`;
};

export const VideoEditor = React.memo(forwardRef<VideoEditorHandle, VideoEditorProps>(({
  images,
  textLayers,
  audioSrc,
  subtitles,
  subtitleOffset,
  visualizerSettings,
  textSettings,
  isPlaying,
  onPlayStateChange,
  onTimeUpdate,
  onDurationChange,
  onEnded,
  isRendering,
  onRenderComplete,
  totalDuration = 0
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationRef = useRef<number>(0);
  
  // Store loaded HTMLImageElements mapped by ID
  const [loadedBitmaps, setLoadedBitmaps] = useState<Record<string, HTMLImageElement>>({});
  
  const [showControls, setShowControls] = useState(false);
  const masterTimeRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1280, height: 720 });

  // Expose methods
  useImperativeHandle(ref, () => ({
    seek: (time: number) => {
      if (audioRef.current) audioRef.current.currentTime = time;
      masterTimeRef.current = time;
      onTimeUpdate(time);
    },
    stop: () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      masterTimeRef.current = 0;
      onPlayStateChange(false);
      onTimeUpdate(0);
    },
    play: () => {
      if (audioRef.current) audioRef.current.play().catch(console.error);
      onPlayStateChange(true);
    },
    pause: () => {
      audioRef.current?.pause();
      onPlayStateChange(false);
    },
    getCurrentTime: () => masterTimeRef.current
  }));

  // Internal Handlers
  const handleOverlayPlayToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlayStateChange(!isPlaying);
  };

  const handleOverlayStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    masterTimeRef.current = 0;
    onPlayStateChange(false);
    onTimeUpdate(0);
  };

  const handleOverlaySeek = (e: React.MouseEvent, seconds: number) => {
    e.stopPropagation();
    let newTime = masterTimeRef.current + seconds;
    newTime = Math.max(0, newTime);
    if (audioRef.current) audioRef.current.currentTime = newTime;
    masterTimeRef.current = newTime;
    onTimeUpdate(newTime);
  };

  // Preload Images
  useEffect(() => {
    const loadImages = async () => {
        const newBitmaps: Record<string, HTMLImageElement> = {};
        const promises = images.map(img => {
            return new Promise<void>((resolve) => {
                if (loadedBitmaps[img.id]) {
                    newBitmaps[img.id] = loadedBitmaps[img.id];
                    resolve();
                } else {
                    const imageObj = new Image();
                    imageObj.src = img.src;
                    imageObj.onload = () => {
                        newBitmaps[img.id] = imageObj;
                        resolve();
                    };
                    imageObj.onerror = () => resolve(); // continue even if error
                }
            });
        });
        await Promise.all(promises);
        setLoadedBitmaps(newBitmaps);
    };
    loadImages();
  }, [images]);

  // Audio Duration Listener
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
        onDurationChange(audio.duration);
      }
    };
    if (audio.readyState >= 1) handleLoadedMetadata();
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleLoadedMetadata);
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleLoadedMetadata);
    };
  }, [audioSrc, onDurationChange]);

  // Audio Context Setup
  useEffect(() => {
    if (!audioSrc || !audioRef.current) return;
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioCtx();
    }
    const ctx = audioContextRef.current;
    if (!analyserRef.current) {
      analyserRef.current = ctx.createAnalyser();
      analyserRef.current.fftSize = 1024; 
    }
    if (!sourceRef.current) {
      sourceRef.current = ctx.createMediaElementSource(audioRef.current);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(ctx.destination);
    }
    if (!destRef.current) {
      destRef.current = ctx.createMediaStreamDestination();
      sourceRef.current.connect(destRef.current);
    }
  }, [audioSrc]);

  // Sync Play State
  useEffect(() => {
    if (audioRef.current && audioContextRef.current) {
      if (isPlaying) {
        if (audioContextRef.current.state === 'suspended') audioContextRef.current.resume();
        audioRef.current.play().catch(e => {
            console.error("Play error", e);
            onPlayStateChange(false);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, onPlayStateChange]);

  // Recording Logic
  useEffect(() => {
    if (isRendering && canvasRef.current && destRef.current) {
      const canvasStream = canvasRef.current.captureStream(30); 
      const audioStream = destRef.current.stream;
      const combinedStream = new MediaStream([...canvasStream.getVideoTracks(), ...audioStream.getAudioTracks()]);
      const options = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? { mimeType: 'video/webm;codecs=vp9' } : { mimeType: 'video/webm' };
      
      const recorder = new MediaRecorder(combinedStream, options);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const fullBlob = new Blob(chunksRef.current, { type: 'video/webm' });
        onRenderComplete(fullBlob);
      };

      masterTimeRef.current = 0;
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
      recorder.start();
    } else if (!isRendering && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      if (audioRef.current) audioRef.current.pause();
    }
  }, [isRendering]);

  // --- DRAW LOOP ---
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const analyser = analyserRef.current;
    const audio = audioRef.current;

    if (!canvas || !ctx) return;

    // Time Update & Auto-Stop Logic
    if (audio && audio.readyState >= 1) {
        if (!audio.paused) {
             masterTimeRef.current = audio.currentTime;
        }

        if (isPlaying) {
             const isAudioEnded = audio.ended;
             const isTimeLimitReached = totalDuration > 0 && masterTimeRef.current >= totalDuration;
             
             if (isAudioEnded || isTimeLimitReached) {
                 onEnded();
             }
        }
    }
    onTimeUpdate(masterTimeRef.current);
    const time = masterTimeRef.current;

    // Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Prepare Audio Data for Beat Detection
    let beatScale = 1.0;
    if (analyser && isPlaying) {
         const bufferLength = analyser.frequencyBinCount;
         const dataArray = new Uint8Array(bufferLength);
         analyser.getByteFrequencyData(dataArray);
         
         // Simple bass average (first 10 bins)
         let bassSum = 0;
         const bassBins = 10;
         for(let i=0; i<bassBins; i++) bassSum += dataArray[i];
         const avgBass = bassSum / bassBins;
         // Normalize 0-255 to 1.0-1.5 range for scale
         beatScale = 1 + (avgBass / 255) * 0.3; 
    }

    // 1. Draw Images (Layers)
    images.forEach(layer => {
        const bitmap = loadedBitmaps[layer.id];
        if (bitmap) {
            ctx.save();
            
            let drawX = layer.x;
            let drawY = layer.y;
            let drawScale = layer.scale;
            let drawRot = (layer.rotation * Math.PI) / 180;

            if (isPlaying) {
                const speed = layer.animationSpeed || 1;
                const amp = layer.animationAmp || 20;

                switch (layer.animation) {
                    case 'spin': drawRot += time * speed; break;
                    case 'float-v': drawY += Math.sin(time * speed * 2) * amp; break;
                    case 'float-h': drawX += Math.sin(time * speed * 2) * amp; break;
                    case 'pulse': drawScale *= 1 + (Math.sin(time * speed * 3) * 0.01 * amp); break;
                    case 'wiggle': drawRot += Math.sin(time * speed * 15) * (amp * 0.005); break;
                    case 'beat-zoom': drawScale *= (1 + (beatScale - 1) * speed); break; // Basic beat zoom for images
                }
            }

            ctx.translate(drawX, drawY);
            ctx.rotate(drawRot);
            ctx.scale(drawScale, drawScale);
            ctx.globalAlpha = layer.opacity;

            ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
            ctx.restore();
        }
    });

    // 1.5 Draw Text Layers (With Kinetic Typography)
    textLayers.forEach(layer => {
        ctx.save();

        let drawX = layer.x;
        let drawY = layer.y;
        let drawScale = 1;
        let drawRot = (layer.rotation * Math.PI) / 180;
        let drawOpacity = layer.opacity;
        let shadowBlur = layer.shadowBlur;
        let shadowColor = layer.shadowColor || 'black';

        // Apply animations
        if (isPlaying) {
            const speed = layer.animationSpeed || 1;
            const amp = layer.animationAmp || 20;

            switch (layer.animation) {
                case 'spin': drawRot += time * speed; break;
                case 'float-v': drawY += Math.sin(time * speed * 2) * amp; break;
                case 'float-h': drawX += Math.sin(time * speed * 2) * amp; break;
                case 'pulse': drawScale *= 1 + (Math.sin(time * speed * 3) * 0.01 * amp); break;
                case 'wiggle': drawRot += Math.sin(time * speed * 15) * (amp * 0.005); break;
                case 'beat-zoom': 
                    // Use calculated beat scale
                     drawScale *= (1 + (beatScale - 1) * speed * (amp/50));
                     break;
                case 'neon':
                     shadowColor = layer.color;
                     shadowBlur = 20 + Math.sin(time * speed * 10) * 15;
                     break;
            }
        }

        ctx.translate(drawX, drawY);
        ctx.rotate(drawRot);
        ctx.scale(drawScale, drawScale);
        ctx.globalAlpha = drawOpacity;
        
        ctx.font = `700 ${layer.fontSize}px ${layer.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Shadow Setup
        if (shadowBlur > 0 || layer.animation === 'neon') {
            ctx.shadowColor = shadowColor;
            ctx.shadowBlur = shadowBlur;
        }

        // Render Logic based on Kinetic Type
        const speed = layer.animationSpeed || 1;
        const amp = layer.animationAmp || 20;

        if (layer.animation === 'wave') {
             // Wave Text: Render per character with Y offset
             const text = layer.text;
             const metrics = ctx.measureText(text);
             const totalWidth = metrics.width;
             
             // Estimate char width (approx) to center characters
             // A better way is to accumulate widths
             let currentX = -totalWidth / 2;
             
             // Turn off shadow for individual chars to prevent heavy overlapping shadows, 
             // or keep it if "neon" is not active. 
             // For wave, let's keep it simple.
             
             ctx.fillStyle = layer.color;
             
             for (let i = 0; i < text.length; i++) {
                 const char = text[i];
                 const charWidth = ctx.measureText(char).width;
                 const charX = currentX + charWidth / 2;
                 
                 // Kinetic Wave Calculation
                 const waveOffset = isPlaying ? Math.sin((time * speed * 5) + (i * 0.5)) * amp : 0;
                 
                 ctx.fillText(char, charX, waveOffset);
                 currentX += charWidth;
             }
        } else if (layer.animation === 'glitch') {
             // Glitch Effect: Draw offset RGB channels randomly
             const text = layer.text;
             
             if (isPlaying && Math.random() > 0.85) { // Random glitch trigger
                 // Red Channel Offset
                 ctx.save();
                 ctx.globalAlpha = drawOpacity * 0.8;
                 ctx.fillStyle = 'red';
                 const offX = (Math.random() - 0.5) * amp;
                 const offY = (Math.random() - 0.5) * amp;
                 ctx.fillText(text, offX, offY);
                 ctx.restore();

                 // Cyan Channel Offset
                 ctx.save();
                 ctx.globalAlpha = drawOpacity * 0.8;
                 ctx.fillStyle = 'cyan';
                 const offX2 = (Math.random() - 0.5) * amp;
                 const offY2 = (Math.random() - 0.5) * amp;
                 ctx.fillText(text, offX2, offY2);
                 ctx.restore();
                 
                 // Main Text (White-ish/Original)
                 ctx.fillStyle = layer.color;
                 ctx.fillText(text, 0, 0);
             } else {
                 ctx.fillStyle = layer.color;
                 ctx.fillText(text, 0, 0);
             }
        } else if (layer.animation === 'typewriter') {
             // Typewriter: Substring based on time (looping every 5 seconds or based on speed)
             const text = layer.text;
             // Determine how many chars to show. 
             // Let's assume typing speed = 10 chars per second * animationSpeed
             // Use modulus to loop it or just play once? 
             // "Kinetic" usually implies looping or persistent effect in this context since we lack a timeline start.
             const loopDuration = (text.length / (10 * speed)) + 2; // +2s pause
             const cycleTime = time % loopDuration;
             const charCount = Math.floor(cycleTime * 10 * speed);
             
             const textToShow = text.substring(0, charCount);
             
             ctx.fillStyle = layer.color;
             ctx.fillText(textToShow, 0, 0);
             
             // Blinking cursor
             if (cycleTime < text.length / (10 * speed)) {
                 const metrics = ctx.measureText(textToShow);
                 const cursorX = metrics.width / 2 + 5; // Rough approximation since we are center aligned.
                 // Actually center alignment makes typewriter hard because the text block shifts.
                 // Let's switch align to left for typewriter temporarily?
                 // No, easier to just draw the whole substring centered.
             }
        } else {
             // Standard Render
             ctx.fillStyle = layer.color;
             ctx.fillText(layer.text, 0, 0);
        }

        ctx.restore();
    });
    
    // Draw Dark Overlay for readability if images exist
    if (images.length > 0) {
         ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
         ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 2. Draw Spectrum Visualizer
    if (analyser && visualizerSettings.enabled) {
      ctx.save();
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      const posX = (visualizerSettings.x / 100) * canvas.width;
      const posY = (visualizerSettings.y / 100) * canvas.height;
      const scale = visualizerSettings.scale || 1.0;

      ctx.translate(posX, posY);
      ctx.scale(scale, scale);

      ctx.shadowBlur = visualizerSettings.shadowBlur ?? 0;
      ctx.shadowColor = visualizerSettings.barColor;
      ctx.globalAlpha = visualizerSettings.fillAlpha ?? 1.0;
      ctx.strokeStyle = visualizerSettings.barColor;
      ctx.fillStyle = visualizerSettings.barColor;

      if (visualizerSettings.type === 'bars') {
        const BAR_COUNT = visualizerSettings.barCount || 40; 
        const TOTAL_WIDTH = 800;
        const GAP_RATIO = visualizerSettings.gap ?? 0.3;
        const BAR_WIDTH = (TOTAL_WIDTH / BAR_COUNT) * (1 - GAP_RATIO);
        const SPACING = TOTAL_WIDTH / BAR_COUNT;
        const START_X = -(TOTAL_WIDTH / 2);
        const usableLength = Math.floor(bufferLength * 0.75); 
        const step = usableLength / BAR_COUNT;

        for (let i = 0; i < BAR_COUNT; i++) {
            let sum = 0;
            let count = 0;
            const startBin = Math.floor(i * step);
            const endBin = Math.floor((i + 1) * step);
            for (let j = startBin; j < endBin; j++) {
                if (dataArray[j] !== undefined) {
                    sum += dataArray[j];
                    count++;
                }
            }
            let average = count > 0 ? sum / count : 0;
            const boost = 1 + (i / BAR_COUNT) * 1.5; 
            average = Math.min(average * boost, 255);
            const baseHeight = 25; 
            const dynamicHeight = (average / 255) * visualizerSettings.sensitivity * 180;
            const totalHeight = baseHeight + dynamicHeight;
            const x = START_X + (i * SPACING);
            const y = -totalHeight / 2; 
            const radius = visualizerSettings.roundness ?? 50;
            if (ctx.roundRect) {
                ctx.beginPath();
                ctx.roundRect(x, y, BAR_WIDTH, totalHeight, radius); 
                ctx.fill();
            } else {
                ctx.fillRect(x, y, BAR_WIDTH, totalHeight);
            }
        }
      } else if (visualizerSettings.type === 'circular') {
        const radius = 90; 
        const bars = visualizerSettings.barCount || 64; 
        const circumference = 2 * Math.PI * radius;
        const barSpace = circumference / bars;
        const width = Math.max(2, barSpace * (1 - (visualizerSettings.gap || 0.3)));
        
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        const usableLen = Math.floor(bufferLength * 0.75);
        const step = usableLen / bars;

        for (let i = 0; i < bars; i++) {
            const angle = (i / bars) * (Math.PI * 2) - (Math.PI / 2); 
            const dataIndex = Math.floor(i * step);
            const value = dataArray[dataIndex] || 0;
            const boost = 1 + (i / bars) * 0.5;
            const amp = Math.min(255, value * boost);
            const barHeight = (amp / 255) * 150 * visualizerSettings.sensitivity;
            const h = Math.max(4, barHeight);
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const x1 = cos * radius;
            const y1 = sin * radius;
            const x2 = cos * (radius + h);
            const y2 = sin * (radius + h);
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
        }
        ctx.stroke();
      } else {
        ctx.lineWidth = 3;
        ctx.beginPath();
        const sliceWidth = 800 * 1.0 / bufferLength;
        let x = -400;
        for(let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = (v - 1) * 100 * visualizerSettings.sensitivity;
            if(i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            x += sliceWidth;
        }
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      ctx.globalAlpha = 1.0;
      ctx.restore();
    }

    // 3. Draw Subtitles
    const effectiveTime = masterTimeRef.current;
    let activeIndex = -1;
    let maxStartTime = -Infinity;

    for (let i = 0; i < subtitles.length; i++) {
        const s = subtitles[i];
        const start = s.startTime + subtitleOffset;
        const end = s.endTime + subtitleOffset;
        if (effectiveTime >= start && effectiveTime <= end + 1.0) {
            if (s.startTime > maxStartTime) {
                maxStartTime = s.startTime;
                activeIndex = i;
            }
        }
    }
    
    const renderText = (text: string, fontSize: number, color: string, yPos: number, opacity: number, isPrimary: boolean) => {
        if (opacity <= 0.01) return;
        ctx.globalAlpha = opacity;
        ctx.font = `700 ${fontSize}px ${textSettings.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const maxWidth = canvas.width * 0.9;
        const words = text.split(' ');
        let line = '';
        const lines = [];
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
                lines.push(line);
                line = words[n] + ' ';
            } else {
                line = testLine;
            }
        }
        lines.push(line);
        const lineHeight = fontSize * 1.4;
        const blockHeight = (lines.length - 1) * lineHeight;
        const startY = yPos - blockHeight;

        lines.forEach((l, i) => {
            const lineY = startY + (i * lineHeight);
            if (isPrimary) {
                ctx.shadowColor = 'black';
                ctx.shadowBlur = 0;
                ctx.strokeStyle = 'black';
                ctx.lineWidth = Math.max(2, fontSize * 0.125); 
                ctx.lineJoin = 'round';
                ctx.strokeText(l, canvas.width / 2, lineY);
                ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
                ctx.shadowBlur = 8;
                ctx.shadowOffsetX = 3;
                ctx.shadowOffsetY = 3;
            } else {
                ctx.shadowColor = 'transparent';
                ctx.strokeStyle = 'rgba(0,0,0,0.5)';
                ctx.lineWidth = Math.max(2, fontSize * 0.1);
                ctx.strokeText(l, canvas.width / 2, lineY);
            }
            ctx.fillStyle = color;
            ctx.fillText(l, canvas.width / 2, lineY);
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        });
        ctx.globalAlpha = 1.0;
    };

    const POS_EXIT = canvas.height - 350;
    const POS_PREV = canvas.height - 260;
    const POS_PRIMARY = canvas.height - 160;
    const POS_NEXT = canvas.height - 80;
    const TRANSITION_DURATION = 0.5;

    if (activeIndex !== -1) {
        const currentSub = subtitles[activeIndex];
        const actualStart = currentSub.startTime + subtitleOffset;
        const timeSinceStart = effectiveTime - actualStart;
        const isTransitioning = timeSinceStart < TRANSITION_DURATION;
        const t = isTransitioning ? easeOutCubic(timeSinceStart / TRANSITION_DURATION) : 1;

        let curY = lerp(POS_NEXT, POS_PRIMARY, t);
        let curSize = lerp(textSettings.secondaryFontSize, textSettings.primaryFontSize, t);
        let curColor = lerpColor(textSettings.secondaryColor, textSettings.primaryColor, t);
        renderText(currentSub.text, curSize, curColor, curY, 1, true);

        if (activeIndex > 0) {
            const prevSub = subtitles[activeIndex - 1];
            let prevY = lerp(POS_PRIMARY, POS_PREV, t);
            let prevSize = lerp(textSettings.primaryFontSize, textSettings.secondaryFontSize, t);
            let prevColor = lerpColor(textSettings.primaryColor, textSettings.secondaryColor, t);
            renderText(prevSub.text, prevSize, prevColor, prevY, 1, false);
        }

        if (activeIndex > 1 && isTransitioning) {
            const oldPrev = subtitles[activeIndex - 2];
            let exitY = lerp(POS_PREV, POS_EXIT, t);
            let exitOpacity = lerp(1, 0, t);
            renderText(oldPrev.text, textSettings.secondaryFontSize, textSettings.secondaryColor, exitY, exitOpacity, false);
        }

        if (activeIndex + 1 < subtitles.length) {
            const nextSub = subtitles[activeIndex + 1];
            if (nextSub.startTime - currentSub.endTime < 15.0) {
                let nextY = lerp(POS_NEXT + 50, POS_NEXT, t);
                let nextOpacity = lerp(0, 1, t);
                renderText(nextSub.text, textSettings.secondaryFontSize, textSettings.secondaryColor, nextY, nextOpacity, false);
            }
        }
    }

    animationRef.current = requestAnimationFrame(draw);
  }, [loadedBitmaps, visualizerSettings, subtitles, subtitleOffset, textSettings, onTimeUpdate, onEnded, isPlaying, totalDuration, images, textLayers]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(draw);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [draw]);

  return (
    <div 
      className="relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-2xl border border-gray-800 group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
        <canvas 
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="w-full h-full object-contain"
        />
        <audio 
            ref={audioRef} 
            src={audioSrc || undefined} 
            crossOrigin="anonymous" 
            className="hidden"
        />
        
        {images.length === 0 && !audioSrc && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                <p>Load Image and Audio to Start</p>
            </div>
        )}

        {/* ON-CANVAS CONTROLS OVERLAY */}
        {audioSrc && (
          <div className={`absolute inset-0 bg-black/40 flex flex-col justify-end items-center transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
               <button 
                  onClick={handleOverlayPlayToggle}
                  className="w-20 h-20 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-transform transform hover:scale-110 pointer-events-auto"
               >
                 {isPlaying ? <PauseIcon /> : <PlayIcon />}
               </button>
            </div>
            <div className="w-full bg-gradient-to-t from-black/90 to-transparent p-6 pb-8 flex items-center justify-center gap-6 pointer-events-auto">
               <button 
                onClick={(e) => handleOverlaySeek(e, -10)}
                className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition"
               >
                 <RewindIcon />
               </button>
               <button 
                 onClick={handleOverlayStop}
                 className="p-3 bg-red-600/80 hover:bg-red-500 text-white rounded-full transition shadow-lg shadow-red-900/50"
               >
                 <StopIcon />
               </button>
               <button 
                onClick={(e) => handleOverlaySeek(e, 10)}
                className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition"
               >
                 <ForwardIcon />
               </button>
            </div>
          </div>
        )}
    </div>
  );
}));
