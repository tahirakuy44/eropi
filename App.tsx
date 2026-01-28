import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { EditorState, VisualizerSettings, VideoEditorHandle, Subtitle, TextSettings, ImageLayer, AnimationType, TextLayer } from './types';
import { VideoEditor } from './components/VideoEditor';
import { generateSubtitles } from './services/geminiService';
import { Button } from './components/Button';

// Icons
const UploadIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2 2H5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const MusicIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>;
const PlayIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const PauseIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>;
const StopIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/></svg>;
const RewindIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m11 17-5-5 5-5"/><path d="m18 17-5-5 5-5"/></svg>;
const ForwardIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m13 17 5-5-5-5"/><path d="m6 17 5-5-5-5"/></svg>;
const SparklesIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M9 3v4"/><path d="M3 5h4"/><path d="M3 9h4"/></svg>;
const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
const LayersIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>;
const TypeIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>;
const TapIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>;

const AVAILABLE_FONTS = [
  { name: 'Sans Serif', value: 'sans-serif' },
  { name: 'Serif', value: 'serif' },
  { name: 'Monospace', value: 'monospace' },
  { name: 'Cursive', value: 'cursive' },
  { name: 'Fantasy', value: 'fantasy' },
  { name: 'Impact', value: 'Impact, sans-serif' },
  { name: 'Arial', value: 'Arial, sans-serif' },
  { name: 'Courier New', value: '"Courier New", monospace' },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'Verdana', value: 'Verdana, sans-serif' },
];

const ANIMATION_TYPES: { label: string, value: AnimationType }[] = [
    { label: 'None', value: 'none' },
    { label: 'Spin', value: 'spin' },
    { label: 'Float Up/Down', value: 'float-v' },
    { label: 'Float Left/Right', value: 'float-h' },
    { label: 'Pulse', value: 'pulse' },
    { label: 'Wiggle', value: 'wiggle' },
    // Kinetic Typography Options
    { label: 'Typewriter', value: 'typewriter' },
    { label: 'Glitch (RGB)', value: 'glitch' },
    { label: 'Wave Text', value: 'wave' },
    { label: 'Neon Flicker', value: 'neon' },
    { label: 'Beat Zoom (Audio)', value: 'beat-zoom' },
];

