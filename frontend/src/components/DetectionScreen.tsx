import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  ChevronRight,
  Sparkles,
  Layers,
  ArrowRight,
  Share2,
  Download,
  RotateCcw,
  Volume2,
} from 'lucide-react';
import { ScanResult, ScreenTab } from '../types';
import { formatDuration, formatFileSize } from '../utils/audioSynth';

interface DetectionScreenProps {
  scanResult: ScanResult | null;
  setCurrentTab: (tab: ScreenTab) => void;
  onOpenCertificateModal: () => void;
}

export const DetectionScreen: React.FC<DetectionScreenProps> = ({
  scanResult,
  setCurrentTab,
  onOpenCertificateModal,
}) => {
  if (!scanResult) {
    return (
      <div className="glass-panel rounded-2xl p-12 text-center border border-slate-800">
        <div className="w-16 h-16 rounded-2xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white font-display">No Audio Scanned Yet</h2>
        <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
          Upload an audio file or record from your microphone to inspect for deepfakes, neural vocoder cloning, and voice synthesis attacks.
        </p>
        <button
          onClick={() => setCurrentTab('upload')}
          className="mt-6 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:from-cyan-400 hover:to-blue-500 transition-all"
        >
          Select Audio for Detection
        </button>
      </div>
    );
  }

  const isAi = scanResult.verdict === 'AI_GENERATED';
  const confidence = scanResult.confidenceScore;
  const humanScore = isAi ? Number((100 - confidence).toFixed(1)) : confidence;
  const aiScore = isAi ? confidence : Number((100 - confidence).toFixed(1));

  // Circular gauge calculations (circumference for radius 80)
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (confidence / 100) * circumference;

  return (
    <div className="space-y-6" id="detection-screen-container">
      {/* Top Main Verdict Card */}
      <div
        className={`relative overflow-hidden rounded-2xl p-6 sm:p-8 border transition-all ${
          isAi ? 'glass-panel-danger' : 'glass-panel-success'
        }`}
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          {/* Verdict Text & Badge */}
          <div className="space-y-3 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase border bg-slate-950/80">
              {isAi ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                  <span className="text-rose-400">CRITICAL SECURITY ALERT</span>
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  <span className="text-emerald-400">VERIFIED HUMAN BIOMETRIC</span>
                </>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold font-display tracking-tight text-white">
              {isAi ? 'Likely AI-Generated Voice Clone' : 'Verified Natural Human Voice'}
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
              {scanResult.summary}
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs font-mono text-slate-400 pt-2">
              <span className="text-slate-300 font-semibold">{scanResult.fileName}</span>
              <span>•</span>
              <span>{formatDuration(scanResult.duration)}</span>
              <span>•</span>
              <span>{formatFileSize(scanResult.fileSize)}</span>
              <span>•</span>
              <span className="text-cyan-400 font-bold">{scanResult.format}</span>
            </div>
          </div>

          {/* Glowing Radial Confidence Gauge */}
          <div className="relative shrink-0 flex flex-col items-center">
            <svg className="w-48 h-48 -rotate-90 transform" viewBox="0 0 180 180">
              {/* Background circle */}
              <circle
                cx="90"
                cy="90"
                r={radius}
                className="text-slate-900/90"
                strokeWidth="12"
                stroke="currentColor"
                fill="transparent"
              />
              {/* Animated Progress circle */}
              <circle
                cx="90"
                cy="90"
                r={radius}
                stroke={isAi ? '#f43f5e' : '#10b981'}
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                style={{
                  filter: isAi
                    ? 'drop-shadow(0 0 10px rgba(244,63,94,0.6))'
                    : 'drop-shadow(0 0 10px rgba(16,185,129,0.6))',
                  transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              />
            </svg>

            {/* Centered Score in Circle */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Confidence</span>
              <span
                className={`text-3xl font-extrabold font-display ${
                  isAi ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {confidence}%
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {isAi ? 'SYNTHETIC' : 'AUTHENTIC'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Probability Split & Model Signature */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Synthetic vs Human Split Bar */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold font-display text-white">Biometric Probability Split</h3>

          {/* AI vs Human Split Bar */}
          <div className="space-y-2 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-rose-400 font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> AI Synthetic Probability
              </span>
              <span className="text-rose-400 font-bold">{aiScore}%</span>
            </div>
            <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div
                className="bg-rose-500 h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                style={{ width: `${aiScore}%` }}
              ></div>
            </div>

            <div className="flex justify-between pt-2">
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Human Authenticity Score
              </span>
              <span className="text-emerald-400 font-bold">{humanScore}%</span>
            </div>
            <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                style={{ width: `${humanScore}%` }}
              ></div>
            </div>
          </div>

          <div className="pt-2 text-xs text-slate-400 border-t border-slate-800/80">
            Calculated via multi-harmonic Fourier transforms and neural vocoder spectral coherence.
          </div>
        </div>

        {/* Detected Signature Architecture */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400">MODEL ARCHITECTURE</span>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                isAi
                  ? 'bg-rose-950 text-rose-400 border-rose-500/40'
                  : 'bg-emerald-950 text-emerald-400 border-emerald-500/40'
              }`}
            >
              RISK: {scanResult.riskLevel}
            </span>
          </div>

          <div className="text-sm font-bold text-white leading-snug">
            {scanResult.detectedModelSignature}
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            {isAi
              ? 'Identified characteristic phase-alignment discontinuities and artificial pitch quantization consistent with neural vocoder synthesis algorithms.'
              : 'Continuous organic glottal micro-tremor and authentic subglottal pressure decay verified.'}
          </p>

          <div className="pt-2 flex items-center gap-2 text-xs font-mono text-cyan-400">
            <Sparkles className="w-4 h-4" />
            <span>Forensically Evaluated by Gemini 3.8</span>
          </div>
        </div>

        {/* Quick Action Buttons Card */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col justify-between space-y-3">
          <div>
            <h3 className="text-sm font-bold font-display text-white">Forensic Next Steps</h3>
            <p className="text-xs text-slate-400 mt-1">
              Dive deeper into frequency spectrograms, or generate an authenticated compliance certificate.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <button
              id="view-detailed-analysis-btn"
              onClick={() => setCurrentTab('analysis')}
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-300 hover:text-white border border-cyan-500/40 font-semibold text-xs flex items-center justify-between transition-all"
            >
              <span>Inspect Detailed Spectrogram & Waveform</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              id="export-certificate-btn"
              onClick={onOpenCertificateModal}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center justify-between transition-all"
            >
              <span>Generate Forensic Certificate</span>
              <FileCheck className="w-4 h-4 text-cyan-400" />
            </button>

            <button
              id="scan-another-audio-btn"
              onClick={() => setCurrentTab('upload')}
              className="w-full py-2 px-4 rounded-xl text-slate-400 hover:text-white text-xs font-mono flex items-center justify-center gap-2 hover:bg-slate-900/50 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Scan Another Audio</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
