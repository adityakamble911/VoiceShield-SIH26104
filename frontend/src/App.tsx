import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardScreen } from './components/DashboardScreen';
import { UploadScreen } from './components/UploadScreen';
import { DetectionScreen } from './components/DetectionScreen';
import { DetailedAnalysisScreen } from './components/DetailedAnalysisScreen';
import { LiveDetectionScreen } from './components/LiveDetectionScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { ForensicCertificateModal } from './components/ForensicCertificateModal';
import { ScreenTab, ScanResult } from './types';
import { INITIAL_SCAN_HISTORY } from './data/mockData';
import { createPresetAudioBlob } from './utils/audioSynth';

export default function App() {
  const [currentTab, setCurrentTab] = useState<ScreenTab>('dashboard');
  const [scans, setScans] = useState<ScanResult[]>(() => {
    try {
      const saved = localStorage.getItem('voiceshield_scans_v1');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to read stored scans:', e);
    }
    return INITIAL_SCAN_HISTORY;
  });

  const [activeScan, setActiveScan] = useState<ScanResult | null>(() => {
    return scans.length > 0 ? scans[0] : null;
  });

  const [isScanning, setIsScanning] = useState(false);
  const [isCertificateOpen, setIsCertificateOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Shared in-line audio preview player for history and dashboard
  const [playingScanId, setPlayingScanId] = useState<string | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Sync scans with localStorage
  useEffect(() => {
    try {
      localStorage.setItem('voiceshield_scans_v1', JSON.stringify(scans));
    } catch (e) {
      console.error('Failed to persist scans:', e);
    }
  }, [scans]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // When a scan completes in UploadScreen or LiveDetectionScreen:
  const handleScanComplete = (result: ScanResult) => {
    setScans((prev) => [result, ...prev]);
    setActiveScan(result);
    setCurrentTab('detection');
    showToast(
      result.verdict === 'AI_GENERATED'
        ? '⚠️ AI Voice Clone Detected! Reviewing forensic metrics.'
        : '✅ Authentic Biological Voice Verified!'
    );
  };

  // Inspect a specific scan in Detailed Analysis
  const handleSelectScan = (scan: ScanResult) => {
    setActiveScan(scan);
    setCurrentTab('detection');
  };

  // Delete a scan
  const handleDeleteScan = (id: string) => {
    setScans((prev) => prev.filter((s) => s.id !== id));
    if (activeScan?.id === id) {
      setActiveScan(scans.find((s) => s.id !== id) || null);
    }
    showToast('Scan record removed from audit log.');
  };

  // Clear all history
  const handleClearHistory = () => {
    if (window.confirm('Clear all forensic scan history?')) {
      setScans([]);
      setActiveScan(null);
      showToast('All scan history cleared.');
    }
  };

  // Restore preset sample history
  const handleRestoreDefaults = () => {
    setScans(INITIAL_SCAN_HISTORY);
    setActiveScan(INITIAL_SCAN_HISTORY[0]);
    showToast('Preset sample records restored.');
  };

  // Toggle playback of any scan in History or Dashboard
  const handleTogglePlayScan = async (scan: ScanResult) => {
    if (playingScanId === scan.id) {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
      setPlayingScanId(null);
      return;
    }

    try {
      let playUrl = scan.audioUrl;
      if (!playUrl) {
        const tone = scan.verdict === 'AI_GENERATED' ? 'deepfake_ceo' : 'natural_human';
        const synth = await createPresetAudioBlob(tone, scan.duration || 5.0);
        playUrl = synth.url;
        scan.audioUrl = playUrl;
      }

      if (audioPreviewRef.current) {
        audioPreviewRef.current.src = playUrl;
        audioPreviewRef.current.onended = () => setPlayingScanId(null);
        await audioPreviewRef.current.play();
        setPlayingScanId(scan.id);
      }
    } catch (e) {
      console.warn('Playback could not be initialized:', e);
      setPlayingScanId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Invisible Global Audio Preview Element */}
      <audio ref={audioPreviewRef} className="hidden" />

      {/* Top Header Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        scans={scans}
      />

      {/* Main Layout Container with High Density Sidebar & Content */}
      <div className="flex-1 flex flex-col lg:flex-row w-full overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          scans={scans}
          latestScan={activeScan}
        />

        {/* Dynamic Screen View */}
        <main className="flex-1 bg-[#0a0f1d] p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto min-w-0">
          {currentTab === 'dashboard' && (
            <DashboardScreen
              scans={scans}
              setCurrentTab={setCurrentTab}
              onSelectScan={handleSelectScan}
              playingScanId={playingScanId}
              onTogglePlayScan={handleTogglePlayScan}
            />
          )}

          {currentTab === 'upload' && (
            <UploadScreen
              onScanComplete={handleScanComplete}
              isScanning={isScanning}
              setIsScanning={setIsScanning}
            />
          )}

          {currentTab === 'detection' && (
            <DetectionScreen
              scanResult={activeScan}
              setCurrentTab={setCurrentTab}
              onOpenCertificateModal={() => setIsCertificateOpen(true)}
            />
          )}

          {currentTab === 'analysis' && (
            <DetailedAnalysisScreen
              scanResult={activeScan}
              setCurrentTab={setCurrentTab}
              onOpenCertificateModal={() => setIsCertificateOpen(true)}
            />
          )}

          {currentTab === 'live' && (
            <LiveDetectionScreen
              onScanComplete={handleScanComplete}
              setCurrentTab={setCurrentTab}
              isScanning={isScanning}
              setIsScanning={setIsScanning}
            />
          )}

          {currentTab === 'history' && (
            <HistoryScreen
              scans={scans}
              onSelectScan={handleSelectScan}
              onDeleteScan={handleDeleteScan}
              onClearHistory={handleClearHistory}
              onRestoreDefaults={handleRestoreDefaults}
              playingScanId={playingScanId}
              onTogglePlayScan={handleTogglePlayScan}
              onOpenCertificateModal={() => setIsCertificateOpen(true)}
            />
          )}
        </main>
      </div>

      {/* High Density Footer matching theme */}
      <footer className="h-16 border-t border-slate-800 bg-[#0d1425] flex items-center justify-between px-4 sm:px-8 z-30 shrink-0">
        <div className="flex items-center gap-6 font-mono">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span>API LATENCY: 42ms</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
            <span>NODE: US-EAST-1</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="footer-export-report-btn"
            onClick={() => {
              if (activeScan) {
                setIsCertificateOpen(true);
              } else {
                setCurrentTab('dashboard');
              }
            }}
            className="px-3 sm:px-4 py-2 bg-cyan-500 text-black text-xs font-black rounded uppercase hover:bg-cyan-400 transition-colors shadow-[0_0_12px_rgba(6,182,212,0.35)]"
          >
            Export Report
          </button>
          <button
            id="footer-batch-scan-btn"
            onClick={() => setCurrentTab('upload')}
            className="px-3 sm:px-4 py-2 bg-slate-800 text-white text-xs font-black rounded uppercase border border-slate-700 hover:bg-slate-700 transition-colors"
          >
            Batch Scan
          </button>
        </div>
      </footer>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 right-6 z-50 px-4 py-3 rounded-xl bg-slate-900/95 backdrop-blur-md border border-cyan-500/40 text-slate-100 text-xs font-mono shadow-[0_0_25px_rgba(6,182,212,0.3)] animate-fadeIn">
          {toastMessage}
        </div>
      )}

      {/* Forensic Certificate Modal */}
      {isCertificateOpen && (
        <ForensicCertificateModal
          scanResult={activeScan}
          onClose={() => setIsCertificateOpen(false)}
        />
      )}
    </div>
  );
}
