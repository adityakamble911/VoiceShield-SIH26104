import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  Mic,
  UploadCloud,
  ChevronRight,
  TrendingUp,
  Cpu,
  AlertTriangle,
  Play,
  Pause,
  ArrowUpRight,
  Volume2,
} from 'lucide-react';
import { ScanResult, ScreenTab } from '../types';
import { formatDuration, formatFileSize } from '../utils/audioSynth';

interface DashboardScreenProps {
  scans: ScanResult[];
  setCurrentTab: (tab: ScreenTab) => void;
  onSelectScan: (scan: ScanResult) => void;
  playingScanId: string | null;
  onTogglePlayScan: (scan: ScanResult) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  scans,
  setCurrentTab,
  onSelectScan,
  playingScanId,
  onTogglePlayScan,
}) => {
  const totalScans = scans.length;
  const aiScans = scans.filter((s) => s.verdict === 'AI_GENERATED');
  const humanScans = scans.filter((s) => s.verdict === 'REAL_HUMAN');
  const aiPercentage = totalScans > 0 ? Math.round((aiScans.length / totalScans) * 100) : 0;
  const avgConfidence =
    totalScans > 0
      ? (scans.reduce((acc, s) => acc + s.confidenceScore, 0) / totalScans).toFixed(1)
      : '98.4';

  const activeScan = scans.length > 0 ? scans[0] : null;
  const isActiveAi = activeScan?.verdict === 'AI_GENERATED';

  return (
    <div className="space-y-6" id="dashboard-screen-container">
      {/* 4 High Density Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Total Scans */}
        <div className="bg-slate-800/30 backdrop-blur-md border border-slate-700/50 p-5 rounded-2xl transition-all hover:border-cyan-500/30">
          <div className="text-slate-400 text-xs font-bold uppercase mb-2 tracking-wider">
            Total Scans
          </div>
          <div className="text-3xl font-bold font-display text-white">
            {totalScans.toLocaleString()}
          </div>
          <div className="text-emerald-400 text-xs mt-2 font-mono flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> +12.5% vs last month
          </div>
        </div>

        {/* Card 2: AI Detected */}
        <div className="bg-slate-800/30 backdrop-blur-md border border-slate-700/50 p-5 rounded-2xl transition-all hover:border-rose-500/30">
          <div className="text-slate-400 text-xs font-bold uppercase mb-2 tracking-wider">
            AI Detected
          </div>
          <div className="text-3xl font-bold font-display text-white">
            {aiScans.length}
          </div>
          <div className="text-rose-400 text-xs mt-2 font-mono">
            {aiPercentage}% hit rate
          </div>
        </div>

        {/* Card 3: Avg. Confidence */}
        <div className="bg-slate-800/30 backdrop-blur-md border border-slate-700/50 p-5 rounded-2xl transition-all hover:border-cyan-500/30">
          <div className="text-slate-400 text-xs font-bold uppercase mb-2 tracking-wider">
            Avg. Confidence
          </div>
          <div className="text-3xl font-bold font-display text-cyan-400">
            {avgConfidence}%
          </div>
          <div className="text-slate-400 text-xs mt-2 font-mono">
            High Accuracy Mode
          </div>
        </div>

        {/* Card 4: Processing Time */}
        <div className="bg-slate-800/30 backdrop-blur-md border border-slate-700/50 p-5 rounded-2xl transition-all hover:border-cyan-500/30">
          <div className="text-slate-400 text-xs font-bold uppercase mb-2 tracking-wider">
            Processing Time
          </div>
          <div className="text-3xl font-bold font-display text-white">
            1.2s
          </div>
          <div className="text-slate-400 text-xs mt-2 font-mono">
            Real-time edge analysis
          </div>
        </div>
      </div>

      {/* Main High Density Analysis & History Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Analysis Card */}
        <div className="lg:col-span-2 bg-slate-800/30 border border-slate-700/50 rounded-2xl flex flex-col overflow-hidden">
          {/* Card Header */}
          <div className="p-5 border-b border-slate-700/50 flex justify-between items-center gap-4 flex-wrap">
            <h3 className="font-bold flex items-center gap-2 text-white text-sm sm:text-base">
              <svg className="w-4 h-4 text-cyan-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V5l12-2v14l-12 2zM9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-2" />
              </svg>
              <span className="truncate">
                ACTIVE ANALYSIS: {activeScan ? activeScan.fileName : 'sample_3921.wav'}
              </span>
            </h3>

            <div className="flex items-center gap-2">
              {activeScan && (
                <button
                  onClick={() => onTogglePlayScan(activeScan)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
                >
                  {playingScanId === activeScan.id ? (
                    <>
                      <Pause className="w-3 h-3 fill-current text-cyan-400" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-current text-cyan-400" />
                      <span>Listen</span>
                    </>
                  )}
                </button>
              )}

              <div className="px-3 py-1 bg-cyan-500 text-black text-[10px] font-black rounded uppercase tracking-wider">
                {activeScan ? (isActiveAi ? 'Clone Detected' : 'Verified') : 'Standing By'}
              </div>
            </div>
          </div>

          {/* Card Body with High Density Waveform & Score */}
          <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            {/* Waveform Bars */}
            <div className="flex justify-between items-end gap-1 sm:gap-1.5 h-28 sm:h-32 px-1 bg-slate-950/40 rounded-xl p-3 border border-slate-800/80">
              <div className="w-2 bg-slate-700 h-1/4 rounded-full"></div>
              <div className="w-2 bg-cyan-500 h-1/2 rounded-full"></div>
              <div className="w-2 bg-cyan-400 h-2/3 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)]"></div>
              <div className="w-2 bg-cyan-600 h-5/6 rounded-full"></div>
              <div className="w-2 bg-cyan-400 h-full rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)]"></div>
              <div className="w-2 bg-blue-500 h-3/4 rounded-full"></div>
              <div className="w-2 bg-blue-600 h-1/2 rounded-full"></div>
              <div className="w-2 bg-slate-700 h-1/3 rounded-full"></div>
              <div className="w-2 bg-cyan-400 h-2/3 rounded-full"></div>
              <div className="w-2 bg-cyan-500 h-4/5 rounded-full"></div>
              <div className="w-2 bg-cyan-600 h-1/2 rounded-full"></div>
              <div className="w-2 bg-slate-700 h-1/4 rounded-full"></div>
              <div className="w-2 bg-cyan-400 h-2/3 rounded-full"></div>
              <div className="w-2 bg-cyan-500 h-full rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)]"></div>
              <div className="w-2 bg-blue-500 h-3/4 rounded-full"></div>
              <div className="w-2 bg-blue-400 h-1/2 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
              <div className="w-2 bg-cyan-400 h-2/3 rounded-full"></div>
              <div className="w-2 bg-slate-700 h-1/3 rounded-full"></div>
              <div className="w-2 bg-cyan-500 h-4/5 rounded-full"></div>
              <div className="w-2 bg-blue-600 h-1/2 rounded-full"></div>
            </div>

            {/* Score Ring & Anomaly Indicator Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-center pt-2">
              {/* Radial Detection Score Ring */}
              <div className="relative flex flex-col items-center justify-center sm:border-r border-slate-700/60 sm:pr-8 py-2">
                <div className="w-32 h-32 rounded-full border-8 border-slate-800 border-t-cyan-500 relative flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                  <span className="text-3xl font-black font-display text-white">
                    {activeScan ? `${Math.round(activeScan.confidenceScore)}%` : '97%'}
                  </span>
                  <span className="absolute -bottom-6 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Detection Score
                  </span>
                </div>
              </div>

              {/* Indicator Pills */}
              <div className="space-y-3">
                <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex items-center gap-3">
                  <div className="w-8 h-8 bg-rose-500/20 text-rose-500 rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-rose-400 uppercase">AI INDICATOR DETECTED</div>
                    <div className="text-xs text-slate-300 mt-0.5">
                      {activeScan?.verdict === 'AI_GENERATED'
                        ? 'Synthetic jitter found at 00:04.2s'
                        : 'No abnormal high-frequency cutoff'}
                    </div>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-blue-400 uppercase">SPECTRAL CONSISTENCY</div>
                    <div className="text-xs text-slate-300 mt-0.5">84.2% variation detected</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action footer inside active card */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-700/50 flex-wrap gap-2">
              <span className="text-xs text-slate-400 font-mono">
                Model Signature: {activeScan?.detectedModelSignature || 'Neural Vocoder DiffWave / ElevenLabs'}
              </span>
              <button
                onClick={() => {
                  if (activeScan) onSelectScan(activeScan);
                  else setCurrentTab('upload');
                }}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono hover:underline"
              >
                <span>Open Full Spectrogram</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Col: Recent History in High Density Design */}
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl flex flex-col overflow-hidden">
          <div className="p-5 border-b border-slate-700/50 flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2 text-white text-sm">
              <span>Recent History</span>
            </h3>
            <button
              onClick={() => setCurrentTab('history')}
              className="text-[11px] font-mono text-cyan-400 hover:underline"
            >
              View All
            </button>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[460px]">
            <div className="p-3 space-y-2">
              {scans.slice(0, 6).map((scan) => {
                const isAi = scan.verdict === 'AI_GENERATED';
                const isPlaying = playingScanId === scan.id;

                return (
                  <div
                    key={scan.id}
                    className="p-3 bg-slate-900/50 hover:bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between gap-3 transition-colors group cursor-pointer"
                    onClick={() => onSelectScan(scan)}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white group-hover:text-cyan-300 transition-colors truncate">
                        {scan.fileName}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase font-mono mt-0.5">
                        {new Date(scan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {formatDuration(scan.duration)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePlayScan(scan);
                        }}
                        className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
                      >
                        {isPlaying ? <Pause className="w-3 h-3 fill-current text-cyan-400" /> : <Play className="w-3 h-3 fill-current" />}
                      </button>

                      <span
                        className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                          isAi
                            ? 'text-rose-400 bg-rose-950/40 border border-rose-500/20'
                            : 'text-emerald-400 bg-emerald-950/40 border border-emerald-500/20'
                        }`}
                      >
                        {isAi ? 'AI CLONE' : 'HUMAN'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
