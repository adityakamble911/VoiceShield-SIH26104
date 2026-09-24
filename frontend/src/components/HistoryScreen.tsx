import React, { useState } from 'react';
import {
  History,
  Search,
  Filter,
  Trash2,
  Download,
  Play,
  Pause,
  ArrowUpRight,
  ShieldAlert,
  ShieldCheck,
  FileAudio,
  Calendar,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { ScanResult, ScreenTab } from '../types';
import { formatDuration, formatFileSize } from '../utils/audioSynth';

interface HistoryScreenProps {
  scans: ScanResult[];
  onSelectScan: (scan: ScanResult) => void;
  onDeleteScan: (id: string) => void;
  onClearHistory: () => void;
  onRestoreDefaults: () => void;
  playingScanId: string | null;
  onTogglePlayScan: (scan: ScanResult) => void;
  onOpenCertificateModal: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  scans,
  onSelectScan,
  onDeleteScan,
  onClearHistory,
  onRestoreDefaults,
  playingScanId,
  onTogglePlayScan,
  onOpenCertificateModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVerdict, setFilterVerdict] = useState<'ALL' | 'AI_GENERATED' | 'REAL_HUMAN'>('ALL');

  // Filtered scans list
  const filteredScans = scans.filter((scan) => {
    const matchesSearch =
      scan.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scan.detectedModelSignature.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scan.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterVerdict === 'ALL' || scan.verdict === filterVerdict;

    return matchesSearch && matchesFilter;
  });

  // Export full scan archive as JSON
  const handleExportAllJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(scans, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `voiceshield_audit_log_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6" id="history-screen-container">
      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-wider">
            <span>FORENSIC AUDIT TRAIL</span>
            <span>•</span>
            <span>{scans.length} RECORDS INDEXED</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-white mt-1">
            Voice Cloning Scan History & Records
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportAllJSON}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export JSON Audit</span>
          </button>

          {scans.length === 0 ? (
            <button
              onClick={onRestoreDefaults}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Load Preset Samples</span>
            </button>
          ) : (
            <button
              onClick={onClearHistory}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-500/40 text-xs font-semibold transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Log</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by filename, model, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-cyan-500/60 text-xs text-white placeholder-slate-500 focus:outline-hidden transition-all"
          />
        </div>

        {/* Verdict Filter Buttons */}
        <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono w-full sm:w-auto justify-center">
          <button
            onClick={() => setFilterVerdict('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterVerdict === 'ALL'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({scans.length})
          </button>
          <button
            onClick={() => setFilterVerdict('AI_GENERATED')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterVerdict === 'AI_GENERATED'
                ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.2)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            AI Clones ({scans.filter((s) => s.verdict === 'AI_GENERATED').length})
          </button>
          <button
            onClick={() => setFilterVerdict('REAL_HUMAN')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterVerdict === 'REAL_HUMAN'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Real Humans ({scans.filter((s) => s.verdict === 'REAL_HUMAN').length})
          </button>
        </div>
      </div>

      {/* History Records Table / Cards */}
      {filteredScans.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center border border-slate-800">
          <History className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white font-display">No matching scan records found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search query or verdict filter, or run a new scan from the upload chamber.
          </p>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Audio Source & Filename</th>
                  <th className="py-3 px-4">Verdict</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Duration / Size</th>
                  <th className="py-3 px-4">Detected Architecture</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredScans.map((scan) => {
                  const isAi = scan.verdict === 'AI_GENERATED';
                  const isPlaying = playingScanId === scan.id;

                  return (
                    <tr
                      key={scan.id}
                      className="hover:bg-slate-900/50 transition-colors group"
                    >
                      {/* Filename & Play Button */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => onTogglePlayScan(scan)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                              isAi
                                ? 'bg-rose-950/60 text-rose-400 border border-rose-500/30 hover:bg-rose-900/60'
                                : 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-900/60'
                            }`}
                            title={isPlaying ? 'Pause' : 'Play audio'}
                          >
                            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                          </button>
                          <div>
                            <div className="font-semibold text-white group-hover:text-cyan-300 transition-colors truncate max-w-xs">
                              {scan.fileName}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500">
                              ID: {scan.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Verdict Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[10px] font-bold border ${
                            isAi
                              ? 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                              : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                          }`}
                        >
                          {isAi ? <ShieldAlert className="w-3 h-3 text-rose-400" /> : <ShieldCheck className="w-3 h-3 text-emerald-400" />}
                          <span>{isAi ? 'AI CLONE' : 'REAL HUMAN'}</span>
                        </span>
                      </td>

                      {/* Confidence */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono">
                        <span
                          className={`font-bold text-sm ${
                            isAi ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {scan.confidenceScore}%
                        </span>
                      </td>

                      {/* Duration / Format */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-400">
                        <div>{formatDuration(scan.duration)}</div>
                        <div className="text-[10px] text-slate-500">
                          {formatFileSize(scan.fileSize)} • {scan.format}
                        </div>
                      </td>

                      {/* Model Signature */}
                      <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate text-xs">
                        {scan.detectedModelSignature}
                      </td>

                      {/* Timestamp */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-400 text-[11px]">
                        <div>{new Date(scan.timestamp).toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(scan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectScan(scan)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/40 transition-all"
                            title="Inspect Detailed Analysis"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onDeleteScan(scan.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/40 transition-all"
                            title="Delete Scan Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