export default function App() {
  const [state, setState] = useState<EditorState>({
    images: [], 
    textLayers: [],
    activeImageId: null,
    activeTextLayerId: null,
    audioSrc: null,
    audioFile: null,
    subtitles: [],
    subtitleOffset: 0,
    isGeneratingSubtitles: false,
    isRendering: false,
    isPlaying: false,
    visualizer: {
      enabled: true, 
      barColor: '#22c55e', 
      type: 'bars',
      x: 50,
      y: 50,
      scale: 1.0,
      sensitivity: 1.5,
      barCount: 40,
      gap: 0.3,
      roundness: 50,
      shadowBlur: 0,
      fillAlpha: 1.0
    },
    textSettings: {
      fontFamily: 'sans-serif',
      primaryFontSize: 48,
      primaryColor: '#ffffff',
      secondaryFontSize: 32,
      secondaryColor: '#9ca3af'
    }
  });

  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  // Derived state: Calculate Total Duration
  const totalDuration = useMemo(() => {
    const audioDur = audioDuration > 0 ? audioDuration : 0;
    const maxSubTime = state.subtitles.length > 0 
      ? Math.max(...state.subtitles.map(s => s.endTime)) + state.subtitleOffset 
      : 0;
    return Math.max(audioDur, maxSubTime + (maxSubTime > audioDur ? 1 : 0));
  }, [audioDuration, state.subtitles, state.subtitleOffset]);
  
  // Tap to Sync State
  const [isRecordingTiming, setIsRecordingTiming] = useState(false);
  
  const editorRef = useRef<VideoEditorHandle>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastActiveIndexRef = useRef<number>(-1);

  // File Handlers
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const newImage: ImageLayer = {
          id: Date.now().toString(),
          src: url,
          name: file.name.substring(0, 15),
          x: 640, 
          y: 360, 
          scale: 0.5,
          rotation: 0,
          opacity: 1,
          animation: 'none',
          animationSpeed: 1,
          animationAmp: 20
      };
      setState(prev => ({ 
          ...prev, 
          images: [...prev.images, newImage],
          activeImageId: newImage.id,
          activeTextLayerId: null // Deselect text
      }));
    }
    e.target.value = '';
  };

  const handleAddTextLayer = () => {
      const newText: TextLayer = {
          id: Date.now().toString(),
          text: "Kinetic Text",
          x: 640,
          y: 200,
          fontSize: 80,
          fontFamily: 'Impact, sans-serif',
          color: '#ffffff',
          opacity: 1,
          rotation: 0,
          shadowBlur: 0,
          shadowColor: '#000000',
          animation: 'none',
          animationSpeed: 1,
          animationAmp: 20
      };
      setState(prev => ({
          ...prev,
          textLayers: [...prev.textLayers, newText],
          activeTextLayerId: newText.id,
          activeImageId: null // Deselect image
      }));
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setState(prev => ({ ...prev, audioSrc: url, audioFile: file, subtitles: [], subtitleOffset: 0 }));
      setAudioDuration(0); 
      setCurrentTime(0);
    }
  };

  // Image Layer Management
  const updateActiveImage = (field: keyof ImageLayer, value: any) => {
      if (!state.activeImageId) return;
      setState(prev => ({
          ...prev,
          images: prev.images.map(img => 
              img.id === prev.activeImageId ? { ...img, [field]: value } : img
          )
      }));
  };

  const removeActiveImage = () => {
      if (!state.activeImageId) return;
      setState(prev => ({
          ...prev,
          images: prev.images.filter(img => img.id !== prev.activeImageId),
          activeImageId: null
      }));
  };

  const removeImageById = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setState(prev => ({
          ...prev,
          images: prev.images.filter(img => img.id !== id),
          activeImageId: prev.activeImageId === id ? null : prev.activeImageId
      }));
  };

  const selectImage = (id: string) => {
      setState(prev => ({ ...prev, activeImageId: id, activeTextLayerId: null }));
  };

  // Text Layer Management
  const updateActiveTextLayer = (field: keyof TextLayer, value: any) => {
      if (!state.activeTextLayerId) return;
      setState(prev => ({
          ...prev,
          textLayers: prev.textLayers.map(l => 
              l.id === prev.activeTextLayerId ? { ...l, [field]: value } : l
          )
      }));
  };

  const removeTextLayerById = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setState(prev => ({
          ...prev,
          textLayers: prev.textLayers.filter(l => l.id !== id),
          activeTextLayerId: prev.activeTextLayerId === id ? null : prev.activeTextLayerId
      }));
  };

  const removeActiveTextLayer = () => {
      if (!state.activeTextLayerId) return;
      setState(prev => ({
          ...prev,
          textLayers: prev.textLayers.filter(l => l.id !== prev.activeTextLayerId),
          activeTextLayerId: null
      }));
  };

  const selectTextLayer = (id: string) => {
      setState(prev => ({ ...prev, activeTextLayerId: id, activeImageId: null }));
  };


  // Actions
  const handleGenerateSubtitles = async () => {
    if (!state.audioFile) return;
    setState(prev => ({ ...prev, isGeneratingSubtitles: true }));
    try {
      const subtitles = await generateSubtitles(state.audioFile);
      setState(prev => ({ ...prev, subtitles, isGeneratingSubtitles: false }));
    } catch (error: any) {
      console.error("Failed to generate subtitles", error);
      alert(`Failed to generate subtitles: ${error.message || 'Unknown error'}. Please check your API key.`);
      setState(prev => ({ ...prev, isGeneratingSubtitles: false }));
    }
  };

  // Subtitle Editing Logic
  const updateSubtitle = (index: number, field: keyof Subtitle, value: string | number) => {
    const newSubtitles = [...state.subtitles];
    newSubtitles[index] = { ...newSubtitles[index], [field]: value };
    setState(prev => ({ ...prev, subtitles: newSubtitles }));
  };

  const updateTextSetting = (field: keyof TextSettings, value: string | number) => {
    setState(prev => ({
      ...prev,
      textSettings: { ...prev.textSettings, [field]: value }
    }));
  };
  
  const updateVisualizerSetting = (field: keyof VisualizerSettings, value: any) => {
    setState(prev => ({
      ...prev,
      visualizer: { ...prev.visualizer, [field]: value }
    }));
  };

  const togglePlay = () => {
    if (!state.audioSrc) return;
    setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const handleStop = () => {
    if (editorRef.current) {
      editorRef.current.stop();
      setIsRecordingTiming(false);
    }
  };

  const handleSeek = (seconds: number) => {
    if (editorRef.current) {
      const current = editorRef.current.getCurrentTime();
      editorRef.current.seek(current + seconds);
    }
  };

  const handleSeekTo = (seconds: number) => {
      if (editorRef.current) {
          editorRef.current.seek(seconds);
      }
  };

  const handleRender = () => {
    if (!state.audioSrc || state.images.length === 0) return;
    setState(prev => ({ ...prev, isRendering: true, isPlaying: true }));
  };

  const onRenderComplete = useCallback((blob: Blob) => {
    setState(prev => ({ ...prev, isRendering: false, isPlaying: false }));
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waveclip-render-${Date.now()}.webm`;
    a.click();
  }, []);

  const formatTime = (time: number) => {
    if (!isFinite(time) || isNaN(time)) return "0.00";
    return time.toFixed(2);
  };

  const handlePlayStateChange = useCallback((isPlaying: boolean) => {
    setState(p => ({ ...p, isPlaying }));
  }, []);

  const handleDurationChange = useCallback((d: number) => {
    setAudioDuration(d);
  }, []);

  const handleEnded = useCallback(() => {
    setState(s => {
       if (s.isRendering) {
         return { ...s, isRendering: false, isPlaying: false };
       }
       return { ...s, isPlaying: false, isRecordingTiming: false };
    });
    setIsRecordingTiming(false);
  }, []);

  // --- TAP TO SYNC LOGIC ---
  const toggleRecordingMode = () => {
    if (state.subtitles.length === 0) return;
    
    const newMode = !isRecordingTiming;
    setIsRecordingTiming(newMode);
    
    // Optional: Start/Stop playback on toggle
    if (newMode) {
      editorRef.current?.play();
    } else {
      editorRef.current?.pause();
    }
  };

  const handleSyncTap = (index: number) => {
    if (!isRecordingTiming) return;
    
    const now = editorRef.current?.getCurrentTime() || 0;
    
    setState(prev => {
        const newSubtitles = [...prev.subtitles];
        
        // 1. Set Start Time for CLICKED line
        newSubtitles[index] = {
            ...newSubtitles[index],
            startTime: now,
            // Set default duration (e.g. 5s)
            endTime: now + 5 
        };
        
        // 2. AUTO DURATION: Set End Time for PREVIOUS line in the list
        // This cuts off the previous line exactly when the new one starts
        if (index > 0) {
            newSubtitles[index - 1] = {
                ...newSubtitles[index - 1],
                endTime: now
            };
        }
        
        return { ...prev, subtitles: newSubtitles };
    });
    
    // Auto Scroll to next one? Or keep focus here?
    // User might want to click the *next* one next, so let's ensure it's visible.
    const nextEl = document.getElementById(`sub-${index + 1}`);
    if (nextEl) nextEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // AUTO SCROLL SIDEBAR Logic
  useEffect(() => {
    if (state.isPlaying && !isRecordingTiming) {
        const activeIndex = state.subtitles.findIndex(s => 
            currentTime >= (s.startTime + state.subtitleOffset) && 
            currentTime <= (s.endTime + state.subtitleOffset)
        );
        if (activeIndex !== -1 && activeIndex !== lastActiveIndexRef.current) {
            lastActiveIndexRef.current = activeIndex;
            const el = document.getElementById(`sub-${activeIndex}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
  }, [currentTime, state.isPlaying, isRecordingTiming, state.subtitles, state.subtitleOffset]);
  
  // Get active image/text object
  const activeImage = state.images.find(img => img.id === state.activeImageId);
  const activeText = state.textLayers.find(txt => txt.id === state.activeTextLayerId);

  return (
    <div className="flex h-screen w-full bg-gray-950 text-gray-100">
      
      {/* Sidebar Controls */}
      <aside className="w-96 bg-gray-900 border-r border-gray-800 flex flex-col overflow-hidden z-10">
        
        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-800">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              WaveClip Studio
            </h1>
          </div>
          
          {/* File Inputs */}
          <div className="grid grid-cols-3 gap-2">
            <div className="relative group col-span-1">
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="img-up" />
              <label htmlFor="img-up" className="flex flex-col items-center justify-center p-2 rounded-lg border border-dashed border-gray-700 hover:border-blue-500 hover:bg-gray-800 transition cursor-pointer text-xs text-gray-400 h-20">
                <UploadIcon />
                <span className="mt-1 truncate max-w-full px-1">Img</span>
              </label>
            </div>
            <button 
                onClick={handleAddTextLayer}
                className="col-span-1 flex flex-col items-center justify-center p-2 rounded-lg border border-dashed border-gray-700 hover:border-blue-500 hover:bg-gray-800 transition cursor-pointer text-xs text-gray-400 h-20"
            >
                <TypeIcon />
                <span className="mt-1 truncate max-w-full px-1">Text</span>
            </button>
            <div className="relative group col-span-1">
              <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" id="aud-up" />
              <label htmlFor="aud-up" className="flex flex-col items-center justify-center p-2 rounded-lg border border-dashed border-gray-700 hover:border-blue-500 hover:bg-gray-800 transition cursor-pointer text-xs text-gray-400 h-20">
                <MusicIcon />
                <span className="mt-1 truncate max-w-full px-1">{state.audioFile ? 'OK' : 'Aud'}</span>
              </label>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8" ref={scrollContainerRef}>
          <style>{`
            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
            .custom-scrollbar::-webkit-scrollbar-track { bg: #1f2937; }
            .custom-scrollbar::-webkit-scrollbar-thumb { bg: #4b5563; border-radius: 4px; }
          `}</style>
        
          {/* LAYER MANAGEMENT */}
           <div className="space-y-4">
             <div className="flex justify-between items-center">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Visual Layers</h2>
                <LayersIcon className="w-4 h-4 text-gray-500"/>
             </div>
             
             {/* List */}
             {(state.images.length > 0 || state.textLayers.length > 0) ? (
                 <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                     {/* Images */}
                     {state.images.map(img => (
                         <div 
                             key={img.id}
                             onClick={() => selectImage(img.id)}
                             className={`relative group/layer flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden cursor-pointer transition-all ${state.activeImageId === img.id ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'border-gray-700 opacity-80 hover:opacity-100'}`}
                         >
                             <img src={img.src} alt="" className="w-full h-full object-cover" />
                             <button onClick={(e) => removeImageById(img.id, e)} className="absolute top-0.5 right-0.5 bg-red-600 hover:bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/layer:opacity-100 transition-opacity shadow-sm z-10"><TrashIcon width={12} height={12}/></button>
                         </div>
                     ))}
                     {/* Texts */}
                     {state.textLayers.map(txt => (
                         <div 
                             key={txt.id}
                             onClick={() => selectTextLayer(txt.id)}
                             className={`relative group/layer flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden cursor-pointer transition-all bg-gray-800 flex items-center justify-center ${state.activeTextLayerId === txt.id ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'border-gray-700 opacity-80 hover:opacity-100'}`}
                         >
                             <span className="text-xs font-bold text-gray-300 truncate px-1">{txt.text.substring(0,6)}..</span>
                             <button onClick={(e) => removeTextLayerById(txt.id, e)} className="absolute top-0.5 right-0.5 bg-red-600 hover:bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/layer:opacity-100 transition-opacity shadow-sm z-10"><TrashIcon width={12} height={12}/></button>
                         </div>
                     ))}
                 </div>
             ) : (
                 <div className="text-xs text-gray-600 text-center py-4 bg-gray-900/50 rounded border border-gray-800 border-dashed">No layers added</div>
             )}

             {/* Active Image Settings */}
             {activeImage && (
                 <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                        <span className="text-xs font-bold text-white truncate max-w-[150px]">{activeImage.name}</span>
                        <button onClick={removeActiveImage} className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-white/10" title="Remove Layer"><TrashIcon /></button>
                    </div>

                    {/* Transform Controls */}
                    <div className="grid grid-cols-2 gap-3">
                         <div className="space-y-1">
                            <label className="text-[10px] text-gray-400">Scale</label>
                            <input type="range" min="0.1" max="2.0" step="0.1" value={activeImage.scale} onChange={(e) => updateActiveImage('scale', parseFloat(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg accent-blue-500"/>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-400">Opacity</label>
                            <input type="range" min="0" max="1" step="0.1" value={activeImage.opacity} onChange={(e) => updateActiveImage('opacity', parseFloat(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg accent-blue-500"/>
                        </div>
                         <div className="space-y-1">
                            <label className="text-[10px] text-gray-400">Rotation</label>
                            <input type="range" min="0" max="360" step="1" value={activeImage.rotation} onChange={(e) => updateActiveImage('rotation', parseInt(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg accent-blue-500"/>
                        </div>
                         <div className="space-y-1">
                            <label className="text-[10px] text-gray-400">Pos X</label>
                            <input type="range" min="0" max="1280" step="10" value={activeImage.x} onChange={(e) => updateActiveImage('x', parseInt(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg accent-blue-500"/>
                        </div>
                         <div className="space-y-1">
                            <label className="text-[10px] text-gray-400">Pos Y</label>
                            <input type="range" min="0" max="720" step="10" value={activeImage.y} onChange={(e) => updateActiveImage('y', parseInt(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg accent-blue-500"/>
                        </div>
                    </div>

                    <div className="h-px bg-gray-700" />
                    
                    {/* Animation Controls */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Animation</label>
                        <select 
                             className="w-full bg-gray-900 border border-gray-600 text-xs rounded p-2 outline-none text-gray-200"
                             value={activeImage.animation}
                             onChange={(e) => updateActiveImage('animation', e.target.value)}
                        >
                            {ANIMATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        
                        {activeImage.animation !== 'none' && (
                            <div className="grid grid-cols-2 gap-3">
                                 <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] text-gray-400"><span>Speed</span><span>{activeImage.animationSpeed}x</span></div>
                                    <input type="range" min="0.1" max="5.0" step="0.1" value={activeImage.animationSpeed} onChange={(e) => updateActiveImage('animationSpeed', parseFloat(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg accent-green-500"/>
                                </div>
                                 <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] text-gray-400"><span>Intensity</span><span>{activeImage.animationAmp}</span></div>
                                    <input type="range" min="1" max="100" step="1" value={activeImage.animationAmp} onChange={(e) => updateActiveImage('animationAmp', parseInt(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg accent-green-500"/>
                                </div>
                            </div>
                        )}
                    </div>
                 </div>
             )}

            {/* Active Text Settings */}
             {activeText && (
                 <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                        <span className="text-xs font-bold text-white">Edit Text Layer</span>
                        <button onClick={removeActiveTextLayer} className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-white/10" title="Remove Layer"><TrashIcon /></button>
                    </div>

                    <div className="space-y-2">
                        <textarea 
                            value={activeText.text}
                            onChange={(e) => updateActiveTextLayer('text', e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm text-white outline-none focus:border-blue-500 resize-none"
                            rows={2}
                        />
                        <select 
                             className="w-full bg-gray-900 border border-gray-600 text-xs rounded p-2 outline-none text-gray-200"
                             value={activeText.fontFamily}
                             onChange={(e) => updateActiveTextLayer('fontFamily', e.target.value)}
                        >
                            {AVAILABLE_FONTS.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
                        </select>
                    </div>

                    {/* Transform Controls */}
                    <div className="grid grid-cols-2 gap-3">
                         <div className="space-y-1">
                            <label className="text-[10px] text-gray-400">Size</label>
                            <input type="range" min="10" max="200" step="1" value={activeText.fontSize} onChange={(e) => updateActiveTextLayer('fontSize', parseInt(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg accent-blue-500"/>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-gray-400">Opacity</label>
                            <input type="range" min="0" max="1" step="0.1" value={activeText.opacity} onChange={(e) => updateActiveTextLayer('opacity', parseFloat(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg accent-blue-500"/>
                        </div>
                         <div className="space-y-1">
                            <label className="text-[10px] text-gray-400">Rotation</label>
                            <input type="range" min="0" max="360" step="1" value={activeText.rotation} onChange={(e) => updateActiveTextLayer('rotation', parseInt(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg accent-blue-500"/>
                        </div>
                         <div className="space-y-1">
                            <label className="text-[10px] text-gray-400">Color</label>
                            <input type="color" value={activeText.color} onChange={(e) => updateActiveTextLayer('color', e.target.value)} className="w-full h-6 bg-transparent border-none"/>
                        </div>
                         <div className="space-y-1">
                            <label className="text-[10px] text-gray-400">Pos X</label>
                            <input type="range" min="0" max="1280" step="10" value={activeText.x} onChange={(e) => updateActiveTextLayer('x', parseInt(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg accent-blue-500"/>
                        </div>
                         <div className="space-y-1">
                            <label className="text-[10px] text-gray-400">Pos Y</label>
                            <input type="range" min="0" max="720" step="10" value={activeText.y} onChange={(e) => updateActiveTextLayer('y', parseInt(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg accent-blue-500"/>
                        </div>
                    </div>

                    <div className="h-px bg-gray-700" />
                    
                    {/* Animation Controls */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Animation</label>
                        <select 
                             className="w-full bg-gray-900 border border-gray-600 text-xs rounded p-2 outline-none text-gray-200"
                             value={activeText.animation}
                             onChange={(e) => updateActiveTextLayer('animation', e.target.value)}
                        >
                            {ANIMATION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        
                        {activeText.animation !== 'none' && (
                            <div className="grid grid-cols-2 gap-3">
                                 <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] text-gray-400"><span>Speed</span><span>{activeText.animationSpeed}x</span></div>
                                    <input type="range" min="0.1" max="5.0" step="0.1" value={activeText.animationSpeed} onChange={(e) => updateActiveTextLayer('animationSpeed', parseFloat(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg accent-green-500"/>
                                </div>
                                 <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] text-gray-400"><span>Intensity</span><span>{activeText.animationAmp}</span></div>
                                    <input type="range" min="1" max="100" step="1" value={activeText.animationAmp} onChange={(e) => updateActiveTextLayer('animationAmp', parseInt(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg accent-green-500"/>
                                </div>
                            </div>
                        )}
                    </div>
                 </div>
             )}
           </div>

           <div className="h-px bg-gray-800" />

          {/* AI Tools & Text Settings */}
          <div className="space-y-4">
             <div className="flex justify-between items-center">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Subtitles</h2>
                {state.subtitles.length > 0 && (
                    <span className="text-[10px] text-gray-500">{state.subtitles.length} lines</span>
                )}
            </div>
            
            <div className="flex gap-2">
                <Button onClick={handleGenerateSubtitles} disabled={!state.audioFile} isLoading={state.isGeneratingSubtitles} className="flex-1 text-xs py-2" variant="secondary">
                  <SparklesIcon /> {state.subtitles.length > 0 ? 'Retry AI' : 'Generate'}
                </Button>
                <Button onClick={toggleRecordingMode} disabled={state.subtitles.length === 0} className={`flex-1 text-xs py-2 ${isRecordingTiming ? 'animate-pulse ring-2 ring-red-500' : ''}`} variant={isRecordingTiming ? 'danger' : 'primary'}>
                    <TapIcon /> {isRecordingTiming ? 'Stop Sync' : 'Tap Sync'}
                </Button>
            </div>
            
             {/* Global Offset */}
             {state.subtitles.length > 0 && !isRecordingTiming && (
                <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                    <span>Global Adjustment (Offset)</span>
                    <span className={state.subtitleOffset === 0 ? 'text-gray-400' : 'text-blue-400 font-bold'}>
                    {state.subtitleOffset > 0 ? '+' : ''}{state.subtitleOffset.toFixed(2)}s
                    </span>
                </div>
                
                {/* Fine Control Buttons */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                    <button onClick={() => setState(prev => ({ ...prev, subtitleOffset: Number((prev.subtitleOffset - 0.5).toFixed(2)) }))} className="bg-gray-700 hover:bg-gray-600 text-white text-[10px] py-1.5 rounded border border-gray-600 transition-colors">-0.5s</button>
                    <button onClick={() => setState(prev => ({ ...prev, subtitleOffset: Number((prev.subtitleOffset - 0.1).toFixed(2)) }))} className="bg-gray-700 hover:bg-gray-600 text-white text-[10px] py-1.5 rounded border border-gray-600 transition-colors">-0.1s</button>
                    <button onClick={() => setState(prev => ({ ...prev, subtitleOffset: Number((prev.subtitleOffset + 0.1).toFixed(2)) }))} className="bg-gray-700 hover:bg-gray-600 text-white text-[10px] py-1.5 rounded border border-gray-600 transition-colors">+0.1s</button>
                    <button onClick={() => setState(prev => ({ ...prev, subtitleOffset: Number((prev.subtitleOffset + 0.5).toFixed(2)) }))} className="bg-gray-700 hover:bg-gray-600 text-white text-[10px] py-1.5 rounded border border-gray-600 transition-colors">+0.5s</button>
                </div>
                
                {/* Slider for coarse adjustment */}
                <input type="range" min="-5" max="5" step="0.05" value={state.subtitleOffset} onChange={(e) => setState(prev => ({ ...prev, subtitleOffset: parseFloat(e.target.value) }))} className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                
                {state.subtitleOffset !== 0 && (
                    <button 
                        onClick={() => setState(prev => ({ ...prev, subtitleOffset: 0 }))}
                        className="w-full mt-2 text-[10px] text-gray-400 hover:text-white flex items-center justify-center gap-1 opacity-70 hover:opacity-100 transition-opacity"
                    >
                        Reset Offset
                    </button>
                )}
                </div>
              )}
          </div>

          <div className="h-px bg-gray-800" />
          
          {/* TEXT SETTINGS */}
          <div className="space-y-4">
             <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Text Style</h2>
             
             {/* Font Family */}
             <div className="space-y-1">
               <label className="text-[10px] text-gray-400">Font Family</label>
               <select 
                 className="w-full bg-gray-800 border border-gray-700 text-xs rounded p-2 outline-none focus:border-blue-500 text-gray-200"
                 value={state.textSettings.fontFamily}
                 onChange={(e) => updateTextSetting('fontFamily', e.target.value)}
               >
                 {AVAILABLE_FONTS.map(font => (
                   <option key={font.value} value={font.value}>{font.name}</option>
                 ))}
               </select>
             </div>

             <div className="grid grid-cols-2 gap-4">
                {/* Primary Text Settings */}
                <div className="space-y-2 p-3 bg-gray-800/50 rounded border border-gray-700">
                  <span className="text-[10px] font-bold text-gray-300 uppercase block mb-2">Primary Text</span>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-gray-400">
                       <span>Size</span>
                       <span>{state.textSettings.primaryFontSize}px</span>
                    </div>
                    <input 
                      type="range" min="20" max="120" step="1" 
                      value={state.textSettings.primaryFontSize}
                      onChange={(e) => updateTextSetting('primaryFontSize', parseInt(e.target.value))}
                      className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-white"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400">Color</label>
                    <div className="flex items-center gap-2">
                       <input 
                         type="color" 
                         value={state.textSettings.primaryColor}
                         onChange={(e) => updateTextSetting('primaryColor', e.target.value)}
                         className="h-6 w-8 bg-transparent border-none cursor-pointer"
                       />
                       <span className="text-[10px] text-gray-400 font-mono">{state.textSettings.primaryColor}</span>
                    </div>
                  </div>
                </div>

                {/* Secondary Text Settings */}
                <div className="space-y-2 p-3 bg-gray-800/50 rounded border border-gray-700">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block mb-2">Next Line</span>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-gray-400">
                       <span>Size</span>
                       <span>{state.textSettings.secondaryFontSize}px</span>
                    </div>
                    <input 
                      type="range" min="10" max="80" step="1" 
                      value={state.textSettings.secondaryFontSize}
                      onChange={(e) => updateTextSetting('secondaryFontSize', parseInt(e.target.value))}
                      className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-gray-400"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-400">Color</label>
                    <div className="flex items-center gap-2">
                       <input 
                         type="color" 
                         value={state.textSettings.secondaryColor}
                         onChange={(e) => updateTextSetting('secondaryColor', e.target.value)}
                         className="h-6 w-8 bg-transparent border-none cursor-pointer"
                       />
                       <span className="text-[10px] text-gray-400 font-mono">{state.textSettings.secondaryColor}</span>
                    </div>
                  </div>
                </div>
             </div>
          </div>

           <div className="h-px bg-gray-800" />

          {/* Visualizer Settings */}
          <div className="space-y-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Visual Effects</h2>
            
            {/* Controls (Dimmed if disabled) */}
            <div className={`space-y-4 transition-opacity duration-200 ${!state.visualizer.enabled ? 'opacity-40 pointer-events-none' : ''}`}>
                <div className="flex gap-2 mb-2">
                    {['#22c55e', '#3b82f6', '#ef4444', '#f59e0b', '#ec4899', '#ffffff'].map(color => (
                    <button
                        key={color}
                        onClick={() => updateVisualizerSetting('barColor', color)}
                        className={`w-6 h-6 rounded-full border-2 ${state.visualizer.barColor === color ? 'border-white' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                    />
                    ))}
                </div>
                
                {/* Expanded Controls */}
                <div className="space-y-3 bg-gray-800/50 p-3 rounded border border-gray-700">
                    <div className="grid grid-cols-2 gap-3">
                    {/* Position */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-gray-400">
                            <span>Pos X</span>
                            <span>{state.visualizer.x}%</span>
                        </div>
                        <input type="range" min="0" max="100" value={state.visualizer.x} onChange={(e) => updateVisualizerSetting('x', parseInt(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"/>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-gray-400">
                            <span>Pos Y</span>
                            <span>{state.visualizer.y}%</span>
                        </div>
                        <input type="range" min="0" max="100" value={state.visualizer.y} onChange={(e) => updateVisualizerSetting('y', parseInt(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"/>
                    </div>
                    </div>

                    {/* Dimensions */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-gray-400">
                        <span>Scale</span>
                        <span>{state.visualizer.scale}x</span>
                        </div>
                        <input type="range" min="0.1" max="5.0" step="0.1" value={state.visualizer.scale} onChange={(e) => updateVisualizerSetting('scale', parseFloat(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"/>
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-gray-400">
                        <span>Sensitivity</span>
                        <span>{state.visualizer.sensitivity}</span>
                        </div>
                        <input type="range" min="0.1" max="5.0" step="0.1" value={state.visualizer.sensitivity} onChange={(e) => updateVisualizerSetting('sensitivity', parseFloat(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"/>
                    </div>

                    {/* Advanced Style */}
                    <div className="h-px bg-gray-700 my-2" />
                    
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-gray-400">
                        <span>Bar Count</span>
                        <span>{state.visualizer.barCount}</span>
                        </div>
                        <input type="range" min="10" max="100" step="2" value={state.visualizer.barCount} onChange={(e) => updateVisualizerSetting('barCount', parseInt(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-green-500"/>
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-gray-400">
                        <span>Gap / Spacing</span>
                        <span>{(state.visualizer.gap * 100).toFixed(0)}%</span>
                        </div>
                        <input type="range" min="0" max="0.9" step="0.05" value={state.visualizer.gap} onChange={(e) => updateVisualizerSetting('gap', parseFloat(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-green-500"/>
                    </div>
                    
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-gray-400">
                        <span>Roundness</span>
                        <span>{state.visualizer.roundness}px</span>
                        </div>
                        <input type="range" min="0" max="50" step="1" value={state.visualizer.roundness} onChange={(e) => updateVisualizerSetting('roundness', parseInt(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500"/>
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-gray-400">
                        <span>Glow</span>
                        <span>{state.visualizer.shadowBlur}px</span>
                        </div>
                        <input type="range" min="0" max="50" step="1" value={state.visualizer.shadowBlur} onChange={(e) => updateVisualizerSetting('shadowBlur', parseInt(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500"/>
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-gray-400">
                        <span>Opacity</span>
                        <span>{(state.visualizer.fillAlpha * 100).toFixed(0)}%</span>
                        </div>
                        <input type="range" min="0.1" max="1.0" step="0.1" value={state.visualizer.fillAlpha} onChange={(e) => updateVisualizerSetting('fillAlpha', parseFloat(e.target.value))} className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500"/>
                    </div>
                </div>
            </div>

             {/* Selector Buttons */}
             <div className="grid grid-cols-2 gap-2 mt-2">
                <button 
                    onClick={() => updateVisualizerSetting('enabled', false)}
                    className={`px-3 py-1.5 text-xs rounded border ${!state.visualizer.enabled ? 'bg-gray-600 border-gray-600 text-white shadow-md' : 'border-gray-700 text-gray-400 hover:bg-gray-800'}`}
                >
                    None
                </button>
                <button 
                    onClick={() => {
                        updateVisualizerSetting('enabled', true);
                        updateVisualizerSetting('type', 'bars');
                    }}
                    className={`px-3 py-1.5 text-xs rounded border ${state.visualizer.enabled && state.visualizer.type === 'bars' ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'border-gray-700 text-gray-400 hover:bg-gray-800'}`}
                >
                    Bars
                </button>
                <button 
                    onClick={() => {
                        updateVisualizerSetting('enabled', true);
                        updateVisualizerSetting('type', 'wave');
                    }}
                    className={`px-3 py-1.5 text-xs rounded border ${state.visualizer.enabled && state.visualizer.type === 'wave' ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'border-gray-700 text-gray-400 hover:bg-gray-800'}`}
                >
                    Line
                </button>
                 <button 
                    onClick={() => {
                        updateVisualizerSetting('enabled', true);
                        updateVisualizerSetting('type', 'circular');
                        // Auto-set optimal settings for sunburst look
                        updateVisualizerSetting('barCount', 60);
                        updateVisualizerSetting('gap', 0.2);
                    }}
                    className={`px-3 py-1.5 text-xs rounded border ${state.visualizer.enabled && state.visualizer.type === 'circular' ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'border-gray-700 text-gray-400 hover:bg-gray-800'}`}
                >
                    Circular
                </button>
            </div>
          </div>
          
           {/* Subtitle List */}
           {state.subtitles.length > 0 && (
             <div className="space-y-2">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Lyrics</h2>
                <div className="space-y-2">
                    {state.subtitles.map((sub, i) => {
                       const isCurrent = currentTime >= (sub.startTime + state.subtitleOffset) && currentTime <= (sub.endTime + state.subtitleOffset);
                       return (
                        <div 
                            key={i} 
                            id={`sub-${i}`}
                            onClick={() => !isRecordingTiming && handleSeekTo(sub.startTime + state.subtitleOffset + 0.01)}
                            className={`relative flex flex-col gap-1 p-2 rounded border transition-all duration-200 cursor-pointer ${
                                isCurrent 
                                    ? 'bg-blue-900/30 border-blue-500/50' 
                                    : 'bg-gray-800 border-gray-700 hover:border-gray-600 hover:bg-gray-700/50'
                                } ${isRecordingTiming ? 'hover:ring-2 hover:ring-red-500 hover:scale-[1.02]' : ''}`
                            }
                        >
                          {/* Sync Mode Overlay for Tapping */}
                          {isRecordingTiming && (
                              <div 
                                className="absolute inset-0 z-20"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSyncTap(i);
                                }}
                              >
                                  <div className="absolute right-2 top-2">
                                     <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded shadow animate-pulse">TAP TO SET</span>
                                  </div>
                              </div>
                          )}

                          <div className="flex gap-2 mb-1">
                              <div className="relative flex-1 group/input">
                                  <input 
                                      type="number" step="0.01" 
                                      className={`w-full bg-gray-900 border text-xs rounded px-1 py-1 outline-none font-mono ${isCurrent ? 'border-blue-500 text-blue-400' : 'border-gray-700 text-green-400'}`}
                                      value={sub.startTime.toFixed(2)}
                                      onChange={(e) => updateSubtitle(i, 'startTime', parseFloat(e.target.value))}
                                      onClick={(e) => e.stopPropagation()} 
                                      disabled={isRecordingTiming}
                                  />
                              </div>
                              <div className="relative flex-1 group/input">
                                  <input 
                                      type="number" step="0.01" 
                                      className="w-full bg-gray-900 border border-gray-700 text-red-400 text-xs rounded px-1 py-1 outline-none font-mono"
                                      value={sub.endTime.toFixed(2)}
                                      onChange={(e) => updateSubtitle(i, 'endTime', parseFloat(e.target.value))}
                                      onClick={(e) => e.stopPropagation()}
                                      disabled={isRecordingTiming}
                                  />
                              </div>
                          </div>
                          <textarea
                            className="w-full bg-transparent text-sm text-gray-200 resize-none outline-none border-b border-transparent focus:border-gray-600 py-1"
                            rows={1}
                            value={sub.text}
                            onChange={(e) => updateSubtitle(i, 'text', e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            disabled={isRecordingTiming}
                          />
                        </div>
                      );
                    })}
                </div>
             </div>
          )}

        </div>

        {/* Footer Action */}
        <div className="p-6 border-t border-gray-800 bg-gray-900">
           <Button 
             className="w-full py-3 text-lg font-bold tracking-wide" 
             onClick={handleRender}
             disabled={!state.audioSrc || (state.images.length === 0 && state.textLayers.length === 0) || state.isRendering || isRecordingTiming}
             variant="primary"
           >
             {state.isRendering ? 'Rendering...' : 'EXPORT VIDEO'}
           </Button>
        </div>
      </aside>

      {/* Main Canvas Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 p-8 flex items-center justify-center bg-gray-950 relative overflow-hidden">
          
          {/* Editor Component */}
          <div className="w-full max-w-5xl shadow-2xl shadow-black/50">
            <VideoEditor 
              ref={editorRef}
              images={state.images}
              textLayers={state.textLayers} // Pass text layers
              audioSrc={state.audioSrc}
              subtitles={state.subtitles}
              subtitleOffset={state.subtitleOffset}
              visualizerSettings={state.visualizer}
              textSettings={state.textSettings}
              isPlaying={state.isPlaying}
              onPlayStateChange={handlePlayStateChange}
              onTimeUpdate={setCurrentTime}
              onDurationChange={handleDurationChange}
              onEnded={handleEnded}
              isRendering={state.isRendering}
              onRenderComplete={onRenderComplete}
              totalDuration={totalDuration}
            />
          </div>
        </div>

        {/* Timeline / Playback Controls */}
        <div className="h-24 bg-gray-900 border-t border-gray-800 flex items-center px-8 gap-8 select-none z-20">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => handleSeek(-5)}
              disabled={!state.audioSrc}
              className="w-10 h-10 rounded-full text-gray-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition disabled:opacity-50"
            >
              <RewindIcon />
            </button>

            <button 
              onClick={togglePlay}
              disabled={!state.audioSrc}
              className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40 flex items-center justify-center hover:scale-105 transition disabled:opacity-50 disabled:scale-100 disabled:bg-gray-700"
            >
              {state.isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>

            <button 
              onClick={handleStop}
              disabled={!state.audioSrc}
              className="w-10 h-10 rounded-full text-red-400 hover:text-red-300 hover:bg-white/10 flex items-center justify-center transition disabled:opacity-50"
            >
              <StopIcon />
            </button>
             <button 
              onClick={() => handleSeek(5)}
              disabled={!state.audioSrc}
              className="w-10 h-10 rounded-full text-gray-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition disabled:opacity-50"
            >
              <ForwardIcon />
            </button>
          </div>
          
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex justify-between text-xs text-gray-400 font-mono tracking-wider">
              <span>{formatTime(currentTime)}s</span>
              <span>{formatTime(totalDuration)}s</span>
            </div>
            {/* Clickable progress bar */}
            <div 
              className="h-3 bg-gray-800 rounded-full overflow-hidden cursor-pointer relative group"
              onClick={(e) => {
                if (!totalDuration || !editorRef.current) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                editorRef.current.seek(pos * totalDuration);
              }}
            >
               <div 
                 className="h-full bg-gradient-to-r from-blue-600 to-purple-500 transition-all duration-75 ease-linear relative"
                 style={{ width: `${totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0}%` }}
               >
                 <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
               </div>
               <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}