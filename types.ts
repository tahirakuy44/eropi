
export interface Subtitle {
  startTime: number;
  endTime: number;
  text: string;
}

export type AnimationType = 'none' | 'spin' | 'float-v' | 'float-h' | 'pulse' | 'wiggle' | 'typewriter' | 'glitch' | 'wave' | 'neon' | 'beat-zoom';

export interface ImageLayer {
  id: string;
  src: string; // Blob URL
  name: string;
  x: number; // Center X (pixels relative to canvas)
  y: number; // Center Y (pixels relative to canvas)
  scale: number;
  rotation: number; // Static rotation (degrees)
  opacity: number;
  animation: AnimationType;
  animationSpeed: number; // 0.1 - 5.0
  animationAmp: number; // Amplitude (pixels or degrees)
}

export interface TextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  opacity: number;
  rotation: number;
  shadowColor: string;
  shadowBlur: number;
  animation: AnimationType;
  animationSpeed: number;
  animationAmp: number;
}

export interface VisualizerSettings {
  enabled: boolean; // New: Toggle visualizer on/off
  barColor: string;
  type: 'bars' | 'wave' | 'circular';
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  scale: number; // Multiplier 0.1-5
  sensitivity: number; // 0.1 - 5.0
  
  // New Expanded Settings
  barCount: number; // 10 - 100
  gap: number; // 0 - 1.0 (ratio)
  roundness: number; // 0 - 50 (px)
  shadowBlur: number; // 0 - 50 (px)
  fillAlpha: number; // 0.1 - 1.0
}

export interface TextSettings {
  fontFamily: string;
  primaryFontSize: number;
  primaryColor: string;
  secondaryFontSize: number;
  secondaryColor: string;
}

export interface EditorState {
  images: ImageLayer[]; 
  textLayers: TextLayer[]; // New text layers
  activeImageId: string | null; 
  activeTextLayerId: string | null; // Track selected text layer
  audioSrc: string | null;
  audioFile: File | null; 
  subtitles: Subtitle[];
  subtitleOffset: number; 
  isGeneratingSubtitles: boolean;
  isRendering: boolean;
  isPlaying: boolean;
  visualizer: VisualizerSettings;
  textSettings: TextSettings;
}

export interface VideoEditorHandle {
  seek: (time: number) => void;
  stop: () => void;
  play: () => void;
  pause: () => void;
  getCurrentTime: () => number;
}
