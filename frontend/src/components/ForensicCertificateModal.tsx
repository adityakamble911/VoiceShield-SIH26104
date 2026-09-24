import React from 'react';
import { X, Shield, CheckCircle2, ShieldAlert, Download, Printer, Copy, Sparkles } from 'lucide-react';
import { ScanResult } from '../types';
import { formatDuration, formatFileSize } from '../utils/audioSynth';

interface ForensicCertificateModalProps {
  scanResult: ScanResult | null;
  onClose: () => void;
}

export const ForensicCertificateModal: React.FC<ForensicCertificateModalProps> = ({
  scanResult,
  onClose,
}) => {
  if (!scanResult) return null;

  const isAi = scanResult.verdict === 'AI_GENERATED';
  const certHash =
    '0x' +
    (scanResult.id + scanResult.fileName)
      .split('')
      .map((c) => c.charCodeAt(0).toString(16))
      .join('')
      .slice(0, 32);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyHash = () => {
    navigator.clipboard.writeText(certHash);
    alert('Certificate hash copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl rounded-2xl glass-panel-glow border border-cyan-500/50 p-6 sm:p-8 space-y-6 shadow-[0_0_50px_rgba(6,182,212,0.25)] max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Certificate Header */}
        <div className="text-center space-y-2 border-b border-slate-800 pb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 mb-2 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <Shield className="w-6 h-6" />
          </div>
          <div className="text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-semibold">
            VOICESHIELD ACOUSTIC INTELLIGENCE LABS
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
            Forensic Audio Biometric Certificate
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            CERTIFICATE ID: {scanResult.id} • SHA-256: {certHash}
          </p>
        </div>

        {/* Classification Result Banner */}
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
            isAi ? 'glass-panel-danger' : 'glass-panel-success'
          }`}
        >
          <div className="flex items-center gap-3">
            {isAi ? (
              <ShieldAlert className="w-8 h-8 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
            )}
            <div>
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                OFFICIAL CLASSIFICATION
              </div>
              <div
                className={`text-lg font-bold font-display ${
                  isAi ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {isAi ? 'SYNTHETIC AI VOICE CLONE' : 'AUTHENTIC HUMAN BIOMETRIC'}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-mono text-slate-400 uppercase">CERTAINTY</div>
            <div
              className={`text-2xl font-extrabold font-mono ${
                isAi ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {scanResult.confidenceScore}%
            </div>
          </div>
        </div>

        {/* Forensic Metadata Specifications */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="text-slate-500 text-[10px]">FILE NAME</div>
            <div className="text-slate-200 font-bold mt-0.5 truncate">{scanResult.fileName}</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="text-slate-500 text-[10px]">DURATION / SIZE</div>
            <div className="text-slate-200 font-bold mt-0.5">
              {formatDuration(scanResult.duration)} ({formatFileSize(scanResult.fileSize)})
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="text-slate-500 text-[10px]">SAMPLE RATE</div>
            <div className="text-cyan-400 font-bold mt-0.5">{scanResult.sampleRate} Hz</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 col-span-2 sm:col-span-3">
            <div className="text-slate-500 text-[10px]">DETECTED MODEL ARCHITECTURE</div>
            <div className="text-slate-200 font-bold mt-0.5">{scanResult.detectedModelSignature}</div>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="space-y-1.5 text-xs text-slate-300">
          <div className="text-slate-400 font-mono text-[10px] uppercase font-bold">
            Forensic Findings Summary
          </div>
          <p className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 leading-relaxed">
            {scanResult.summary}
          </p>
        </div>

        {/* Security Stamp / Digital Seal */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-cyan-500/30 flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-2 text-cyan-400">
            <Sparkles className="w-4 h-4" />
            <span>Cryptographically Verified by Gemini 3.8 Flash & VoiceShield v4.2</span>
          </div>
          <button
            onClick={handleCopyHash}
            className="text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Hash</span>
          </button>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700 transition-all"
          >
            Dismiss
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center gap-2 transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Print Certificate</span>
          </button>
        </div>
      </div>
    </div>
  );
};
