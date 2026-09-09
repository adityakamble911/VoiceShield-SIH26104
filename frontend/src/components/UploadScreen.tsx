import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  FileAudio,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Cpu,
  Layers,
  Clock,
  HardDrive,
  Info,
} from 'lucide-react';
import { PresetSample, ScanResult } from '../types';
import { PRESET_SAMPLES } from '../data/mockData';
import {
  analyzeAudioBlobLocally,
  formatDuration,
  formatFileSize,
} from '../utils/audioSynth';

interface UploadScreenProps {
  onScanComplete: (result: ScanResult) => void;
  isScanning: boolean;
  setIsScanning: (scanning: boolean) => void;
}

export const UploadScreen: React.FC<UploadScreenProps> = ({
  onScanComplete,
  isScanning,
  setIsScanning,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<PresetSample | null>(null);

  // Audio metadata
  const [metadata, setMetadata] = useState<{
    fileName: string;
    fileSize: number;
    duration: number;
    sampleRate: number;
    channels: number;
    format: string;
    peaks: number[];
    extractedFeatures: any;
  } | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [loadingPresetId, setLoadingPresetId] = useState<string | null>(null);
  const [scanStepMessage, setScanStepMessage] = useState<string>('Initializing forensic engine...');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load default preset on initial mount for instant interactivity
  useEffect(() => {
    handleSelectPreset(PRESET_SAMPLES[0]);
  }, []);

  // Update audio element volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Handle Preset selection
  const handleSelectPreset = async (preset: PresetSample) => {
    try {
      setLoadingPresetId(preset.id);
      setSelectedPreset(preset);
      setSelectedFile(null);

      // Fetch the REAL audio recording from /public/samples (no synthesis)
      const response = await fetch(preset.audioUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioBlob(blob);
      setAudioUrl(url);

      // Run local feature extraction on the real decoded audio
      const localAnalysis = await analyzeAudioBlobLocally(blob);

      setMetadata({
        fileName: `${preset.id}.wav`,
        fileSize: blob.size,
        duration: localAnalysis.duration,
        sampleRate: localAnalysis.sampleRate,
        channels: localAnalysis.channels,
        format: 'WAV',
        peaks: localAnalysis.peaks,
        extractedFeatures: {
          ...localAnalysis.extractedFeatures,
          isSyntheticCandidate: preset.isSynthetic,
        },
      });

      setCurrentTime(0);
      setIsPlaying(false);
    } catch (err) {
      console.error('Error loading preset:', err);
    } finally {
      setLoadingPresetId(null);
    }
  };

  // Handle File Input selection
  const handleFileChange = async (file: File) => {
    const validExtensions = ['wav', 'mp3', 'm4a', 'aac', 'ogg', 'flac'];
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';

    if (!validExtensions.includes(fileExt) && !file.type.includes('audio')) {
      alert('Please select a valid audio file (.wav, .mp3, or .m4a).');
      return;
    }

    setSelectedFile(file);
    setSelectedPreset(null);
    setAudioBlob(file);

    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    try {
      const localAnalysis = await analyzeAudioBlobLocally(file);
      setMetadata({
        fileName: file.name,
        fileSize: file.size,
        duration: localAnalysis.duration,
        sampleRate: localAnalysis.sampleRate,
        channels: localAnalysis.channels,
        format: fileExt.toUpperCase() || 'AUDIO',
        peaks: localAnalysis.peaks,
        extractedFeatures: localAnalysis.extractedFeatures,
      });
      setCurrentTime(0);
      setIsPlaying(false);
    } catch (err) {
      console.error('Failed to parse audio:', err);
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Audio Playback
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((e) => console.log('Playback error:', e));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || metadata?.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Execute real ML forensic analysis through the local FastAPI backend
  const handleRunDetection = async () => {
    if (!metadata || !audioBlob || isScanning) return;

    setIsScanning(true);
    setScanStepMessage('Sending audio to local VoiceShield ML engine...');

    try {
      await new Promise((r) => setTimeout(r, 250));
      setScanStepMessage('Extracting 80-bin log-mel spectrogram...');

      const formData = new FormData();

      // Device uploads are Files; preset samples are fetched Blobs.
      // FastAPI expects multipart/form-data with field name "file".
      const uploadFile =
        audioBlob instanceof File
          ? audioBlob
          : new File(
              [audioBlob],
              metadata.fileName || 'voiceshield_sample.wav',
              { type: audioBlob.type || 'audio/wav' }
            );

      formData.append('file', uploadFile);

      setScanStepMessage('Running AudioCNN inference on local ML model...');

      const response = await fetch('http://127.0.0.1:8000/predict', {
        method: 'POST',
        body: formData,
      });

      const raw = await response.text();

      let data: any;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(
          `Backend returned non-JSON response (${response.status}): ${raw.slice(0, 300)}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.detail || data?.error || `Backend request failed (${response.status})`
        );
      }

      if (!data || !data.prediction || typeof data.confidence !== 'number') {
        throw new Error(`Invalid ML response: ${raw.slice(0, 500)}`);
      }

      setScanStepMessage('Building forensic result...');

      const isAI = data.prediction === 'SYNTHETIC';
      const syntheticProbability =
        typeof data.prob_synthetic === 'number'
          ? data.prob_synthetic
          : isAI
            ? data.confidence
            : 1 - data.confidence;

      const confidencePercent = Math.round(data.confidence * 100);

      const result: ScanResult = {
        id: `scan_${Date.now()}`,
        timestamp: data.timestamp || new Date().toISOString(),
        fileName: metadata.fileName,
        fileSize: metadata.fileSize,
        duration: metadata.duration,
        format: metadata.format,
        sampleRate: metadata.sampleRate,
        channels: metadata.channels,

        verdict: isAI ? 'AI_GENERATED' : 'REAL_HUMAN',
        confidenceScore: confidencePercent,

        riskLevel:
          data.risk_level === 'HIGH'
            ? 'HIGH'
            : data.risk_level === 'MEDIUM'
              ? 'MEDIUM'
              : data.risk_level === 'LOW'
                ? 'LOW'
                : 'SAFE',

        detectedModelSignature: isAI
          ? 'AudioCNN • Synthetic Voice Classifier'
          : 'AudioCNN • Biological Speech Classifier',

        summary: isAI
          ? `Local AudioCNN classified this recording as synthetic with ${confidencePercent}% confidence. Synthetic probability: ${Math.round(syntheticProbability * 100)}%.`
          : `Local AudioCNN classified this recording as real human speech with ${confidencePercent}% confidence. Synthetic probability: ${Math.round(syntheticProbability * 100)}%.`,

        detailedExplanation:
          `VoiceShield processed the uploaded audio locally using the trained AudioCNN model. ` +
          `The audio was resampled to 16 kHz, converted to a fixed 80 × 401 log-mel spectrogram, ` +
          `and passed through the trained classifier.\n\n` +
          `Model classification: ${data.prediction}. ` +
          `Classification confidence: ${confidencePercent}%. ` +
          `Synthetic probability: ${Math.round(syntheticProbability * 100)}%.\n\n` +
          `${data.recommendation || 'Review the result together with the audio and other evidence.'}`,

        indicators: [
          {
            name: 'AudioCNN Classification',
            severity: isAI ? 'HIGH' : 'NORMAL',
            status: isAI ? 'ANOMALY_DETECTED' : 'NATURAL',
            detail: isAI
              ? `The trained model assigned ${(syntheticProbability * 100).toFixed(1)}% probability to synthetic audio.`
              : `The trained model assigned ${((1 - syntheticProbability) * 100).toFixed(1)}% probability to real human audio.`,
            timestamp: 'Full recording',
          },
          {
            name: 'Synthetic Probability',
            severity:
              syntheticProbability > 0.7
                ? 'HIGH'
                : syntheticProbability > 0.3
                  ? 'MEDIUM'
                  : 'NORMAL',
            status: syntheticProbability > 0.7 ? 'ANOMALY_DETECTED' : 'NATURAL',
            detail: `Synthetic probability: ${(syntheticProbability * 100).toFixed(1)}%.`,
            timestamp: 'Model output',
          },
        ],

        recommendations: [
          data.recommendation ||
            (isAI
              ? 'Require additional verification before trusting this voice.'
              : 'No strong synthetic classification was produced by the model.'),
        ],

        waveformPeaks: metadata.peaks,
        audioUrl: audioUrl || undefined,
        audioType: selectedPreset ? 'sample' : 'uploaded',
      };

      onScanComplete(result);
    } catch (err) {
      console.error('VoiceShield ML detection failed:', err);

      const message =
        err instanceof Error ? err.message : 'Unknown ML backend error';

      alert(
        `VoiceShield could not complete the ML analysis.\n\n${message}\n\n` +
        `Make sure the FastAPI backend is running on http://127.0.0.1:8000`
      );
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6" id="upload-screen-container">
      {/* Hidden Audio element for playback */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          onLoadedMetadata={handleTimeUpdate}
        />
      )}

      {/* Screen Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-white tracking-tight">
          Audio Upload & Inspection Chamber
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Upload any speech recording (WAV, MP3, M4A) or test with calibrated forensic deepfake audio presets.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Drag & Drop Zone + Audio Player */}
        <div className="lg:col-span-2 space-y-6">
          {/* Drag & Drop Upload Zone */}
          <div
            id="drag-drop-zone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 flex flex-col items-center justify-center min-h-[220px] ${
              isDragOver
                ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_30px_rgba(6,182,212,0.3)]'
                : 'border-cyan-500/30 bg-slate-900/50 hover:border-cyan-400/60 hover:bg-slate-900/70'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
              accept=".wav,.mp3,.m4a,audio/*"
              className="hidden"
              id="audio-file-input"
            />

            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-4 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
              <UploadCloud className="w-8 h-8" />
            </div>

            <h3 className="text-base font-semibold text-white">
              Drop your audio file here, or <span className="text-cyan-400 underline">browse</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Supports high-resolution WAV, MP3, and M4A audio files up to 50MB. Full 44.1kHz / 48kHz frequency inspection.
            </p>

            <div className="mt-4 flex items-center gap-2 text-[11px] font-mono text-cyan-300/80 bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-500/30">
              <span>WAV</span>
              <span>•</span>
              <span>MP3</span>
              <span>•</span>
              <span>M4A</span>
              <span>•</span>
              <span>FLAC</span>
            </div>
          </div>

          {/* Active Audio Player Card */}
          {metadata && (
            <div className="glass-panel-glow rounded-2xl p-6 border border-cyan-500/40 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                    <FileAudio className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white truncate max-w-md">
                      {metadata.fileName}
                    </div>
                    <div className="text-xs text-cyan-400/80 font-mono">
                      {metadata.format} • {metadata.sampleRate} Hz • {metadata.channels === 1 ? 'Mono' : 'Stereo'}
                    </div>
                  </div>
                </div>

                {selectedPreset && (
                  <span
                    className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border ${
                      selectedPreset.isSynthetic
                        ? 'bg-rose-950/70 text-rose-400 border-rose-500/40'
                        : 'bg-emerald-950/70 text-emerald-400 border-emerald-500/40'
                    }`}
                  >
                    Preset: {selectedPreset.category}
                  </span>
                )}
              </div>

              {/* Waveform Visualization Bars */}
              <div className="relative bg-slate-950/80 rounded-xl p-3 border border-slate-800">
                <div className="h-16 flex items-end gap-1 px-1">
                  {metadata.peaks.map((peak, idx) => {
                    const progressRatio = duration > 0 ? currentTime / duration : 0;
                    const isPassed = idx / metadata.peaks.length <= progressRatio;

                    return (
                      <div
                        key={idx}
                        className="flex-1 rounded-t-sm transition-all duration-75"
                        style={{
                          height: `${Math.max(8, peak * 100)}%`,
                          backgroundColor: isPassed
                            ? '#22d3ee'
                            : 'rgba(6, 182, 212, 0.25)',
                          boxShadow: isPassed ? '0 0 6px rgba(34, 211, 238, 0.6)' : 'none',
                        }}
                      ></div>
                    );
                  })}
                </div>

                {/* Scrub slider overlay */}
                <input
                  type="range"
                  min="0"
                  max={duration || metadata.duration}
                  step="0.01"
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full mt-2 accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                />
              </div>

              {/* Audio Controls */}
              <div className="flex items-center justify-between gap-4 text-xs font-mono">
                <div className="flex items-center gap-3">
                  <button
                    id="audio-play-toggle-btn"
                    onClick={togglePlay}
                    className="w-10 h-10 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all active:scale-95"
                  >
                    {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                  </button>

                  <div className="text-slate-300">
                    <span className="text-cyan-400 font-bold">{formatDuration(currentTime)}</span>
                    <span className="text-slate-500"> / {formatDuration(duration || metadata.duration)}</span>
                  </div>
                </div>

                {/* Volume slider */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="text-slate-400 hover:text-cyan-400 transition-colors"
                  >
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      setVolume(parseFloat(e.target.value));
                      setIsMuted(false);
                    }}
                    className="w-20 accent-cyan-400 cursor-pointer h-1 bg-slate-800 rounded appearance-none"
                  />
                </div>
              </div>

              {/* Run Forensic Detection CTA Button */}
              <button
                id="run-detection-btn"
                onClick={handleRunDetection}
                disabled={isScanning}
                className="w-full py-3.5 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-sm sm:text-base tracking-wider uppercase shadow-[0_0_20px_rgba(6,182,212,0.5)] flex items-center justify-center gap-3 transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin text-black" />
                    <span>Analyzing Audio Forensic Spectra...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-black" />
                    <span>Run Voice Cloning Forensic Detection</span>
                  </>
                )}
              </button>

              {isScanning && (
                <div className="p-3 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-xs font-mono text-cyan-300 flex items-center gap-2 animate-pulse">
                  <Cpu className="w-4 h-4 text-cyan-400 animate-spin" />
                  <span>{scanStepMessage}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Col: Preset Showcase & Technical File Information */}
        <div className="space-y-6">
          {/* Preset Audio Test Library */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold font-display text-white">Preset Forensic Test Audio</h3>
                <p className="text-[11px] text-slate-400">Instant one-click test samples</p>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                5 SAMPLES
              </span>
            </div>

            <div className="space-y-2.5">
              {PRESET_SAMPLES.map((preset) => {
                const isSelected = selectedPreset?.id === preset.id;
                const isLoading = loadingPresetId === preset.id;

                return (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-3 rounded-xl cursor-pointer transition-all border text-left ${
                      isSelected
                        ? 'bg-cyan-950/50 border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                        : 'bg-slate-950/40 border-slate-800/60 hover:border-slate-700 hover:bg-slate-900/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white truncate">
                            {preset.title}
                          </span>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${
                              preset.isSynthetic
                                ? 'bg-rose-950/70 text-rose-400 border-rose-500/30'
                                : 'bg-emerald-950/70 text-emerald-400 border-emerald-500/30'
                            }`}
                          >
                            {preset.isSynthetic ? 'AI Clone' : 'Real Human'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                          {preset.description}
                        </p>
                      </div>

                      {isLoading ? (
                        <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                      ) : isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* File Technical Specifications Card */}
          {metadata && (
            <div className="glass-panel rounded-2xl p-6 border border-slate-800">
              <h3 className="text-sm font-bold font-display text-white mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-cyan-400" />
                <span>Audio File Specifications</span>
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">FILE FORMAT</div>
                  <div className="text-slate-200 font-bold mt-0.5">{metadata.format} (Lossless PCM)</div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">FILE SIZE</div>
                  <div className="text-slate-200 font-bold mt-0.5">{formatFileSize(metadata.fileSize)}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">SAMPLE RATE</div>
                  <div className="text-cyan-400 font-bold mt-0.5">{metadata.sampleRate} Hz</div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">CHANNELS</div>
                  <div className="text-slate-200 font-bold mt-0.5">{metadata.channels === 1 ? '1 (Mono)' : '2 (Stereo)'}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 col-span-2">
                  <div className="text-slate-500 text-[10px]">NYQUIST LIMIT</div>
                  <div className="text-slate-300 font-bold mt-0.5">
                    {(metadata.sampleRate / 2 / 1000).toFixed(1)} kHz (Full Vocal Harmonic Range)
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
